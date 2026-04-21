import { getStripe } from './config';
import { calculateStripeFee } from '@/lib/utils';

// ── Stripe Connect (Express Accounts) ──

/**
 * Create a Stripe Connect Express account for an artist.
 * Express accounts handle onboarding, identity verification, and bank details
 * entirely within Stripe's hosted UI.
 */
export async function createConnectAccount(
  userId: string,
  email: string
): Promise<string> {
  const stripe = getStripe();
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'AU',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      signo_user_id: userId,
    },
    settings: {
      payouts: {
        schedule: {
          // Pay out automatically once funds are available
          interval: 'daily',
        },
      },
    },
  });
  return account.id;
}

/**
 * Generate an Account Link for the artist to complete Stripe Connect onboarding.
 * This redirects them to Stripe's hosted form for identity verification,
 * bank account setup, and terms acceptance.
 */
export async function createAccountLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<string> {
  const stripe = getStripe();
  const link = await stripe.accountLinks.create({
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: 'account_onboarding',
  });
  return link.url;
}

/**
 * Check the status of a Stripe Connect Express account.
 * Returns whether onboarding is complete and payouts are enabled.
 */
export async function getAccountStatus(accountId: string) {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);

  // Extract bank account details from external accounts if available
  const externalAccount = account.external_accounts?.data?.[0] as
    | { object?: string; last4?: string; bank_name?: string }
    | undefined;
  const isBankAccount = externalAccount?.object === 'bank_account';

  return {
    id: account.id,
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
    bankLast4: isBankAccount ? externalAccount?.last4 ?? null : null,
    bankName: isBankAccount ? externalAccount?.bank_name ?? null : null,
    email: account.email ?? null,
  };
}

/**
 * Create a Stripe login link so the artist can access their Express dashboard
 * to view payouts, update bank details, etc.
 */
export async function createLoginLink(accountId: string): Promise<string> {
  const stripe = getStripe();
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}

/**
 * Transfer funds to an artist's connected account after the inspection window.
 *
 * Transfer amount = sale_price - stripe_processing_fee
 * No platform commission is deducted.
 *
 * @param amountCents - Amount to transfer in cents (AUD)
 * @param accountId - Artist's Stripe Connect account ID
 * @param orderId - Signo order ID for tracking
 */
export async function createTransfer(
  amountCents: number,
  accountId: string,
  orderId: string
) {
  const stripe = getStripe();
  // Idempotency key scoped to the order — if this function is invoked
  // twice for the same order (overlapping cron runs, manual complete
  // racing with the auto-release cron, a retry after a transient 5xx),
  // Stripe will return the original transfer instead of creating a
  // duplicate. Without this, double-payout is possible.
  const transfer = await stripe.transfers.create(
    {
      amount: amountCents,
      currency: 'aud',
      destination: accountId,
      metadata: {
        signo_order_id: orderId,
      },
    },
    {
      idempotencyKey: `transfer_order_${orderId}`,
    }
  );
  return transfer;
}

/**
 * Calculate the transfer amount for an artist payout.
 * Deducts only Stripe processing fees — zero platform commission.
 *
 * Stripe AU domestic cards: 1.75% + $0.30 AUD
 */
export function calculateTransferAmount(salePriceDollars: number) {
  const stripeFee = calculateStripeFee(salePriceDollars);
  const artistReceives = Math.round((salePriceDollars - stripeFee) * 100) / 100;
  const artistReceivesCents = Math.round(artistReceives * 100);

  return {
    salePriceDollars,
    stripeFee,
    platformCommission: 0,
    artistReceives,
    artistReceivesCents,
  };
}
