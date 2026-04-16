'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
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

const STATUS_LABEL: Record<string, string> = {
  paid: 'Awaiting dispatch',
  shipped: 'In transit',
  delivered: 'Delivered',
  completed: 'Completed',
  disputed: 'Disputed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

const KICKER: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
};

function EditorialSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-warm-white)',
      }}
    >
      <p
        className="font-serif"
        style={{ fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--color-stone)' }}
      >
        {label}
      </p>
    </div>
  );
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
        const res = await fetch('/api/artist/orders');
        if (!res.ok) throw new Error('Failed to fetch orders');
        const { orders } = await res.json();
        setOrders((orders as OrderRow[]) ?? []);
      } catch (err) {
        console.error('[ArtistOrders] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [user]);

  if (authLoading) return <EditorialSpinner />;
  if (loading) return <EditorialSpinner label="Retrieving your orders…" />;

  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      <div
        className="px-6 sm:px-10"
        style={{
          maxWidth: '72rem',
          margin: '0 auto',
          paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
        }}
      >
        {/* Header */}
        <header style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
          <p style={{ ...KICKER, marginBottom: '1rem' }}>
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
            Works <em style={{ fontStyle: 'italic' }}>changing hands.</em>
          </h1>
          <p
            style={{
              fontSize: '0.92rem',
              fontWeight: 300,
              color: 'var(--color-stone-dark)',
              lineHeight: 1.6,
              maxWidth: '48ch',
            }}
          >
            {orders.length > 0
              ? `${orders.length} ${orders.length === 1 ? 'order' : 'orders'} to attend to — dispatch, track, and close out.`
              : 'A quiet ledger of every sale — from payment to dispatch to completion.'}
          </p>
        </header>

        {orders.length === 0 ? (
          <div
            style={{
              paddingTop: '2rem',
              borderTop: '1px solid var(--color-border)',
              maxWidth: '46ch',
            }}
          >
            <p
              className="font-serif"
              style={{
                fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)',
                lineHeight: 1.2,
                color: 'var(--color-ink)',
                fontStyle: 'italic',
                fontWeight: 400,
                marginTop: '1.4rem',
              }}
            >
              No orders yet.
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
              When a collector takes a work home, it will settle here — with
              their details, your share, and a clear next step.
            </p>
            <Link
              href="/artist/artworks"
              className="editorial-link"
              style={{ marginTop: '1.6rem', display: 'inline-block' }}
            >
              View your listings
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table
              className="hidden md:table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                borderTop: '1px solid var(--color-border-strong)',
              }}
            >
              <thead>
                <tr>
                  {['Work', 'Buyer', 'Sale', 'Fee', 'Your share', 'Date', 'Status', ''].map(
                    (h, i) => (
                      <th
                        key={i}
                        style={{
                          ...KICKER,
                          padding: '1rem 0.8rem',
                          textAlign: i >= 2 && i <= 4 ? 'right' : 'left',
                          borderBottom: '1px solid var(--color-border)',
                          fontWeight: 400,
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const artwork = order.artworks;
                  const thumbnail = artwork?.images?.[0];
                  const salePrice = order.total_amount_aud ?? 0;
                  const payout = order.artist_payout_aud ?? 0;
                  const stripeFee =
                    Math.round((salePrice - payout) * 100) / 100;
                  const label = STATUS_LABEL[order.status] ?? order.status;

                  return (
                    <tr
                      key={order.id}
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                    >
                      <td style={{ padding: '1.2rem 0.8rem' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                          }}
                        >
                          <div
                            style={{
                              width: 52,
                              height: 52,
                              background: 'var(--color-cream)',
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}
                          >
                            {thumbnail && (
                              <Image
                                src={thumbnail}
                                alt={artwork?.title ?? ''}
                                width={52}
                                height={52}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            )}
                          </div>
                          <span
                            className="font-serif"
                            style={{
                              fontSize: '1rem',
                              color: 'var(--color-ink)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 200,
                            }}
                          >
                            {artwork?.title ?? 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '1.2rem 0.8rem',
                          fontSize: '0.88rem',
                          color: 'var(--color-stone-dark)',
                          fontWeight: 300,
                        }}
                      >
                        {order.profiles?.full_name ?? 'Unknown'}
                      </td>
                      <td
                        className="font-serif"
                        style={{
                          padding: '1.2rem 0.8rem',
                          fontSize: '0.95rem',
                          textAlign: 'right',
                          color: 'var(--color-ink)',
                        }}
                      >
                        {formatPrice(salePrice)}
                      </td>
                      <td
                        style={{
                          padding: '1.2rem 0.8rem',
                          fontSize: '0.85rem',
                          fontStyle: 'italic',
                          color: 'var(--color-stone)',
                          textAlign: 'right',
                          fontWeight: 300,
                        }}
                      >
                        −{formatPrice(stripeFee)}
                      </td>
                      <td
                        className="font-serif"
                        style={{
                          padding: '1.2rem 0.8rem',
                          fontSize: '1rem',
                          textAlign: 'right',
                          color: 'var(--color-ink)',
                        }}
                      >
                        {formatPrice(payout)}
                      </td>
                      <td
                        className="font-serif"
                        style={{
                          padding: '1.2rem 0.8rem',
                          fontSize: '0.8rem',
                          fontStyle: 'italic',
                          color: 'var(--color-stone)',
                        }}
                      >
                        {new Date(order.created_at).toLocaleDateString(
                          'en-AU',
                          { day: 'numeric', month: 'short' }
                        )}
                      </td>
                      <td
                        style={{
                          ...KICKER,
                          padding: '1.2rem 0.8rem',
                          fontSize: '0.6rem',
                        }}
                      >
                        {label}
                      </td>
                      <td style={{ padding: '1.2rem 0.8rem' }}>
                        <Link
                          href={`/artist/orders/${order.id}`}
                          className="font-serif"
                          style={{
                            fontStyle: 'italic',
                            fontSize: '0.88rem',
                            color: 'var(--color-ink)',
                            textDecoration: 'none',
                            borderBottom:
                              order.status === 'paid'
                                ? '1px solid var(--color-ink)'
                                : '1px solid var(--color-border-strong)',
                            paddingBottom: '0.15rem',
                          }}
                        >
                          {order.status === 'paid' ? 'Dispatch →' : 'Open →'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile list */}
            <ul
              className="md:hidden"
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                borderTop: '1px solid var(--color-border-strong)',
              }}
            >
              {orders.map((order) => {
                const artwork = order.artworks;
                const thumbnail = artwork?.images?.[0];
                const salePrice = order.total_amount_aud ?? 0;
                const payout = order.artist_payout_aud ?? 0;
                const stripeFee =
                  Math.round((salePrice - payout) * 100) / 100;
                const label = STATUS_LABEL[order.status] ?? order.status;

                return (
                  <li
                    key={order.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      padding: '1.4rem 0',
                    }}
                  >
                    <Link
                      href={`/artist/orders/${order.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          background: 'var(--color-cream)',
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}
                      >
                        {thumbnail && (
                          <Image
                            src={thumbnail}
                            alt={artwork?.title ?? ''}
                            width={60}
                            height={60}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            gap: '0.8rem',
                          }}
                        >
                          <p
                            className="font-serif"
                            style={{
                              fontSize: '1rem',
                              margin: 0,
                              color: 'var(--color-ink)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {artwork?.title ?? 'Unknown'}
                          </p>
                          <span
                            style={{ ...KICKER, fontSize: '0.58rem', flexShrink: 0 }}
                          >
                            {label}
                          </span>
                        </div>
                        <p
                          style={{
                            marginTop: '0.3rem',
                            fontSize: '0.8rem',
                            fontWeight: 300,
                            color: 'var(--color-stone-dark)',
                          }}
                        >
                          {order.profiles?.full_name ?? 'Unknown'} ·{' '}
                          {new Date(order.created_at).toLocaleDateString(
                            'en-AU',
                            { day: 'numeric', month: 'short' }
                          )}
                        </p>
                        <div
                          style={{
                            marginTop: '0.5rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontStyle: 'italic',
                              color: 'var(--color-stone)',
                              fontWeight: 300,
                            }}
                          >
                            {formatPrice(salePrice)} −{' '}
                            {formatPrice(stripeFee)} fee
                          </span>
                          <span
                            className="font-serif"
                            style={{
                              fontSize: '1rem',
                              color: 'var(--color-ink)',
                            }}
                          >
                            {formatPrice(payout)}
                          </span>
                        </div>
                        {order.status === 'paid' && (
                          <p
                            className="font-serif"
                            style={{
                              marginTop: '0.6rem',
                              fontSize: '0.85rem',
                              fontStyle: 'italic',
                              color: 'var(--color-ink)',
                              borderBottom: '1px solid var(--color-ink)',
                              display: 'inline-block',
                              paddingBottom: '0.1rem',
                            }}
                          >
                            Dispatch this order →
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
