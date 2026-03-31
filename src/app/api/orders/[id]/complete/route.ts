import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { releaseFunds } from '@/lib/stripe/escrow';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── PUT: Buyer manually completes order (releases funds early) ──

export async function PUT(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
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

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
