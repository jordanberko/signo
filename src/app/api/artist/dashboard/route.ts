import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET — fetch artist dashboard stats + recent orders
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Run all queries in parallel
    const [activeRes, pendingRes, ordersRes, profileRes] = await Promise.allSettled([
      supabase
        .from('artworks')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', user.id)
        .eq('status', 'approved'),
      supabase
        .from('artworks')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', user.id)
        .eq('status', 'pending_review'),
      supabase
        .from('orders')
        .select(
          '*, artworks(title), profiles!orders_buyer_id_fkey(full_name)'
        )
        .eq('artist_id', user.id)
        .in('status', ['paid', 'shipped', 'delivered', 'completed'])
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('subscription_status, grace_period_deadline')
        .eq('id', user.id)
        .single(),
    ]);

    const activeListings =
      activeRes.status === 'fulfilled' ? activeRes.value.count || 0 : 0;
    const pendingReview =
      pendingRes.status === 'fulfilled' ? pendingRes.value.count || 0 : 0;

    const allOrders =
      ordersRes.status === 'fulfilled' ? ordersRes.value.data || [] : [];

    const totalSales = allOrders.length;
    const totalEarnings = allOrders.reduce(
      (sum: number, o: Record<string, unknown>) =>
        sum + ((o.artist_payout_aud as number) || 0),
      0
    );

    const profile =
      profileRes.status === 'fulfilled' ? profileRes.value.data : null;

    // Recent 5 orders for the table
    const recentOrders = allOrders.slice(0, 5).map((o: Record<string, unknown>) => {
      const salePrice = (o.total_amount_aud as number) || 0;
      const payout = (o.artist_payout_aud as number) || 0;
      const stripeFee = Math.round((salePrice - payout) * 100) / 100;
      return {
        id: o.id,
        title: (o.artworks as Record<string, string>)?.title || 'Unknown',
        buyer: (o.profiles as Record<string, string>)?.full_name || 'Unknown',
        salePrice,
        stripeFee,
        youReceive: payout,
        status: o.status,
        date: o.created_at,
      };
    });

    return NextResponse.json({
      stats: { totalSales, totalEarnings, activeListings, pendingReview },
      recentOrders,
      subscription_status: profile?.subscription_status ?? 'trial',
      grace_period_deadline: profile?.grace_period_deadline ?? null,
    });
  } catch (err) {
    console.error('[API artist/dashboard]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
