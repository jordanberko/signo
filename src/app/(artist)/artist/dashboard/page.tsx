'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  DollarSign,
  Package,
  Eye,
  TrendingUp,
  Plus,
  ArrowRight,
  CreditCard,
  Sparkles,
  Loader2,
  Banknote,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';

interface Stats {
  totalSales: number;
  activeListings: number;
  pendingReview: number;
  totalEarnings: number;
}

interface RecentOrder {
  id: string;
  title: string;
  buyer: string;
  salePrice: number;
  stripeFee: number;
  youReceive: number;
  status: string;
  date: string;
}

export default function ArtistDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalSales: 0,
    activeListings: 0,
    pendingReview: 0,
    totalEarnings: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchStats() {
      setLoading(true);
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

      // Get ALL completed orders for total sales count & earnings
      const { data: allOrders } = await supabase
        .from('orders')
        .select('total_amount_aud, artist_payout_aud')
        .eq('artist_id', user!.id)
        .in('status', ['paid', 'shipped', 'delivered', 'completed']);

      // Total earnings = sum of (total_amount_aud - stripe fee) for all completed orders
      // artist_payout_aud already reflects this (sale price minus Stripe fees, zero commission)
      const totalEarnings =
        allOrders?.reduce((sum, o) => sum + (o.artist_payout_aud || 0), 0) || 0;

      // Get recent 5 orders for the table
      const { data: recent } = await supabase
        .from('orders')
        .select(
          '*, artworks(title), profiles!orders_buyer_id_fkey(full_name)'
        )
        .eq('artist_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalSales: allOrders?.length || 0,
        activeListings: activeCount || 0,
        pendingReview: pendingCount || 0,
        totalEarnings,
      });

      if (recent) {
        setRecentOrders(
          recent.map((o: Record<string, unknown>) => {
            const salePrice = (o.total_amount_aud as number) || 0;
            const payout = (o.artist_payout_aud as number) || 0;
            const stripeFee = Math.round((salePrice - payout) * 100) / 100;
            return {
              id: o.id as string,
              title:
                (o.artworks as Record<string, string>)?.title || 'Unknown',
              buyer:
                (o.profiles as Record<string, string>)?.full_name || 'Unknown',
              salePrice,
              stripeFee,
              youReceive: payout,
              status: o.status as string,
              date: new Date(o.created_at as string).toLocaleDateString(
                'en-AU'
              ),
            };
          })
        );
      }

      setLoading(false);
    }

    fetchStats();
  }, [user]);

  const STATS = [
    {
      label: 'Total Sales',
      value: String(stats.totalSales),
      icon: TrendingUp,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Total Earnings',
      value: formatPrice(stats.totalEarnings),
      icon: DollarSign,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Active Listings',
      value: String(stats.activeListings),
      icon: Package,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'Pending Review',
      value: String(stats.pendingReview),
      icon: Eye,
      color: 'text-amber-600 bg-amber-50',
    },
  ];

  const statusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700';
      case 'shipped':
      case 'delivered':
        return 'bg-blue-50 text-blue-700';
      case 'paid':
        return 'bg-amber-50 text-amber-700';
      case 'disputed':
        return 'bg-red-50 text-red-700';
      case 'refunded':
      case 'cancelled':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Seller Dashboard</h1>
          <p className="text-muted mt-1">
            Manage your listings and sales
            {user ? `, ${user.full_name}` : ''}
          </p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-border rounded-lg p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted">{stat.label}</span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${stat.color}`}
              >
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold">
              {loading ? (
                <span className="inline-block w-16 h-7 bg-gray-100 rounded animate-pulse" />
              ) : (
                stat.value
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Subscription Status Card */}
      <div className="bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20 rounded-lg p-5 mb-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-accent/15 rounded-full flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-accent-dark" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold">Subscription</p>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Early Access
              </span>
            </div>
            <p className="text-sm text-muted mt-0.5">
              Free during our launch period &mdash; $30/mo starts later.
              Zero commission, keep 100% of every sale.
            </p>
          </div>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-xs text-muted">Your plan</p>
          <p className="text-sm font-semibold text-accent-dark">$30/mo</p>
          <p className="text-xs text-green-600 font-medium">Free now</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Link
          href="/artist/artworks/new"
          className="flex items-center gap-4 p-5 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors"
        >
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
            <Plus className="h-5 w-5 text-accent-dark" />
          </div>
          <div>
            <p className="font-semibold text-sm">Upload Artwork</p>
            <p className="text-xs text-muted">
              Add a new listing
            </p>
          </div>
        </Link>
        <Link
          href="/artist/artworks"
          className="flex items-center gap-4 p-5 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors"
        >
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
            <Package className="h-5 w-5 text-accent-dark" />
          </div>
          <div>
            <p className="font-semibold text-sm">Manage Listings</p>
            <p className="text-xs text-muted">
              Edit or update artwork
            </p>
          </div>
        </Link>
        <Link
          href="/artist/earnings"
          className="flex items-center gap-4 p-5 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors"
        >
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-accent-dark" />
          </div>
          <div>
            <p className="font-semibold text-sm">View Earnings</p>
            <p className="text-xs text-muted">
              Sales &amp; payout history
            </p>
          </div>
        </Link>
        <Link
          href="/artist/settings/payouts"
          className="flex items-center gap-4 p-5 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors"
        >
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
            <Banknote className="h-5 w-5 text-accent-dark" />
          </div>
          <div>
            <p className="font-semibold text-sm">Payout Settings</p>
            <p className="text-xs text-muted">
              Bank &amp; Stripe Connect
            </p>
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="border border-border rounded-lg">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-lg">Recent Orders</h2>
          <Link
            href="/artist/orders"
            className="text-sm text-accent-dark hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="p-10 text-center">
            <Package className="h-10 w-10 text-muted mx-auto mb-3" />
            <p className="font-medium mb-1">No orders yet</p>
            <p className="text-sm text-muted mb-4">
              Once your artwork is listed and approved, orders will appear
              here.
            </p>
            <Link
              href="/artist/artworks/new"
              className="inline-flex items-center gap-2 text-accent-dark font-medium hover:underline"
            >
              Upload your first artwork <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-muted border-b border-border">
                    <th className="p-4">Artwork</th>
                    <th className="p-4">Buyer</th>
                    <th className="p-4">Sale Price</th>
                    <th className="p-4">Stripe Fee</th>
                    <th className="p-4">You Receive</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="p-4 font-medium text-sm">
                        {order.title}
                      </td>
                      <td className="p-4 text-sm text-muted">
                        {order.buyer}
                      </td>
                      <td className="p-4 text-sm">
                        {formatPrice(order.salePrice)}
                      </td>
                      <td className="p-4 text-sm text-muted">
                        −{formatPrice(order.stripeFee)}
                      </td>
                      <td className="p-4 text-sm font-semibold text-green-700">
                        {formatPrice(order.youReceive)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusStyle(order.status)}`}
                        >
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted">{order.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {recentOrders.map((order) => (
                <div key={order.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{order.title}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusStyle(order.status)}`}
                    >
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">{order.buyer}</span>
                    <span className="text-muted">{order.date}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">
                      {formatPrice(order.salePrice)} − {formatPrice(order.stripeFee)} fee
                    </span>
                    <span className="font-semibold text-green-700">
                      {formatPrice(order.youReceive)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Earnings note */}
      <p className="text-xs text-muted text-center mt-4">
        Earnings reflect 100% of sale price minus Stripe processing fees (~1.75% + 30c). Zero commission.
      </p>
    </div>
  );
}
