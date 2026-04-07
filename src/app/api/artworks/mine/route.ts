import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET — fetch all artworks belonging to the authenticated artist
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('artworks')
      .select('*')
      .eq('artist_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API artworks/mine]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ artworks: data || [] });
  } catch (err) {
    console.error('[API artworks/mine]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
