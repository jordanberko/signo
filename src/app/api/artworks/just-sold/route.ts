import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

/**
 * GET /api/artworks/just-sold?limit=20
 *
 * Public endpoint — no auth required.
 * Returns recently sold artworks (completed orders within last 30 days).
 * Does NOT expose any buyer information.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit: 30 requests per minute per IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { success } = rateLimit(`just-sold:${ip}`, {
      max: 30,
      windowMs: 60_000,
    });
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '20', 10) || 20, 1), 50);

    const supabase = await createClient();

    // 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('orders')
      .select(
        'artwork_id, updated_at, artworks!orders_artwork_id_fkey(id, title, images, medium, width_cm, height_cm, price_aud, artist_id, profiles!artworks_artist_id_fkey(id, full_name))',
      )
      .eq('status', 'completed')
      .gte('updated_at', thirtyDaysAgo.toISOString())
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[API /artworks/just-sold] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sold artworks' },
        { status: 500 },
      );
    }

    // Map to the public-facing response shape
    const items = (data || [])
      .filter((row: Record<string, unknown>) => row.artworks)
      .map((row: Record<string, unknown>) => {
        const artwork = row.artworks as Record<string, unknown>;
        const artist = artwork.profiles as Record<string, string> | null;
        const images = (artwork.images as string[]) || [];

        return {
          artworkId: artwork.id as string,
          title: artwork.title as string,
          imageUrl: images[0] || '',
          medium: (artwork.medium as string) || null,
          widthCm: (artwork.width_cm as number) || null,
          heightCm: (artwork.height_cm as number) || null,
          price: artwork.price_aud as number,
          artistName: artist?.full_name || 'Unknown',
          artistId: artwork.artist_id as string,
          soldAt: row.updated_at as string,
        };
      });

    return NextResponse.json(
      { data: items },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch (err) {
    console.error('[API /artworks/just-sold] Exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
