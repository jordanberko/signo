import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAccountStatus } from '@/lib/stripe/connect';

/**
 * GET /api/stripe/connect/status
 *
 * Returns the Stripe Connect account status for the authenticated artist.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        accountId: null,
      });
    }

    const status = await getAccountStatus(profile.stripe_account_id);

    return NextResponse.json({
      connected: true,
      accountId: status.id,
      chargesEnabled: status.chargesEnabled,
      payoutsEnabled: status.payoutsEnabled,
      detailsSubmitted: status.detailsSubmitted,
      bankLast4: status.bankLast4,
      bankName: status.bankName,
    });
  } catch (err) {
    console.error('[Stripe Connect] Status error:', err);
    return NextResponse.json(
      { error: 'Failed to get account status' },
      { status: 500 }
    );
  }
}
