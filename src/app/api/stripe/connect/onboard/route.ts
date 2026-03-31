import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createConnectAccount, createAccountLink } from '@/lib/stripe/connect';

/**
 * POST /api/stripe/connect/onboard
 *
 * Creates a Stripe Connect Express account for the authenticated artist
 * (or uses their existing one) and returns the onboarding URL.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get profile — must be an artist
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email, stripe_account_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'artist') {
      return NextResponse.json(
        { error: 'Only artists can set up payouts' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const origin =
      body.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    let accountId = profile.stripe_account_id;

    // Create a new Connect account if one doesn't exist
    if (!accountId) {
      const email = profile.email || user.email || '';
      accountId = await createConnectAccount(user.id, email);

      // Store the Connect account ID in the profile
      await supabase
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', user.id);
    }

    // Generate the onboarding link
    const url = await createAccountLink(
      accountId,
      `${origin}/artist/settings/payouts?onboarded=true`,
      `${origin}/artist/settings/payouts?refresh=true`
    );

    return NextResponse.json({ url, accountId });
  } catch (err) {
    console.error('[Stripe Connect] Onboard error:', err);
    return NextResponse.json(
      { error: 'Failed to create onboarding link' },
      { status: 500 }
    );
  }
}
