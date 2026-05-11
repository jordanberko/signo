import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { releaseFunds, refundBuyer } from '@/lib/stripe/escrow';
import { sendOpsAlert } from '@/lib/ops-alert';
import { sendReturnApprovedToBuyer, sendReturnApprovedToSeller } from '@/lib/email';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const VALID_RESOLUTIONS = ['resolved_refund', 'resolved_no_refund', 'resolved_return', 'approve_return'];

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
      .select('id, order_id, status')
      .eq('id', id)
      .single();

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // ── Approve return (multi-step flow, no immediate refund) ──
    if (resolution === 'approve_return') {
      if (dispute.status !== 'open' && dispute.status !== 'under_review') {
        return NextResponse.json(
          { error: 'Dispute must be open or under review to approve a return' },
          { status: 400 }
        );
      }

      const { return_address, return_shipping_payer, return_window_days } = body;

      if (!return_address?.trim()) {
        return NextResponse.json({ error: 'Return address is required' }, { status: 400 });
      }
      if (!['buyer', 'seller', 'split'].includes(return_shipping_payer)) {
        return NextResponse.json({ error: 'Return shipping payer must be buyer, seller, or split' }, { status: 400 });
      }

      const windowDays = return_window_days ?? 14;
      const serviceClient = getServiceClient();

      const { error: disputeUpdateError } = await serviceClient
        .from('disputes')
        .update({
          status: 'return_pending',
          resolution_notes: resolution_notes || null,
          return_address: return_address.trim(),
          return_shipping_payer,
          return_window_days: windowDays,
          return_approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (disputeUpdateError) {
        console.error('[API admin/disputes/resolve] approve_return dispute update failed:', disputeUpdateError);
        return NextResponse.json({ error: 'Failed to update dispute' }, { status: 500 });
      }

      const { error: orderUpdateError } = await serviceClient
        .from('orders')
        .update({ status: 'return_pending' })
        .eq('id', dispute.order_id);

      if (orderUpdateError) {
        console.error('[API admin/disputes/resolve] approve_return order update failed:', orderUpdateError);
        await sendOpsAlert({
          title: `DB inconsistency: dispute ${id} return_pending but order not updated`,
          description:
            `Dispute ${id} moved to return_pending but the order status update for ` +
            `${dispute.order_id} failed. Manual reconciliation needed.`,
          context: { dispute_id: id, order_id: dispute.order_id, error: orderUpdateError.message },
          level: 'error',
        });
        return NextResponse.json({ error: 'Dispute updated but order could not be updated. Ops have been alerted.' }, { status: 500 });
      }

      // Fetch order, then buyer/seller/artwork in parallel
      const { data: order } = await serviceClient
        .from('orders')
        .select('buyer_id, artist_id, artwork_id')
        .eq('id', dispute.order_id)
        .single();

      const [buyerResult, sellerResult, artworkResult] = order
        ? await Promise.all([
            serviceClient.from('profiles').select('email, full_name').eq('id', order.buyer_id).single(),
            serviceClient.from('profiles').select('email, full_name').eq('id', order.artist_id).single(),
            serviceClient.from('artworks').select('title').eq('id', order.artwork_id).single(),
          ])
        : [{ data: null }, { data: null }, { data: null }];

      const shippingPayerLabel =
        return_shipping_payer === 'buyer' ? 'you (the buyer)' :
        return_shipping_payer === 'seller' ? 'the seller' : 'split between you and the seller';

      // Fire emails (non-blocking)
      const emailPromises: Promise<unknown>[] = [];

      if (buyerResult.data?.email) {
        emailPromises.push(
          sendReturnApprovedToBuyer({
            buyerEmail: buyerResult.data.email,
            buyerName: buyerResult.data.full_name || '',
            orderId: dispute.order_id,
            artworkTitle: artworkResult.data?.title || 'Artwork',
            returnAddress: return_address.trim(),
            shippingPayer: shippingPayerLabel,
            returnWindowDays: windowDays,
          }).catch((err) => {
            console.warn('[EMAIL_FAILED]', { type: 'return_approved_buyer', orderId: dispute.order_id, error: err instanceof Error ? err.message : String(err) });
          })
        );
      }

      if (sellerResult.data?.email) {
        emailPromises.push(
          sendReturnApprovedToSeller({
            sellerEmail: sellerResult.data.email,
            sellerName: sellerResult.data.full_name || '',
            orderId: dispute.order_id,
            artworkTitle: artworkResult.data?.title || 'Artwork',
            buyerName: buyerResult.data?.full_name || 'The buyer',
          }).catch((err) => {
            console.warn('[EMAIL_FAILED]', { type: 'return_approved_seller', orderId: dispute.order_id, error: err instanceof Error ? err.message : String(err) });
          })
        );
      }

      await Promise.all(emailPromises);

      return NextResponse.json({ success: true });
    }

    // ── Immediate resolutions (existing logic) ──

    let financialOpType: 'refund' | 'release' | null = null;

    if (resolution === 'resolved_refund' || resolution === 'resolved_return') {
      financialOpType = 'refund';
      const result = await refundBuyer(dispute.order_id);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

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
    }

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
