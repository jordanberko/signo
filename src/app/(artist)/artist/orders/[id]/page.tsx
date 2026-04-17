'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/providers/AuthProvider';
import EditorialSpinner from '@/components/ui/EditorialSpinner';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { formatPrice } from '@/lib/utils';

// ── Types ──

interface OrderDetail {
  id: string;
  total_amount_aud: number | null;
  artist_payout_aud: number | null;
  status: string;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  payout_released_at: string | null;
  shipping_tracking_number: string | null;
  shipping_carrier: string | null;
  shipping_address: Record<string, string> | null;
  artworks: {
    id: string;
    title: string;
    images: string[];
    category: string;
    medium: string;
  } | null;
  profiles: { full_name: string; email: string } | null;
}

interface DisputeInfo {
  type: string;
  description: string;
  status: string;
  created_at: string;
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

const CARRIERS = ['Australia Post', 'Sendle', 'StarTrack', 'Aramex', 'Other'];

const DISPUTE_TYPE_LABELS: Record<string, string> = {
  damaged: 'Item damaged',
  not_as_described: 'Not as described',
  not_received: 'Not received',
};

const KICKER: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Shell ──

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      <div
        className="px-6 sm:px-10"
        style={{
          maxWidth: '56rem',
          margin: '0 auto',
          paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Inner content ──

function OrderContent({ orderId }: { orderId: string }) {
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [dispute, setDispute] = useState<DisputeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [, setPackagingPhoto] = useState<File | null>(null);

  async function fetchOrder() {
    if (!user) return;
    try {
      const res = await fetch(`/api/artist/orders/${orderId}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.order) setOrder(data.order as OrderDetail);
      if (data.dispute) setDispute(data.dispute as DisputeInfo);
    } catch (err) {
      console.error('[ArtistOrderDetail] Fetch error:', err);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!user) return;
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, orderId]);

  async function handleShipOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingNumber.trim() || !carrier) return;

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/orders/${orderId}/ship`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracking_number: trackingNumber.trim(),
          carrier,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to mark order as shipped');
      }

      setSuccessMessage('Order marked as dispatched.');
      setTrackingNumber('');
      setCarrier('');
      setPackagingPhoto(null);

      setLoading(true);
      await fetchOrder();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <EditorialSpinner headline="Retrieving the order…" />;

  if (!order) {
    return (
      <PageShell>
        <Link
          href="/artist/orders"
          className="font-serif"
          style={{
            fontStyle: 'italic',
            fontSize: '0.85rem',
            color: 'var(--color-stone)',
            textDecoration: 'none',
            display: 'inline-block',
            marginBottom: '2rem',
          }}
        >
          ← All orders
        </Link>
        <p
          className="font-serif"
          style={{
            fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)',
            fontStyle: 'italic',
            color: 'var(--color-ink)',
            lineHeight: 1.2,
          }}
        >
          Order not found.
        </p>
        <p
          style={{
            marginTop: '1rem',
            fontSize: '0.9rem',
            fontWeight: 300,
            color: 'var(--color-stone-dark)',
          }}
        >
          This order doesn&apos;t exist or isn&apos;t yours.
        </p>
      </PageShell>
    );
  }

  const label = STATUS_LABEL[order.status] ?? order.status;
  const salePrice = order.total_amount_aud ?? 0;
  const payout = order.artist_payout_aud ?? 0;
  const stripeFee = Math.round((salePrice - payout) * 100) / 100;
  const artwork = order.artworks;
  const thumbnail = artwork?.images?.[0];
  const address = order.shipping_address;

  const isShipped = ['shipped', 'delivered', 'completed'].includes(order.status);
  const isDelivered = ['delivered', 'completed'].includes(order.status);
  const isCompleted = order.status === 'completed';

  const timeline: Array<{ title: string; date: string | null; done: boolean }> = [
    { title: 'Order placed', date: formatDate(order.created_at), done: true },
    { title: 'Payment confirmed', date: formatDate(order.created_at), done: true },
    {
      title: 'Dispatched',
      date: isShipped && order.shipped_at ? formatDate(order.shipped_at) : 'Awaiting your dispatch',
      done: isShipped,
    },
    {
      title: 'Delivered',
      date: isDelivered && order.delivered_at ? formatDate(order.delivered_at) : null,
      done: isDelivered,
    },
    {
      title: 'Completed · payout released',
      date: isCompleted && order.payout_released_at ? formatDate(order.payout_released_at) : null,
      done: isCompleted,
    },
  ];

  return (
    <PageShell>
      {/* Back */}
      <Link
        href="/artist/orders"
        className="font-serif"
        style={{
          fontStyle: 'italic',
          fontSize: '0.85rem',
          color: 'var(--color-stone)',
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: '2rem',
        }}
      >
        ← All orders
      </Link>

      {/* Header */}
      <header
        style={{
          marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)',
          borderBottom: '1px solid var(--color-border-strong)',
          paddingBottom: 'clamp(1.6rem, 3vw, 2.4rem)',
        }}
      >
        <p style={{ ...KICKER, marginBottom: '1rem' }}>
          The Studio · Order · {label}
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(1.8rem, 3.6vw, 2.6rem)',
            lineHeight: 1.1,
            letterSpacing: '-0.015em',
            color: 'var(--color-ink)',
            fontWeight: 400,
            marginBottom: '0.7rem',
          }}
        >
          {artwork?.title ?? 'Unknown work'}
        </h1>
        <p
          className="font-serif"
          style={{
            fontSize: '0.88rem',
            fontStyle: 'italic',
            color: 'var(--color-stone)',
          }}
        >
          Placed{' '}
          {new Date(order.created_at).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </header>

      {/* Messages */}
      {successMessage && (
        <div
          style={{
            marginBottom: '2rem',
            paddingBlock: '1.2rem',
            borderTop: '1px solid var(--color-ink)',
            borderBottom: '1px solid var(--color-ink)',
          }}
        >
          <p
            className="font-serif"
            style={{
              fontSize: '0.92rem',
              fontStyle: 'italic',
              color: 'var(--color-ink)',
            }}
          >
            ✓ {successMessage}
          </p>
        </div>
      )}
      {errorMessage && (
        <div
          style={{
            marginBottom: '2rem',
            paddingBlock: '1.2rem',
            borderTop: '1px solid var(--color-terracotta, #c45d3e)',
            borderBottom: '1px solid var(--color-terracotta, #c45d3e)',
          }}
        >
          <p
            className="font-serif"
            style={{
              fontSize: '0.92rem',
              fontStyle: 'italic',
              color: 'var(--color-terracotta, #c45d3e)',
            }}
          >
            — {errorMessage}
          </p>
        </div>
      )}

      {/* Artwork */}
      <section style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
        <p style={{ ...KICKER, marginBottom: '1.2rem' }}>— The work —</p>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1.6rem',
            paddingBottom: '1.6rem',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              width: 96,
              height: 120,
              background: 'var(--color-cream)',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {thumbnail && (
              <Image
                src={thumbnail}
                alt={artwork?.title ?? ''}
                width={96}
                height={120}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              className="font-serif"
              style={{
                fontSize: '1.2rem',
                fontWeight: 400,
                color: 'var(--color-ink)',
                marginBottom: '0.3rem',
              }}
            >
              {artwork?.title ?? 'Unknown'}
            </h2>
            {artwork?.medium && (
              <p
                className="font-serif"
                style={{
                  fontSize: '0.88rem',
                  fontStyle: 'italic',
                  color: 'var(--color-stone-dark)',
                  marginBottom: '0.5rem',
                }}
              >
                {artwork.medium}
              </p>
            )}
            {artwork?.category && (
              <p style={{ ...KICKER, fontSize: '0.58rem' }}>
                {artwork.category}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Buyer */}
      <section style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
        <p style={{ ...KICKER, marginBottom: '1.2rem' }}>— The buyer —</p>
        <p
          className="font-serif"
          style={{
            fontSize: '1.05rem',
            color: 'var(--color-ink)',
            marginBottom: '1.4rem',
          }}
        >
          {order.profiles?.full_name ?? 'Unknown'}
        </p>
        {address && (
          <dl
            style={{
              margin: 0,
              padding: '1.2rem 0',
              borderTop: '1px solid var(--color-border)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <dt style={{ ...KICKER, marginBottom: '0.6rem' }}>
              Shipping to
            </dt>
            <dd
              style={{
                margin: 0,
                fontSize: '0.9rem',
                color: 'var(--color-ink)',
                fontWeight: 300,
                lineHeight: 1.7,
              }}
            >
              {address.line1 && <span style={{ display: 'block' }}>{address.line1}</span>}
              {address.line2 && <span style={{ display: 'block' }}>{address.line2}</span>}
              <span style={{ display: 'block' }}>
                {[address.city, address.state, address.postal_code]
                  .filter(Boolean)
                  .join(', ')}
              </span>
              {address.country && <span style={{ display: 'block' }}>{address.country}</span>}
            </dd>
          </dl>
        )}
      </section>

      {/* Payment summary */}
      <section style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
        <p style={{ ...KICKER, marginBottom: '1.2rem' }}>— The ledger —</p>
        <dl
          style={{
            margin: 0,
            padding: 0,
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {[
            { term: 'Sale price', val: formatPrice(salePrice), muted: false },
            { term: 'Stripe processing', val: `−${formatPrice(stripeFee)}`, muted: true },
          ].map((row) => (
            <div
              key={row.term}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '1rem 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <dt
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 300,
                  color: 'var(--color-stone-dark)',
                }}
              >
                {row.term}
              </dt>
              <dd
                className="font-serif"
                style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontStyle: row.muted ? 'italic' : 'normal',
                  color: row.muted
                    ? 'var(--color-stone)'
                    : 'var(--color-ink)',
                }}
              >
                {row.val}
              </dd>
            </div>
          ))}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '1.4rem 0 0',
            }}
          >
            <dt
              style={{
                ...KICKER,
                marginTop: 0,
              }}
            >
              You receive
            </dt>
            <dd
              className="font-serif"
              style={{
                margin: 0,
                fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)',
                fontWeight: 400,
                color: 'var(--color-ink)',
                letterSpacing: '-0.01em',
              }}
            >
              {formatPrice(payout)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Timeline */}
      <section style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
        <p style={{ ...KICKER, marginBottom: '1.2rem' }}>— The timeline —</p>
        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {timeline.map((step) => (
            <li
              key={step.title}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '1.1rem 0',
                borderBottom: '1px solid var(--color-border)',
                gap: '1rem',
                opacity: step.done ? 1 : 0.42,
              }}
            >
              <span
                className="font-serif"
                style={{
                  fontSize: '1rem',
                  fontStyle: step.done ? 'italic' : 'normal',
                  color: 'var(--color-ink)',
                }}
              >
                {step.title}
              </span>
              {step.date && (
                <span
                  className="font-serif"
                  style={{
                    fontSize: '0.8rem',
                    fontStyle: 'italic',
                    color: 'var(--color-stone)',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {step.date}
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Tracking info */}
      {isShipped && order.shipping_tracking_number && (
        <section style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
          <p style={{ ...KICKER, marginBottom: '1.2rem' }}>— In transit —</p>
          <dl
            style={{
              margin: 0,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.2rem 2rem',
              padding: '1.4rem 0',
              borderTop: '1px solid var(--color-border)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div>
              <dt style={{ ...KICKER, marginBottom: '0.4rem' }}>Carrier</dt>
              <dd
                className="font-serif"
                style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  color: 'var(--color-ink)',
                }}
              >
                {order.shipping_carrier ?? '—'}
              </dd>
            </div>
            <div>
              <dt style={{ ...KICKER, marginBottom: '0.4rem' }}>
                Tracking number
              </dt>
              <dd
                style={{
                  margin: 0,
                  fontSize: '0.88rem',
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  color: 'var(--color-ink)',
                  wordBreak: 'break-all',
                }}
              >
                {order.shipping_tracking_number}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {/* Dispute alert */}
      {order.status === 'disputed' && (
        <section
          style={{
            marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)',
            padding: '1.6rem 0',
            borderTop: '1px solid var(--color-terracotta, #c45d3e)',
            borderBottom: '1px solid var(--color-terracotta, #c45d3e)',
          }}
        >
          <p
            style={{
              ...KICKER,
              color: 'var(--color-terracotta, #c45d3e)',
              marginBottom: '0.9rem',
            }}
          >
            — A dispute has been raised —
          </p>
          {dispute ? (
            <>
              <p
                className="font-serif"
                style={{
                  fontSize: '1.1rem',
                  fontStyle: 'italic',
                  color: 'var(--color-ink)',
                  marginBottom: '0.7rem',
                  lineHeight: 1.3,
                }}
              >
                {DISPUTE_TYPE_LABELS[dispute.type] ?? dispute.type}.
              </p>
              <p
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 300,
                  color: 'var(--color-stone-dark)',
                  lineHeight: 1.6,
                  marginBottom: '0.7rem',
                }}
              >
                {dispute.description}
              </p>
              <p
                className="font-serif"
                style={{
                  fontSize: '0.78rem',
                  fontStyle: 'italic',
                  color: 'var(--color-stone)',
                }}
              >
                Opened{' '}
                {new Date(dispute.created_at).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </>
          ) : (
            <p
              style={{
                fontSize: '0.9rem',
                fontWeight: 300,
                color: 'var(--color-stone-dark)',
                lineHeight: 1.6,
              }}
            >
              The buyer has raised a dispute. Our team will be in touch
              shortly.
            </p>
          )}
        </section>
      )}

      {/* Ship form */}
      {order.status === 'paid' && (
        <section style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
          <p style={{ ...KICKER, marginBottom: '1rem' }}>— Dispatch —</p>
          <h2
            className="font-serif"
            style={{
              fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)',
              lineHeight: 1.2,
              color: 'var(--color-ink)',
              fontWeight: 400,
              marginBottom: '0.7rem',
            }}
          >
            Mark this work as <em style={{ fontStyle: 'italic' }}>on its way.</em>
          </h2>
          <p
            style={{
              fontSize: '0.9rem',
              fontWeight: 300,
              color: 'var(--color-stone-dark)',
              lineHeight: 1.6,
              marginBottom: '2rem',
              maxWidth: '52ch',
            }}
          >
            Enter tracking details below — the buyer is notified, and your
            payout is released when the work is confirmed delivered.
          </p>

          <form
            onSubmit={handleShipOrder}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.8rem',
              maxWidth: '40rem',
            }}
          >
            <div>
              <label
                htmlFor="tracking_number"
                style={{ ...KICKER, display: 'block', marginBottom: '0.6rem' }}
              >
                Tracking number
              </label>
              <input
                id="tracking_number"
                type="text"
                required
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="AP123456789AU"
                className="commission-field"
              />
            </div>

            <div>
              <label
                htmlFor="carrier"
                style={{ ...KICKER, display: 'block', marginBottom: '0.6rem' }}
              >
                Carrier
              </label>
              <select
                id="carrier"
                required
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="commission-field"
              >
                <option value="">Select a carrier</option>
                {CARRIERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="packaging_photo"
                style={{ ...KICKER, display: 'block', marginBottom: '0.6rem' }}
              >
                Packaging photo · optional
              </label>
              <input
                id="packaging_photo"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setPackagingPhoto(e.target.files?.[0] ?? null)
                }
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.7rem 0',
                  fontSize: '0.85rem',
                  color: 'var(--color-stone-dark)',
                  fontStyle: 'italic',
                }}
              />
              <p
                className="font-serif"
                style={{
                  marginTop: '0.4rem',
                  fontSize: '0.78rem',
                  fontStyle: 'italic',
                  color: 'var(--color-stone)',
                }}
              >
                Evidence of careful packaging — useful if a dispute is raised.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || !trackingNumber.trim() || !carrier}
              className="artwork-primary-cta"
              style={{ alignSelf: 'flex-start' }}
            >
              {submitting ? 'Confirming…' : 'Confirm dispatch'}
            </button>
          </form>
        </section>
      )}
    </PageShell>
  );
}

// ── Wrapper ──

export default function ArtistOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { loading: authLoading } = useRequireAuth('artist');
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setOrderId(p.id));
  }, [params]);

  if (authLoading) return <EditorialSpinner />;
  if (!orderId) return <EditorialSpinner />;

  return (
    <Suspense fallback={<EditorialSpinner />}>
      <OrderContent orderId={orderId} />
    </Suspense>
  );
}
