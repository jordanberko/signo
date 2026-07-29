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
    // getUser() revalidates the JWT with the auth server (order state change).
    const { data: { user } } = await supabase.auth.getUser();
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
    const { tracking_number, carrier, packaging_photo_url, dispatch_photo_urls, insurance_acknowledged } = body;

    // Validate required fields
    if (!tracking_number?.trim()) {
      return NextResponse.json({ error: 'Tracking number is required' }, { status: 400 });
    }
    if (!carrier?.trim()) {
      return NextResponse.json({ error: 'Carrier is required' }, { status: 400 });
    }

    // ── Server-side dispatch evidence validation ──
    // The three dispatch photos are the platform's protection in a damage
    // dispute: they prove the work's condition and packing at hand-off. The
    // client marks them required and disables submit without them, but a
    // crafted request could ship with none — so enforce it here too. Require
    // all three expected views, each with a real URL.
    const REQUIRED_DISPATCH_PHOTO_TYPES = [
      'work_before_packing',
      'work_during_packing',
      'sealed_package',
    ];
    const photos = Array.isArray(dispatch_photo_urls) ? dispatch_photo_urls : [];
    const presentTypes = new Set(
      photos
        .filter(
          (p): p is { type: string; url: string } =>
            !!p &&
            typeof p === 'object' &&
            typeof (p as { type?: unknown }).type === 'string' &&
            typeof (p as { url?: unknown }).url === 'string' &&
            ((p as { url: string }).url).trim().length > 0
        )
        .map((p) => p.type)
    );
    const missing = REQUIRED_DISPATCH_PHOTO_TYPES.filter((t) => !presentTypes.has(t));
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error:
            'Dispatch photos are required to confirm shipment. Please upload all three: the work before packing, during packing, and the sealed package.',
          missing_dispatch_photos: missing,
        },
        { status: 400 }
      );
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
        ...(Array.isArray(dispatch_photo_urls) ? { dispatch_photo_urls } : {}),
        ...(typeof insurance_acknowledged === 'boolean' ? { insurance_acknowledged } : {}),
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
