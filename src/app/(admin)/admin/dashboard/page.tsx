'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Package, DollarSign, AlertTriangle, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';

interface PlatformStats {
  totalUsers: number;
  totalArtists: number;
  totalBuyers: number;
  totalArtworks: number;
  pendingReviews: number;
  approvedArtworks: number;
  totalOrders: number;
  totalRevenue: number;
  openDisputes: number;
}

export default function AdminDashboardPage() {
  const { loading: authLoading } = useRequireAuth('admin');
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0, totalArtists: 0, totalBuyers: 0,
    totalArtworks: 0, pendingReviews: 0, approvedArtworks: 0,
    totalOrders: 0, totalRevenue: 0, openDisputes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    async function fetchStats() {
      const supabase = createClient();

      const [users, artists, buyers, artworks, pending, approved, orders, disputes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'artist'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'buyer'),
        supabase.from('artworks').select('*', { count: 'exact', head: true }),
        supabase.from('artworks').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
        supabase.from('artworks').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('orders').select('platform_fee_aud'),
        supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      ]);

      const totalRevenue = orders.data?.reduce((sum, o) => sum + (o.platform_fee_aud || 0), 0) || 0;

      setStats({
        totalUsers: users.count || 0,
        totalArtists: artists.count || 0,
        totalBuyers: buyers.count || 0,
        totalArtworks: artworks.count || 0,
        pendingReviews: pending.count || 0,
        approvedArtworks: approved.count || 0,
        totalOrders: orders.data?.length || 0,
        totalRevenue,
        openDisputes: disputes.count || 0,
      });
      setLoading(false);
    }
    fetchStats();
  }, [authLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted mt-1">Platform overview and management</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">Total Users</span>
            <Users className="h-5 w-5 text-muted" />
          </div>
          <p className="text-2xl font-bold">{stats.totalUsers}</p>
          <p className="text-xs text-muted mt-1">{stats.totalArtists} artists, {stats.totalBuyers} buyers</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">Total Artworks</span>
            <Package className="h-5 w-5 text-muted" />
          </div>
          <p className="text-2xl font-bold">{stats.totalArtworks}</p>
          <p className="text-xs text-muted mt-1">{stats.approvedArtworks} approved</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">Platform Revenue</span>
            <DollarSign className="h-5 w-5 text-muted" />
          </div>
          <p className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</p>
          <p className="text-xs text-muted mt-1">{stats.totalOrders} orders</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">Open Disputes</span>
            <AlertTriangle className="h-5 w-5 text-muted" />
          </div>
          <p className="text-2xl font-bold">{stats.openDisputes}</p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/admin/reviews" className="flex items-center justify-between p-5 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold">Review Queue</p>
              <p className="text-xs text-muted">{stats.pendingReviews} pending</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted" />
        </Link>
        <Link href="/admin/users" className="flex items-center justify-between p-5 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold">Manage Users</p>
              <p className="text-xs text-muted">{stats.totalUsers} total</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted" />
        </Link>
        <Link href="/admin/disputes" className="flex items-center justify-between p-5 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="font-semibold">Disputes</p>
              <p className="text-xs text-muted">{stats.openDisputes} open</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted" />
        </Link>
      </div>
    </div>
  );
}
