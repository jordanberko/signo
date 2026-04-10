import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET — fetch artwork details for checkout + buyer's saved address
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const artworkId = searchParams.get('id');

    if (!artworkId) {
      return NextResponse.json({ error: 'Missing artwork ID' }, { status: 400 });
    }

    const { data: { session } } = await supabase.auth.getSession();

    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch artwork
    const { data: artwork, error: artworkError } = await supabase
      .from('artworks')
      .select(
        'id, title, price_aud, category, images, medium, artist_id, shipping_weight_kg, profiles!artworks_artist_id_fkey(full_name)'
      )
      .eq('id', artworkId)
      .eq('status', 'approved')
      .single();

    if (artworkError || !artwork) {
      return NextResponse.json(
        { error: 'This artwork is not available for purchase.' },
        { status: 404 }
      );
    }

    // Fetch buyer's saved address from profile (stored in social_links._shipping_address)
    const { data: profile } = await supabase
      .from('profiles')
      .select('social_links')
      .eq('id', user.id)
      .single();

    let address = null;
    const socialLinks = profile?.social_links as Record<string, string> | null;
    if (socialLinks?._shipping_address) {
      try {
        const saved = JSON.parse(socialLinks._shipping_address);
        address = {
          street: saved.street || '',
          city: saved.city || '',
          state: saved.state || '',
          postcode: saved.postcode || '',
          country: saved.country || 'Australia',
        };
      } catch {
        // Ignore malformed JSON — treat as no saved address
      }
    }

    return NextResponse.json({
      artwork,
      address,
    });
  } catch (err) {
    console.error('[API checkout/artwork]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
