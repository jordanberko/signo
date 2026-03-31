'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DollarSign, Package, Eye, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';

interface Stats {
  totalSales: number;
  activeListings: number;
  pendingReview: number;
  totalEarnings: number;
}

export default function ArtistDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalSales: 0, activeListings: 0, pendingReview: 0, totalEarnings: 0 });
  const [recentOrders, setRecentOrders] = useState<{ id: string; title: string; buyer: string; amount: number; status: string; date: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    async function fetchStats() {
      const supabase = createClient();

      // Count active listings
      const { count: activeCount } = await supabase
        .from('artworks')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', user!.id)
        .eq('status', 'approved');

      // Count pending review
      const { count: pendingCount } = await supabase
        .from('artworks')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', user!.id)
        .eq('status', 'pending_review');

      // Get orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*, artworks(title), profiles!orders_buyer_id_fkey(full_name)')
        .eq('artist_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const totalEarnings = orders?.reduce((sum, o) => sum + (o.artist_payout_aud || 0), 0) || 0;

      setStats({
        totalSales: orders?.length || 0,
        activeListings: activeCount || 0,
        pendingReview: pendingCount || 0,
        totalEarnings,
      });

      if (orders) {
        setRecentOrders(orders.map((o: Record<string, unknown>) => ({
          id: o.id as string,
          title: (o.artworks as Record<string, string>)?.title || 'Unknown',
          buyer: (o.profiles as Record<string, string>)?.full_name || 'Unknown',
          amount: o.artist_payout_aud as number,
          status: o.status as string,
          date: new Date(o.created_at as string).toLocaleDateString('en-AU'),
        })));
      }
    }
    fetchStats();
  }, [user]);

  const STATS = [
    { label: 'Total Earnings', value: formatPrice(stats.totalEarnings), icon: DollarSign },
    { label: 'Active Listings', value: String(stats.activeListings), icon: Package },
    { label: 'Pending Review', value: String(stats.pendingReview), icon: Eye },
    { label: 'Total Sales', value: String(stats.totalSales), icon: TrendingUp },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Seller Dashboard</h1>
          <p className="text-muted mt-1">Manage your listings and sales{user ? `, ${user.full_name}` : ''}</p>
        </div>
        <Link
          href="/artist/artworks/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light transition-colors"
        >
          <Plus className="h-4 w-4" />
          Upload Artwork
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-white border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted">{stat.label}</span>
              <stat.icon className="h-5 w-5 text-muted" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <Link href="/artist/artworks/new" className="flex items-center gap-4 p-5 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors">
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
            <Plus className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="font-semibold">Upload New Artwork</p>
            <p className="text-xs text-muted">Add a new listing to your storefront</p>
          </div>
        </Link>
        <Link href="/artist/artworks" className="flex items-center gap-4 p-5 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors">
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
            <Package className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="font-semibold">Manage Listings</p>
            <p className="text-xs text-muted">Edit, pause, or update your artwork</p>
          </div>
        </Link>
        <Link href="/artist/earnings" className="flex items-center gap-4 p-5 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors">
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="font-semibold">View Earnings</p>
            <p className="text-xs text-muted">Track payouts and earnings</p>
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="border border-border rounded-lg">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-lg">Recent Orders</h2>
          <Link href="/artist/orders" className="text-sm text-accent hover:underline flex items-center gap-1">
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-muted">No orders yet. Once your artwork is listed and approved, orders will appear here.</p>
            <Link href="/artist/artworks/new" className="inline-flex items-center gap-2 mt-4 text-accent font-medium hover:underline">
              Upload your first artwork <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-muted border-b border-border">
                <th className="p-4">Artwork</th>
                <th className="p-4">Buyer</th>
                <th className="p-4">Your Payout</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0">
                  <td className="p-4 font-medium text-sm">{order.title}</td>
                  <td className="p-4 text-sm text-muted">{order.buyer}</td>
                  <td className="p-4 text-sm font-medium">{formatPrice(order.amount)}</td>
                  <td className="p-4"><span className="text-xs px-2 py-1 bg-muted-bg rounded capitalize">{order.status.replace('_', ' ')}</span></td>
                  <td className="p-4 text-sm text-muted">{order.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
