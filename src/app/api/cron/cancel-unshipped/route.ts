import { NextResponse } from 'next/server';
import { cancelUnshippedOrders } from '@/lib/stripe/escrow';

/**
 * GET|POST /api/cron/cancel-unshipped
 *
 * Cancels orders that haven't been shipped within 7 calendar days.
 * Refunds the buyer and re-lists the artwork.
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
    const result = await cancelUnshippedOrders();

    console.log(
      `[Cron] cancel-unshipped complete: ${result.cancelled} cancelled, ${result.failed} failed`
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Cron] cancel-unshipped error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handler(request);
}

export async function POST(request: Request) {
  return handler(request);
}
