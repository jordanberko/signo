import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET — check follow status + follower count for an artist
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get('artistId');

    if (!artistId) {
      return NextResponse.json({ error: 'artistId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    // Get follower count for this artist
    const { count } = await (supabase as unknown as {
      from: (table: string) => {
        select: (cols: string, opts: { count: string; head: boolean }) => {
          eq: (col: string, val: string) => Promise<{ count: number | null; error: unknown }>;
        };
      };
    })
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('followed_id', artistId);

    // Check if current user is following
    let isFollowing = false;
    if (user) {
      const db = supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              eq: (col: string, val: string) => {
                maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
              };
            };
          };
        };
      };

      const { data } = await db
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('followed_id', artistId)
        .maybeSingle();
      isFollowing = !!data;
    }

    return NextResponse.json({
      isFollowing,
      followerCount: count ?? 0,
    });
  } catch (err) {
    console.error('[API follows GET]', err);
    return NextResponse.json({ isFollowing: false, followerCount: 0 });
  }
}

// POST — follow an artist
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { followedId } = await request.json();
    if (!followedId) {
      return NextResponse.json({ error: 'followedId required' }, { status: 400 });
    }

    // Don't allow following yourself
    if (followedId === user.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    const db = supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{ data: { id: string } | null; error: unknown }>;
            };
          };
        };
        insert: (row: Record<string, string>) => {
          select: (cols: string) => {
            single: () => Promise<{ data: unknown; error: { message: string } | null }>;
          };
        };
      };
    };

    // Check if already following
    const { data: existing } = await db
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('followed_id', followedId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ followed: true, message: 'Already following' });
    }

    const { error } = await db
      .from('follows')
      .insert({ follower_id: user.id, followed_id: followedId })
      .select('id')
      .single();

    if (error) {
      console.error('[API follows POST]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ followed: true }, { status: 201 });
  } catch (err) {
    console.error('[API follows POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — unfollow an artist
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Support both body and query params
    let followedId: string | null = null;
    const { searchParams } = new URL(request.url);
    followedId = searchParams.get('followedId');

    if (!followedId) {
      try {
        const body = await request.json();
        followedId = body.followedId;
      } catch {
        // No body provided
      }
    }

    if (!followedId) {
      return NextResponse.json({ error: 'followedId required' }, { status: 400 });
    }

    const db = supabase as unknown as {
      from: (table: string) => {
        delete: () => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
    };

    const { error } = await db
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('followed_id', followedId);

    if (error) {
      console.error('[API follows DELETE]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ followed: false });
  } catch (err) {
    console.error('[API follows DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
