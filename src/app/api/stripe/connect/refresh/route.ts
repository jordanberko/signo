import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAccountLink } from '@/lib/stripe/connect';

/**
 * POST /api/stripe/connect/refresh
 *
 * Generates a new onboarding link for an artist whose previous link expired.
 * Account links expire after a short time, so this is needed when the artist
 * returns to finish onboarding after the link has gone stale.
 */
export async function POST(_request: Request) {
  try {
    const supabase = await createClient();

    const { data: { session } } = await supabase.auth.getSession();

    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_account_id) {
      return NextResponse.json(
        { error: 'No Stripe Connect account found. Please start onboarding first.' },
        { status: 400 }
      );
    }

    // Use server-side origin only — never trust client-supplied origin.
    // A malicious actor could pass an attacker-controlled host and
    // turn the Stripe redirect into an open-redirect / phishing vector.
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const url = await createAccountLink(
      profile.stripe_account_id,
      `${origin}/artist/settings/payouts?onboarded=true`,
      `${origin}/artist/settings/payouts?refresh=true`
    );

    return NextResponse.json({ url });
  } catch (err) {
    console.error('[Stripe Connect] Refresh error:', err);
    return NextResponse.json(
      { error: 'Failed to generate new onboarding link' },
      { status: 500 }
    );
  }
}
