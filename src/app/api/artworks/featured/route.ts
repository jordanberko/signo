import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

/**
 * GET /api/artworks/featured?limit=12
 *
 * Public endpoint — no auth required.
 * Returns the most recent approved artworks for the homepage.
 * Uses server-side Supabase client to avoid browser client
 * navigator.locks issues that can cause queries to hang.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit: 30 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { success } = rateLimit(`featured:${ip}`, { max: 30, windowMs: 60_000 });
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }
    const limit = parseInt(
      request.nextUrl.searchParams.get('limit') || '12',
      10,
    );
    const supabase = await createClient();

    // Fetch featured artworks first, then fill with recent approved
    const { data: featuredData } = await supabase
      .from('artworks')
      .select(
        'id, title, price_aud, images, medium, category, artist_id, width_cm, height_cm, is_featured, profiles!artworks_artist_id_fkey(id, full_name)',
      )
      .eq('status', 'approved')
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    const featured = featuredData || [];
    const featuredIds = featured.map((a) => a.id);
    const remaining = limit - featured.length;

    let recentData: typeof featured = [];
    if (remaining > 0) {
      const q = supabase
        .from('artworks')
        .select(
          'id, title, price_aud, images, medium, category, artist_id, width_cm, height_cm, is_featured, profiles!artworks_artist_id_fkey(id, full_name)',
        )
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(remaining);

      // Exclude already-fetched featured artworks
      if (featuredIds.length > 0) {
        q.not('id', 'in', `(${featuredIds.join(',')})`);
      }

      const { data: rd } = await q;
      recentData = rd || [];
    }

    const data = [...featured, ...recentData];

    // Map to frontend-friendly shape
    const artworks = (data || []).map((a: Record<string, unknown>) => ({
      id: a.id as string,
      title: a.title as string,
      artistName:
        (a.profiles as Record<string, string> | null)?.full_name || 'Unknown',
      artistId: a.artist_id as string,
      price: a.price_aud as number,
      imageUrl: ((a.images as string[]) || [])[0] || '',
      medium: a.medium as string,
      category: a.category as string,
      widthCm: (a.width_cm as number) || null,
      heightCm: (a.height_cm as number) || null,
    }));

    return NextResponse.json({ data: artworks });
  } catch (err) {
    console.error('[API /artworks/featured] Exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
