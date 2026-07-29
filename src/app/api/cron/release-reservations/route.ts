import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe/config';
import { sendOpsAlert } from '@/lib/ops-alert';

// Service role client — bypasses RLS for server-side operations
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET|POST /api/cron/release-reservations
 *
 * Releases orphaned artwork reservations that were never completed.
 * If a Stripe checkout session expires without the webhook firing,
 * the artwork stays 'reserved' forever — this cron cleans those up.
 *
 * Also proactively expires the associated open Stripe checkout session
 * so a buyer can't complete payment on an artwork that has been
 * handed back to the marketplace. Stripe errors on session expiry
 * are logged and swallowed — the artwork flip must not be blocked by
 * a best-effort session cleanup.
 *
 * Cadence: every 5 minutes (vercel.json: `*\/5 * * * *`), tied to the
 * 10-minute reservation window set in a8774f7 (2026-04-22). Worst-case
 * cleanup latency = reservation window + cron gap, so a 5-minute cron
 * keeps latency at ≤15 minutes. Anything coarser (hourly, daily) makes
 * the shortened reservation window functionally meaningless — pieces
 * would sit reserved long after the buyer abandoned checkout.
 * Requires Vercel Pro or higher (Hobby caps cron frequency at
 * once-per-day).
 *
 * Idempotent on concurrent fires: the status+updated_at filter matches
 * only rows that haven't been flipped yet. Safe if the schedule
 * overlaps or a run is double-triggered.
 *
 * Protected by CRON_SECRET. Vercel Cron calls GET; POST is kept as an
 * ops-accessible alias so `curl -X POST` still works during incidents.
 */
