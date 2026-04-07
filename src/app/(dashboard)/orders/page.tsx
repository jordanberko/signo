'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Package,
  ArrowRight,
  Loader2,
  ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { formatPrice } from '@/lib/utils';

// ── Types ──

interface OrderRow {
  id: string;
  total_amount_aud: number;
  status: string;
  created_at: string;
  artworks: {
    title: string;
    images: string[];
  } | null;
  profiles: {
    full_name: string;
  } | null;
}

// ── Helpers ──

function statusStyle(status: string): string {
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
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Component ──

export default function OrdersPage() {
  const { loading: authLoading } = useRequireAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;

    async function fetchOrders() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch('/api/orders', { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load orders');
        }

        const data = await res.json();
        console.log('[Orders] Fetched:', data.orders?.length, 'orders');
        setOrders(data.orders || []);
      } catch (err) {
        console.error('[Orders]', err);
        if ((err as Error).name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else {
          setError((err as Error).message || 'Failed to load orders.');
        }
      } finally {
        setLoading(false);
      }
    }

    const safetyTimeout = setTimeout(() => setLoading(false), 10000);
    fetchOrders().then(() => clearTimeout(safetyTimeout));
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="font-editorial text-3xl md:text-4xl font-medium">
          My Orders
        </h1>
        <p className="text-muted mt-1.5">
          {orders.length > 0
            ? `${orders.length} order${orders.length === 1 ? '' : 's'}`
            : 'Your purchase history'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/5 border border-error/20 rounded-xl flex items-center gap-3 text-sm text-error">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {orders.length === 0 && !error ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 bg-muted-bg rounded-full flex items-center justify-center mx-auto mb-5">
            <Package className="h-10 w-10 text-muted" />
          </div>
          <h2 className="font-editorial text-2xl font-medium mb-2">
            No orders yet
          </h2>
          <p className="text-muted mb-8 max-w-md mx-auto">
            When you purchase artwork, your orders will appear here.
          </p>
          <Link
            href="/browse"
            className="group inline-flex items-center gap-2 px-8 py-3 bg-primary text-white text-sm font-semibold rounded-full hover:bg-accent transition-colors duration-300"
          >
            Browse Artwork
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const artwork = order.artworks;
            const artist = order.profiles;
            const image = artwork?.images?.[0];

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center gap-4 p-4 bg-white border border-border rounded-xl hover:border-accent/40 hover:shadow-sm transition-all group"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg bg-muted-bg flex-shrink-0 overflow-hidden">
                  {image ? (
                    <Image
                      src={image}
                      alt={artwork?.title || 'Artwork'}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-border" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {artwork?.title || 'Unknown Artwork'}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {artist?.full_name || 'Unknown Artist'} &middot;{' '}
                    {new Date(order.created_at).toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-sm font-medium">
                      {formatPrice(order.total_amount_aud)}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusStyle(order.status)}`}
                    >
                      {statusLabel(order.status)}
                    </span>
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 text-muted flex-shrink-0 group-hover:text-accent-dark transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
