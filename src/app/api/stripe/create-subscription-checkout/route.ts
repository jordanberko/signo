import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ARTIST_SUBSCRIPTION_PRICE_ID,
  ENFORCE_SUBSCRIPTIONS,
} from '@/lib/stripe/config';
import {
  getOrCreateCustomer,
  createSubscriptionCheckoutSession,
} from '@/lib/stripe/subscriptions';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Authenticate
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const user = authSession?.user;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'artist') {
      return NextResponse.json(
        { error: 'Only artists can subscribe' },
        { status: 403 }
      );
    }

    if (!ENFORCE_SUBSCRIPTIONS) {
      return NextResponse.json(
        {
          error: 'Subscriptions are not yet enforced. You have free access during the launch period.',
          launch_period: true,
        },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const email = profile.email || user.email || '';
    const name = profile.full_name || '';
    const customerId = await getOrCreateCustomer(email, name, user.id);

    // Store customer ID in profile if not already there
    await supabase
      .from('profiles')
      .update({ stripe_account_id: customerId })
      .eq('id', user.id);

    // Parse request for URLs
    const body = await request.json().catch(() => ({}));
    const origin = body.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
