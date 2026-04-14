import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET — list all artists the current user follows with profile info
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

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

    // Fetch follows with joined artist profile data
    const { data, error } = await db
      .from('follows')
      .select(
        'id, created_at, followed_id, profiles!follows_followed_id_fkey(id, full_name, avatar_url, location)'
      )
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API follows/list]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get artwork counts for each followed artist
    const artists = (data || [])
      .filter((f: Record<string, unknown>) => f.profiles)
      .map((f: Record<string, unknown>) => {
        const p = f.profiles as Record<string, unknown>;
        return {
          id: p.id as string,
          full_name: (p.full_name as string) || 'Artist',
          avatar_url: (p.avatar_url as string) || null,
          location: (p.location as string) || null,
          followedAt: f.created_at as string,
        };
      });

    // Fetch artwork counts for all followed artists in one query
    const artistIds = artists.map((a) => a.id);
    const artworkCounts: Record<string, number> = {};

    if (artistIds.length > 0) {
      const countDb = supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            in: (col: string, vals: string[]) => {
              eq: (col: string, val: string) => Promise<{
                data: { artist_id: string }[] | null;
                error: unknown;
              }>;
            };
          };
        };
      };

      const { data: artworks } = await countDb
        .from('artworks')
        .select('artist_id')
        .in('artist_id', artistIds)
        .eq('status', 'approved');

      if (artworks) {
        for (const a of artworks) {
          artworkCounts[a.artist_id] = (artworkCounts[a.artist_id] || 0) + 1;
        }
      }
    }

    const result = artists.map((a) => ({
      ...a,
      artworkCount: artworkCounts[a.id] || 0,
    }));

    return NextResponse.json({
      artists: result,
      count: result.length,
    });
  } catch (err) {
    console.error('[API follows/list]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
