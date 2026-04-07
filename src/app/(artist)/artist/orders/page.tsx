'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Package,
  Loader2,
  ImageIcon,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { getReadyClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';

// ── Types ──

interface OrderRow {
  id: string;
  total_amount_aud: number | null;
  artist_payout_aud: number | null;
  status: string;
  created_at: string;
  artworks: { title: string; images: string[] } | null;
  profiles: { full_name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  paid: { label: 'Awaiting Shipment', color: 'bg-amber-50 text-amber-700' },
  shipped: { label: 'Shipped', color: 'bg-blue-50 text-blue-700' },
  delivered: { label: 'Delivered', color: 'bg-blue-50 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-green-50 text-green-700' },
  disputed: { label: 'Disputed', color: 'bg-red-50 text-red-700' },
  refunded: { label: 'Refunded', color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
};

function getStatusBadge(status: string) {
  return STATUS_CONFIG[status] ?? { label: status, color: 'bg-gray-50 text-gray-600' };
}

// ── Component ──

export default function ArtistOrdersPage() {
  const { loading: authLoading } = useRequireAuth('artist');
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchOrders() {
      try {
        const supabase = await getReadyClient();
        const { data } = await supabase
          .from('orders')
          .select(
            'id, total_amount_aud, artist_payout_aud, status, created_at, artworks(title, images), profiles!orders_buyer_id_fkey(full_name)'
          )
          .eq('artist_id', user!.id)
          .order('created_at', { ascending: false });

        setOrders((data as unknown as OrderRow[]) ?? []);
      } catch (err) {
        console.error('[ArtistOrders] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [user]);

  if (authLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div style={{ width: 32, height: 32, border: '3px solid #E5E2DB', borderTopColor: '#2C2C2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style></div>;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-sm text-muted mt-1">Manage your incoming orders</p>
      </div>

      {orders.length === 0 ? (
        /* Empty state */
        <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
          <div className="w-16 h-16 bg-muted-bg rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="h-7 w-7 text-muted" />
          </div>
          <h3 className="font-medium text-lg mb-2">No orders yet</h3>
          <p className="text-sm text-muted mb-6 max-w-sm mx-auto">
            Once buyers purchase your artwork, orders will appear here for you to manage and ship.
          </p>
          <Link
            href="/artist/artworks"
            className="inline-flex items-center gap-2 text-accent-dark font-medium hover:underline"
          >
            View your listings <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div>
          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-border rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium tracking-wide uppercase text-muted border-b border-border bg-cream">
                  <th className="px-5 py-3.5">Artwork</th>
                  <th className="px-5 py-3.5">Buyer</th>
                  <th className="px-5 py-3.5">Sale Price</th>
                  <th className="px-5 py-3.5">Stripe Fee</th>
                  <th className="px-5 py-3.5">You Receive</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const badge = getStatusBadge(order.status);
                  const artwork = order.artworks;
                  const thumbnail = artwork?.images?.[0];
                  const salePrice = order.total_amount_aud ?? 0;
                  const payout = order.artist_payout_aud ?? 0;
                  const stripeFee = Math.round((salePrice - payout) * 100) / 100;

                  return (
                    <tr
                      key={order.id}
                      className="border-b border-border last:border-0 hover:bg-cream/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-muted-bg flex-shrink-0 overflow-hidden">
                            {thumbnail ? (
                              <Image
                                src={thumbnail}
                                alt={artwork?.title ?? ''}
                                width={48}
                                height={48}
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
                      <td className="px-5 py-4 text-sm text-muted">
                        {order.profiles?.full_name ?? 'Unknown'}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {formatPrice(salePrice)}
                      </td>
                      <td className="px-5 py-4 text-sm text-muted">
                        &minus;{formatPrice(stripeFee)}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-green-700">
                        {formatPrice(payout)}
                      </td>
                      <td className="px-5 py-4 text-sm text-muted">
                        {new Date(order.created_at).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {order.status === 'paid' ? (
                          <Link
                            href={`/artist/orders/${order.id}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-dark hover:underline"
                          >
                            Ship Order
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <Link
                            href={`/artist/orders/${order.id}`}
                            className="text-sm text-muted hover:text-foreground transition-colors"
                          >
                            View
                          </Link>
                        )}
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
              const badge = getStatusBadge(order.status);
              const artwork = order.artworks;
              const thumbnail = artwork?.images?.[0];
              const salePrice = order.total_amount_aud ?? 0;
              const payout = order.artist_payout_aud ?? 0;
              const stripeFee = Math.round((salePrice - payout) * 100) / 100;

              return (
                <div
                  key={order.id}
                  className="bg-white border border-border rounded-2xl p-4"
                >
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
                        <p className="font-medium text-sm truncate">
                          {artwork?.title ?? 'Unknown'}
                        </p>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {order.profiles?.full_name ?? 'Unknown'} &middot;{' '}
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
                      <p className="text-sm font-medium">{formatPrice(salePrice)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wide">Stripe Fee</p>
                      <p className="text-sm text-muted">&minus;{formatPrice(stripeFee)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wide">Yours</p>
                      <p className="text-sm font-bold text-green-700">
                        {formatPrice(payout)}
                      </p>
                    </div>
                  </div>

                  {order.status === 'paid' && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <Link
                        href={`/artist/orders/${order.id}`}
                        className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light transition-colors"
                      >
                        Ship Order
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
