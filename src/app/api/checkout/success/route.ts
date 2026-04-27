import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/config';
import { sendOpsAlert } from '@/lib/ops-alert';

/**
 * GET /api/checkout/success?session_id=<session_id>
 *
 * Retrieves order details for the checkout success page.
 * Uses the Stripe session's payment_intent to locate the order.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const supabase = await createClient();

    // Auth check
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const authUser = authSession?.user;

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Retrieve the Stripe session to get the payment_intent id
    const stripe = getStripe();
    let paymentIntentId: string | null = null;
    try {
      const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
      if (typeof stripeSession.payment_intent === 'string') {
        paymentIntentId = stripeSession.payment_intent;
      } else if (stripeSession.payment_intent) {
        paymentIntentId = stripeSession.payment_intent.id;
      }
    } catch {
      // Stripe session not found or error — fall through, order may still be queryable
    }

    // Query order — first try by payment_intent, then by buyer + recency as fallback
    let orderData = null;

    if (paymentIntentId) {
      const { data } = await supabase
        .from('orders')
        .select(
          'id, total_amount_aud, status, buyer_id, artworks(title, images), profiles!orders_artist_id_fkey(full_name)'
        )
        .eq('stripe_payment_intent_id', paymentIntentId)
        .eq('buyer_id', authUser.id)
        .single();
      orderData = data;
    }

    // Fallback: most recent order for this buyer in the last 10 minutes
    if (!orderData) {
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('orders')
        .select(
          'id, total_amount_aud, status, buyer_id, artworks(title, images), profiles!orders_artist_id_fkey(full_name)'
        )
        .eq('buyer_id', authUser.id)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      orderData = data;
    }

    if (!orderData) {
      await sendOpsAlert({
        title: 'Webhook race: order missing on /checkout/success',
        description:
          `A buyer landed on /checkout/success for a Stripe session and no matching order ` +
          `exists in the DB (neither by payment_intent nor by recent buyer activity). The ` +
          `webhook may have failed. Stripe will retry for up to 3 days; if it never ` +
          `recovers, the buyer was charged with no order record. ` +
          `Note: this can fire multiple times per failed session (page polls every 1s ` +
          `for up to 10s).`,
        context: {
          session_id: sessionId,
          buyer_id: authUser.id,
          payment_intent_id: paymentIntentId ?? '—',
        },
        level: 'error',
      });
      return NextResponse.json({ order: null }, { status: 202 });
    }

    // Fetch buyer first name
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', authUser.id)
      .single();

    const fullName = buyerProfile?.full_name || '';
    const buyerFirstName = fullName.split(' ')[0] || 'there';

    const raw = orderData as {
      id: string;
      total_amount_aud: number | null;
      status: string;
      buyer_id: string;
      artworks: { title: string; images: string[] } | null;
      profiles: { full_name: string | null } | null;
    };

    return NextResponse.json({
      order: {
        id: raw.id,
        total_amount_aud: raw.total_amount_aud,
        status: raw.status,
        buyer_first_name: buyerFirstName,
        artwork: raw.artworks ?? null,
        artist: raw.profiles ?? null,
      },
    });
  } catch (err) {
    console.error('[API checkout/success]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
