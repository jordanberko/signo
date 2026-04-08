import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
      .select('id, total_amount_aud, artist_payout_aud, status, payout_released_at, inspection_deadline, created_at, artworks(title, images)')
      .eq('artist_id', user.id)
      .in('status', ['paid', 'shipped', 'delivered', 'completed', 'disputed', 'refunded'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API artist/earnings]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: data || [] });
  } catch (err) {
    console.error('[API artist/earnings]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
