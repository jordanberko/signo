'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Eye,
  Heart,
  Users,
  DollarSign,
  ArrowLeft,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { formatPrice } from '@/lib/utils';
import AnalyticsChart from '@/components/ui/AnalyticsChart';

type Period = 7 | 30 | 90;

interface AnalyticsData {
  profileViews: Array<{ date: string; count: number }>;
  totalProfileViews: number;
  favourites: Array<{ date: string; count: number }>;
  totalFavourites: number;
  followers: Array<{ date: string; count: number }>;
  totalFollowers: number;
  sales: Array<{ date: string; count: number; revenue: number }>;
  totalSales: number;
  totalRevenue: number;
  artworks: Array<{
    id: string;
    title: string;
    imageUrl: string;
    status: string;
    price: number;
    favouriteCount: number;
    listedDate: string;
  }>;
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

export default function AnalyticsPage() {
  const { loading: authLoading } = useRequireAuth('artist');
  const [period, setPeriod] = useState<Period>(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/artist/analytics?period=${p}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchAnalytics(period);
    }
  }, [period, authLoading, fetchAnalytics]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  const metrics = data
    ? [
        {
          label: 'Profile Views',
          value: data.totalProfileViews.toLocaleString(),
          icon: Eye,
          color: '#7C8C5B',
        },
        {
          label: 'Favourites',
          value: data.totalFavourites.toLocaleString(),
          icon: Heart,
          color: '#C4727F',
        },
        {
          label: 'New Followers',
          value: data.totalFollowers.toLocaleString(),
          icon: Users,
          color: '#5B7C8C',
        },
        {
          label: 'Revenue',
          value: formatPrice(data.totalRevenue),
          icon: DollarSign,
          color: '#6B8C5B',
        },
      ]
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/artist/dashboard"
            className="p-2 rounded-lg hover:bg-accent/5 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-muted mt-0.5">
              Track your performance and engagement
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-1 bg-white border border-border rounded-lg p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                period === opt.value
                  ? 'bg-accent text-white font-medium'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : data ? (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="bg-white border border-border rounded-lg p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <m.icon
                    className="h-4 w-4"
                    style={{ color: m.color }}
                  />
                  <span className="text-sm text-muted">{m.label}</span>
                </div>
                <p className="text-2xl font-bold">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="bg-white border border-border rounded-lg p-5">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Eye className="h-4 w-4" style={{ color: '#7C8C5B' }} />
                Profile Views
              </h3>
              <AnalyticsChart
                data={data.profileViews.map((d) => ({
                  date: d.date,
                  value: d.count,
                }))}
                color="#7C8C5B"
              />
            </div>

            <div className="bg-white border border-border rounded-lg p-5">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Heart className="h-4 w-4" style={{ color: '#C4727F' }} />
                Favourites
              </h3>
              <AnalyticsChart
                data={data.favourites.map((d) => ({
                  date: d.date,
                  value: d.count,
                }))}
                color="#C4727F"
              />
            </div>

            <div className="bg-white border border-border rounded-lg p-5">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Users className="h-4 w-4" style={{ color: '#5B7C8C' }} />
                New Followers
              </h3>
              <AnalyticsChart
                data={data.followers.map((d) => ({
                  date: d.date,
                  value: d.count,
                }))}
                color="#5B7C8C"
              />
            </div>

            <div className="bg-white border border-border rounded-lg p-5">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4" style={{ color: '#6B8C5B' }} />
                Revenue
              </h3>
              <AnalyticsChart
                data={data.sales.map((d) => ({
                  date: d.date,
                  value: d.revenue,
                }))}
                color="#6B8C5B"
                valueFormatter={(v) => formatPrice(v)}
              />
            </div>
          </div>

          {/* Artwork Breakdown Table */}
          {data.artworks.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="p-5 border-b border-border">
                <h2 className="font-semibold text-lg">Artwork Performance</h2>
                <p className="text-sm text-muted mt-0.5">
                  Sorted by favourites — all time
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-cream/50">
                      <th className="text-left py-3 px-5 font-medium text-muted">
                        Artwork
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted">
                        Status
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-muted">
                        Price
                      </th>
                      <th className="text-right py-3 px-5 font-medium text-muted">
                        Favourites
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.artworks.map((artwork) => (
                      <tr
                        key={artwork.id}
                        className="border-b border-border last:border-b-0 hover:bg-accent/5 transition-colors"
                      >
                        <td className="py-3 px-5">
                          <Link
                            href={`/artwork/${artwork.id}`}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                          >
                            {artwork.imageUrl ? (
                              <Image
                                src={artwork.imageUrl}
                                alt={artwork.title}
                                width={40}
                                height={40}
                                className="rounded object-cover w-10 h-10"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-border/30 rounded flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-muted" />
                              </div>
                            )}
                            <span className="font-medium truncate max-w-[200px]">
                              {artwork.title}
                            </span>
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize text-muted">
                            {artwork.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {formatPrice(artwork.price)}
                        </td>
                        <td className="py-3 px-5 text-right">
                          <span className="inline-flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5 text-rose-400" />
                            {artwork.favouriteCount}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-muted">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Unable to load analytics data.</p>
          <button
            onClick={() => fetchAnalytics(period)}
            className="mt-3 text-sm text-accent hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
