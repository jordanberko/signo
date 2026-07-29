import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createConnectAccount, createAccountLink } from '@/lib/stripe/connect';
import { appUrl } from '@/lib/urls';

/**
 * POST /api/stripe/connect/onboard
 *
 * Creates a Stripe Connect Express account for the authenticated artist
 * (or uses their existing one) and returns the onboarding URL.
 */
// Only accept a same-site absolute path for the post-onboarding return, so
// a caller can't turn the Stripe redirect into an off-site open redirect.
function safeReturnPath(input: unknown): string | null {
  if (typeof input !== 'string' || !input) return null;
  if (!input.startsWith('/') || input.startsWith('//') || input.startsWith('/\\')) {
    return null;
  }
  return input;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Auth check
    // getUser() revalidates the JWT with the auth server (creates a payout account).
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get profile — must be an artist
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email, stripe_account_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['artist', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only artists can set up payouts' },
        { status: 403 }
      );
    }

    // Use server-side origin only — never trust client-supplied origin.
    // A malicious actor could pass an attacker-controlled host and
    // turn the Stripe redirect into an open-redirect / phishing vector.
    const origin = appUrl();

    // Optional caller-supplied return path (same-site only). Lets the
    // onboarding wizard bring the artist back INTO the wizard after Stripe
    // instead of dropping them on the standalone payouts settings page —
    // which stranded them before the "add your first artwork" step.
    let returnPath: string | null = null;
    try {
      const body = await request.json();
      returnPath = safeReturnPath(body?.returnPath);
    } catch {
      // No/invalid body — fall back to the default payouts settings page.
    }

    const joiner = (path: string, flag: string) =>
      `${origin}${path}${path.includes('?') ? '&' : '?'}${flag}`;
    const returnUrl = returnPath
      ? joiner(returnPath, 'onboarded=true')
      : `${origin}/artist/settings/payouts?onboarded=true`;
    const refreshUrl = returnPath
      ? joiner(returnPath, 'refresh=true')
      : `${origin}/artist/settings/payouts?refresh=true`;

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
    const url = await createAccountLink(accountId, returnUrl, refreshUrl);

    return NextResponse.json({ url, accountId });
  } catch (err) {
    console.error('[Stripe Connect] Onboard error:', err);
    return NextResponse.json(
      { error: 'Failed to create onboarding link' },
      { status: 500 }
    );
  }
}
