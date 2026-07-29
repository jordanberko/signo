import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sendOrderConfirmation, sendNewSaleNotification } from '@/lib/email';
import { sendOpsAlert } from '@/lib/ops-alert';
import { resolveStripeFee } from '@/lib/stripe/fees';
import {
  isMissingColumnError,
  alertMissingMigration023,
} from '@/lib/supabase/schema-fallback';

// ── Webhook handler ──
//
// Response semantics (H3 — keep aligned with any future subscription
// webhook rewrite):
//
//   400   Signature verification failed (or missing sig header).
//         Stripe does NOT retry 400s, which is correct — a bad
//         signature never becomes a good signature on retry.
//
//   200   Event acknowledged. One of:
//           • event already present in processed_stripe_events
//           • unhandled event type (logged for audit)
//           • handler ran to completion and processed_stripe_events
//             insert succeeded
//
//   500   Processing failed (DB write error, thrown exception, or
//         processed_stripe_events insert failed). Stripe retries on
//         exponential backoff for up to 3 days.

// Use service role client to bypass RLS (webhooks are server-to-server)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_PAYMENT_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(
      '[Payment Webhook] Signature verification failed:',
      message
    );
    await sendOpsAlert({
      title: 'Stripe payment webhook signature verification failed',
      description:
        'An incoming payment webhook had an invalid signature. Likely causes: misrotated STRIPE_PAYMENT_WEBHOOK_SECRET, replay attack, or misconfigured endpoint URL in Stripe. Stripe is being told 400 (no retry).',
      context: { error: message },
      level: 'error',
    });
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // ── Idempotency check ──
  // If we've already processed this event (completed the handler AND
  // logged it to processed_stripe_events), acknowledge with 200 and
  // skip business logic. This is the definitive marker — we only
  // insert on success.
  try {
    const { data: alreadyProcessed, error: lookupError } = await supabase
      .from('processed_stripe_events')
      .select('event_id')
      .eq('event_id', event.id)
      .maybeSingle();

    if (lookupError) {
      console.error(
        '[Payment Webhook] Idempotency lookup failed:',
        lookupError
      );
      return NextResponse.json(
        { error: 'Idempotency lookup failed' },
        { status: 500 }
      );
    }

    if (alreadyProcessed) {
      console.log(
        `[Payment Webhook] Event ${event.id} (${event.type}) already processed, acknowledging`
      );
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch (err) {
    console.error('[Payment Webhook] Idempotency lookup exception:', err);
    return NextResponse.json(
      { error: 'Idempotency lookup exception' },
      { status: 500 }
    );
  }

  // ── Event dispatch ──
  // Handlers throw on unrecoverable write errors. The outer try/catch
  // maps those to HTTP 500. Handlers return normally on "nothing to
  // do" conditions (missing metadata, no-op branches) so the event
  // still gets logged to processed_stripe_events and Stripe stops
  // retrying.
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event, supabase);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event, supabase);
        break;

      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event, supabase);
        break;

      case 'charge.dispute.created':
        await handleChargeDisputeCreated(event, supabase);
        break;

      case 'charge.dispute.closed':
        await handleChargeDisputeClosed(event, supabase);
        break;

      default:
        // Unhandled event types are acknowledged so Stripe stops
        // retrying. Logged at info level for audit.
        console.log(
          `[Payment Webhook] Unhandled event type: ${event.type} (id=${event.id})`
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(
      `[Payment Webhook] Processing error for event ${event.id} (${event.type}):`,
      message,
      stack
    );
    return NextResponse.json(
      { error: `Webhook processing failed: ${message}` },
      { status: 500 }
    );
  }

  // ── Mark as processed ──
  // Log this event so duplicate deliveries short-circuit above.
  // If this insert fails we return 500 and Stripe retries — the
  // business logic above is idempotent (existingOrder check,
  // status-filtered artwork update) so retrying is safe.
  try {
    const { error: logError } = await supabase
      .from('processed_stripe_events')
      .insert({ event_id: event.id, event_type: event.type });

    if (logError) {
      // If the failure is "already exists" (race between concurrent
      // deliveries), that's acceptable — treat as success.
      if (logError.code === '23505') {
        console.log(
          `[Payment Webhook] Event ${event.id} inserted concurrently, acknowledging`
        );
        return NextResponse.json({ received: true, duplicate: true });
      }
      console.error(
        `[Payment Webhook] Failed to log event ${event.id}:`,
        logError
      );
      return NextResponse.json(
        { error: 'Failed to log processed event' },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error(
      `[Payment Webhook] Exception logging event ${event.id}:`,
      err
    );
    return NextResponse.json(
      { error: 'Exception logging processed event' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

// ────────────────────────────────────────────────────────────────────
// Handlers
// ────────────────────────────────────────────────────────────────────

async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;

  // Only handle payment mode (not subscription — those go to the
  // subscription webhook). This is a "nothing to do" case, not an
  // error.
  if (session.mode !== 'payment') return;

  const meta = session.metadata || {};
  const artworkId = meta.signo_artwork_id;
  const buyerId = meta.signo_buyer_id;
  const artistId = meta.signo_artist_id;
  const totalAud = parseFloat(meta.signo_total_aud || '0');
  const shippingCostAud = parseFloat(
    meta.signo_shipping_cost_aud || '0'
  );
  const shippingAddress = meta.signo_shipping_address
    ? JSON.parse(meta.signo_shipping_address)
    : null;

  if (!artworkId || !buyerId || !artistId) {
    // Permanent failure — no retry will help. Log loudly so ops can
    // investigate the payment manually. Acknowledge (return normally)
    // so Stripe stops retrying.
    console.warn(
      `[Payment Webhook] Missing metadata in checkout session ${session.id}`,
      { artworkId, buyerId, artistId }
    );
    return;
  }

  // Soft idempotency: if an order already exists for this payment
  // intent (e.g. this event is being retried after a prior
  // processed_stripe_events-insert failure), skip creation.
  const { data: existingOrder, error: existingErr } = await supabase
    .from('orders')
    .select('id')
    .eq('stripe_payment_intent_id', session.payment_intent as string)
    .maybeSingle();

  if (existingErr) {
    throw new Error(
      `Failed to look up existing order: ${existingErr.message}`
    );
  }

  if (existingOrder) {
    console.log(
      `[Payment Webhook] Order already exists for payment ${session.payment_intent}, skipping creation`
    );
    return;
  }

  // Calculate fees — zero commission, only Stripe processing.
  // Read the ACTUAL fee off the charge's balance transaction rather than
  // assuming the AU domestic rate; international cards cost roughly twice
  // as much and the difference came straight out of Signo's margin.
  const { feeAud: stripeFee, source: feeSource } = await resolveStripeFee(
    session.payment_intent as string | null,
    totalAud,
    { artwork_id: artworkId, buyer_id: buyerId }
  );
  const artistPayout = Math.round((totalAud - stripeFee) * 100) / 100;

  // Create the order — throw on DB error so outer handler returns 500
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      buyer_id: buyerId,
      artwork_id: artworkId,
      artist_id: artistId,
      total_amount_aud: totalAud,
      shipping_cost_aud: shippingCostAud,
      platform_fee_aud: 0, // Zero commission
      artist_payout_aud: artistPayout,
      stripe_payment_intent_id: session.payment_intent as string,
      status: 'paid',
      shipping_address: shippingAddress,
    })
    .select('id')
    .single();

  if (orderError || !order) {
    throw new Error(
      `Failed to create order: ${orderError?.message ?? 'no row returned'}`
    );
  }

  // Mark artwork as sold — throw on DB error.
  // Status-filtered: only a reserved/approved work becomes sold. If the
  // work is ALREADY sold, a second buyer has paid for the same one-off
  // original (possible when a reservation was released while their
  // Stripe session was still live). We must not silently overwrite —
  // alert loudly so the duplicate can be refunded.
  const markSold = (clearReservation: boolean) =>
    supabase
      .from('artworks')
      .update(
        clearReservation
          ? {
              status: 'sold',
              reserved_by: null,
              reserved_at: null,
              reserved_session_id: null,
            }
          : { status: 'sold' }
      )
      .eq('id', artworkId)
      .in('status', ['reserved', 'approved'])
      .select('id');

  let { data: soldRows, error: artworkErr } = await markSold(true);

  // Pre-023 database: retry without the reservation columns so a paid
  // order still completes. See lib/supabase/schema-fallback.ts.
  if (isMissingColumnError(artworkErr)) {
    await alertMissingMigration023(
      'The payment webhook sold-flip',
      artworkErr?.message ?? 'missing reservation column'
    );
    ({ data: soldRows, error: artworkErr } = await markSold(false));
  }

  if (!artworkErr && (!soldRows || soldRows.length === 0)) {
    await sendOpsAlert({
      title: 'DOUBLE SALE — artwork was already sold when this payment landed',
      description:
        `Order ${order.id} was created for an artwork that is no longer reservable (already sold or withdrawn). The buyer HAS BEEN CHARGED. Refund this order immediately unless the artist can supply another piece — a one-off original cannot ship twice.`,
      context: {
        order_id: order.id,
        artwork_id: artworkId,
        buyer_id: buyerId,
        artist_id: artistId,
        amount_aud: totalAud,
      },
      level: 'error',
    });
  }

  if (artworkErr) {
    throw new Error(
      `Failed to flip artwork ${artworkId} to sold: ${artworkErr.message}`
    );
  }

  console.log(
    `[Payment Webhook] Order created: ${order.id} | Artwork: ${artworkId} | Total: $${totalAud} | Stripe fee: $${stripeFee} (${feeSource}) | Artist receives: $${artistPayout}`
  );

  // ── Send email notifications ──
  // These are awaited so the serverless function doesn't tear down
  // the HTTP connection to Resend mid-flight. Failures are caught
  // locally and logged — they must NOT throw out of this handler,
  // because the order row + artwork flip have already committed and
  // a non-2xx here would make Stripe retry (which would re-run email
  // sends — the existingOrder guard prevents duplicate orders, not
  // duplicate emails).
  // allSettled, not all: the order is already committed above, so a
  // single rejected fetch (network-level throw) must not abort the
  // whole email block — emails are best-effort per recipient.
  const [buyerSettled, artistSettled, artworkSettled] = await Promise.allSettled([
    supabase.from('profiles').select('email, full_name').eq('id', buyerId).single(),
    supabase.from('profiles').select('email, full_name').eq('id', artistId).single(),
    supabase.from('artworks').select('title, images').eq('id', artworkId).single(),
  ]);

  const buyer = buyerSettled.status === 'fulfilled' ? buyerSettled.value.data : null;
  const artist = artistSettled.status === 'fulfilled' ? artistSettled.value.data : null;
  const artwork = artworkSettled.status === 'fulfilled' ? artworkSettled.value.data : null;

  if (buyer?.email) {
    try {
      const result = await sendOrderConfirmation({
        buyerEmail: buyer.email,
        buyerName: buyer.full_name || '',
        orderId: order.id,
        artworkTitle: artwork?.title || 'Artwork',
        artistName: artist?.full_name || 'Artist',
        artworkImageUrl: artwork?.images?.[0] || undefined,
        totalAmount: totalAud,
      });
      if (!result.success) {
        console.warn('[EMAIL_FAILED]', {
          type: 'order_confirmation',
          orderId: order.id,
          recipient: buyer.email,
          error: result.error || 'unknown',
        });
        await sendOpsAlert({
          title: 'Order confirmation email failed',
          description:
            `Order ${order.id} was created and the artwork is marked sold, but the buyer's confirmation email did not send. Buyer may not know the order succeeded.`,
          context: {
            order_id: order.id,
            recipient: buyer.email,
            error: result.error || 'unknown',
          },
          level: 'error',
        });
      }
    } catch (err) {
      console.warn('[EMAIL_FAILED]', {
        type: 'order_confirmation',
        orderId: order.id,
        recipient: buyer.email,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (artist?.email) {
    try {
      const result = await sendNewSaleNotification({
        artistEmail: artist.email,
        artistName: artist.full_name || '',
        orderId: order.id,
        artworkTitle: artwork?.title || 'Artwork',
        salePrice: totalAud,
        artistPayout,
        buyerCity: shippingAddress?.city,
        buyerState: shippingAddress?.state,
      });
      if (!result.success) {
        console.warn('[EMAIL_FAILED]', {
          type: 'new_sale_notification',
          orderId: order.id,
          recipient: artist.email,
          error: result.error || 'unknown',
        });
        await sendOpsAlert({
          title: 'New sale notification email failed',
          description:
            `Order ${order.id} committed and artwork sold, but the artist's new-sale email did not send. Artist may not know to ship until they check the orders page.`,
          context: {
            order_id: order.id,
            recipient: artist.email,
            error: result.error || 'unknown',
          },
          level: 'error',
        });
      }
    } catch (err) {
      console.warn('[EMAIL_FAILED]', {
        type: 'new_sale_notification',
        orderId: order.id,
        recipient: artist.email,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

async function handlePaymentIntentFailed(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const errMessage = paymentIntent.last_payment_error?.message;
  console.error(
    `[Payment Webhook] Payment failed: ${paymentIntent.id}`,
    errMessage
  );
  await sendOpsAlert({
    title: 'Stripe payment intent failed',
    description:
      `A buyer's payment was declined by Stripe. The buyer was not charged. Common causes: insufficient funds, fraud flag, 3DS challenge failure. No order created; nothing to retry.`,
    context: {
      payment_intent: paymentIntent.id,
      error: errMessage || 'unknown',
      decline_code: paymentIntent.last_payment_error?.decline_code || '',
    },
    level: 'warn',
  });
  // Don't create an order — the payment didn't go through. Nothing to
  // retry, nothing to write; acknowledging is correct.
}

/**
 * A refund issued directly from the Stripe Dashboard (rather than via
 * the app's dispute-resolution flow, which updates the order itself)
 * previously bypassed order state entirely — the money went back but
 * orders.status still said paid/shipped. Sync it here.
 *
 * Idempotent: an order already refunded or cancelled is left alone.
 * Partial refunds are recorded as refunded too — Signo sells one-off
 * originals, so any refund means the sale is off.
 */
async function handleChargeRefunded(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<void> {
  const charge = event.data.object as Stripe.Charge;
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) {
    console.warn(
      `[Payment Webhook] charge.refunded ${charge.id} has no payment_intent; skipping`
    );
    return;
  }

  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('id, status, artwork_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (findError) {
    // Throwing makes the outer handler return 500 so Stripe retries —
    // a transient DB failure must not permanently desync order state.
    throw new Error(
      `charge.refunded: order lookup failed for ${paymentIntentId}: ${findError.message}`
    );
  }

  if (!order) {
    console.log(
      `[Payment Webhook] charge.refunded ${charge.id}: no order for payment_intent ${paymentIntentId} (likely a non-order charge)`
    );
    return;
  }

  if (order.status === 'refunded' || order.status === 'cancelled') {
    return; // already reflected — e.g. refund initiated via the app flow
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'refunded' })
    .eq('id', order.id);

  if (updateError) {
    throw new Error(
      `charge.refunded: failed to mark order ${order.id} refunded: ${updateError.message}`
    );
  }

  console.log(
    `[Payment Webhook] Order ${order.id} marked refunded via dashboard refund ${charge.id}`
  );
  await sendOpsAlert({
    title: 'Order refunded via Stripe Dashboard',
    description:
      `A refund was issued outside the app flow (Stripe Dashboard or API). The order is now marked refunded. Check whether the artwork should be relisted — this handler does not change artwork status.`,
    context: {
      order_id: order.id,
      artwork_id: order.artwork_id,
      charge: charge.id,
      payment_intent: paymentIntentId,
    },
    level: 'warn',
  });
}

/**
 * A card chargeback. The buyer went to their bank instead of using the app's
 * dispute flow, so nothing in Signo knows about it — and the escrow cron
 * would happily pay the artist out of funds Stripe is about to claw back,
 * leaving Signo down both the sale and the dispute fee.
 *
 * Moving the order to 'disputed' takes it out of the auto-release query
 * (which only looks at 'delivered'), freezing the payout until an admin
 * resolves it.
 */
async function handleChargeDisputeCreated(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<void> {
  const dispute = event.data.object as Stripe.Dispute;
  const paymentIntentId =
    typeof dispute.payment_intent === 'string'
      ? dispute.payment_intent
      : dispute.payment_intent?.id;

  if (!paymentIntentId) {
    console.warn(
      `[Payment Webhook] charge.dispute.created ${dispute.id} has no payment_intent; skipping`
    );
    return;
  }

  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('id, status, artwork_id, buyer_id, artist_id, payout_released_at, total_amount_aud')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (findError) {
    throw new Error(
      `charge.dispute.created: order lookup failed for ${paymentIntentId}: ${findError.message}`
    );
  }

  if (!order) {
    console.log(
      `[Payment Webhook] charge.dispute.created ${dispute.id}: no order for payment_intent ${paymentIntentId}`
    );
    return;
  }

  const evidenceDue = dispute.evidence_details?.due_by
    ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
    : null;

  // Freeze the payout unless the order is already settled. 'refunded' and
  // 'cancelled' need no freeze; 'completed' means the money is already gone
  // and the alert below is the whole point.
  let frozen = false;
  if (!['completed', 'refunded', 'cancelled', 'disputed'].includes(order.status)) {
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({ status: 'disputed' })
      .eq('id', order.id)
      .not('status', 'in', '(completed,refunded,cancelled)')
      .select('id');

    if (updateError) {
      // Retry via Stripe rather than leave a live payout unfrozen.
      throw new Error(
        `charge.dispute.created: failed to freeze order ${order.id}: ${updateError.message}`
      );
    }
    frozen = !!updated && updated.length > 0;
  }

  const alreadyPaidOut = !!order.payout_released_at;

  await sendOpsAlert({
    title: alreadyPaidOut
      ? 'CHARGEBACK ON AN ALREADY-PAID ORDER'
      : 'Chargeback opened — escrow payout frozen',
    description: alreadyPaidOut
      ? `The buyer raised a card chargeback on order ${order.id}, but the artist was already paid at ` +
        `${order.payout_released_at}. Stripe will debit Signo for the disputed amount plus the ` +
        `dispute fee. Submit evidence in Stripe and decide whether to reverse the artist's transfer.`
      : `The buyer raised a card chargeback on order ${order.id} instead of using the in-app dispute ` +
        `flow. The order is now 'disputed' so the escrow cron will not release funds. Submit evidence ` +
        `in Stripe before the deadline — an unanswered chargeback is lost by default.`,
    context: {
      order_id: order.id,
      dispute_id: dispute.id,
      reason: dispute.reason,
      stripe_status: dispute.status,
      amount_aud: order.total_amount_aud,
      artwork_id: order.artwork_id,
      buyer_id: order.buyer_id,
      artist_id: order.artist_id,
      previous_order_status: order.status,
      payout_frozen: frozen ? 'yes' : 'no change needed',
      evidence_due_by: evidenceDue,
    },
    level: 'error',
  });

  console.log(
    `[Payment Webhook] Chargeback ${dispute.id} on order ${order.id} (was '${order.status}', frozen: ${frozen})`
  );
}

/**
 * Chargeback resolved by the card network. Purely informational — Stripe has
 * already moved the money either way, and whether the artwork should be
 * relisted or the artist still paid is an admin decision.
 */
async function handleChargeDisputeClosed(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<void> {
  const dispute = event.data.object as Stripe.Dispute;
  const paymentIntentId =
    typeof dispute.payment_intent === 'string'
      ? dispute.payment_intent
      : dispute.payment_intent?.id;

  if (!paymentIntentId) return;

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, artwork_id, total_amount_aud')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (!order) return;

  const won = dispute.status === 'won';

  await sendOpsAlert({
    title: won ? 'Chargeback won' : `Chargeback closed: ${dispute.status}`,
    description: won
      ? `Signo won the chargeback on order ${order.id}. The funds have been returned. Decide whether ` +
        `the order should resume (release the payout) or stay disputed.`
      : `The chargeback on order ${order.id} closed as '${dispute.status}'. If it was lost, the funds ` +
        `and the dispute fee have been debited from Signo. The order is still '${order.status}' — set ` +
        `it to refunded and relist or withdraw the artwork as appropriate.`,
    context: {
      order_id: order.id,
      dispute_id: dispute.id,
      stripe_status: dispute.status,
      order_status: order.status,
      artwork_id: order.artwork_id,
      amount_aud: order.total_amount_aud,
    },
    level: won ? 'warn' : 'error',
  });
}

async function handleCheckoutSessionExpired(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<void> {
  const expiredSession = event.data.object as Stripe.Checkout.Session;
  const expiredArtworkId = expiredSession.metadata?.signo_artwork_id;

  if (!expiredArtworkId) return;

  // Release the reservation — only if still reserved (not already
  // sold). The status filter makes this idempotent: on retry, if the
  // artwork is already back to 'approved' or has been sold, this
  // matches zero rows and succeeds as a no-op.
  const release = (clearReservation: boolean) =>
    supabase
      .from('artworks')
      .update(
        clearReservation
          ? {
              status: 'approved',
              reserved_by: null,
              reserved_at: null,
              reserved_session_id: null,
            }
          : { status: 'approved' }
      )
      .eq('id', expiredArtworkId)
      .eq('status', 'reserved')
      .select('id');

  let { data: reverted, error } = await release(true);

  if (isMissingColumnError(error)) {
    await alertMissingMigration023(
      'The expired-checkout reservation release',
      error?.message ?? 'missing reservation column'
    );
    ({ data: reverted, error } = await release(false));
  }

  if (error) {
    throw new Error(
      `Failed to release reservation for artwork ${expiredArtworkId}: ${error.message}`
    );
  }

  if (reverted && reverted.length > 0) {
    console.log(
      `[Payment Webhook] Released reservation for artwork: ${expiredArtworkId}`
    );
  }
}
