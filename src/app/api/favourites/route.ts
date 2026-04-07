import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET — check if user has favourited an artwork + get count
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const artworkId = searchParams.get('artworkId');

    if (!artworkId) {
      return NextResponse.json({ error: 'artworkId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const db = supabase as unknown as {
      from: (table: string) => {
        select: (cols: string, opts?: { count: string; head: boolean }) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
            };
            maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
          } & Promise<{ count: number | null; error: unknown }>;
        };
      };
    };

    // Get favourite count for this artwork
    const { count } = await (supabase as unknown as {
      from: (table: string) => {
        select: (cols: string, opts: { count: string; head: boolean }) => {
          eq: (col: string, val: string) => Promise<{ count: number | null; error: unknown }>;
        };
      };
    })
      .from('favourites')
      .select('*', { count: 'exact', head: true })
      .eq('artwork_id', artworkId);

    // Check if current user has favourited
    let isFavourited = false;
    if (user) {
      const { data } = await db
        .from('favourites')
        .select('id')
        .eq('user_id', user.id)
        .eq('artwork_id', artworkId)
        .maybeSingle();
      isFavourited = !!data;
    }

    return NextResponse.json({
      isFavourited,
      count: count ?? 0,
    });
  } catch (err) {
    console.error('[API favourites GET]', err);
    return NextResponse.json({ isFavourited: false, count: 0 });
  }
}

// POST — toggle favourite
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { artworkId } = await request.json();
    if (!artworkId) {
      return NextResponse.json({ error: 'artworkId required' }, { status: 400 });
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
        delete: () => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
    };

    // Check if already favourited
    const { data: existing } = await db
      .from('favourites')
      .select('id')
      .eq('user_id', user.id)
      .eq('artwork_id', artworkId)
      .maybeSingle();

    if (existing) {
      // Unfavourite
      await db
        .from('favourites')
        .delete()
        .eq('user_id', user.id)
        .eq('artwork_id', artworkId);
      return NextResponse.json({ favourited: false });
    } else {
      // Favourite
      const { error } = await db
        .from('favourites')
        .insert({ user_id: user.id, artwork_id: artworkId })
        .select('id')
        .single();
      if (error) {
        console.error('[API favourites POST]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ favourited: true });
    }
  } catch (err) {
    console.error('[API favourites POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
