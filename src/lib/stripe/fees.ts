import type Stripe from 'stripe';
import { getStripe } from './config';
import { calculateStripeFee } from '@/lib/utils';
import { sendOpsAlert } from '@/lib/ops-alert';

export type FeeSource = 'balance_transaction' | 'estimate';

export interface ResolvedFee {
  /** Actual (or estimated) Stripe processing fee, in AUD dollars. */
  feeAud: number;
  source: FeeSource;
}

/**
 * Resolve the REAL Stripe processing fee for a settled payment.
 *
 * `calculateStripeFee()` assumes the AU domestic card rate (1.75% + $0.30).
 * Stripe charges materially more for international cards (3.5% + $0.30) and
 * adds a currency-conversion fee on top. Because the artist payout is
 * `total - fee` and the platform takes zero commission, any underestimate is
 * paid out of Signo's own pocket — on a $2,000 international sale the gap is
 * about $35.
 *
 * The authoritative number is `balance_transaction.fee` on the charge, which
 * only exists once the charge has settled. We read it here and fall back to
 * the domestic estimate if Stripe can't tell us (network failure, charge not
 * yet expanded, settlement currency that isn't AUD).
 *
 * The fallback is deliberately non-fatal: an order must still be created when
 * a fee lookup fails. It raises a warn-level ops alert so the payout can be
 * reconciled by hand.
 */
export async function resolveStripeFee(
  paymentIntentId: string | null | undefined,
  amountAud: number,
  context: Record<string, string | number> = {}
): Promise<ResolvedFee> {
  const estimate = { feeAud: calculateStripeFee(amountAud), source: 'estimate' as const };

  if (!paymentIntentId) return estimate;

  let reason: string;

  try {
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge.balance_transaction'],
    });

    const charge =
      intent.latest_charge && typeof intent.latest_charge !== 'string'
        ? (intent.latest_charge as Stripe.Charge)
        : null;
    const balanceTxn =
      charge?.balance_transaction && typeof charge.balance_transaction !== 'string'
        ? (charge.balance_transaction as Stripe.BalanceTransaction)
        : null;

    if (!balanceTxn) {
      reason = 'no expanded balance_transaction on the latest charge';
    } else if (balanceTxn.currency !== 'aud') {
      // The fee is denominated in the settlement currency. Signo pays out in
      // AUD, so anything else can't be subtracted from an AUD total.
      reason = `balance transaction settled in ${balanceTxn.currency}, not aud`;
    } else if (typeof balanceTxn.fee !== 'number' || balanceTxn.fee <= 0) {
      reason = `balance transaction reported fee=${String(balanceTxn.fee)}`;
    } else {
      const feeAud = Math.round(balanceTxn.fee) / 100;

      // Sanity bound: a fee at or above the sale price means we've misread
      // the field (or the charge belongs to a different payment). Don't
      // build a payout on it.
      if (feeAud >= amountAud) {
        reason = `fee $${feeAud} is not less than the $${amountAud} total`;
      } else {
        return { feeAud, source: 'balance_transaction' };
      }
    }
  } catch (err) {
    reason = err instanceof Error ? err.message : String(err);
  }

  console.warn(
    `[Fees] Falling back to estimated Stripe fee for ${paymentIntentId}: ${reason}`
  );
  await sendOpsAlert({
    title: 'Stripe fee estimated instead of measured',
    description:
      `Could not read the real processing fee from the charge's balance transaction, so the ` +
      `artist payout was calculated with the AU domestic estimate (1.75% + $0.30). If this ` +
      `payment used an international card the fee is higher and Signo absorbed the difference — ` +
      `check the payment in Stripe and adjust the payout before it releases.`,
    context: {
      payment_intent: paymentIntentId,
      amount_aud: amountAud,
      estimated_fee_aud: estimate.feeAud,
      reason,
      ...context,
    },
    level: 'warn',
  });

  return estimate;
}
