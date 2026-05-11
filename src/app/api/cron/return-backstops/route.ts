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

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// ── Buyer tracking reminder (day 10) ──

async function remindBuyerTracking() {
  const supabase = getServiceClient();
  const cutoff = daysAgo(10);

  const { data: disputes, error } = await supabase
    .from('disputes')
    .select('id, order_id, return_approved_at, orders(buyer_id, artwork_id)')
    .eq('status', 'return_pending')
    .lt('return_approved_at', cutoff);

  if (error) {
    console.error('[BACKSTOP] buyer tracking reminder query failed:', error.message);
    return { sent: 0, errors: [error.message] };
  }
  if (!disputes?.length) return { sent: 0, errors: [] };

  let sent = 0;
  const errors: string[] = [];

  for (const dispute of disputes) {
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

// ── Admin escalation for missing buyer tracking (day 14) ──

async function escalateMissingTracking() {
  const supabase = getServiceClient();
  const cutoff = daysAgo(14);

  const { data: disputes, error } = await supabase
    .from('disputes')
    .select('id, order_id, return_approved_at')
    .eq('status', 'return_pending')
    .lt('return_approved_at', cutoff);

  if (error) {
    console.error('[BACKSTOP] escalate missing tracking query failed:', error.message);
    return { escalated: 0 };
  }
  if (!disputes?.length) return { escalated: 0 };

  for (const dispute of disputes) {
    await sendOpsAlert({
      title: `Return tracking overdue — order ${dispute.order_id.slice(0, 8)}`,
      description:
        `Dispute ${dispute.id} has been in return_pending for over 14 days. ` +
        `The buyer has not submitted tracking. Manual intervention needed — ` +
        `consider contacting the buyer or resolving the dispute.`,
      context: {
        dispute_id: dispute.id,
        order_id: dispute.order_id,
        return_approved_at: dispute.return_approved_at ?? 'unknown',
      },
      level: 'warn',
    });
  }

  return { escalated: disputes.length };
}

// ── Seller receipt reminder (day 7 after tracking submitted) ──

async function remindSellerReceipt() {
  const supabase = getServiceClient();
  const cutoff = daysAgo(7);

  const { data: disputes, error } = await supabase
    .from('disputes')
    .select('id, order_id, return_tracking_submitted_at, orders(artist_id, artwork_id)')
    .eq('status', 'return_in_transit')
    .lt('return_tracking_submitted_at', cutoff);

  if (error) {
    console.error('[BACKSTOP] seller receipt reminder query failed:', error.message);
    return { sent: 0, errors: [error.message] };
  }
  if (!disputes?.length) return { sent: 0, errors: [] };

  let sent = 0;
  const errors: string[] = [];

  for (const dispute of disputes) {
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
  const cutoff = daysAgo(14);

  const { data: disputes, error } = await supabase
    .from('disputes')
    .select('id, order_id, return_tracking_submitted_at')
    .eq('status', 'return_in_transit')
    .lt('return_tracking_submitted_at', cutoff);

  if (error) {
    console.error('[BACKSTOP] escalate missing receipt query failed:', error.message);
    return { escalated: 0 };
  }
  if (!disputes?.length) return { escalated: 0 };

  for (const dispute of disputes) {
    await sendOpsAlert({
      title: `Return receipt overdue — order ${dispute.order_id.slice(0, 8)}`,
      description:
        `Dispute ${dispute.id} has been in return_in_transit for over 14 days. ` +
        `The seller has not confirmed receipt. Manual intervention needed — ` +
        `consider contacting the seller or processing the refund directly.`,
      context: {
        dispute_id: dispute.id,
        order_id: dispute.order_id,
        tracking_submitted_at: dispute.return_tracking_submitted_at ?? 'unknown',
      },
      level: 'warn',
    });
  }

  return { escalated: disputes.length };
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
