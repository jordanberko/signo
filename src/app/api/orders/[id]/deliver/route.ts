import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── PUT: Mark order as delivered (admin or buyer) ──

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

    // Fetch order
    const { data: order } = await supabase
      .from('orders')
      .select('id, buyer_id, status')
      .eq('id', id)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.status !== 'shipped') {
      return NextResponse.json({ error: 'Order must be in shipped status to deliver' }, { status: 400 });
    }

    // Check user is admin or the buyer (only the buyer should confirm delivery)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    if (!isAdmin && user.id !== order.buyer_id) {
      return NextResponse.json({ error: 'Not authorized to mark this order as delivered' }, { status: 403 });
    }

    // Update order (service role bypasses RLS -- orders table has no
    // UPDATE policy for authenticated users, only for service role)
    const serviceClient = getServiceClient();
    const { data: updated, error: updateError } = await serviceClient
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        inspection_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[DELIVER_ORDER_FAILED]', { orderId: id, error: updateError.message });
      return NextResponse.json({ error: 'Failed to update order' }, { status: 400 });
    }

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
