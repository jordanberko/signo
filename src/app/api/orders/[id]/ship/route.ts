import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { sendShippingConfirmation } from '@/lib/email';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── PUT: Artist marks order as shipped ──

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Auth check
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch order
    const { data: order } = await supabase
      .from('orders')
      .select('id, artist_id, status')
      .eq('id', id)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.artist_id !== user.id) {
      return NextResponse.json({ error: 'You are not the artist for this order' }, { status: 403 });
    }
    if (order.status !== 'paid') {
      return NextResponse.json({ error: 'Order must be in paid status to ship' }, { status: 400 });
    }

    const body = await request.json();
    const { tracking_number, carrier, packaging_photo_url } = body;

    // Validate required fields
    if (!tracking_number?.trim()) {
      return NextResponse.json({ error: 'Tracking number is required' }, { status: 400 });
    }
    if (!carrier?.trim()) {
      return NextResponse.json({ error: 'Carrier is required' }, { status: 400 });
    }

    // Update order (service role bypasses RLS -- orders table has no
    // UPDATE policy for authenticated users, only for service role)
    const serviceClient = getServiceClient();
    const { data: updated, error: updateError } = await serviceClient
      .from('orders')
      .update({
        status: 'shipped',
        shipping_tracking_number: tracking_number.trim(),
        shipping_carrier: carrier.trim(),
        shipped_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[SHIP_ORDER_FAILED]', { orderId: id, error: updateError.message });
      return NextResponse.json({ error: 'Failed to update order' }, { status: 400 });
    }

    // ── Send shipping confirmation to buyer (fire-and-forget) ──
    const [buyerResult, artworkResult] = await Promise.all([
      serviceClient.from('profiles').select('email, full_name').eq('id', updated.buyer_id).single(),
      serviceClient.from('artworks').select('title').eq('id', updated.artwork_id).single(),
    ]);

    if (buyerResult.data?.email) {
      try {
        await sendShippingConfirmation({
          buyerEmail: buyerResult.data.email,
          buyerName: buyerResult.data.full_name || '',
          orderId: id,
          artworkTitle: artworkResult.data?.title || 'Artwork',
          trackingNumber: tracking_number.trim(),
          carrier: carrier.trim(),
        });
      } catch (err) {
        console.warn('[EMAIL_FAILED]', {
          type: 'shipping_confirmation',
          orderId: id,
          recipient: buyerResult.data.email,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      data: updated,
      ...(packaging_photo_url ? { packaging_photo_url } : {}),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
