import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/config';
import { createClient } from '@supabase/supabase-js';
import { sendOrderConfirmation, sendNewSaleNotification } from '@/lib/email';
import { calculateStripeFee } from '@/lib/utils';

// Use service role client to bypass RLS (webhooks are server-to-server)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Webhook handler ──

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
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  try {
    switch (event.type) {
      // ── Checkout completed (payment successful) ──
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Only handle payment mode (not subscription)
        if (session.mode !== 'payment') break;

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
          console.warn(
            '[Payment Webhook] Missing metadata in checkout session:',
            session.id
          );
          break;
        }

        // Check if order already exists (idempotency)
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('stripe_payment_intent_id', session.payment_intent as string)
          .single();

        if (existingOrder) {
          console.log(
            '[Payment Webhook] Order already exists for payment:',
            session.payment_intent
          );
          break;
        }

        // Calculate fees — zero commission, only Stripe processing
        const stripeFee = calculateStripeFee(totalAud);
        const artistPayout = Math.round((totalAud - stripeFee) * 100) / 100;

        // Create the order
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

        if (orderError) {
          console.error(
            '[Payment Webhook] Failed to create order:',
            orderError
          );
          break;
        }

        // Mark artwork as sold
        await supabase
          .from('artworks')
          .update({ status: 'sold' })
          .eq('id', artworkId);

        console.log(
          `[Payment Webhook] Order created: ${order.id} | Artwork: ${artworkId} | Total: $${totalAud} | Artist receives: $${artistPayout}`
        );

        // ── Send email notifications (fire-and-forget) ──
        // Fetch buyer, artist, and artwork details for the emails
        const [buyerResult, artistResult, artworkResult] = await Promise.all([
          supabase.from('profiles').select('email, full_name').eq('id', buyerId).single(),
          supabase.from('profiles').select('email, full_name').eq('id', artistId).single(),
          supabase.from('artworks').select('title, images').eq('id', artworkId).single(),
        ]);

        const buyer = buyerResult.data;
        const artist = artistResult.data;
        const artwork = artworkResult.data;

        // Order confirmation to buyer
        if (buyer?.email) {
          sendOrderConfirmation({
            buyerEmail: buyer.email,
            buyerName: buyer.full_name || '',
            orderId: order.id,
            artworkTitle: artwork?.title || 'Artwork',
            artistName: artist?.full_name || 'Artist',
            artworkImageUrl: artwork?.images?.[0] || undefined,
            totalAmount: totalAud,
          }).catch((err) => console.warn('[EMAIL_FAILED]', { type: 'order_confirmation', orderId: order.id, recipient: buyer.email, error: err?.message }));
        }

        // New sale notification to artist
        if (artist?.email) {
          sendNewSaleNotification({
            artistEmail: artist.email,
            artistName: artist.full_name || '',
            orderId: order.id,
            artworkTitle: artwork?.title || 'Artwork',
            salePrice: totalAud,
            artistPayout,
            buyerCity: shippingAddress?.city,
            buyerState: shippingAddress?.state,
          }).catch((err) => console.warn('[EMAIL_FAILED]', { type: 'new_sale_notification', orderId: order.id, recipient: artist.email, error: err?.message }));
        }

        break;
      }

      // ── Payment failed ──
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error(
          `[Payment Webhook] Payment failed: ${paymentIntent.id}`,
          paymentIntent.last_payment_error?.message
        );
        // Don't create an order — the payment didn't go through
        break;
      }

      // ── Checkout session expired (buyer abandoned checkout) ──
      case 'checkout.session.expired': {
        const expiredSession = event.data.object as Stripe.Checkout.Session;
        const expiredArtworkId = expiredSession.metadata?.signo_artwork_id;

        if (expiredArtworkId) {
          // Release the reservation — only if still reserved (not already sold)
          const { data: reverted } = await supabase
            .from('artworks')
            .update({ status: 'approved' })
            .eq('id', expiredArtworkId)
            .eq('status', 'reserved')
            .select('id');

          if (reverted && reverted.length > 0) {
            console.log(
              `[Payment Webhook] Released reservation for artwork: ${expiredArtworkId}`
            );
          }
        }
        break;
      }

      default:
        console.log(
          `[Payment Webhook] Unhandled event type: ${event.type}`
        );
    }
  } catch (err) {
    console.error('[Payment Webhook] Processing error:', err);
    // Return 200 to prevent Stripe from retrying endlessly
  }

  return NextResponse.json({ received: true });
}
