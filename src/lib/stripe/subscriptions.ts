import { stripe } from './config';

// ── Customer Management ──

/**
 * Create a Stripe Customer for an artist.
 * Stores the Signo user ID in metadata for webhook lookups.
 */
export async function createCustomer(
  email: string,
  name: string,
  userId: string
): Promise<string> {
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { signo_user_id: userId },
  });
  return customer.id;
}

/**
 * Retrieve or create a Stripe Customer for a user.
 * Searches by metadata first to avoid duplicates.
 */
export async function getOrCreateCustomer(
  email: string,
  name: string,
  userId: string
): Promise<string> {
  // Search for existing customer by metadata
  const existing = await stripe.customers.search({
    query: `metadata["signo_user_id"]:"${userId}"`,
  });

  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  return createCustomer(email, name, userId);
}

// ── Subscription Management ──

/**
 * Create a subscription for a customer.
 * Returns the Stripe Subscription object.
 */
export async function createSubscription(
  customerId: string,
  priceId: string
) {
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
  });
  return subscription;
}

/**
 * Cancel a subscription at the end of the current billing period.
 * The artist retains access until the period ends.
 */
export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
  return subscription;
}

/**
 * Reactivate a subscription that was set to cancel at period end.
 */
export async function reactivateSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
  return subscription;
}

/**
 * Get the current status of a subscription.
 */
export async function getSubscriptionStatus(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const item = subscription.items.data[0];
  return {
    id: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodStart: item
      ? new Date(item.current_period_start * 1000)
      : null,
    currentPeriodEnd: item
      ? new Date(item.current_period_end * 1000)
      : null,
  };
}

/**
 * Create a Stripe Checkout Session for the subscription.
 * Redirects the artist to Stripe's hosted checkout page.
 */
export async function createSubscriptionCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  userId: string
) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { signo_user_id: userId },
    subscription_data: {
      metadata: { signo_user_id: userId },
    },
  });
  return session;
}
