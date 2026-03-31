import { NextResponse } from 'next/server';
import { cancelUnshippedOrders } from '@/lib/stripe/escrow';

/**
 * POST /api/cron/cancel-unshipped
 *
 * Cancels orders that haven't been shipped within 7 calendar days.
 * Refunds the buyer and re-lists the artwork.
 * Protected by CRON_SECRET — called by Vercel Cron daily.
 */
export async function POST(request: Request) {
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
