// Re-export from the new modular location.
// New code should import from '@/lib/stripe/config' directly.
export {
  stripe,
  getStripe,
  ENFORCE_SUBSCRIPTIONS,
  ARTIST_SUBSCRIPTION_PRICE_ID,
  SUBSCRIPTION_AMOUNT_AUD,
} from './stripe/config';
