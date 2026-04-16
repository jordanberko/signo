'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { formatPrice } from '@/lib/utils';

// ── Types ──

interface OrderDetail {
  id: string;
  total_amount_aud: number;
  shipping_cost_aud: number | null;
  platform_fee_aud: number | null;
  artist_payout_aud: number | null;
  stripe_payment_intent_id: string | null;
  status: string;
  shipping_tracking_number: string | null;
  shipping_carrier: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  inspection_deadline: string | null;
  payout_released_at: string | null;
  shipping_address: Record<string, string> | null;
  created_at: string;
  artwork: {
    id: string;
    title: string;
    images: string[];
    category: string | null;
    medium: string | null;
  } | null;
  artist: {
    id: string;
    full_name: string | null;
  } | null;
}

function statusLabel(status: string): string {
  switch (status) {
    case 'paid':
      return 'Paid · Awaiting shipment';
    case 'shipped':
      return 'In transit';
    case 'delivered':
      return 'Delivered · Inspection window';
    case 'completed':
      return 'Completed';
    case 'disputed':
      return 'Disputed';
    case 'refunded':
      return 'Refunded';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

// ── Editorial section helper ──

function Section({
  kicker,
  children,
}: {
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
      <p
        style={{
          fontSize: '0.6rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--color-stone)',
          marginBottom: '0.9rem',
          paddingBottom: '0.9rem',
          borderBottom: '1px solid var(--color-border-strong)',
          fontWeight: 400,
        }}
      >
        {kicker}
      </p>
      {children}
    </section>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '1rem',
        padding: '0.65rem 0',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <span
        style={{
          fontSize: '0.78rem',
          color: 'var(--color-stone)',
          fontWeight: 300,
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </span>
      <span
        className="font-serif"
        style={{
          fontSize: '0.95rem',
          color: 'var(--color-ink)',
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Content component ──

function OrderContent({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get('success') === 'true';

  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number } | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!user) return;

    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const { order: data } = await res.json();
      if (data) {
        const artwork = data.artworks as Record<string, unknown> | null;
        const artist = data.profiles as Record<string, string> | null;
        setOrder({
          id: data.id as string,
          total_amount_aud: (data.total_amount_aud as number) || 0,
          shipping_cost_aud: data.shipping_cost_aud as number | null,
          platform_fee_aud: data.platform_fee_aud as number | null,
          artist_payout_aud: data.artist_payout_aud as number | null,
          stripe_payment_intent_id: data.stripe_payment_intent_id as string | null,
          status: data.status as string,
          shipping_tracking_number: data.shipping_tracking_number as string | null,
          shipping_carrier: data.shipping_carrier as string | null,
          shipped_at: data.shipped_at as string | null,
          delivered_at: data.delivered_at as string | null,
          inspection_deadline: data.inspection_deadline as string | null,
          payout_released_at: data.payout_released_at as string | null,
          shipping_address: data.shipping_address as Record<string, string> | null,
          created_at: data.created_at as string,
          artwork: artwork
            ? {
                id: artwork.id as string,
                title: artwork.title as string,
                images: (artwork.images as string[]) || [],
                category: artwork.category as string | null,
                medium: artwork.medium as string | null,
              }
            : null,
          artist: artist
            ? {
                id: artist.id || '',
                full_name: artist.full_name || null,
              }
            : null,
        });
      }
    } catch (err) {
      console.error('[OrderDetail] Fetch error:', err);
    }
    setLoading(false);
  }, [user, orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Countdown timer for inspection window
  useEffect(() => {
    if (!order || order.status !== 'delivered' || !order.inspection_deadline) return;

    function updateCountdown() {
      const deadline = new Date(order!.inspection_deadline!).getTime();
      const now = Date.now();
      const diff = deadline - now;

      if (diff <= 0) {
        setCountdown(null);
        return;
      }

      setCountdown({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      });
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 60_000);
    return () => clearInterval(interval);
  }, [order]);

  async function handleComplete() {
    if (!order) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/complete`, { method: 'PUT' });
      if (res.ok) {
        await fetchOrder();
      }
    } finally {
      setCompleting(false);
    }
  }

  function copyOrderId() {
    if (!order) return;
    navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Loading ──

  if (loading) {
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
          style={{
            fontStyle: 'italic',
            fontSize: '0.95rem',
            color: 'var(--color-stone)',
          }}
        >
          {isSuccess ? 'Finalising your order…' : 'Retrieving order…'}
        </p>
      </div>
    );
  }

  // ── Order not found / still processing ──

  if (!order) {
    return (
      <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
        <div
          className="px-6 sm:px-10"
          style={{
            maxWidth: '42rem',
            margin: '0 auto',
            paddingTop: 'clamp(4rem, 8vw, 6rem)',
            paddingBottom: 'clamp(4rem, 8vw, 6rem)',
          }}
        >
          {isSuccess ? (
            <>
              <p
                style={{
                  fontSize: '0.62rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--color-stone)',
                  marginBottom: '1.2rem',
                }}
              >
                — Received —
              </p>
              <h1
                className="font-serif"
                style={{
                  fontSize: 'clamp(2.2rem, 4.4vw, 3.4rem)',
                  lineHeight: 1.05,
                  color: 'var(--color-ink)',
                  fontWeight: 400,
                  marginBottom: '1.2rem',
                }}
              >
                Payment <em style={{ fontStyle: 'italic' }}>received.</em>
              </h1>
              <p
                style={{
                  fontSize: '0.95rem',
                  color: 'var(--color-stone-dark)',
                  fontWeight: 300,
                  lineHeight: 1.6,
                  marginBottom: '1.8rem',
                  maxWidth: '52ch',
                }}
              >
                Your order is being processed. This page will update automatically, or you can return to your{' '}
                <Link
                  href="/dashboard"
                  className="editorial-link"
                  style={{ display: 'inline' }}
                >
                  dashboard
                </Link>{' '}
                in a moment.
              </p>
              <Link
                href="/dashboard"
                className="artwork-primary-cta artwork-primary-cta--compact"
                style={{ minWidth: '14rem' }}
              >
                Go to dashboard
              </Link>
            </>
          ) : (
            <>
              <p
                style={{
                  fontSize: '0.62rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--color-stone)',
                  marginBottom: '1.2rem',
                }}
              >
                — Not found —
              </p>
              <h1
                className="font-serif"
                style={{
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                  lineHeight: 1.05,
                  color: 'var(--color-ink)',
                  fontWeight: 400,
                  marginBottom: '1.2rem',
                }}
              >
                This order isn&apos;t in your ledger.
              </h1>
              <p
                style={{
                  fontSize: '0.95rem',
                  color: 'var(--color-stone-dark)',
                  fontWeight: 300,
                  lineHeight: 1.6,
                  marginBottom: '1.8rem',
                  maxWidth: '52ch',
                }}
              >
                Either the order doesn&apos;t exist, or it belongs to a different account.
              </p>
              <Link
                href="/dashboard"
                className="artwork-primary-cta artwork-primary-cta--compact"
                style={{ minWidth: '14rem' }}
              >
                Go to dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Order found ──

  const thumbnail = order.artwork?.images?.[0];
  const isDigital = order.artwork?.category === 'digital';
  const orderDate = new Date(order.created_at).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const fmtStep = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString('en-AU', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

  const statusOrder = ['paid', 'shipped', 'delivered', 'completed'];
  const currentIdx = statusOrder.indexOf(order.status);

  const steps: {
    label: string;
    detail: string | null;
    done: boolean;
    current?: boolean;
    extra?: string | null;
  }[] = [
    {
      label: 'Order placed',
      detail: fmtStep(order.created_at),
      done: true,
    },
    {
      label: 'Payment confirmed',
      detail: fmtStep(order.created_at),
      done: currentIdx >= 0,
    },
    {
      label: 'Shipped',
      detail: order.shipped_at ? fmtStep(order.shipped_at) : 'Awaiting shipment',
      done: currentIdx >= 1,
      current: currentIdx === 0,
      extra:
        order.shipped_at && order.shipping_tracking_number
          ? `${order.shipping_carrier ? order.shipping_carrier + ' · ' : ''}${order.shipping_tracking_number}`
          : null,
    },
    {
      label: 'Delivered',
      detail: order.delivered_at ? fmtStep(order.delivered_at) : null,
      done: currentIdx >= 2,
      current: currentIdx === 1,
    },
    {
      label: 'Completed',
      detail: order.payout_released_at ? fmtStep(order.payout_released_at) : null,
      done: currentIdx >= 3,
      current: currentIdx === 2,
    },
  ];

  const deadlinePassed =
    order.inspection_deadline &&
    new Date(order.inspection_deadline).getTime() < Date.now();

  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      <div
        className="px-6 sm:px-10"
        style={{
          maxWidth: '58rem',
          margin: '0 auto',
          paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
        }}
      >
        {/* ── Success banner ── */}
        {isSuccess && (
          <div
            style={{
              marginBottom: '2.4rem',
              paddingBottom: '1.6rem',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <p
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                marginBottom: '0.8rem',
              }}
            >
              — Confirmed —
            </p>
            <p
              className="font-serif"
              style={{
                fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)',
                lineHeight: 1.2,
                color: 'var(--color-ink)',
                fontStyle: 'italic',
                fontWeight: 400,
                maxWidth: '38ch',
              }}
            >
              Your order is placed.
            </p>
            <p
              style={{
                marginTop: '0.8rem',
                fontSize: '0.88rem',
                color: 'var(--color-stone-dark)',
                fontWeight: 300,
                lineHeight: 1.6,
                maxWidth: '54ch',
              }}
            >
              {isDigital
                ? 'Your download link will be available shortly.'
                : 'The artist will ship within 7 days. You\u2019ll receive tracking information once the work is on its way.'}
            </p>
          </div>
        )}

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
            The Studio · Order {order.id.slice(0, 8)}
          </p>
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(1.9rem, 3.6vw, 2.6rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.015em',
              color: 'var(--color-ink)',
              fontWeight: 400,
              marginBottom: '0.8rem',
            }}
          >
            {isSuccess ? (
              <>
                Order <em style={{ fontStyle: 'italic' }}>confirmation.</em>
              </>
            ) : (
              <>
                Order <em style={{ fontStyle: 'italic' }}>ledger.</em>
              </>
            )}
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.2rem',
              flexWrap: 'wrap',
            }}
          >
            <p
              className="font-serif"
              style={{
                fontSize: '0.85rem',
                color: 'var(--color-ink)',
                fontStyle: 'italic',
                fontWeight: 400,
              }}
            >
              {statusLabel(order.status)}
            </p>
            <button
              onClick={copyOrderId}
              className="editorial-link"
              style={{ fontSize: '0.66rem' }}
              aria-label="Copy order ID"
            >
              {copied ? 'Copied' : 'Copy ID'}
            </button>
          </div>
        </header>

        {/* ── Artwork block ── */}
        <Section kicker="01 · The work">
          <div
            style={{
              display: 'flex',
              gap: '1.6rem',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href={`/artwork/${order.artwork?.id}`}
              style={{
                width: 148,
                height: 148,
                background: 'var(--color-cream)',
                flexShrink: 0,
                overflow: 'hidden',
                display: 'block',
              }}
            >
              {thumbnail && (
                <Image
                  src={thumbnail}
                  alt={order.artwork?.title || ''}
                  width={148}
                  height={148}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </Link>
            <div style={{ flex: 1, minWidth: '18rem' }}>
              <Link
                href={`/artwork/${order.artwork?.id}`}
                className="font-serif"
                style={{
                  fontSize: '1.5rem',
                  color: 'var(--color-ink)',
                  textDecoration: 'none',
                  lineHeight: 1.2,
                  display: 'block',
                }}
              >
                {order.artwork?.title || 'Artwork'}
              </Link>
              <p
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 300,
                  color: 'var(--color-stone-dark)',
                }}
              >
                by{' '}
                <Link
                  href={`/artists/${order.artist?.id}`}
                  className="footer-link"
                  style={{ fontStyle: 'italic' }}
                >
                  {order.artist?.full_name || 'Unknown artist'}
                </Link>
              </p>
              {order.artwork?.medium && (
                <p
                  style={{
                    marginTop: '0.3rem',
                    fontSize: '0.78rem',
                    color: 'var(--color-stone)',
                    fontWeight: 300,
                  }}
                >
                  {order.artwork.medium}
                </p>
              )}
              <p
                style={{
                  marginTop: '0.9rem',
                  fontSize: '0.6rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--color-stone)',
                }}
              >
                {isDigital
                  ? 'Digital'
                  : order.artwork?.category === 'print'
                    ? 'Print'
                    : 'Original'}
              </p>
            </div>
          </div>
        </Section>

        {/* ── Payment summary ── */}
        <Section kicker="02 · Payment">
          <DetailRow
            label="Artwork"
            value={formatPrice(order.total_amount_aud - (order.shipping_cost_aud || 0))}
          />
          {!isDigital && (
            <DetailRow
              label="Shipping"
              value={
                (order.shipping_cost_aud || 0) > 0
                  ? formatPrice(order.shipping_cost_aud!)
                  : 'Free'
              }
            />
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: '1rem',
              padding: '1rem 0 0.4rem',
              marginTop: '0.4rem',
              borderTop: '1px solid var(--color-border-strong)',
            }}
          >
            <span
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
              }}
            >
              Total paid
            </span>
            <span
              className="font-serif"
              style={{
                fontSize: '1.5rem',
                color: 'var(--color-ink)',
                fontWeight: 400,
              }}
            >
              {formatPrice(order.total_amount_aud)}
            </span>
          </div>
          <p
            style={{
              marginTop: '0.8rem',
              fontSize: '0.78rem',
              color: 'var(--color-stone)',
              fontWeight: 300,
              fontStyle: 'italic',
            }}
            className="font-serif"
          >
            Placed {orderDate}
          </p>
        </Section>

        {/* ── Shipping ── */}
        {!isDigital && order.shipping_address && (
          <Section kicker="03 · Shipping">
            <p
              className="font-serif"
              style={{
                fontSize: '1rem',
                lineHeight: 1.7,
                color: 'var(--color-ink)',
                fontWeight: 400,
              }}
            >
              {order.shipping_address.street}
              <br />
              {order.shipping_address.city}, {order.shipping_address.state}{' '}
              {order.shipping_address.postcode}
              <br />
              {order.shipping_address.country || 'Australia'}
            </p>
            {order.shipping_tracking_number && (
              <div
                style={{
                  marginTop: '1.4rem',
                  paddingTop: '1.2rem',
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                <p
                  style={{
                    fontSize: '0.6rem',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'var(--color-stone)',
                    marginBottom: '0.4rem',
                  }}
                >
                  Tracking
                </p>
                <p
                  style={{
                    fontFamily: 'ui-monospace, Menlo, monospace',
                    fontSize: '0.85rem',
                    color: 'var(--color-ink)',
                  }}
                >
                  {order.shipping_carrier && (
                    <span style={{ color: 'var(--color-stone)' }}>
                      {order.shipping_carrier} ·{' '}
                    </span>
                  )}
                  {order.shipping_tracking_number}
                </p>
              </div>
            )}
          </Section>
        )}

        {/* ── Timeline ── */}
        <Section kicker={`${!isDigital && order.shipping_address ? '04' : '03'} · Timeline`}>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {steps.map((step, i) => (
              <li
                key={step.label}
                style={{
                  display: 'flex',
                  gap: '1.1rem',
                  alignItems: 'flex-start',
                  paddingBottom: i < steps.length - 1 ? '1.4rem' : 0,
                  position: 'relative',
                }}
              >
                {/* Dot column */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flexShrink: 0,
                    paddingTop: '0.3rem',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: step.done ? 'var(--color-ink)' : 'transparent',
                      border: step.done
                        ? '1px solid var(--color-ink)'
                        : step.current
                          ? '1px solid var(--color-ink)'
                          : '1px solid var(--color-border-strong)',
                      boxShadow: step.current
                        ? '0 0 0 3px var(--color-warm-white), 0 0 0 4px var(--color-ink)'
                        : 'none',
                    }}
                  />
                  {i < steps.length - 1 && (
                    <span
                      aria-hidden
                      style={{
                        width: 1,
                        flex: 1,
                        minHeight: 28,
                        background: step.done
                          ? 'var(--color-ink)'
                          : 'var(--color-border)',
                        marginTop: 4,
                      }}
                    />
                  )}
                </div>

                <div style={{ paddingBottom: '0.2rem', minWidth: 0 }}>
                  <p
                    className="font-serif"
                    style={{
                      fontSize: '1rem',
                      fontWeight: 400,
                      color: step.done || step.current
                        ? 'var(--color-ink)'
                        : 'var(--color-stone)',
                      fontStyle: step.current ? 'italic' : 'normal',
                      margin: 0,
                      lineHeight: 1.3,
                    }}
                  >
                    {step.label}
                  </p>
                  {step.detail && (
                    <p
                      style={{
                        fontSize: '0.76rem',
                        color: step.done
                          ? 'var(--color-stone-dark)'
                          : 'var(--color-stone)',
                        fontWeight: 300,
                        marginTop: '0.2rem',
                      }}
                    >
                      {step.detail}
                    </p>
                  )}
                  {step.extra && (
                    <p
                      style={{
                        fontFamily: 'ui-monospace, Menlo, monospace',
                        fontSize: '0.76rem',
                        color: 'var(--color-stone-dark)',
                        marginTop: '0.3rem',
                      }}
                    >
                      {step.extra}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* ── Inspection window ── */}
        {order.status === 'delivered' && order.inspection_deadline && (
          <Section kicker="Inspection window">
            {deadlinePassed ? (
              <p
                className="font-serif"
                style={{
                  fontSize: '1.05rem',
                  fontStyle: 'italic',
                  color: 'var(--color-stone)',
                }}
              >
                The inspection window has closed.
              </p>
            ) : (
              <>
                <p
                  className="font-serif"
                  style={{
                    fontSize: '1.2rem',
                    lineHeight: 1.4,
                    color: 'var(--color-ink)',
                    fontStyle: 'italic',
                    fontWeight: 400,
                    maxWidth: '46ch',
                  }}
                >
                  You have 48 hours to inspect the work.
                </p>
                {countdown && (
                  <p
                    style={{
                      marginTop: '0.5rem',
                      fontFamily: 'ui-monospace, Menlo, monospace',
                      fontSize: '0.92rem',
                      color: 'var(--color-ink)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {countdown.hours}h {countdown.minutes}m remaining
                  </p>
                )}
                <div
                  style={{
                    marginTop: '1.6rem',
                    display: 'flex',
                    gap: '1.4rem',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  <button
                    onClick={handleComplete}
                    disabled={completing}
                    className="artwork-primary-cta artwork-primary-cta--compact"
                    style={{
                      minWidth: '16rem',
                      opacity: completing ? 0.5 : 1,
                    }}
                  >
                    {completing ? 'Confirming…' : 'Everything looks great'}
                  </button>
                  <Link
                    href={`/orders/${order.id}/dispute`}
                    className="font-serif"
                    style={{
                      fontSize: '0.72rem',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: 'var(--color-terracotta)',
                      fontStyle: 'italic',
                      textDecoration: 'none',
                      borderBottom: '1px solid var(--color-terracotta)',
                      paddingBottom: '0.15rem',
                    }}
                  >
                    Report an issue
                  </Link>
                </div>
              </>
            )}
          </Section>
        )}

        {/* ── Dispute banner ── */}
        {order.status === 'disputed' && (
          <div
            style={{
              marginBottom: '2.4rem',
              paddingTop: '1.6rem',
              paddingBottom: '1.6rem',
              borderTop: '1px solid var(--color-terracotta)',
              borderBottom: '1px solid var(--color-terracotta)',
            }}
          >
            <p
              style={{
                fontSize: '0.6rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-terracotta)',
                marginBottom: '0.5rem',
              }}
            >
              — Disputed —
            </p>
            <p
              className="font-serif"
              style={{
                fontSize: '1.05rem',
                fontStyle: 'italic',
                color: 'var(--color-ink)',
                lineHeight: 1.5,
                maxWidth: '52ch',
              }}
            >
              A dispute has been opened for this order. Signo is reviewing it.
            </p>
          </div>
        )}

        {/* ── Buyer protection ── */}
        <Section kicker="Buyer protection">
          <p
            className="font-serif"
            style={{
              fontSize: '1rem',
              lineHeight: 1.65,
              color: 'var(--color-ink)',
              fontWeight: 400,
              maxWidth: '58ch',
            }}
          >
            Your payment is held in escrow. After delivery, you have a 48-hour inspection window — if
            anything isn&apos;t as described, open a dispute for a full refund. The artist is paid only
            once the window closes.
          </p>
        </Section>

        {/* ── Actions ── */}
        <div
          style={{
            display: 'flex',
            gap: '1.6rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            paddingTop: '1.4rem',
            borderTop: '1px solid var(--color-border-strong)',
          }}
        >
          <Link
            href="/dashboard"
            className="artwork-primary-cta artwork-primary-cta--compact"
            style={{ minWidth: '14rem' }}
          >
            Back to dashboard
          </Link>
          <Link href="/browse" className="editorial-link">
            Continue browsing
          </Link>
          {order.status === 'completed' && (
            <span
              className="font-serif"
              style={{
                fontSize: '0.75rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                fontStyle: 'italic',
              }}
            >
              Reviews coming soon
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page wrapper ──

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { loading: authLoading } = useRequireAuth();
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setOrderId(p.id));
  }, [params]);

  const spinner = (
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
        style={{
          fontStyle: 'italic',
          fontSize: '0.95rem',
          color: 'var(--color-stone)',
        }}
      >
        Loading…
      </p>
    </div>
  );

  if (authLoading) return spinner;
  if (!orderId) return spinner;

  return (
    <Suspense fallback={spinner}>
      <OrderContent orderId={orderId} />
    </Suspense>
  );
}
