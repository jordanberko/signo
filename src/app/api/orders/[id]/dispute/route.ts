import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { sendOpsAlert } from '@/lib/ops-alert';
import {
  sendDisputeAcknowledgementEmail,
  sendDisputeRaisedArtist,
} from '@/lib/email';

const VALID_DISPUTE_TYPES = ['damaged', 'not_as_described', 'not_received', 'other'];

/**
 * Service-role client for the order status transition.
 *
 * `orders` deliberately has NO update policy for authenticated users —
 * only admins and the service role (001_initial_schema.sql:250). The
 * buyer's `status = 'disputed'` write therefore matched zero rows
 * silently, leaving the order at `delivered` so the hourly escrow cron
 * released funds to the artist 48h later. After that `refundBuyer`
 * refuses (order is `completed`) and there is no clawback — a
 * guaranteed loss on the first real dispute.
 */
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── POST: Buyer submits a dispute ──

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Auth check
    // getUser() revalidates the JWT with the auth server (money endpoint).
    const { data: { user } } = await supabase.auth.getUser();
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
    const { type, description, evidence_images, evidence_video } = body;

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

    const hasVideo = typeof evidence_video === 'string' && evidence_video.length > 0;
    const insertRow = (withVideo: boolean) =>
      supabase
        .from('disputes')
        .insert({
          order_id: id,
          raised_by: user.id,
          type,
          description: fullDescription,
          evidence_images: evidence_images || [],
          ...(withVideo ? { evidence_video } : {}),
        })
        .select()
        .single();

    let { data: dispute, error: insertError } = await insertRow(hasVideo);

    // Pre-migration-024 tolerance: if evidence_video isn't a column yet, the
    // buyer's dispute must still be recorded (never block a damage claim on a
    // schema gap). Retry without it and alert so the video isn't quietly
    // lost. Once 024 is applied this branch never runs.
    if (hasVideo && (insertError?.code === 'PGRST204' || insertError?.code === '42703')) {
      console.error(
        '[Dispute] evidence_video column missing (migration 024 unapplied) — recording dispute without the video URL'
      );
      await sendOpsAlert({
        title: 'Dispute video evidence could not be stored (migration 024 unapplied)',
        description:
          `A buyer submitted a dispute with a video walkthrough, but the disputes.evidence_video ` +
          `column does not exist yet, so the video reference was NOT saved. The file is in the ` +
          `dispute-evidence bucket but the admin queue can't link to it. Apply migration 024, then ` +
          `attach this video to the dispute by hand.`,
        context: { order_id: id, evidence_video: String(evidence_video).slice(0, 400) },
        level: 'error',
      });
      ({ data: dispute, error: insertError } = await insertRow(false));
    }

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

    if (!dispute) {
      // No error but no row — shouldn't happen with .single(); guard so the
      // rest of the handler can rely on a non-null dispute.
      return NextResponse.json({ error: 'Failed to create dispute' }, { status: 500 });
    }

    // ── Move the order to `disputed` (service role — see note above) ──
    // This is the write that pauses escrow: autoReleaseFunds only selects
    // status='delivered', so if this fails the artist gets paid anyway.
    // Status-filtered so we never clobber a terminal state.
    const serviceClient = getServiceClient();
    const { data: statusUpdated, error: statusError } = await serviceClient
      .from('orders')
      .update({ status: 'disputed' })
      .eq('id', id)
      .in('status', ['shipped', 'delivered'])
      .select('id');

    if (statusError || !statusUpdated || statusUpdated.length === 0) {
      // The dispute row exists but escrow is NOT paused. This needs
      // human action before the 48h inspection window elapses.
      console.error('[Dispute] CRITICAL: order status not moved to disputed', {
        orderId: id,
        error: statusError?.message,
        matched: statusUpdated?.length ?? 0,
      });
      await sendOpsAlert({
        title: 'Dispute raised but order status NOT updated — escrow not paused',
        description:
          `A dispute row was created but the order could not be moved to 'disputed'. Escrow auto-release only skips disputed orders, so the artist may be paid before this is resolved. Move the order to 'disputed' manually NOW.`,
        context: {
          order_id: id,
          dispute_id: dispute.id,
          buyer_id: user.id,
          error: statusError?.message || 'no matching row (unexpected status)',
        },
        level: 'error',
      });
    }

    // ── Notify: buyer acknowledgement + ops ──
    // Best-effort; the dispute is already recorded so a mail failure must
    // not fail the request.
    try {
      const { data: orderCtx } = await serviceClient
        .from('orders')
        .select(
          'artwork_id, artworks!orders_artwork_id_fkey(title, profiles!artworks_artist_id_fkey(full_name)), buyer:profiles!orders_buyer_id_fkey(email, full_name), artist:profiles!orders_artist_id_fkey(email, full_name)'
        )
        .eq('id', id)
        .single();

      const artworkCtx = orderCtx?.artworks as
        | { title?: string; profiles?: { full_name?: string } | null }
        | null;
      const buyerCtx = orderCtx?.buyer as
        | { email?: string; full_name?: string }
        | null;
      const artistCtx = orderCtx?.artist as
        | { email?: string; full_name?: string }
        | null;

      if (buyerCtx?.email) {
        await sendDisputeAcknowledgementEmail({
          buyerEmail: buyerCtx.email,
          buyerName: buyerCtx.full_name || '',
          artworkTitle: artworkCtx?.title || 'your artwork',
          artistName: artworkCtx?.profiles?.full_name || 'the artist',
          orderId: id,
          disputeReason: type,
        });
      }

      // Notify the artist — their sale is now on hold and the payout is
      // paused. Previously the artist learned nothing until an admin acted,
      // which for a shipped piece could be days. A failed send is non-fatal.
      if (artistCtx?.email) {
        try {
          await sendDisputeRaisedArtist({
            artistEmail: artistCtx.email,
            artistName: artistCtx.full_name || '',
            artworkTitle: artworkCtx?.title || 'your artwork',
            orderId: id,
            disputeReason: type,
          });
        } catch (artistMailErr) {
          console.warn('[Dispute] Artist notification failed (non-fatal):', artistMailErr);
        }
      }

      await sendOpsAlert({
        title: `Dispute raised — ${type}`,
        description:
          `A buyer raised a dispute. Escrow is paused; review in the admin dispute queue. Note the 14-day resolution expectation set in the buyer's acknowledgement email.`,
        context: {
          order_id: id,
          dispute_id: dispute.id,
          type,
          artwork: artworkCtx?.title || null,
          evidence_images: (evidence_images || []).length,
        },
        level: 'warn',
      });
    } catch (notifyErr) {
      console.error('[Dispute] Notification failure (non-fatal):', notifyErr);
    }

    return NextResponse.json({ success: true, dispute });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
