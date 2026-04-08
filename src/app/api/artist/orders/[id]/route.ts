import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch order with related data
    const { data: order, error } = await supabase
      .from('orders')
      .select(
        'id, total_amount_aud, artist_payout_aud, status, created_at, shipped_at, delivered_at, payout_released_at, shipping_tracking_number, shipping_carrier, shipping_address, artworks(id, title, images, category, medium), profiles!orders_buyer_id_fkey(full_name, email)'
      )
      .eq('id', id)
      .eq('artist_id', user.id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check for dispute if status is disputed
    let dispute = null;
    if (order.status === 'disputed') {
      const { data: disputeData } = await supabase
        .from('disputes')
        .select('type, description, status, created_at')
        .eq('order_id', id)
        .single();
      dispute = disputeData;
    }

    return NextResponse.json({ order, dispute });
  } catch (err) {
    console.error('[API artist/orders/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
