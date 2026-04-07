import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── PUT: Mark order as delivered (admin or artist) ──

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
      .select('id, artist_id, status')
      .eq('id', id)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.status !== 'shipped') {
      return NextResponse.json({ error: 'Order must be in shipped status to deliver' }, { status: 400 });
    }

    // Check user is admin or the artist
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    if (!isAdmin && user.id !== order.artist_id) {
      return NextResponse.json({ error: 'Not authorized to mark this order as delivered' }, { status: 403 });
    }

    // Update order
    const { data: updated, error: updateError } = await supabase
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
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
