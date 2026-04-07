import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/stats
 *
 * Returns platform-wide stats for the admin dashboard.
 * Uses server-side Supabase client for reliable auth.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    const [users, artists, buyers, artworks, pending, approved, orders, disputes] =
      await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'artist'),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'buyer'),
        supabase.from('artworks').select('*', { count: 'exact', head: true }),
        supabase
          .from('artworks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending_review'),
        supabase
          .from('artworks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved'),
        supabase.from('orders').select('platform_fee_aud'),
        supabase
          .from('disputes')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open'),
      ]);

    const totalRevenue =
      orders.data?.reduce(
        (sum: number, o: Record<string, unknown>) =>
          sum + ((o.platform_fee_aud as number) || 0),
        0,
      ) || 0;

    return NextResponse.json({
      data: {
        totalUsers: users.count || 0,
        totalArtists: artists.count || 0,
        totalBuyers: buyers.count || 0,
        totalArtworks: artworks.count || 0,
        pendingReviews: pending.count || 0,
        approvedArtworks: approved.count || 0,
        totalOrders: orders.data?.length || 0,
        totalRevenue,
        openDisputes: disputes.count || 0,
      },
    });
  } catch (err) {
    console.error('[API /admin/stats] Exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
