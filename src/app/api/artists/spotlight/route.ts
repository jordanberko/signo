import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

/**
 * GET /api/artists/spotlight?limit=10
 *
 * Public endpoint — no auth required.
 * Returns artists who have at least 1 approved artwork, along with
 * their profile info, artwork count, and a sample artwork image.
 *
 * Used by the homepage "Meet Our Artists" section and the
 * enhanced Artist Spotlight.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit: 30 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { success } = rateLimit(`spotlight:${ip}`, { max: 30, windowMs: 60_000 });
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }
    const limit = parseInt(
      request.nextUrl.searchParams.get('limit') || '10',
      10,
    );
    const supabase = await createClient();

    // Hide artists with paused/cancelled subscriptions
    const { data: hiddenArtists } = await supabase
      .from('profiles')
      .select('id')
      .in('subscription_status', ['paused', 'cancelled']);

    const hiddenIds = new Set((hiddenArtists || []).map((a: { id: string }) => a.id));

    // Step 1: Get all approved artworks grouped by artist
    // We fetch artist_id + first image for each approved artwork
    const { data: artworkRows, error: artworkError } = await supabase
      .from('artworks')
      .select('artist_id, images, title')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (artworkError) {
      console.error('[API /artists/spotlight] Artwork query error:', artworkError);
      return NextResponse.json({ error: 'Failed to fetch artworks' }, { status: 500 });
    }

    if (!artworkRows || artworkRows.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Step 2: Aggregate per artist — count + up to 2 sample images
    const artistMap = new Map<
      string,
      { count: number; sampleImages: string[]; sampleTitle: string }
    >();

    for (const row of artworkRows) {
      const aid = row.artist_id as string;
      const images = (row.images as string[]) || [];
      const firstImage = images[0] || '';

      if (!artistMap.has(aid)) {
        artistMap.set(aid, {
          count: 0,
          sampleImages: [],
          sampleTitle: (row.title as string) || '',
        });
      }

      const entry = artistMap.get(aid)!;
      entry.count += 1;
      if (entry.sampleImages.length < 2 && firstImage) {
        entry.sampleImages.push(firstImage);
      }
    }

    // Filter out paused/cancelled subscription artists
    const artistIds = Array.from(artistMap.keys()).filter((id) => !hiddenIds.has(id));

    if (artistIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Step 3: Fetch profile data for these artists
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, bio, location')
      .in('id', artistIds);

    if (profileError) {
      console.error('[API /artists/spotlight] Profile query error:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    // Step 4: Merge and sort by artwork count descending
    const artists = (profiles || [])
      .map((p) => {
        const agg = artistMap.get(p.id);
        return {
          id: p.id,
          fullName: p.full_name || 'Unknown Artist',
          avatarUrl: p.avatar_url || null,
          bio: p.bio || null,
          location: p.location || null,
          artworkCount: agg?.count || 0,
          sampleImages: agg?.sampleImages || [],
          sampleTitle: agg?.sampleTitle || '',
        };
      })
      .sort((a, b) => b.artworkCount - a.artworkCount)
      .slice(0, limit);

    return NextResponse.json({ data: artists }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    console.error('[API /artists/spotlight] Exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
