'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  DollarSign,
  Clock,
  CreditCard,
  TrendingUp,
  ArrowRight,
  Plus,
  Share2,
  Info,
  ImageIcon,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';

// ── Types ──

interface OrderRow {
  id: string;
  total_amount_aud: number | null;
  artist_payout_aud: number | null;
  status: string;
  payout_released_at: string | null;
  inspection_deadline: string | null;
  created_at: string;
  artworks: { title: string; images: string[] } | null;
}

function getPaymentStatus(order: OrderRow): { label: string; color: string } {
  if (order.status === 'completed' && order.payout_released_at) {
    return { label: 'Paid', color: 'bg-green-50 text-green-700' };
  }
  if (order.status === 'delivered') {
    // Check if still within inspection window
    if (order.inspection_deadline) {
      const deadline = new Date(order.inspection_deadline);
      if (deadline > new Date()) {
        return { label: 'In Escrow', color: 'bg-amber-50 text-amber-700' };
      }
    }
    return { label: 'Pending', color: 'bg-blue-50 text-blue-700' };
  }
  if (['shipped', 'paid'].includes(order.status)) {
    return { label: 'In Escrow', color: 'bg-amber-50 text-amber-700' };
  }
  if (['disputed', 'refunded', 'cancelled'].includes(order.status)) {
    return { label: order.status.charAt(0).toUpperCase() + order.status.slice(1), color: 'bg-red-50 text-red-600' };
  }
  return { label: 'Pending', color: 'bg-gray-100 text-gray-600' };
}

// ── Component ──

