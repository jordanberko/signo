import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { releaseFunds, refundBuyer } from '@/lib/stripe/escrow';

const VALID_RESOLUTIONS = ['resolved_refund', 'resolved_no_refund', 'resolved_return'];

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── PUT: Admin resolves a dispute ──

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { resolution, resolution_notes } = body;

    // Validate resolution
    if (!resolution || !VALID_RESOLUTIONS.includes(resolution)) {
      return NextResponse.json(
        { error: `Invalid resolution. Must be one of: ${VALID_RESOLUTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch dispute with order info
    const { data: dispute } = await supabase
      .from('disputes')
      .select('id, order_id')
      .eq('id', id)
      .single();

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // Update dispute
    const { error: updateError } = await supabase
      .from('disputes')
      .update({
        status: resolution,
        resolution_notes: resolution_notes || null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Handle resolution actions
    if (resolution === 'resolved_refund' || resolution === 'resolved_return') {
      const result = await refundBuyer(dispute.order_id);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      await supabase
        .from('orders')
        .update({ status: 'refunded' })
        .eq('id', dispute.order_id);
    } else if (resolution === 'resolved_no_refund') {
      const result = await releaseFunds(dispute.order_id);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
