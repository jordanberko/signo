import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe/config';

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
 * Cadence: every 5 minutes (vercel.json: `*\/5 * * * *`).
 * The reservation window is 10 minutes (see `tenMinutesAgo` below).
 * Worst-case cleanup latency = reservation window + cron gap, so a
 * 5-minute cron keeps latency at ≤15 minutes. A daily or even hourly
 * cron would make the 10-minute window functionally meaningless —
 * pieces would sit reserved long after the buyer abandoned checkout.
 * Idempotent on concurrent fires: the status+updated_at filter
 * matches only rows that haven't been flipped yet.
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
      .select('id')
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
    // Any Stripe failure (session already complete, Stripe 5xx,
    // missing env var at boot) is logged and swallowed — the
    // artwork going back to the marketplace is the correctness
    // guarantee. A missed session expiry is caught by the payment
    // webhook's own idempotency (existingOrder check + status-
    // filtered artwork update).
    const staleSet = new Set(ids);
    const sessionsToExpire = new Map<string, string>(); // artworkId → sessionId
    try {
      const stripe = getStripe();
      const createdSinceSeconds = Math.floor(Date.now() / 1000) - 40 * 60;
      for await (const session of stripe.checkout.sessions.list({
        status: 'open',
        created: { gte: createdSinceSeconds },
        limit: 100,
      })) {
        const artworkId = session.metadata?.signo_artwork_id;
        if (artworkId && staleSet.has(artworkId)) {
          sessionsToExpire.set(artworkId, session.id);
          if (sessionsToExpire.size === staleSet.size) break;
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
          console.warn(
            `[Cron] Stripe expire failed for session ${sessionId} (artwork ${artworkId}): ${m} — continuing`
          );
        }
      }
    } catch (stripeErr) {
      const m = stripeErr instanceof Error ? stripeErr.message : 'unknown';
      console.warn(
        `[Cron] Stripe session cleanup failed, flipping artworks anyway: ${m}`
      );
    }

    const { error: updateError } = await supabase
      .from('artworks')
      .update({ status: 'approved' })
      .in('id', ids);

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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handler(request);
}

export async function POST(request: Request) {
  return handler(request);
}
