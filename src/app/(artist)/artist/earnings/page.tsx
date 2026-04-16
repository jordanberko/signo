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
  payout_released_at: string | null;
  inspection_deadline: string | null;
  created_at: string;
  artworks: { title: string; images: string[] } | null;
}

function getPaymentLabel(order: OrderRow): string {
  if (order.status === 'completed' && order.payout_released_at) return 'Paid';
  if (order.status === 'delivered') {
    if (order.inspection_deadline) {
      const deadline = new Date(order.inspection_deadline);
      if (deadline > new Date()) return 'In escrow';
    }
    return 'Pending';
  }
  if (['shipped', 'paid'].includes(order.status)) return 'In escrow';
  if (['disputed', 'refunded', 'cancelled'].includes(order.status)) {
    return order.status.charAt(0).toUpperCase() + order.status.slice(1);
  }
  return 'Pending';
}

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

export default function EarningsPage() {
  const { loading: authLoading } = useRequireAuth('artist');
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchOrders() {
      try {
        const res = await fetch('/api/artist/earnings');
        if (!res.ok) throw new Error('Failed to fetch earnings');
        const { orders } = await res.json();
        setOrders((orders as OrderRow[]) ?? []);
      } catch (err) {
        console.error('[Earnings] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [user]);

  const totalEarnings = orders
    .filter((o) => o.status === 'completed' && o.payout_released_at)
    .reduce((sum, o) => sum + (o.artist_payout_aud ?? 0), 0);

  const pendingPayout = orders
    .filter((o) => ['delivered'].includes(o.status) && !o.payout_released_at)
    .reduce((sum, o) => sum + (o.artist_payout_aud ?? 0), 0);

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

  if (authLoading) return <EditorialSpinner />;
  if (loading) return <EditorialSpinner label="Gathering the ledger…" />;

  const hasOrders = orders.length > 0;

  const STATS = [
    { label: 'Total earnings', value: formatPrice(totalEarnings), detail: 'All time' },
    { label: 'In escrow', value: formatPrice(pendingPayout), detail: 'Awaiting release' },
    {
      label: 'This month',
      value: formatPrice(thisMonth),
      detail: now.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
    },
    { label: 'Subscription', value: 'Free', detail: 'Until your first sale' },
  ];

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
            The Studio · Earnings
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
            Your <em style={{ fontStyle: 'italic' }}>ledger.</em>
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
            Every sale, every payout, every cent — plainly listed.
          </p>
        </header>

        {/* Stats dl */}
        <section
          style={{
            borderTop: '1px solid var(--color-border-strong)',
            borderBottom: '1px solid var(--color-border-strong)',
            marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)',
          }}
        >
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
              margin: 0,
            }}
          >
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  padding: '1.8rem 1.6rem',
                  borderLeft: i === 0 ? 'none' : '1px solid var(--color-border)',
                }}
              >
                <dt style={{ ...KICKER, marginBottom: '0.9rem' }}>
                  {stat.label}
                </dt>
                <dd
                  className="font-serif"
                  style={{
                    margin: 0,
                    fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)',
                    fontWeight: 400,
                    color: 'var(--color-ink)',
                    lineHeight: 1,
                    letterSpacing: '-0.01em',
                    marginBottom: '0.5rem',
                  }}
                >
                  {stat.value}
                </dd>
                <p
                  className="font-serif"
                  style={{
                    fontSize: '0.78rem',
                    fontStyle: 'italic',
                    color: 'var(--color-stone)',
                  }}
                >
                  {stat.detail}
                </p>
              </div>
            ))}
          </dl>
        </section>

        {/* Payout explainer */}
        <section style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
          <p style={{ ...KICKER, marginBottom: '1rem' }}>— How payouts flow —</p>
          <p
            className="font-serif"
            style={{
              fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
              lineHeight: 1.45,
              color: 'var(--color-ink)',
              fontWeight: 400,
              fontStyle: 'italic',
              marginBottom: '1rem',
              maxWidth: '58ch',
            }}
          >
            Signo takes zero commission.
          </p>
          <p
            style={{
              fontSize: '0.92rem',
              fontWeight: 300,
              color: 'var(--color-stone-dark)',
              lineHeight: 1.7,
              maxWidth: '58ch',
              marginBottom: '0.8rem',
            }}
          >
            The only deduction from your sale is Stripe&apos;s payment
            processing fee (approximately 1.75% + 30¢). Your $30 monthly
            subscription covers unlimited listings and every platform feature.
          </p>
          <p
            style={{
              fontSize: '0.92rem',
              fontWeight: 300,
              color: 'var(--color-stone-dark)',
              lineHeight: 1.7,
              maxWidth: '58ch',
            }}
          >
            Payouts release automatically after the buyer&apos;s 48-hour
            inspection window closes, and travel to your connected bank via
            Stripe.
          </p>
          <Link
            href="/artist/settings/payouts"
            className="editorial-link"
            style={{ marginTop: '1.4rem', display: 'inline-block' }}
          >
            Manage payout settings →
          </Link>
        </section>

        {/* Orders list */}
        {!hasOrders ? (
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
              No sales yet.
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
              The first sale tends to come once the catalogue is settled. Make
              sure the works are listed at their best.
            </p>
            <div
              style={{
                marginTop: '1.6rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.8rem',
              }}
            >
              <Link
                href="/artist/artworks/new"
                className="editorial-link"
                style={{ display: 'inline-block' }}
              >
                Upload a new work →
              </Link>
              <Link
                href={user ? `/artists/${user.id}` : '#'}
                className="editorial-link"
                style={{ display: 'inline-block' }}
              >
                View your storefront →
              </Link>
            </div>
          </div>
        ) : (
          <section>
            <p style={{ ...KICKER, marginBottom: '1.2rem' }}>— Sales history —</p>

            {/* Desktop */}
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
                  {['Work', 'Sale', 'Fee', 'Your share', 'Date', 'Status'].map(
                    (h, i) => (
                      <th
                        key={h}
                        style={{
                          ...KICKER,
                          padding: '1rem 0.8rem',
                          textAlign: i >= 1 && i <= 3 ? 'right' : 'left',
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
                  const label = getPaymentLabel(order);
                  const artwork = order.artworks;
                  const thumbnail = artwork?.images?.[0];
                  const sale = order.total_amount_aud ?? 0;
                  const payout = order.artist_payout_aud ?? 0;
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
                              width: 44,
                              height: 44,
                              background: 'var(--color-cream)',
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}
                          >
                            {thumbnail && (
                              <Image
                                src={thumbnail}
                                alt={artwork?.title ?? ''}
                                width={44}
                                height={44}
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
                              fontSize: '0.95rem',
                              color: 'var(--color-ink)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 180,
                            }}
                          >
                            {artwork?.title ?? 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td
                        className="font-serif"
                        style={{
                          padding: '1.2rem 0.8rem',
                          fontSize: '0.9rem',
                          textAlign: 'right',
                          color: 'var(--color-ink)',
                        }}
                      >
                        {formatPrice(sale)}
                      </td>
                      <td
                        style={{
                          padding: '1.2rem 0.8rem',
                          fontSize: '0.82rem',
                          fontStyle: 'italic',
                          color: 'var(--color-stone)',
                          textAlign: 'right',
                          fontWeight: 300,
                        }}
                      >
                        −{formatPrice(sale - payout)}
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
                          { day: 'numeric', month: 'short', year: 'numeric' }
                        )}
                      </td>
                      <td
                        style={{
                          ...KICKER,
                          padding: '1.2rem 0.8rem',
                          fontSize: '0.58rem',
                        }}
                      >
                        {label}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile */}
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
                const label = getPaymentLabel(order);
                const artwork = order.artworks;
                const thumbnail = artwork?.images?.[0];
                const sale = order.total_amount_aud ?? 0;
                const payout = order.artist_payout_aud ?? 0;
                return (
                  <li
                    key={order.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      padding: '1.4rem 0',
                      display: 'flex',
                      gap: '1rem',
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        background: 'var(--color-cream)',
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}
                    >
                      {thumbnail && (
                        <Image
                          src={thumbnail}
                          alt={artwork?.title ?? ''}
                          width={56}
                          height={56}
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
                        <span style={{ ...KICKER, fontSize: '0.58rem', flexShrink: 0 }}>
                          {label}
                        </span>
                      </div>
                      <p
                        className="font-serif"
                        style={{
                          fontSize: '0.78rem',
                          fontStyle: 'italic',
                          color: 'var(--color-stone)',
                          marginTop: '0.3rem',
                        }}
                      >
                        {new Date(order.created_at).toLocaleDateString(
                          'en-AU',
                          { day: 'numeric', month: 'short', year: 'numeric' }
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
                          {formatPrice(sale)} − {formatPrice(sale - payout)} fee
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
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
