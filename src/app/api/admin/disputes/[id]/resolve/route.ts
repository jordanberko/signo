import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { releaseFunds, refundBuyer } from '@/lib/stripe/escrow';
import { sendOpsAlert } from '@/lib/ops-alert';

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
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user;
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

    // Perform financial operation FIRST, before updating dispute status.
    // We track the financial-op type so any post-finance inconsistency
    // alert can name what was actually executed.
    let financialOpType: 'refund' | 'release' | null = null;

    if (resolution === 'resolved_refund' || resolution === 'resolved_return') {
      financialOpType = 'refund';
      const result = await refundBuyer(dispute.order_id);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      // refundBuyer's internal update (escrow.ts) already sets
      // orders.status='refunded'. This redundant update is preserved per
      // scope discipline; if it fails, alert because the inconsistency is
      // worth surfacing even if the side-effect is benign.
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({ status: 'refunded' })
        .eq('id', dispute.order_id);

      if (orderUpdateError) {
        console.error(
          '[API admin/disputes/resolve] orders.status update failed after refund:',
          { dispute_id: id, order_id: dispute.order_id, error: orderUpdateError }
        );
        await sendOpsAlert({
          title: `DB inconsistency after refund — order ${dispute.order_id}`,
          description:
            `Refund succeeded for order ${dispute.order_id} (dispute ${id}) but the orders.status ` +
            `update failed. The buyer has been refunded. orders.status may not reflect 'refunded'. ` +
            `Manual reconciliation needed via Supabase + the Stripe dashboard.`,
          context: {
            order_id: dispute.order_id,
            dispute_id: id,
            operation: 'orders.status_after_refund',
            error: orderUpdateError.message,
          },
          level: 'error',
        });
        return NextResponse.json(
          {
            error:
              'Refund completed but the order record could not be finalised. Ops have been alerted.',
          },
          { status: 500 }
        );
      }
    } else if (resolution === 'resolved_no_refund') {
      financialOpType = 'release';
      const result = await releaseFunds(dispute.order_id);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      // releaseFunds sets orders.status='completed' internally; no
      // redundant external update needed in this branch.
    }

    // Only update dispute status after financial operation succeeds.
    const { error: updateError } = await supabase
      .from('disputes')
      .update({
        status: resolution,
        resolution_notes: resolution_notes || null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error(
        '[API admin/disputes/resolve] dispute status update failed after financial op:',
        {
          dispute_id: id,
          order_id: dispute.order_id,
          financial_op: financialOpType,
          error: updateError,
        }
      );
      await sendOpsAlert({
        title: `DB inconsistency: dispute ${id} unresolved after ${financialOpType ?? 'finance op'}`,
        description:
          `Financial operation (${financialOpType ?? 'unknown'}) succeeded for order ${dispute.order_id} ` +
          `but the dispute status update failed. The dispute remains 'open' in the admin queue while ` +
          `money has moved. Manual reconciliation needed.`,
        context: {
          order_id: dispute.order_id,
          dispute_id: id,
          financial_op: financialOpType ?? 'none',
          resolution,
          error: updateError.message,
        },
        level: 'error',
      });
      return NextResponse.json(
        {
          error:
            'Financial operation completed but dispute could not be finalised. Ops have been alerted.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
