import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/config';
import { createClient } from '@supabase/supabase-js';
import { sendOpsAlert } from '@/lib/ops-alert';

// Use service role client to bypass RLS (webhooks are server-to-server)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Webhook handler ──
//
// Response semantics (mirrors payment-webhook):
//
//   400   Signature verification failed (or missing sig header).
//         Stripe does NOT retry 400s — a bad signature never becomes
//         a good signature on retry.
//
//   200   Event acknowledged. One of:
//           • event already present in processed_stripe_events
//           • non-actionable (missing metadata, deleted artist, FK
//             violation 23503 from a delete-vs-write race, etc.)
//           • handler ran to completion and processed_stripe_events
//             insert succeeded
//
//   500   Processing failed (DB write error, thrown exception, or
//         processed_stripe_events insert failed). Stripe retries on
//         exponential backoff for up to 3 days.
//
// Distinguishing transient vs non-actionable failures:
//   • Transient (DB connection/query failure) → throw → outer catch
//     returns 500 → Stripe retries.
//   • Non-actionable (no signo_user_id in metadata, profile no longer
//     exists, FK violation 23503 due to artist deletion race) → log +
//     return normally → row gets logged to processed_stripe_events →
//     Stripe stops.

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
    await sendOpsAlert({
      title: 'Stripe subscription webhook signature verification failed',
      description:
        'An incoming subscription webhook had an invalid signature. Likely causes: misrotated STRIPE_SUBSCRIPTION_WEBHOOK_SECRET, replay attack, or misconfigured endpoint URL in Stripe. Stripe is being told 400 (no retry).',
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
  // Definitive marker that an event was already processed. Must be the
  // first DB-touching operation so retried deliveries short-circuit
  // before any business logic runs.
  try {
    const { data: alreadyProcessed, error: lookupError } = await supabase
      .from('processed_stripe_events')
      .select('event_id')
      .eq('event_id', event.id)
      .maybeSingle();

    if (lookupError) {
      console.error(
        '[Subscription Webhook] Idempotency lookup failed:',
        lookupError
      );
      return NextResponse.json(
        { error: 'Idempotency lookup failed' },
        { status: 500 }
      );
    }

    if (alreadyProcessed) {
      console.log(
        `[Subscription Webhook] Event ${event.id} (${event.type}) already processed, acknowledging`
      );
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch (err) {
    console.error('[Subscription Webhook] Idempotency lookup exception:', err);
    return NextResponse.json(
      { error: 'Idempotency lookup exception' },
      { status: 500 }
    );
  }

  try {
    switch (event.type) {
      // ── Subscription created ──
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.signo_user_id;

        if (!userId) {
          console.warn(
            '[Subscription Webhook] No signo_user_id in subscription.created metadata',
            { eventId: event.id }
          );
          break;
        }

        // .maybeSingle(): null data on 0 rows is the deleted-artist case.
        const { data: profile, error: profileLookupErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (profileLookupErr) {
          throw new Error(
            `Profile lookup failed for ${userId}: ${profileLookupErr.message}`
          );
        }
        if (!profile) {
          console.warn(
            `[Subscription Webhook] subscription.created for missing profile ${userId}, ignoring`,
            { eventId: event.id }
          );
          break;
        }

        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id;

        const { error: upsertError } = await supabase
          .from('subscriptions')
          .upsert(
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
        if (upsertError) {
          // 23503 = FK violation (profile deleted between lookup and write).
          if (upsertError.code === '23503') {
            console.warn(
              `[Subscription Webhook] FK violation on subscriptions upsert for ${userId} — profile deleted in race`,
              { eventId: event.id }
            );
            break;
          }
          throw new Error(
            `Failed to upsert subscription for ${userId}: ${upsertError.message}`
          );
        }

        // Sync profile subscription status (only on active)
        if (subscription.status === 'active') {
          const { error: profileUpdateErr } = await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              grace_period_deadline: null,
              stripe_customer_id: customerId,
            })
            .eq('id', userId);
          if (profileUpdateErr) {
            throw new Error(
              `Failed to update profile ${userId} to active: ${profileUpdateErr.message}`
            );
          }
        }

        console.log(
          `[Subscription Webhook] Subscription created for user ${userId}: ${subscription.id}`
        );
        break;
      }

      // ── Subscription updated ──
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.signo_user_id;

        if (!userId) {
          console.warn(
            '[Subscription Webhook] No signo_user_id in subscription.updated metadata',
            { eventId: event.id }
          );
          break;
        }

        const { data: profile, error: profileLookupErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (profileLookupErr) {
          throw new Error(
            `Profile lookup failed for ${userId}: ${profileLookupErr.message}`
          );
        }
        if (!profile) {
          console.warn(
            `[Subscription Webhook] subscription.updated for missing profile ${userId}, ignoring`,
            { eventId: event.id }
          );
          break;
        }

        const { error: subUpdateErr } = await supabase
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
        if (subUpdateErr) {
          if (subUpdateErr.code === '23503') {
            console.warn(
              `[Subscription Webhook] FK violation on subscriptions update for ${userId} — profile deleted in race`,
              { eventId: event.id }
            );
            break;
          }
          throw new Error(
            `Failed to update subscription for ${userId}: ${subUpdateErr.message}`
          );
        }

        // Sync profile subscription status (active or past_due)
        if (subscription.status === 'active') {
          const { error: profileUpdateErr } = await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              grace_period_deadline: null,
            })
            .eq('id', userId);
          if (profileUpdateErr) {
            throw new Error(
              `Failed to update profile ${userId} to active: ${profileUpdateErr.message}`
            );
          }
        } else if (subscription.status === 'past_due') {
          const { error: profileUpdateErr } = await supabase
            .from('profiles')
            .update({ subscription_status: 'past_due' })
            .eq('id', userId);
          if (profileUpdateErr) {
            throw new Error(
              `Failed to update profile ${userId} to past_due: ${profileUpdateErr.message}`
            );
          }
        }

        console.log(
          `[Subscription Webhook] Subscription updated for user ${userId}: ${subscription.status}`
        );
        break;
      }

      // ── Subscription deleted (fully cancelled) ──
      // Best-effort: profile update is the meaningful action even if subs row is already gone via cascade.
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.signo_user_id;

        if (!userId) {
          console.warn(
            '[Subscription Webhook] No signo_user_id in subscription.deleted metadata',
            { eventId: event.id }
          );
          break;
        }

        const { error: subUpdateErr } = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancel_at_period_end: false,
          })
          .eq('artist_id', userId);
        if (subUpdateErr) {
          throw new Error(
            `Failed to update subscription for ${userId} on delete: ${subUpdateErr.message}`
          );
        }

        const { error: profileUpdateErr } = await supabase
          .from('profiles')
          .update({ subscription_status: 'cancelled' })
          .eq('id', userId);
        if (profileUpdateErr) {
          throw new Error(
            `Failed to update profile ${userId} on subscription delete: ${profileUpdateErr.message}`
          );
        }

        console.log(
          `[Subscription Webhook] Subscription cancelled for user ${userId}`
        );
        break;
      }

      // ── Payment failed ──
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          invoice.parent?.subscription_details?.subscription ?? null;

        if (!subscriptionId) {
          console.warn(
            '[Subscription Webhook] No subscription on invoice.payment_failed',
            { eventId: event.id }
          );
          break;
        }

        const { error: subUpdateErr } = await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId);
        if (subUpdateErr) {
          if (subUpdateErr.code === '23503') {
            console.warn(
              `[Subscription Webhook] FK violation on subscriptions update for ${subscriptionId} (payment_failed) — profile deleted in race`,
              { eventId: event.id }
            );
            break;
          }
          throw new Error(
            `Failed to mark subscription ${subscriptionId} past_due: ${subUpdateErr.message}`
          );
        }

        // Lookup the artist_id to sync profile status
        const { data: sub, error: subLookupErr } = await supabase
          .from('subscriptions')
          .select('artist_id')
          .eq('stripe_subscription_id', subscriptionId)
          .maybeSingle();
        if (subLookupErr) {
          throw new Error(
            `Failed to lookup subscription ${subscriptionId}: ${subLookupErr.message}`
          );
        }
        if (!sub?.artist_id) {
          console.warn(
            `[Subscription Webhook] No artist_id for subscription ${subscriptionId} on payment_failed, skipping profile sync`,
            { eventId: event.id }
          );
          break;
        }

        const { error: profileUpdateErr } = await supabase
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('id', sub.artist_id);
        if (profileUpdateErr) {
          throw new Error(
            `Failed to update profile ${sub.artist_id} to past_due: ${profileUpdateErr.message}`
          );
        }

        console.log(
          `[Subscription Webhook] Payment failed for subscription ${subscriptionId}`
        );
        break;
      }

      // ── Payment succeeded (recover from past_due) ──
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          invoice.parent?.subscription_details?.subscription ?? null;

        if (!subscriptionId) {
          console.warn(
            '[Subscription Webhook] No subscription on invoice.payment_succeeded',
            { eventId: event.id }
          );
          break;
        }

        // Lookup first to distinguish past_due → active recovery from steady-state no-op.
        const { data: sub, error: subLookupErr } = await supabase
          .from('subscriptions')
          .select('artist_id, status')
          .eq('stripe_subscription_id', subscriptionId)
          .maybeSingle();
        if (subLookupErr) {
          throw new Error(
            `Failed to lookup subscription ${subscriptionId}: ${subLookupErr.message}`
          );
        }
        if (!sub?.artist_id) {
          console.warn(
            `[Subscription Webhook] No artist_id for subscription ${subscriptionId} on payment_succeeded, skipping`,
            { eventId: event.id }
          );
          break;
        }

        // Steady-state active: nothing to do.
        if (sub.status !== 'past_due') {
          break;
        }

        const { error: subUpdateErr } = await supabase
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('stripe_subscription_id', subscriptionId);
        if (subUpdateErr) {
          if (subUpdateErr.code === '23503') {
            console.warn(
              `[Subscription Webhook] FK violation on subscriptions update for ${subscriptionId} (payment_succeeded recovery) — profile deleted in race`,
              { eventId: event.id }
            );
            break;
          }
          throw new Error(
            `Failed to mark subscription ${subscriptionId} active (recovery): ${subUpdateErr.message}`
          );
        }

        const { error: profileUpdateErr } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            grace_period_deadline: null,
          })
          .eq('id', sub.artist_id);
        if (profileUpdateErr) {
          throw new Error(
            `Failed to recover profile ${sub.artist_id} to active: ${profileUpdateErr.message}`
          );
        }

        console.log(
          `[Subscription Webhook] Payment succeeded, recovered from past_due for user ${sub.artist_id}`
        );
        break;
      }

      default:
        // Unhandled event type — acknowledged so Stripe stops retrying.
        console.log(
          `[Subscription Webhook] Unhandled event type: ${event.type} (id=${event.id})`
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(
      `[Subscription Webhook] Processing error for event ${event.id} (${event.type}):`,
      message,
      stack
    );

    // Persistent-failure alert with a 15-minute dedup window.
    // event.created is the Unix timestamp set at original delivery,
    // unchanged across Stripe's retries. We alert only when retries
    // fall in the 1h–1h15m window after creation, so a single stuck
    // event fires at most one alert across the full 3-day retry
    // chain.
    //
    // Trade-off: a stuck event whose retry schedule skips this 15-min
    // window entirely (e.g. retry at 50 min then again at 1h20 min)
    // produces no alert. Accepted because launch-week monitoring is
    // hands-on; better to miss the occasional alert than to ring the
    // ops channel repeatedly for one stuck event.
    const eventAgeSeconds = Math.floor(Date.now() / 1000) - event.created;
    if (eventAgeSeconds >= 3600 && eventAgeSeconds < 4500) {
      await sendOpsAlert({
        title: `Subscription webhook persistent failure: ${event.type}`,
        description:
          `Stripe has been retrying this event for ${Math.floor(eventAgeSeconds / 60)} minutes without success. Stripe gives up after ~3 days. Investigate before then.`,
        context: {
          event_id: event.id,
          event_type: event.type,
          event_age_minutes: Math.floor(eventAgeSeconds / 60),
          error: message,
        },
        level: 'error',
      });
    }

    return NextResponse.json(
      { error: `Webhook processing failed: ${message}` },
      { status: 500 }
    );
  }

  // ── Mark as processed ──
  // Per-case logic is idempotent (existence checks + status filters), so re-processing on retry is safe.
  try {
    const { error: logError } = await supabase
      .from('processed_stripe_events')
      .insert({ event_id: event.id, event_type: event.type });

    if (logError) {
      // 23505 = unique violation (concurrent delivery already logged this event).
      if (logError.code === '23505') {
        console.log(
          `[Subscription Webhook] Event ${event.id} inserted concurrently, acknowledging`
        );
        return NextResponse.json({ received: true, duplicate: true });
      }
      console.error(
        `[Subscription Webhook] Failed to log event ${event.id}:`,
        logError
      );
      return NextResponse.json(
        { error: 'Failed to log processed event' },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error(
      `[Subscription Webhook] Exception logging event ${event.id}:`,
      err
    );
    return NextResponse.json(
      { error: 'Exception logging processed event' },
      { status: 500 }
    );
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
