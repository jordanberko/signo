import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_DISPUTE_TYPES = ['damaged', 'not_as_described', 'not_received', 'other'];

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── POST: Buyer submits a dispute ──

export async function POST(request: Request, context: RouteContext) {
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
      .select('id, buyer_id, status, inspection_deadline')
      .eq('id', id)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'You are not the buyer for this order' }, { status: 403 });
    }
    if (order.status !== 'shipped' && order.status !== 'delivered') {
      return NextResponse.json({ error: 'Order must be in shipped or delivered status to dispute' }, { status: 400 });
    }

    // For delivered orders, validate inspection deadline hasn't passed
    if (order.status === 'delivered') {
      if (!order.inspection_deadline || new Date(order.inspection_deadline) <= new Date()) {
        return NextResponse.json({ error: 'Inspection deadline has passed' }, { status: 400 });
      }
    }

    // Note for disputes on shipped (not yet delivered) orders
    const notDeliveredNote = order.status === 'shipped'
      ? 'Note: Order has not been confirmed as delivered yet.'
      : null;

    const body = await request.json();
    const { type, description, evidence_images } = body;

    // Validate type
    if (!type || !VALID_DISPUTE_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid dispute type. Must be one of: ${VALID_DISPUTE_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate description
    if (!description || description.trim().length < 20) {
      return NextResponse.json({ error: 'Description must be at least 20 characters' }, { status: 400 });
    }

    // Validate evidence images for damaged type
    if (type === 'damaged' && (!evidence_images || !Array.isArray(evidence_images) || evidence_images.length < 1)) {
      return NextResponse.json({ error: 'At least one evidence image is required for damaged items' }, { status: 400 });
    }

    // Insert dispute atomically — rely on unique constraint on (order_id) to
    // prevent duplicates instead of a non-atomic check-then-insert pattern.
    const fullDescription = notDeliveredNote
      ? `[${notDeliveredNote}]\n\n${description.trim()}`
      : description.trim();

    const { data: dispute, error: insertError } = await supabase
      .from('disputes')
      .insert({
        order_id: id,
        raised_by: user.id,
        type,
        description: fullDescription,
        evidence_images: evidence_images || [],
      })
      .select()
      .single();

    if (insertError) {
      // Unique constraint violation — a dispute already exists for this order
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'A dispute already exists for this order' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Update order status to disputed
    await supabase
      .from('orders')
      .update({ status: 'disputed' })
      .eq('id', id);

    return NextResponse.json({ success: true, dispute });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
