import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const limit = parseInt(
      request.nextUrl.searchParams.get('limit') || '12',
      10,
    );
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('artworks')
      .select(
        'id, title, price_aud, images, medium, category, artist_id, profiles!artworks_artist_id_fkey(id, full_name)',
      )
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[API /artworks/featured] Query error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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
