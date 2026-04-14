import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/collections
 * List published collections with artwork counts. Public, cached.
 * Query param: minArtworks=3 to filter by minimum artwork count.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const minArtworks = parseInt(request.nextUrl.searchParams.get('minArtworks') || '0', 10);

    const { data: collections, error } = await supabase
      .from('collections')
      .select('*, collection_artworks(id)')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API /collections] Query error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let result = (collections || []).map((c: Record<string, unknown>) => {
      const artworkCount = Array.isArray(c.collection_artworks)
        ? (c.collection_artworks as unknown[]).length
        : 0;
      return {
        ...c,
        artwork_count: artworkCount,
        collection_artworks: undefined,
      };
    });

    if (minArtworks > 0) {
      result = result.filter((c) => c.artwork_count >= minArtworks);
    }

    return NextResponse.json(
      { data: result },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    );
  } catch (err) {
    console.error('[API /collections] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
