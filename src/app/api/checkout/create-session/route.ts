import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/config';

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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { artworkId, shippingAddress, saveAddress, origin } = body;

    if (!artworkId) {
      return NextResponse.json(
        { error: 'Missing artworkId' },
        { status: 400 }
      );
    }

    // Fetch artwork — must be approved
    const { data: artwork, error: artworkError } = await supabase
      .from('artworks')
      .select(
        'id, title, price_aud, category, images, artist_id, shipping_weight_kg, profiles!artworks_artist_id_fkey(full_name, email)'
      )
      .eq('id', artworkId)
      .eq('status', 'approved')
      .single();

    if (artworkError || !artwork) {
      return NextResponse.json(
        { error: 'Artwork not found or no longer available' },
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

    const appOrigin =
      origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const thumbnail = (artwork.images as string[])?.[0];
    const artistProfile = artwork.profiles as Record<string, string> | null;

    // Create Stripe Checkout Session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: buyerProfile?.email || user.email || undefined,
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
      success_url: `${appOrigin}/orders/{CHECKOUT_SESSION_ID}?success=true`,
      cancel_url: `${appOrigin}/artwork/${artwork.id}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[Checkout] Create session error:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
