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

    // Fetch buyer's saved address from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      artwork,
      address: profile
        ? {
            street: (profile as Record<string, unknown>).street_address || '',
            city: (profile as Record<string, unknown>).city || '',
            state: (profile as Record<string, unknown>).state || '',
            postcode: (profile as Record<string, unknown>).postcode || '',
            country: (profile as Record<string, unknown>).country || 'Australia',
          }
        : null,
    });
  } catch (err) {
    console.error('[API checkout/artwork]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
