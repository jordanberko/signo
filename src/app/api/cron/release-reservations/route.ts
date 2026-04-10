import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client — bypasses RLS for server-side operations
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/cron/release-reservations
 *
 * Releases orphaned artwork reservations that were never completed.
 * If a Stripe checkout session expires without the webhook firing,
 * the artwork stays 'reserved' forever — this cron cleans those up.
 * Protected by CRON_SECRET — called by Vercel Cron every 15 minutes.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();

    // Find artworks stuck in 'reserved' status for more than 30 minutes
    const thirtyMinutesAgo = new Date(
      Date.now() - 30 * 60 * 1000
    ).toISOString();

    const { data: staleReservations, error: fetchError } = await supabase
      .from('artworks')
      .select('id')
      .eq('status', 'reserved')
      .lt('updated_at', thirtyMinutesAgo);

    if (fetchError) {
      throw new Error(`Failed to fetch stale reservations: ${fetchError.message}`);
    }

    if (!staleReservations || staleReservations.length === 0) {
      console.log('[Cron] release-reservations complete: 0 released');
      return NextResponse.json({ released: 0 });
    }

    const ids = staleReservations.map((row) => row.id);

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
