import { NextResponse } from 'next/server';
import { autoReleaseFunds } from '@/lib/stripe/escrow';

/**
 * POST /api/cron/release-escrow
 *
 * Releases escrowed funds for orders past their inspection deadline.
 * Protected by CRON_SECRET — called by Vercel Cron every hour.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await autoReleaseFunds();

    console.log(
      `[Cron] release-escrow complete: ${result.released} released, ${result.failed} failed`
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Cron] release-escrow error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
