import Stripe from 'stripe';

// ── Stripe instance (server-side only) ──

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-03-25.dahlia',
  typescript: true,
});

// ── Subscription constants ──

/**
 * The Stripe Price ID for the artist subscription plan ($30 AUD/month).
 *
 * Create this in your Stripe Dashboard:
 *   1. Products → Add Product → "Signo Artist Subscription"
 *   2. Price: $30.00 AUD, Recurring (Monthly)
 *   3. Copy the price ID (starts with "price_") and set it as
 *      STRIPE_ARTIST_SUBSCRIPTION_PRICE_ID in your .env.local
 */
export const ARTIST_SUBSCRIPTION_PRICE_ID =
  process.env.STRIPE_ARTIST_SUBSCRIPTION_PRICE_ID || 'price_signo_artist_30_aud';

export const SUBSCRIPTION_AMOUNT_AUD = 30;

/**
 * Launch-period feature flag.
 * While true, subscription checks are bypassed — all artists get free access.
 * Set STRIPE_ENFORCE_SUBSCRIPTIONS=true in .env.local to start enforcing.
 */
export const ENFORCE_SUBSCRIPTIONS =
  process.env.STRIPE_ENFORCE_SUBSCRIPTIONS === 'true';
