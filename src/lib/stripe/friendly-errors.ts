/**
 * Maps a Stripe error to a buyer-facing message.
 *
 * Stripe's TypeScript types note that `.message` on a StripeCardError
 * is safe to surface, but we still override the most common decline
 * codes with cleaner plain-English copy. Non-card errors (api_error,
 * invalid_request_error, etc.) are NEVER surfaced raw — those messages
 * are written for developers and leak implementation detail.
 *
 * Always log the raw error server-side via `console.error` BEFORE
 * calling this function so debugging context (`.code`, `.requestId`,
 * etc.) is preserved.
 *
 * Returns just a string — HTTP status stays 500 at the route layer
 * regardless of the underlying Stripe error class.
 */
export function friendlyStripeError(err: unknown): string {
  if (!err || typeof err !== 'object') {
    return "We couldn't process your payment. Please try again.";
  }
  const e = err as {
    type?: string;
    rawType?: string;
    code?: string;
    decline_code?: string;
    message?: string;
  };

  // ── Card errors ──
  // Stripe says these messages are safe to display, but we still
  // override the most frequent decline codes with cleaner copy.
  // Note: Stripe's classification of incorrect_cvc / incorrect_number
  // is best-effort, not authoritative — a bank can decline for fraud
  // and have it reported as "incorrect_number". So those two cases use
  // softer "didn't match" framing rather than a flat assertion.
  if (e.type === 'StripeCardError' || e.rawType === 'card_error') {
    const declineCode = e.decline_code;
    if (e.code === 'card_declined') {
      if (declineCode === 'insufficient_funds') {
        return 'Your card was declined for insufficient funds. Please use a different card.';
      }
      if (declineCode === 'lost_card' || declineCode === 'stolen_card' || declineCode === 'fraudulent') {
        return 'Your card was declined. Please use a different card.';
      }
      return 'Your card was declined. Please try a different card.';
    }
    if (e.code === 'expired_card') {
      return 'Your card has expired. Please use a different card.';
    }
    if (e.code === 'incorrect_cvc') {
      return "Your card's security code didn't match. Please check it and try again.";
    }
    if (e.code === 'incorrect_number') {
      return "The card number didn't match. Please check it and try again.";
    }
    if (e.code === 'processing_error') {
      return "We couldn't process your card. Please try again or use a different card.";
    }
    // Less-common card cases — Stripe's own message is safe to display.
    return e.message || 'Your card was declined.';
  }

  // ── Non-card errors ──
  // Never surface the raw Stripe message — those strings are written
  // for developers and leak implementation detail.
  if (e.rawType === 'rate_limit_error') {
    return 'We are experiencing high demand. Please try again in a moment.';
  }
  if (e.rawType === 'authentication_error' || e.rawType === 'api_error') {
    return 'Our payment service is temporarily unavailable. Please try again in a few minutes.';
  }
  if (e.rawType === 'invalid_request_error') {
    // Most often signals a bad metadata field, missing customer, etc.
    // — a server config issue, not user error. Don't expose internals.
    return "We couldn't process your payment. Please try again or contact support if it persists.";
  }

  // Generic fallback — non-Stripe errors, network drops, unknown rawTypes.
  return "We couldn't process your payment. Please try again.";
}
