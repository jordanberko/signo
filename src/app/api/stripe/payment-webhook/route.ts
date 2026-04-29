import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sendOrderConfirmation, sendNewSaleNotification } from '@/lib/email';
import { sendOpsAlert } from '@/lib/ops-alert';
import { calculateStripeFee } from '@/lib/utils';

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

      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event, supabase);
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

  // Calculate fees — zero commission, only Stripe processing
  const stripeFee = calculateStripeFee(totalAud);
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

  // Mark artwork as sold — throw on DB error
  const { error: artworkErr } = await supabase
    .from('artworks')
    .update({ status: 'sold' })
    .eq('id', artworkId);

  if (artworkErr) {
    throw new Error(
      `Failed to flip artwork ${artworkId} to sold: ${artworkErr.message}`
    );
  }

  console.log(
    `[Payment Webhook] Order created: ${order.id} | Artwork: ${artworkId} | Total: $${totalAud} | Artist receives: $${artistPayout}`
  );

  // ── Send email notifications ──
  // These are awaited so the serverless function doesn't tear down
  // the HTTP connection to Resend mid-flight. Failures are caught
  // locally and logged — they must NOT throw out of this handler,
  // because the order row + artwork flip have already committed and
  // a non-2xx here would make Stripe retry (which would re-run email
  // sends — the existingOrder guard prevents duplicate orders, not
  // duplicate emails).
  const [buyerResult, artistResult, artworkResult] = await Promise.all([
    supabase.from('profiles').select('email, full_name').eq('id', buyerId).single(),
    supabase.from('profiles').select('email, full_name').eq('id', artistId).single(),
    supabase.from('artworks').select('title, images').eq('id', artworkId).single(),
  ]);

  const buyer = buyerResult.data;
  const artist = artistResult.data;
  const artwork = artworkResult.data;

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
  const { data: reverted, error } = await supabase
    .from('artworks')
    .update({ status: 'approved' })
    .eq('id', expiredArtworkId)
    .eq('status', 'reserved')
    .select('id');

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
