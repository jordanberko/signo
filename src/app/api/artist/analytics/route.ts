import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Helper: generate array of dates for a period
function generateDateRange(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// Helper: aggregate rows by date
function aggregateByDate(
  rows: Array<{ created_at: string }>,
  dateRange: string[]
): Array<{ date: string; count: number }> {
  const counts = new Map<string, number>();
  for (const date of dateRange) {
    counts.set(date, 0);
  }
  for (const row of rows) {
    const date = row.created_at.split('T')[0];
    if (counts.has(date)) {
      counts.set(date, (counts.get(date) ?? 0) + 1);
    }
  }
  return dateRange.map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get('period');
    const period =
      periodParam === '7' ? 7 : periodParam === '90' ? 90 : 30;

    const dateRange = generateDateRange(period);
    const startDate = dateRange[0] + 'T00:00:00.000Z';

    // Cast supabase to work with tables not in the strict type (favourites)
    const db = supabase as unknown as {
      from: (table: string) => ReturnType<typeof supabase.from>;
    };

    // Run all queries in parallel
    const [
      profileViewsRes,
      favouritesRes,
      followersRes,
      ordersRes,
      artworksRes,
    ] = await Promise.allSettled([
      // Profile views for this artist
      supabase
        .from('profile_views')
        .select('created_at')
        .eq('profile_id', user.id)
        .gte('created_at', startDate),

      // Favourites on this artist's artworks — need to join through artworks
      // First get artist's artwork IDs, then get favourites
      (async () => {
        const { data: artworkIds } = await supabase
          .from('artworks')
          .select('id')
          .eq('artist_id', user.id);

        if (!artworkIds || artworkIds.length === 0) return { data: [] };

        const ids = artworkIds.map((a) => a.id);
        const { data } = await db
          .from('favourites')
          .select('created_at')
          .in('artwork_id', ids)
          .gte('created_at', startDate);

        return { data: data ?? [] };
      })(),

      // Followers
      supabase
        .from('follows')
        .select('created_at')
        .eq('followed_id', user.id)
        .gte('created_at', startDate),

      // Orders (sales)
      supabase
        .from('orders')
        .select('created_at, total_amount_aud, artist_payout_aud')
        .eq('artist_id', user.id)
        .in('status', ['completed', 'delivered', 'shipped', 'paid'])
        .gte('created_at', startDate),

      // All artworks for breakdown table — get favourites count separately
      supabase
        .from('artworks')
        .select('id, title, images, status, price_aud, created_at')
        .eq('artist_id', user.id)
        .in('status', ['approved', 'reserved', 'sold', 'paused', 'pending_review'])
        .order('created_at', { ascending: false }),
    ]);

    // Process profile views
    const profileViewRows =
      profileViewsRes.status === 'fulfilled'
        ? ((profileViewsRes.value as { data: Array<{ created_at: string }> | null }).data ?? [])
        : [];
    const profileViews = aggregateByDate(profileViewRows, dateRange);
    const totalProfileViews = profileViewRows.length;

    // Process favourites
    const favouriteRows =
      favouritesRes.status === 'fulfilled'
        ? ((favouritesRes.value as { data: Array<{ created_at: string }> }).data ?? [])
        : [];
    const favourites = aggregateByDate(favouriteRows, dateRange);
    const totalFavourites = favouriteRows.length;

    // Process followers
    const followerRows =
      followersRes.status === 'fulfilled'
        ? ((followersRes.value as { data: Array<{ created_at: string }> | null }).data ?? [])
        : [];
    const followers = aggregateByDate(followerRows, dateRange);
    const totalFollowers = followerRows.length;

    // Process sales
    const orderRows =
      ordersRes.status === 'fulfilled'
        ? ((ordersRes.value as { data: Array<{ created_at: string; total_amount_aud: number | null; artist_payout_aud: number | null }> | null }).data ?? [])
        : [];

    // Sales aggregation with revenue
    const salesMap = new Map<string, { count: number; revenue: number }>();
    for (const date of dateRange) {
      salesMap.set(date, { count: 0, revenue: 0 });
    }
    for (const row of orderRows) {
      const date = row.created_at.split('T')[0];
      const existing = salesMap.get(date);
      if (existing) {
        existing.count += 1;
        existing.revenue += row.artist_payout_aud ?? 0;
      }
    }
    const sales = dateRange.map((date) => ({
      date,
      count: salesMap.get(date)?.count ?? 0,
      revenue: Math.round((salesMap.get(date)?.revenue ?? 0) * 100) / 100,
    }));
    const totalSales = orderRows.length;
    const totalRevenue = Math.round(
      orderRows.reduce((sum, o) => sum + (o.artist_payout_aud ?? 0), 0) * 100
    ) / 100;

    // Process artworks with favourite counts
    const artworkRows =
      artworksRes.status === 'fulfilled'
        ? ((artworksRes.value as { data: Array<{ id: string; title: string; images: string[]; status: string; price_aud: number; created_at: string }> | null }).data ?? [])
        : [];

    // Fetch favourite counts for each artwork
    let artworkFavouriteCounts = new Map<string, number>();
    if (artworkRows.length > 0) {
      const artworkIds = artworkRows.map((a) => a.id);
      const { data: allFavs } = await db
        .from('favourites')
        .select('artwork_id')
        .in('artwork_id', artworkIds);

      if (allFavs) {
        for (const fav of allFavs as Array<{ artwork_id: string }>) {
          artworkFavouriteCounts.set(
            fav.artwork_id,
            (artworkFavouriteCounts.get(fav.artwork_id) ?? 0) + 1
          );
        }
      }
    }

    const artworks = artworkRows
      .map((a) => ({
        id: a.id,
        title: a.title,
        imageUrl: a.images?.[0] ?? '',
        status: a.status,
        price: a.price_aud,
        favouriteCount: artworkFavouriteCounts.get(a.id) ?? 0,
        listedDate: a.created_at,
      }))
      .sort((a, b) => b.favouriteCount - a.favouriteCount);

    return NextResponse.json({
      profileViews,
      totalProfileViews,
      favourites,
      totalFavourites,
      followers,
      totalFollowers,
      sales,
      totalSales,
      totalRevenue,
      artworks,
    });
  } catch (err) {
    console.error('[API artist/analytics]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
