import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/config';
import { getAccountStatus } from '@/lib/stripe/connect';
import { rateLimit } from '@/lib/rate-limit';
import { appUrl } from '@/lib/urls';

/**
 * POST /api/checkout/create-session
 *
 * Creates a Stripe Checkout Session for purchasing artwork.
 * Payment goes to the PLATFORM account (escrow pattern).
 * Funds are transferred to the artist after the inspection window.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const user = authSession?.user;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Rate limit: 10 requests per hour per user ID
    const { success } = rateLimit(`checkout:${user.id}`, { max: 10, windowMs: 60 * 60_000 });
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { artworkId, shippingAddress, saveAddress } = body;

    if (!artworkId) {
      return NextResponse.json(
        { error: 'Missing artworkId' },
        { status: 400 }
      );
    }

    // Fetch artwork details (status is checked via the atomic reserve below)
    const { data: artwork, error: artworkError } = await supabase
      .from('artworks')
      .select(
        'id, title, price_aud, category, images, artist_id, shipping_weight_kg, profiles!artworks_artist_id_fkey(full_name, email, stripe_account_id)'
      )
      .eq('id', artworkId)
      .single();

    if (artworkError || !artwork) {
      return NextResponse.json(
        { error: 'Artwork not found' },
        { status: 404 }
      );
    }

    // Can't buy your own artwork
    if (artwork.artist_id === user.id) {
      return NextResponse.json(
        { error: "You can't purchase your own artwork" },
        { status: 400 }
      );
    }

    // Calculate totals
    const isDigital = artwork.category === 'digital';
    const shippingCost = 0; // Free shipping (included in price)
    const totalAmount = artwork.price_aud + shippingCost;

    // Validate shipping address for physical items
    if (!isDigital && (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.postcode)) {
      return NextResponse.json(
        { error: 'Shipping address is required for physical artwork' },
        { status: 400 }
      );
    }

    // ── Connect payouts gate ──
    // Runs before reservation so a failed gate doesn't leave the artwork locked.
    const stripeAccountId =
      (artwork.profiles as { stripe_account_id?: string | null } | null)
        ?.stripe_account_id ?? null;

    if (!stripeAccountId) {
      console.log('[Checkout] Artist has no stripe_account_id', {
        artworkId,
        artistId: artwork.artist_id,
      });
      return NextResponse.json(
        { error: "This artist hasn't set up payouts yet. Please check back soon." },
        { status: 409 }
      );
    }

    let payoutsEnabled = false;
    try {
      const status = await getAccountStatus(stripeAccountId);
      payoutsEnabled = status.payoutsEnabled;
    } catch (err) {
      console.error('[Checkout] Stripe getAccountStatus failed', {
        artworkId,
        artistId: artwork.artist_id,
        stripeAccountId,
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json(
        { error: "This artist's payment setup needs attention. Please contact support if this persists." },
        { status: 409 }
      );
    }

    if (!payoutsEnabled) {
      console.log('[Checkout] Artist payouts not yet enabled', {
        artworkId,
        artistId: artwork.artist_id,
        stripeAccountId,
      });
      return NextResponse.json(
        { error: "The artist's payouts aren't enabled yet. Please check back soon." },
        { status: 409 }
      );
    }

    // ── Atomic reservation ──
    // Use the DB update with a status filter as a lock: only the first
    // concurrent request will match (status = 'approved'). The second
    // request will find zero rows because the status is already 'reserved'.
    const { data: reserved, error: reserveError } = await supabase
      .from('artworks')
      .update({ status: 'reserved' })
      .eq('id', artworkId)
      .eq('status', 'approved')
      .select('id');

    if (reserveError) {
      console.error('[Checkout] Reserve error:', reserveError);
      return NextResponse.json(
        { error: 'Failed to reserve artwork' },
        { status: 500 }
      );
    }

    if (!reserved || reserved.length === 0) {
      return NextResponse.json(
        { error: 'This artwork is no longer available' },
        { status: 409 }
      );
    }

    // Save address to profile if requested
    if (saveAddress && shippingAddress) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('social_links')
        .eq('id', user.id)
        .single();

      const existingLinks = (profile?.social_links as Record<string, string>) || {};
      await supabase
        .from('profiles')
        .update({
          social_links: {
            ...existingLinks,
            _shipping_address: JSON.stringify(shippingAddress),
          },
        })
        .eq('id', user.id);
    }

    // Get buyer profile for Stripe
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // Use server-side origin only — never trust client-supplied origin
    const appOrigin = appUrl();

    const thumbnail = (artwork.images as string[])?.[0];
    const artistProfile = artwork.profiles as Record<string, string> | null;

    // Create Stripe Checkout Session — if this fails, revert the reservation
    let session;
    try {
      const stripe = getStripe();
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: buyerProfile?.email || user.email || undefined,
        // Stripe session expires_at: 30 minutes (Stripe's minimum).
        //
        // Asymmetry: our own reservation window is 10 minutes, enforced
        // by `/api/cron/release-reservations`. That cron also calls
        // `stripe.checkout.sessions.expire` on any still-open session
        // for the released artwork, so the buyer can't complete payment
        // on an artwork that has returned to the marketplace.
        //
        // We can't push this value below 30 min — Stripe rejects it —
        // which is why the cron is the authoritative release mechanism
        // and the Stripe expire call exists.
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        line_items: [
          {
            price_data: {
              currency: 'aud',
              product_data: {
                name: artwork.title,
                description: `by ${artistProfile?.full_name || 'Signo Artist'}${artwork.category ? ` • ${artwork.category}` : ''}`,
                ...(thumbnail ? { images: [thumbnail] } : {}),
              },
              unit_amount: Math.round(totalAmount * 100), // cents
            },
            quantity: 1,
          },
        ],
        metadata: {
          signo_artwork_id: artwork.id,
          signo_buyer_id: user.id,
          signo_artist_id: artwork.artist_id,
          signo_total_aud: String(totalAmount),
          signo_shipping_cost_aud: String(shippingCost),
          signo_category: artwork.category || 'original',
          signo_shipping_address: shippingAddress
            ? JSON.stringify(shippingAddress)
            : '',
        },
        success_url: `${appOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        // `?cancelled=1` lets the artwork detail page render a "your
        // reservation is still held" banner instead of silently dropping
        // the buyer back onto the page with no acknowledgement.
        cancel_url: `${appOrigin}/artwork/${artwork.id}?cancelled=1`,
      });
    } catch (stripeError) {
      // Stripe session creation failed — revert artwork back to approved
      console.error('[Checkout] Stripe session failed, reverting reservation:', stripeError);
      await supabase
        .from('artworks')
        .update({ status: 'approved' })
        .eq('id', artworkId)
        .eq('status', 'reserved');
      throw stripeError; // Re-throw so the outer catch handles the response
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[Checkout] Create session error:', err);

    // Return more specific error info for debugging
    let message = 'Failed to create checkout session';
    if (err instanceof Error) {
      // Stripe errors have a `type` property
      const stripeErr = err as Error & { type?: string; code?: string };
      if (stripeErr.type) {
        message = `Stripe error: ${stripeErr.message}`;
      } else {
        message = err.message;
      }
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
