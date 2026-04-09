import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { releaseFunds } from '@/lib/stripe/escrow';
import { sendPayoutReleased } from '@/lib/email';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── PUT: Buyer manually completes order (releases funds early) ──

export async function PUT(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Auth check
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch order with artist details for payout email
    const { data: order } = await supabase
      .from('orders')
      .select('id, buyer_id, artist_id, artwork_id, artist_payout_aud, status')
      .eq('id', id)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'You are not the buyer for this order' }, { status: 403 });
    }
    if (order.status !== 'delivered') {
      return NextResponse.json({ error: 'Order must be in delivered status to complete' }, { status: 400 });
    }

    // Release funds to artist
    const result = await releaseFunds(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // ── Send payout released email to artist (fire-and-forget) ──
    const [artistResult, artworkResult] = await Promise.all([
      supabase.from('profiles').select('email, full_name').eq('id', order.artist_id).single(),
      supabase.from('artworks').select('title').eq('id', order.artwork_id).single(),
    ]);

    if (artistResult.data?.email) {
      sendPayoutReleased({
        artistEmail: artistResult.data.email,
        artistName: artistResult.data.full_name || '',
        orderId: id,
        artworkTitle: artworkResult.data?.title || 'Artwork',
        payoutAmount: order.artist_payout_aud || 0,
      }).catch((err) => console.error('[Complete] Payout released email failed:', err));
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
