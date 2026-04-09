import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/favourites/ids
 *
 * Returns a flat array of artwork IDs that the current user has favourited.
 * Lightweight — no joins, used to pre-fill heart state on card grids.
 * Returns [] for unauthenticated users (no error).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ ids: [] });
    }

    const { data, error } = await supabase
      .from('favourites')
      .select('artwork_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('[API favourites/ids]', error.message);
      return NextResponse.json({ ids: [] });
    }

    const ids = (data || []).map((row: { artwork_id: string }) => row.artwork_id);
    return NextResponse.json({ ids });
  } catch (err) {
    console.error('[API favourites/ids]', err);
    return NextResponse.json({ ids: [] });
  }
}
