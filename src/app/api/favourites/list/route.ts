import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET — list all favourited artworks for the authenticated user
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'recent';

    // Fetch favourites with joined artwork + artist data
    const db = supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            order: (col: string, opts: { ascending: boolean }) => Promise<{
              data: Record<string, unknown>[] | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };

    const { data, error } = await db
      .from('favourites')
      .select(
        'id, created_at, artwork_id, artworks(id, title, price_aud, images, medium, category, artist_id, profiles!artworks_artist_id_fkey(id, full_name))'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API favourites/list]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map and sort
    let artworks = (data || [])
      .filter((f: Record<string, unknown>) => f.artworks) // filter out deleted artworks
      .map((f: Record<string, unknown>) => {
        const a = f.artworks as Record<string, unknown>;
        const artist = a.profiles as Record<string, string> | null;
        return {
          id: a.id as string,
          title: a.title as string,
          price_aud: a.price_aud as number,
          images: (a.images as string[]) || [],
          medium: (a.medium as string) || null,
          category: a.category as string,
          artist_id: a.artist_id as string,
          artistName: artist?.full_name || 'Unknown Artist',
          artistId: artist?.id || (a.artist_id as string),
          favouritedAt: f.created_at as string,
        };
      });

    // Apply sorting
    switch (sort) {
      case 'price_asc':
        artworks.sort((a, b) => a.price_aud - b.price_aud);
        break;
      case 'price_desc':
        artworks.sort((a, b) => b.price_aud - a.price_aud);
        break;
      case 'artist':
        artworks.sort((a, b) => a.artistName.localeCompare(b.artistName));
        break;
      case 'recent':
      default:
        // Already sorted by created_at desc from query
        break;
    }

    return NextResponse.json({
      artworks,
      count: artworks.length,
    });
  } catch (err) {
    console.error('[API favourites/list]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
