import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { refundBuyer } from '@/lib/stripe/escrow';
import { sendOpsAlert } from '@/lib/ops-alert';
import { sendReturnCompleteBuyer, sendReturnCompleteSeller } from '@/lib/email';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── POST: Seller confirms return receipt → triggers refund ──

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const serviceClient = getServiceClient();

    const { data: order } = await serviceClient
      .from('orders')
      .select('id, buyer_id, artist_id, artwork_id, status, total_amount_aud')
      .eq('id', id)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.artist_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    if (order.status !== 'return_in_transit') {
      return NextResponse.json(
        { error: 'Order must be in return_in_transit status to confirm receipt' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { condition_notes } = body;

    const { data: dispute } = await serviceClient
      .from('disputes')
      .select('id')
      .eq('order_id', id)
      .eq('status', 'return_in_transit')
      .single();

    if (!dispute) {
      return NextResponse.json(
        { error: 'No return-in-transit dispute found for this order' },
        { status: 400 }
      );
    }

    // Process the refund via Stripe
    const refundResult = await refundBuyer(id);
    if (!refundResult.success) {
      return NextResponse.json(
        { error: refundResult.error || 'Refund failed' },
        { status: 500 }
      );
    }

    // Update dispute to resolved_return
    const { error: disputeError } = await serviceClient
      .from('disputes')
      .update({
        status: 'resolved_return',
        resolved_at: new Date().toISOString(),
        return_received_at: new Date().toISOString(),
        ...(condition_notes?.trim()
          ? { return_received_condition_notes: condition_notes.trim() }
          : {}),
      })
      .eq('id', dispute.id);

    if (disputeError) {
      console.error('[RETURN_RECEIVED] Dispute update failed after refund:', disputeError);
      await sendOpsAlert({
        title: `DB inconsistency: refund succeeded but dispute ${dispute.id} not resolved`,
        description:
          `refundBuyer succeeded for order ${id} but the dispute status update to ` +
          `resolved_return failed. The buyer has been refunded. Manual reconciliation needed.`,
        context: {
          dispute_id: dispute.id,
          order_id: id,
          error: disputeError.message,
        },
        level: 'error',
      });
      return NextResponse.json(
        { error: 'Refund completed but dispute could not be finalised. Ops have been alerted.' },
        { status: 500 }
      );
    }

    // refundBuyer already sets order status to 'refunded', so no separate order update needed

    // Send emails to both parties
    const [buyerResult, sellerResult, artworkResult] = await Promise.all([
      serviceClient.from('profiles').select('email, full_name').eq('id', order.buyer_id).single(),
      serviceClient.from('profiles').select('email, full_name').eq('id', order.artist_id).single(),
      serviceClient.from('artworks').select('title').eq('id', order.artwork_id).single(),
    ]);

    const emailPromises: Promise<unknown>[] = [];

    if (buyerResult.data?.email) {
      emailPromises.push(
        sendReturnCompleteBuyer({
          buyerEmail: buyerResult.data.email,
          buyerName: buyerResult.data.full_name || '',
          orderId: id,
          artworkTitle: artworkResult.data?.title || 'Artwork',
          refundAmount: order.total_amount_aud || 0,
        }).catch((err) => {
          console.warn('[EMAIL_FAILED]', {
            type: 'return_complete_buyer',
            orderId: id,
            error: err instanceof Error ? err.message : String(err),
          });
        })
      );
    }

    if (sellerResult.data?.email) {
      emailPromises.push(
        sendReturnCompleteSeller({
          sellerEmail: sellerResult.data.email,
          sellerName: sellerResult.data.full_name || '',
          orderId: id,
          artworkTitle: artworkResult.data?.title || 'Artwork',
        }).catch((err) => {
          console.warn('[EMAIL_FAILED]', {
            type: 'return_complete_seller',
            orderId: id,
            error: err instanceof Error ? err.message : String(err),
          });
        })
      );
    }

    await Promise.all(emailPromises);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
