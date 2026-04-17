'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import EditorialSpinner from '@/components/ui/EditorialSpinner';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { formatPrice, getStatusStyle, formatStatus } from '@/lib/utils';

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

  if (authLoading || loading) return <EditorialSpinner headline="Retrieving your orders…" />;

  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      <div
        className="px-6 sm:px-10"
        style={{
          maxWidth: '68rem',
          margin: '0 auto',
          paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
        }}
      >
        {/* ── Editorial header ── */}
        <header style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
          <p
            style={{
              fontSize: '0.62rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--color-stone)',
              marginBottom: '1rem',
            }}
          >
            The Studio · Orders
          </p>
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.015em',
              color: 'var(--color-ink)',
              fontWeight: 400,
              marginBottom: '0.7rem',
            }}
          >
            Your <em style={{ fontStyle: 'italic' }}>acquisitions.</em>
          </h1>
          <p
            style={{
              fontSize: '0.92rem',
              fontWeight: 300,
              color: 'var(--color-stone-dark)',
              lineHeight: 1.6,
            }}
          >
            {orders.length > 0
              ? `${orders.length} order${orders.length === 1 ? '' : 's'} on record.`
              : 'A record of every work you acquire through Signo will live here.'}
          </p>
        </header>

        {error && (
          <p
            className="font-serif"
            style={{
              marginBottom: '2rem',
              fontSize: '0.92rem',
              color: 'var(--color-terracotta, #c45d3e)',
              fontStyle: 'italic',
              fontWeight: 400,
              lineHeight: 1.5,
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            {error}
          </p>
        )}

        {orders.length === 0 && !error ? (
          <div
            style={{
              padding: '2.5rem 0',
              maxWidth: '46ch',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <p
              className="font-serif"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                lineHeight: 1.2,
                color: 'var(--color-ink)',
                fontStyle: 'italic',
                fontWeight: 400,
                marginTop: '2rem',
              }}
            >
              No acquisitions yet.
            </p>
            <p
              style={{
                marginTop: '1rem',
                fontSize: '0.9rem',
                color: 'var(--color-stone-dark)',
                fontWeight: 300,
                lineHeight: 1.6,
              }}
            >
              When you acquire a work through Signo, the order and its full history will appear here.
            </p>
            <Link
              href="/browse"
              className="editorial-link"
              style={{ marginTop: '1.6rem', display: 'inline-block' }}
            >
              Browse the collection
            </Link>
          </div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              borderTop: '1px solid var(--color-border-strong)',
            }}
          >
            {orders.map((order) => {
              const artwork = order.artworks;
              const artist = order.profiles;
              const image = artwork?.images?.[0];

              return (
                <li
                  key={order.id}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <Link
                    href={`/orders/${order.id}`}
                    className="order-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.4rem',
                      padding: '1.4rem 0',
                      textDecoration: 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        background: 'var(--color-cream)',
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}
                    >
                      {image && (
                        <Image
                          src={image}
                          alt={artwork?.title || 'Artwork'}
                          width={72}
                          height={72}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        className="font-serif"
                        style={{
                          fontSize: '1.1rem',
                          color: 'var(--color-ink)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          margin: 0,
                          lineHeight: 1.3,
                        }}
                      >
                        {artwork?.title || 'Unknown artwork'}
                      </p>
                      <p
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--color-stone-dark)',
                          marginTop: '0.25rem',
                          fontWeight: 300,
                        }}
                      >
                        {artist?.full_name || 'Unknown artist'} ·{' '}
                        <span style={{ color: 'var(--color-stone)' }}>
                          {new Date(order.created_at).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </p>
                    </div>

                    <div
                      style={{
                        textAlign: 'right',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '0.4rem',
                        flexShrink: 0,
                      }}
                    >
                      <p
                        className="font-serif"
                        style={{
                          fontSize: '1.05rem',
                          color: 'var(--color-ink)',
                          margin: 0,
                        }}
                      >
                        {formatPrice(order.total_amount_aud)}
                      </p>
                      <span className={`status-pill ${getStatusStyle(order.status)}`}>
                        {formatStatus(order.status)}
                      </span>
                    </div>

                    <span
                      className="font-serif hidden sm:inline"
                      style={{
                        color: 'var(--color-stone)',
                        fontStyle: 'italic',
                        fontSize: '0.75rem',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        marginLeft: '0.8rem',
                        flexShrink: 0,
                      }}
                    >
                      View →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
