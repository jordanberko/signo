import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOpsAlert } from '@/lib/ops-alert';
import { sendReturnTrackingReminder, sendReturnReceiptReminder } from '@/lib/email';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / MS_PER_DAY;
}

/**
 * Fire-once gate for a daily cron.
 *
 * Returns true only on the first daily run at or after `threshold` days of
 * elapsed time, i.e. when elapsed lands in [threshold, threshold + 1). With
 * a once-a-day schedule this yields exactly one firing per event instead of
 * one every day forever (the old `< daysAgo(N)` filter re-alerted on every
 * run until the dispute was resolved by hand — pure noise).
 *
 * The one-day band is chosen to match the cron interval; if a daily run is
 * missed entirely the event won't re-fire, which is an acceptable trade for
 * not needing a persisted per-dispute "reminded_at" column (and therefore no
 * migration).
 */
function crossedThreshold(elapsedDays: number | null, threshold: number): boolean {
  if (elapsedDays === null) return false;
  return elapsedDays >= threshold && elapsedDays < threshold + 1;
}

// ── Buyer tracking reminder (a few days before the return deadline) ──

async function remindBuyerTracking() {
  const supabase = getServiceClient();

  // Fetch all pending returns and decide per-dispute using its OWN
  // return_window_days — the window is admin-configurable per dispute, so a
  // fixed day-10 reminder was wrong for any window other than 14. Volume is
  // low, so fetching the full set is fine.
  const { data: disputes, error } = await supabase
    .from('disputes')
    .select('id, order_id, return_approved_at, return_window_days, orders(buyer_id, artwork_id)')
    .eq('status', 'return_pending');

  if (error) {
    console.error('[BACKSTOP] buyer tracking reminder query failed:', error.message);
    return { sent: 0, errors: [error.message] };
  }
  if (!disputes?.length) return { sent: 0, errors: [] };

  let sent = 0;
  const errors: string[] = [];

  for (const dispute of disputes) {
    const windowDays = (dispute.return_window_days as number) ?? 14;
    // Remind 4 days before the deadline, but never earlier than day 3.
    const remindAt = Math.max(windowDays - 4, 3);
    if (!crossedThreshold(daysSince(dispute.return_approved_at), remindAt)) continue;

    const orderRaw = dispute.orders as unknown;
    const order = Array.isArray(orderRaw) ? orderRaw[0] : orderRaw;
    if (!order) continue;

    const [buyerResult, artworkResult] = await Promise.all([
      supabase.from('profiles').select('email, full_name').eq('id', (order as Record<string, string>).buyer_id).single(),
      supabase.from('artworks').select('title').eq('id', (order as Record<string, string>).artwork_id).single(),
    ]);

    if (buyerResult.data?.email) {
      try {
        await sendReturnTrackingReminder({
          buyerEmail: buyerResult.data.email,
          buyerName: buyerResult.data.full_name || '',
          orderId: dispute.order_id,
          artworkTitle: artworkResult.data?.title || 'Artwork',
        });
        sent++;
      } catch (err) {
        errors.push(`${dispute.order_id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return { sent, errors };
}

// ── Admin escalation for missing buyer tracking (at the return deadline) ──

async function escalateMissingTracking() {
  const supabase = getServiceClient();

  const { data: disputes, error } = await supabase
    .from('disputes')
    .select('id, order_id, return_approved_at, return_window_days')
    .eq('status', 'return_pending');

  if (error) {
    console.error('[BACKSTOP] escalate missing tracking query failed:', error.message);
    return { escalated: 0 };
  }
  if (!disputes?.length) return { escalated: 0 };

  let escalated = 0;
  for (const dispute of disputes) {
    const windowDays = (dispute.return_window_days as number) ?? 14;
    // Escalate once, the day the buyer's own return window lapses.
    if (!crossedThreshold(daysSince(dispute.return_approved_at), windowDays)) continue;

    await sendOpsAlert({
      title: `Return tracking overdue — order ${dispute.order_id.slice(0, 8)}`,
      description:
        `Dispute ${dispute.id} has reached its ${windowDays}-day return window with no tracking ` +
        `submitted by the buyer. Decide the outcome: release the payout to the artist in their ` +
        `favour (resolved_no_refund), or extend/close the dispute.`,
      context: {
        dispute_id: dispute.id,
        order_id: dispute.order_id,
        return_window_days: windowDays,
        return_approved_at: dispute.return_approved_at ?? 'unknown',
      },
      level: 'warn',
    });
    escalated++;
  }

  return { escalated };
}

// ── Seller receipt reminder (day 7 after tracking submitted) ──

async function remindSellerReceipt() {
  const supabase = getServiceClient();

  const { data: disputes, error } = await supabase
    .from('disputes')
    .select('id, order_id, return_tracking_submitted_at, orders(artist_id, artwork_id)')
    .eq('status', 'return_in_transit');

  if (error) {
    console.error('[BACKSTOP] seller receipt reminder query failed:', error.message);
    return { sent: 0, errors: [error.message] };
  }
  if (!disputes?.length) return { sent: 0, errors: [] };

  let sent = 0;
  const errors: string[] = [];

  for (const dispute of disputes) {
    if (!crossedThreshold(daysSince(dispute.return_tracking_submitted_at), 7)) continue;

    const orderRaw = dispute.orders as unknown;
    const order = Array.isArray(orderRaw) ? orderRaw[0] : orderRaw;
    if (!order) continue;

    const [sellerResult, artworkResult] = await Promise.all([
      supabase.from('profiles').select('email, full_name').eq('id', (order as Record<string, string>).artist_id).single(),
      supabase.from('artworks').select('title').eq('id', (order as Record<string, string>).artwork_id).single(),
    ]);

    if (sellerResult.data?.email) {
      try {
        await sendReturnReceiptReminder({
          sellerEmail: sellerResult.data.email,
          sellerName: sellerResult.data.full_name || '',
          orderId: dispute.order_id,
          artworkTitle: artworkResult.data?.title || 'Artwork',
        });
        sent++;
      } catch (err) {
        errors.push(`${dispute.order_id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return { sent, errors };
}

// ── Admin escalation for missing seller receipt (day 14 after tracking) ──

async function escalateMissingReceipt() {
  const supabase = getServiceClient();

  const { data: disputes, error } = await supabase
    .from('disputes')
    .select('id, order_id, return_tracking_submitted_at')
    .eq('status', 'return_in_transit');

  if (error) {
    console.error('[BACKSTOP] escalate missing receipt query failed:', error.message);
    return { escalated: 0 };
  }
  if (!disputes?.length) return { escalated: 0 };

  let escalated = 0;
  for (const dispute of disputes) {
    if (!crossedThreshold(daysSince(dispute.return_tracking_submitted_at), 14)) continue;

    await sendOpsAlert({
      title: `Return receipt overdue — order ${dispute.order_id.slice(0, 8)}`,
      description:
        `Dispute ${dispute.id} has been in return_in_transit for 14 days with no receipt confirmed ` +
        `by the seller. Manual intervention needed — contact the seller or process the refund ` +
        `directly (the tracking suggests the work is back).`,
      context: {
        dispute_id: dispute.id,
        order_id: dispute.order_id,
        tracking_submitted_at: dispute.return_tracking_submitted_at ?? 'unknown',
      },
      level: 'warn',
    });
    escalated++;
  }

  return { escalated };
}

// ── Handler ──

async function handler(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [trackingReminder, trackingEscalation, receiptReminder, receiptEscalation] =
      await Promise.all([
        remindBuyerTracking(),
        escalateMissingTracking(),
        remindSellerReceipt(),
        escalateMissingReceipt(),
      ]);

    const result = {
      buyer_tracking_reminders: trackingReminder,
      buyer_tracking_escalations: trackingEscalation,
      seller_receipt_reminders: receiptReminder,
      seller_receipt_escalations: receiptEscalation,
    };

    console.log('[Cron] return-backstops complete:', JSON.stringify(result));
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Cron] return-backstops error:', message);
    await sendOpsAlert({
      title: 'Cron failure: return-backstops',
      description:
        'The daily return backstops cron threw before completing. Return reminders and ' +
        'escalations may not have fired. A manual run via POST /api/cron/return-backstops ' +
        'with the CRON_SECRET bearer token recovers immediately.',
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
