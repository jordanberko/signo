import { createClient as createAnonClient } from '@supabase/supabase-js';

/**
 * Server-side featured-artworks fetcher for the homepage.
 *
 * Mirrors /api/artworks/featured's query and shape, but runs during
 * server render with a cookie-less anon client so the homepage can be
 * ISR-cached and the artwork grid ships in the initial HTML — the
 * previous client-side fetch meant images didn't even START loading
 * until after hydration + an API round-trip.
 *
 * Returns null on failure (caller renders a graceful fallback) vs []
 * for a genuinely empty marketplace.
 */

export interface FeaturedArtwork {
  id: string;
  title: string;
  artistName: string;
  artistId: string;
  price: number;
  imageUrl: string;
  medium: string;
  category: 'original' | 'print' | 'digital';
  widthCm?: number | null;
  heightCm?: number | null;
  availability?: string;
}

export async function getFeaturedArtworks(
  limit = 12,
): Promise<FeaturedArtwork[] | null> {
  try {
    const supabase = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // Hide artworks from paused/cancelled artists
    const { data: hiddenArtists } = await supabase
      .from('profiles')
      .select('id')
      .in('subscription_status', ['paused', 'cancelled']);

    const hiddenIds = (hiddenArtists || []).map((a: { id: string }) => a.id);

    let featuredQuery = supabase
      .from('artworks')
      .select(
        'id, title, price_aud, images, medium, category, artist_id, width_cm, height_cm, is_featured, availability, available_from, profiles!artworks_artist_id_fkey(id, full_name)',
      )
      .eq('status', 'approved')
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (hiddenIds.length > 0) {
      featuredQuery = featuredQuery.not(
        'artist_id',
        'in',
        `(${hiddenIds.join(',')})`,
      );
    }

    const { data, error } = await featuredQuery;
    if (error) {
      console.error('[featured-artworks] Query error:', error.message);
      return null;
    }

    return (data || []).map((a: Record<string, unknown>) => ({
      id: a.id as string,
      title: a.title as string,
      artistName:
        (a.profiles as Record<string, string> | null)?.full_name || 'Unknown',
      artistId: a.artist_id as string,
      price: a.price_aud as number,
      imageUrl: ((a.images as string[]) || [])[0] || '',
      medium: a.medium as string,
      category: a.category as FeaturedArtwork['category'],
      widthCm: (a.width_cm as number) || null,
      heightCm: (a.height_cm as number) || null,
      availability: (a.availability as string) || 'available',
    }));
  } catch (err) {
    console.error('[featured-artworks] Exception:', err);
    return null;
  }
}