export default function EarningsPage() {
  const { loading: authLoading } = useRequireAuth('artist');
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchOrders() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('orders')
          .select('id, total_amount_aud, artist_payout_aud, status, payout_released_at, inspection_deadline, created_at, artworks(title, images)')
          .eq('artist_id', user!.id)
          .in('status', ['paid', 'shipped', 'delivered', 'completed', 'disputed', 'refunded'])
          .order('created_at', { ascending: false });

        setOrders((data as unknown as OrderRow[]) ?? []);
      } catch (err) {
        console.error('[Earnings] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [user]);

  // ── Calculate summary stats ──

  const totalEarnings = orders
    .filter((o) => o.status === 'completed' && o.payout_released_at)
    .reduce((sum, o) => sum + (o.artist_payout_aud ?? 0), 0);

  const pendingPayout = orders
    .filter((o) => ['delivered'].includes(o.status) && !o.payout_released_at)
    .reduce((sum, o) => sum + (o.artist_payout_aud ?? 0), 0);

  // This month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = orders
    .filter(
      (o) =>
        o.status === 'completed' &&
        o.payout_released_at &&
        new Date(o.created_at) >= startOfMonth
    )
    .reduce((sum, o) => sum + (o.artist_payout_aud ?? 0), 0);

  // ── Render ──

  if (authLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div style={{ width: 32, height: 32, border: '3px solid #E5E2DB', borderTopColor: '#2C2C2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style></div>;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasOrders = orders.length > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-editorial text-2xl md:text-3xl font-medium">Earnings</h1>
        <p className="text-sm text-muted mt-1">Track your sales and payouts</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-white border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium tracking-wide uppercase text-muted">Total Earnings</span>
            <div className="w-9 h-9 bg-green-50 rounded-full flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold">{formatPrice(totalEarnings)}</p>
          <p className="text-xs text-muted mt-1">All time</p>
        </div>

        <div className="bg-white border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium tracking-wide uppercase text-muted">Pending Payout</span>
            <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold">{formatPrice(pendingPayout)}</p>
          <p className="text-xs text-muted mt-1">Awaiting release</p>
        </div>

        <div className="bg-white border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium tracking-wide uppercase text-muted">This Month</span>
            <div className="w-9 h-9 bg-accent-subtle rounded-full flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-accent-dark" />
            </div>
          </div>
          <p className="text-2xl font-bold">{formatPrice(thisMonth)}</p>
          <p className="text-xs text-muted mt-1">
            {now.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="bg-white border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium tracking-wide uppercase text-muted">Subscription</span>
            <div className="w-9 h-9 bg-green-50 rounded-full flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-green-600" />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-green-600" />
            <p className="text-sm font-semibold text-green-700">Free — Launch period</p>
          </div>
          <p className="text-xs text-muted mt-1">$30/mo after launch</p>
        </div>
      </div>

      {/* Payout setup CTA */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between p-5 bg-white border border-border rounded-2xl mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-accent-subtle rounded-full flex items-center justify-center flex-shrink-0">
            <CreditCard className="h-5 w-5 text-accent-dark" />
          </div>
          <div>
            <p className="font-medium text-sm">Payout settings</p>
            <p className="text-xs text-muted">Connect or manage your bank account for receiving payouts.</p>
          </div>
        </div>
        <Link
          href="/artist/settings/payouts"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-sm font-medium rounded-full hover:bg-cream transition-colors whitespace-nowrap"
        >
          Manage Payouts
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Payout explainer */}
      <div className="flex gap-3 p-4 bg-accent-subtle/50 border border-accent/10 rounded-xl mb-10">
        <Info className="h-5 w-5 text-accent-dark flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted space-y-1.5">
          <p>
            <span className="font-medium text-foreground">Signo charges $0 commission.</span>{' '}
            The only deduction from your sales is Stripe&apos;s payment processing fee (~1.75% + 30c per transaction).
            Your $30/month subscription covers unlimited listings and all platform features.
          </p>
          <p>
            Payouts are released automatically after the buyer&apos;s 48-hour inspection window closes and transferred to your connected bank account via Stripe.
          </p>
        </div>
      </div>

      {/* Orders list */}
      {!hasOrders ? (
        /* Empty state */
        <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
          <div className="w-16 h-16 bg-muted-bg rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="h-7 w-7 text-muted" />
          </div>
          <h3 className="font-editorial text-lg font-medium mb-2">No sales yet</h3>
          <p className="text-sm text-muted mb-6 max-w-sm mx-auto">
            Your first sale is coming! Make sure your artworks are listed and looking their best.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/artist/artworks/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-full hover:bg-accent transition-colors duration-300"
            >
              <Plus className="h-4 w-4" />
              Upload Artwork
            </Link>
            <Link
              href={user ? `/artists/${user.id}` : '#'}
              className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-border text-sm font-semibold rounded-full hover:border-warm-gray transition-colors"
            >
              <Share2 className="h-4 w-4" />
              View Storefront
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="font-editorial text-lg font-medium mb-4">Sales History</h2>

          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-border rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium tracking-wide uppercase text-muted border-b border-border bg-cream">
                  <th className="px-5 py-3.5">Artwork</th>
                  <th className="px-5 py-3.5">Sale Price</th>
                  <th className="px-5 py-3.5">Stripe Fee</th>
                  <th className="px-5 py-3.5">You Receive</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const payStatus = getPaymentStatus(order);
                  const artwork = order.artworks;
                  const thumbnail = artwork?.images?.[0];

                  return (
                    <tr key={order.id} className="border-b border-border last:border-0 hover:bg-cream/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted-bg flex-shrink-0 overflow-hidden">
                            {thumbnail ? (
                              <Image
                                src={thumbnail}
                                alt={artwork?.title ?? ''}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-border" />
                              </div>
                            )}
                          </div>
                          <span className="font-medium text-sm truncate max-w-[180px]">
                            {artwork?.title ?? 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {formatPrice(order.total_amount_aud ?? 0)}
                      </td>
                      <td className="px-5 py-4 text-sm text-muted">
                        −{formatPrice((order.total_amount_aud ?? 0) - (order.artist_payout_aud ?? 0))}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-green-700">
                        {formatPrice(order.artist_payout_aud ?? 0)}
                      </td>
                      <td className="px-5 py-4 text-sm text-muted">
                        {new Date(order.created_at).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${payStatus.color}`}>
                          {payStatus.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {orders.map((order) => {
              const payStatus = getPaymentStatus(order);
              const artwork = order.artworks;
              const thumbnail = artwork?.images?.[0];

              return (
                <div key={order.id} className="bg-white border border-border rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl bg-muted-bg flex-shrink-0 overflow-hidden">
                      {thumbnail ? (
                        <Image
                          src={thumbnail}
                          alt={artwork?.title ?? ''}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-border" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm truncate">{artwork?.title ?? 'Unknown'}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${payStatus.color}`}>
                          {payStatus.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border">
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wide">Sale</p>
                      <p className="text-sm font-medium">{formatPrice(order.total_amount_aud ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wide">Stripe Fee</p>
                      <p className="text-sm text-muted">−{formatPrice((order.total_amount_aud ?? 0) - (order.artist_payout_aud ?? 0))}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wide">Yours</p>
                      <p className="text-sm font-bold text-accent-dark">{formatPrice(order.artist_payout_aud ?? 0)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