async function handler(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();

    // Reservation window: 10 minutes.
    // Product decision (2026-04-22): shortened from 30m to 10m so
    // pieces return to the marketplace faster after abandoned
    // checkouts. Longer holds reduce liquidity. The reservation is
    // still required to prevent double-purchase races — just shorter.
    //
    // Note the asymmetry with the Stripe session: Stripe's minimum
    // session expires_at is 30 min, so the session itself can still
    // look "open" to Stripe when we release. That's why we call
    // `checkout.sessions.expire` below — to bring Stripe's view back
    // into sync with ours.
    const tenMinutesAgo = new Date(
      Date.now() - 10 * 60 * 1000
    ).toISOString();

    const { data: staleReservations, error: fetchError } = await supabase
      .from('artworks')
      .select('id, reserved_session_id')
      .eq('status', 'reserved')
      .lt('updated_at', tenMinutesAgo);

    if (fetchError) {
      throw new Error(`Failed to fetch stale reservations: ${fetchError.message}`);
    }

    if (!staleReservations || staleReservations.length === 0) {
      console.log('[Cron] release-reservations complete: 0 released');
      return NextResponse.json({ released: 0 });
    }

    const ids = staleReservations.map((row) => row.id);

    // ── Expire any open Stripe checkout sessions ──
    // Best-effort: scan open checkout sessions in Stripe, match by
    // `metadata.signo_artwork_id`, and expire each matching session.
    // This is belt-and-braces so a buyer sitting on a stale Stripe
    // Checkout tab can't finish paying after the artwork has been
    // released.
    //
    // Checkout Sessions don't support Search API (no metadata filter
    // in `list`), so we iterate `list({ status: 'open' })` and match
    // client-side. We stop early once every stale artwork is matched.
    // The created-time filter is a safety cap: sessions older than
    // Stripe's 30-minute minimum expires_at are already expired.
    //
    // If a session cannot be expired we HOLD the reservation rather
    // than releasing it (see the catch blocks below). Releasing an
    // artwork whose session is still payable is the double-sale race:
    // buyer B buys the freed artwork, then buyer A's old session
    // completes and both are charged for one original.
    const staleSet = new Set(ids);
    const sessionsToExpire = new Map<string, string>(); // artworkId → sessionId
    const failedExpiry = new Set<string>(); // artworks we must NOT release

    // Preferred path: the reservation records its own Stripe session id
    // (migration 023), so we expire exactly the right session with no
    // scanning and no chance of missing it.
    for (const row of staleReservations) {
      const sid = (row as { reserved_session_id?: string | null })
        .reserved_session_id;
      if (sid) sessionsToExpire.set(row.id, sid);
    }

    try {
      const stripe = getStripe();
      // Fallback scan only for reservations with no linked session
      // (created before migration 023, or where the link write failed).
      const unlinked = ids.filter((id) => !sessionsToExpire.has(id));
      if (unlinked.length > 0) {
        const unlinkedSet = new Set(unlinked);
        const createdSinceSeconds = Math.floor(Date.now() / 1000) - 40 * 60;
        for await (const session of stripe.checkout.sessions.list({
          status: 'open',
          created: { gte: createdSinceSeconds },
          limit: 100,
        })) {
          const artworkId = session.metadata?.signo_artwork_id;
          if (artworkId && unlinkedSet.has(artworkId)) {
            sessionsToExpire.set(artworkId, session.id);
            if (sessionsToExpire.size === staleSet.size) break;
          }
        }
      }

      for (const [artworkId, sessionId] of sessionsToExpire) {
        try {
          await stripe.checkout.sessions.expire(sessionId);
          console.log(
            `[Cron] Expired Stripe session ${sessionId} for artwork ${artworkId}`
          );
        } catch (expireErr) {
          const m =
            expireErr instanceof Error ? expireErr.message : 'unknown';
          // Do NOT release this artwork: a still-payable session plus a
          // freed artwork is exactly the double-sale race (a second buyer
          // buys it, then the first session completes). Most commonly the
          // expire fails because the session already COMPLETED — in which
          // case the webhook is about to mark it sold anyway. Leave it
          // reserved; the next run (≤5 min) retries.
          failedExpiry.add(artworkId);
          console.warn(
            `[Cron] Stripe expire failed for session ${sessionId} (artwork ${artworkId}): ${m} — holding reservation`
          );
        }
      }
    } catch (stripeErr) {
      const m = stripeErr instanceof Error ? stripeErr.message : 'unknown';
      // Stripe unreachable: hold every reservation that has a live
      // session rather than releasing into a possible double sale.
      for (const artworkId of sessionsToExpire.keys()) failedExpiry.add(artworkId);
      console.warn(
        `[Cron] Stripe session cleanup failed, holding ${failedExpiry.size} reservation(s): ${m}`
      );
    }

    const releasableIds = ids.filter((id) => !failedExpiry.has(id));

    if (failedExpiry.size > 0) {
      await sendOpsAlert({
        title: 'Reservations held back — Stripe session could not be expired',
        description:
          `These artworks stayed 'reserved' because their checkout session could not be expired. Releasing them while the session is still payable risks a double sale. Usually self-resolving (the session completed, or Stripe was briefly unavailable) — the next run retries. Investigate if the same artwork appears repeatedly.`,
        context: {
          held: failedExpiry.size,
          released: releasableIds.length,
          artwork_ids: Array.from(failedExpiry).join(', ').slice(0, 900),
        },
        level: 'warn',
      });
    }

    if (releasableIds.length === 0) {
      console.log('[Cron] release-reservations complete: 0 released (all held)');
      return NextResponse.json({ released: 0, held: failedExpiry.size });
    }

    const { error: updateError } = await supabase
      .from('artworks')
      .update({
        status: 'approved',
        reserved_by: null,
        reserved_at: null,
        reserved_session_id: null,
      })
      .in('id', releasableIds);

    if (updateError) {
      throw new Error(`Failed to release reservations: ${updateError.message}`);
    }

    console.log(
      `[Cron] release-reservations complete: ${ids.length} released`
    );

    return NextResponse.json({ released: ids.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Cron] release-reservations error:', message);
    await sendOpsAlert({
      title: 'Cron failure: release-reservations',
      description:
        'The 5-minute artwork reservation cleanup cron threw before completing. Abandoned-checkout artworks will sit in `reserved` status (invisible to buyers) until the next successful run. Worst-case visibility delay is now ~10 minutes plus retry interval.',
      context: { error: message },
      level: 'error',
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handler(request);
}

export async function POST(request: Request) {
  return handler(request);
}
