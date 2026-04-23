import { NextResponse } from 'next/server';
import { autoReleaseFunds } from '@/lib/stripe/escrow';

/**
 * GET|POST /api/cron/release-escrow
 *
 * Releases escrowed funds for orders past their inspection deadline.
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

export async function GET(request: Request) {
  return handler(request);
}

export async function POST(request: Request) {
  return handler(request);
}
