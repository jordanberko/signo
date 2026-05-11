import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { sendReturnTrackingToSeller } from '@/lib/email';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── POST: Buyer submits return tracking info ──

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Auth check
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch order
    const serviceClient = getServiceClient();
    const { data: order } = await serviceClient
      .from('orders')
      .select('id, buyer_id, artist_id, artwork_id, status')
      .eq('id', id)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    if (order.status !== 'return_pending') {
      return NextResponse.json({ error: 'Order must be in return_pending status to submit tracking' }, { status: 400 });
    }

    const body = await request.json();
    const { tracking_number, carrier, return_photo_url } = body;

    if (!tracking_number?.trim()) {
      return NextResponse.json({ error: 'Tracking number is required' }, { status: 400 });
    }
    if (!carrier?.trim()) {
      return NextResponse.json({ error: 'Carrier is required' }, { status: 400 });
    }

    // Find the dispute for this order
    const { data: dispute } = await serviceClient
      .from('disputes')
      .select('id')
      .eq('order_id', id)
      .eq('status', 'return_pending')
      .single();

    if (!dispute) {
      return NextResponse.json({ error: 'No return-pending dispute found for this order' }, { status: 400 });
    }

    // Update dispute
    const { error: disputeError } = await serviceClient
      .from('disputes')
      .update({
        status: 'return_in_transit',
        return_tracking_number: tracking_number.trim(),
        return_carrier: carrier.trim(),
        return_tracking_submitted_at: new Date().toISOString(),
        ...(return_photo_url ? { return_photo_url } : {}),
      })
      .eq('id', dispute.id);

    if (disputeError) {
      console.error('[RETURN_TRACKING] Dispute update failed:', disputeError);
      return NextResponse.json({ error: 'Failed to update dispute' }, { status: 500 });
    }

    // Update order
    const { error: orderError } = await serviceClient
      .from('orders')
      .update({ status: 'return_in_transit' })
      .eq('id', id);

    if (orderError) {
      console.error('[RETURN_TRACKING] Order update failed:', orderError);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    // Send email to seller
    const [sellerResult, artworkResult] = await Promise.all([
      serviceClient.from('profiles').select('email, full_name').eq('id', order.artist_id).single(),
      serviceClient.from('artworks').select('title').eq('id', order.artwork_id).single(),
    ]);

    if (sellerResult.data?.email) {
      try {
        await sendReturnTrackingToSeller({
          sellerEmail: sellerResult.data.email,
          sellerName: sellerResult.data.full_name || '',
          orderId: id,
          artworkTitle: artworkResult.data?.title || 'Artwork',
          trackingNumber: tracking_number.trim(),
          carrier: carrier.trim(),
        });
      } catch (err) {
        console.warn('[EMAIL_FAILED]', {
          type: 'return_tracking_seller',
          orderId: id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
