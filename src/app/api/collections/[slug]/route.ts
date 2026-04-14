import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/collections/[slug]
 * Get single published collection with its artworks (full artwork data + artist). Public, cached.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: collection, error } = await supabase
      .from('collections')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error || !collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Fetch artworks ordered by position, with artist profiles
    const { data: collectionArtworks } = await supabase
      .from('collection_artworks')
      .select('*, artworks(*, profiles!artworks_artist_id_fkey(id, full_name, avatar_url))')
      .eq('collection_id', (collection as { id: string }).id)
      .order('position', { ascending: true });

    const artworks = (collectionArtworks || []).map((ca: Record<string, unknown>) => {
      const artwork = ca.artworks as Record<string, unknown> | null;
      if (!artwork) return null;
      return {
        ...artwork,
        artist: artwork.profiles,
        profiles: undefined,
      };
    }).filter(Boolean);

    return NextResponse.json(
      { data: { ...collection, artworks } },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    );
  } catch (err) {
    console.error('[API /collections/[slug]] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
