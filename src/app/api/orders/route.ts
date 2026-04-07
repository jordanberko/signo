import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET — fetch all orders for the authenticated buyer
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('orders')
      .select(
        'id, total_amount_aud, status, created_at, artworks(title, images), profiles!orders_artist_id_fkey(full_name)'
      )
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API orders]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: data || [] });
  } catch (err) {
    console.error('[API orders]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
