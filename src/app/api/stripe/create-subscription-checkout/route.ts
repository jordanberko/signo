import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ARTIST_SUBSCRIPTION_PRICE_ID } from '@/lib/stripe/config';
import {
  getOrCreateCustomer,
  createSubscriptionCheckoutSession,
} from '@/lib/stripe/subscriptions';
import { appUrl } from '@/lib/urls';

export async function POST(_request: Request) {
  try {
    const supabase = await createClient();

    // Authenticate
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const user = authSession?.user;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get profile (including subscription_status)
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, role, subscription_status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'artist') {
      return NextResponse.json(
        { error: 'Only artists can subscribe' },
        { status: 403 }
      );
    }

    // Gate based on subscription_status
    const status = profile.subscription_status;

    if (status === 'trial') {
      return NextResponse.json(
        {
          error: "Your subscription starts after your first sale. Keep listing!",
          trial_period: true,
        },
        { status: 400 }
      );
    }

    if (status === 'active') {
      return NextResponse.json(
        {
          error: 'You already have an active subscription.',
          already_subscribed: true,
        },
        { status: 400 }
      );
    }

    // Allow checkout for: pending_activation, paused, cancelled, or null/undefined (new artists)
    // These are artists who need to start or restart their subscription.

    // Get or create Stripe customer
    const email = profile.email || user.email || '';
    const name = profile.full_name || '';
    const customerId = await getOrCreateCustomer(email, name, user.id);

    // Store customer ID in profile if not already there
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);

    // Use server-side origin only — never trust client-supplied origin.
    // A malicious actor could pass an attacker-controlled host and
    // turn the Stripe redirect into an open-redirect / phishing vector.
    const origin = appUrl();

    // Create checkout session
    const session = await createSubscriptionCheckoutSession(
      customerId,
      ARTIST_SUBSCRIPTION_PRICE_ID,
      `${origin}/artist/dashboard?subscription=success`,
      `${origin}/artist/subscribe?cancelled=true`,
      user.id
    );

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe] Create subscription checkout error:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
