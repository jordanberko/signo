'use client';

import Link from 'next/link';
import { DollarSign, Package, Eye, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

const STATS = [
  { label: 'Total Sales', value: '$0.00', icon: DollarSign, change: null },
  { label: 'Active Listings', value: '0', icon: Package, change: null },
  { label: 'Profile Views', value: '0', icon: Eye, change: null },
  { label: 'Conversion Rate', value: '0%', icon: TrendingUp, change: null },
];

const RECENT_ORDERS: { id: string; title: string; buyer: string; amount: number; status: string; date: string }[] = [];

export default function ArtistDashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Artist Dashboard</h1>
          <p className="text-muted mt-1">Manage your artwork and track your sales</p>
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
            <p className="text-xs text-muted">Track payouts and commission</p>
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
        {RECENT_ORDERS.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-muted">No orders yet. Once your artwork is listed, orders will appear here.</p>
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
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_ORDERS.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0">
                  <td className="p-4 font-medium text-sm">{order.title}</td>
                  <td className="p-4 text-sm text-muted">{order.buyer}</td>
                  <td className="p-4 text-sm font-medium">{formatPrice(order.amount)}</td>
                  <td className="p-4"><span className="text-xs px-2 py-1 bg-muted-bg rounded">{order.status}</span></td>
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
