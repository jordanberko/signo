import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/config';
import { createClient } from '@supabase/supabase-js';

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
      process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe Webhook] Signature verification failed:', message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  try {
    switch (event.type) {
      // ── Subscription created ──
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.signo_user_id;

        if (!userId) {
          console.warn('[Stripe Webhook] No signo_user_id in subscription metadata');
          break;
        }

        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id;

        await supabase.from('subscriptions').upsert(
          {
            artist_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            status: mapStripeStatus(subscription.status),
            current_period_start: new Date(
              subscription.items.data[0]?.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              subscription.items.data[0]?.current_period_end * 1000
            ).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          },
          { onConflict: 'artist_id' }
        );

        // Sync profile subscription status
        if (subscription.status === 'active') {
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              grace_period_deadline: null,
              stripe_customer_id: customerId,
            })
            .eq('id', userId);
        }

        console.log(
          `[Stripe Webhook] Subscription created for user ${userId}: ${subscription.id}`
        );
        break;
      }

      // ── Subscription updated ──
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.signo_user_id;

        if (!userId) break;

        await supabase
          .from('subscriptions')
          .update({
            status: mapStripeStatus(subscription.status),
            current_period_start: new Date(
              subscription.items.data[0]?.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              subscription.items.data[0]?.current_period_end * 1000
            ).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('artist_id', userId);

        // Sync profile subscription status
        if (subscription.status === 'active') {
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              grace_period_deadline: null,
            })
            .eq('id', userId);
        } else if (subscription.status === 'past_due') {
          await supabase
            .from('profiles')
            .update({ subscription_status: 'past_due' })
            .eq('id', userId);
        }

        console.log(
          `[Stripe Webhook] Subscription updated for user ${userId}: ${subscription.status}`
        );
        break;
      }

      // ── Subscription deleted (fully cancelled) ──
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.signo_user_id;

        if (!userId) break;

        await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancel_at_period_end: false,
          })
          .eq('artist_id', userId);

        // Sync profile subscription status
        await supabase
          .from('profiles')
          .update({ subscription_status: 'cancelled' })
          .eq('id', userId);

        console.log(
          `[Stripe Webhook] Subscription cancelled for user ${userId}`
        );
        break;
      }

      // ── Payment failed ──
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          invoice.parent?.subscription_details?.subscription ??
          null;

        if (!subscriptionId) break;

        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId);

        // Sync profile subscription status via the subscriptions table lookup
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('artist_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (sub?.artist_id) {
          await supabase
            .from('profiles')
            .update({ subscription_status: 'past_due' })
            .eq('id', sub.artist_id);
        }

        console.log(
          `[Stripe Webhook] Payment failed for subscription ${subscriptionId}`
        );
        break;
      }

      // ── Payment succeeded (recover from past_due) ──
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          invoice.parent?.subscription_details?.subscription ??
          null;

        if (!subscriptionId) break;

        // Check if the subscription was past_due before this payment
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('artist_id, status')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (sub?.artist_id && sub.status === 'past_due') {
          await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('stripe_subscription_id', subscriptionId);

          await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              grace_period_deadline: null,
            })
            .eq('id', sub.artist_id);

          console.log(
            `[Stripe Webhook] Payment succeeded, recovered from past_due for user ${sub.artist_id}`
          );
        }
        break;
      }

      default:
        // Unhandled event type — log but don't error
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('[Stripe Webhook] Processing error:', err);
    // Return 200 anyway to prevent Stripe from retrying endlessly
    // The error is logged for debugging
  }

  return NextResponse.json({ received: true });
}

// ── Helpers ──

function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): string {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'cancelled';
    case 'trialing':
      return 'trialing';
    case 'incomplete':
    case 'incomplete_expired':
    case 'unpaid':
    case 'paused':
    default:
      return 'inactive';
  }
}
