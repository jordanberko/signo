import { NextResponse } from 'next/server';
import {
  autoReleaseFunds,
  autoMarkStaleShipmentsDelivered,
} from '@/lib/stripe/escrow';
import { sendOpsAlert } from '@/lib/ops-alert';

/**
 * GET|POST /api/cron/release-escrow
 *
 * Two passes, in order:
 *   1. Auto-deliver: orders shipped long ago with no buyer delivery
 *      confirmation are marked delivered, starting their inspection clock.
 *      Without this an artist whose buyer never clicks "confirm delivery"
 *      is never paid.
 *   2. Auto-release: orders past their inspection deadline pay out to the
 *      artist.
 *
 * The auto-deliver pass sets a fresh 48h inspection window, so an order
 * delivered in this run is NOT released in the same run — the buyer keeps
 * their full dispute window.
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
    const autoDelivered = await autoMarkStaleShipmentsDelivered();
    if (autoDelivered.errors.length > 0) {
      await sendOpsAlert({
        title: 'Auto-deliver backstop had per-order failures',
        description:
          'Some shipped orders past the auto-deliver window could not be marked delivered, so ' +
          'their artist payouts remain blocked. They will be retried next hour.',
        context: {
          failed: autoDelivered.errors.length,
          errors: autoDelivered.errors.join(' | ').slice(0, 900),
        },
        level: 'warn',
      });
    }

    const result = await autoReleaseFunds();

    console.log(
      `[Cron] release-escrow complete: ${autoDelivered.delivered} auto-delivered, ${result.released} released, ${result.failed} failed`
    );

    return NextResponse.json({ autoDelivered: autoDelivered.delivered, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Cron] release-escrow error:', message);
    await sendOpsAlert({
      title: 'Cron failure: release-escrow',
      description:
        'The hourly escrow release cron threw before completing. Vercel Cron does not retry, so artist payouts past the inspection window will not transfer until the next scheduled fire (1 hour). A manual run via POST /api/cron/release-escrow with the CRON_SECRET bearer token recovers immediately.',
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
