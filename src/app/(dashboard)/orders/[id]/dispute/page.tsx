'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';

// ── Types ──

type DisputeType = 'damaged' | 'not_as_described' | 'not_received' | 'other';

interface OrderBasic {
  id: string;
  status: string;
  inspection_deadline: string | null;
  artwork: {
    title: string;
  } | null;
}

const disputeTypes: { value: DisputeType; label: string; description: string }[] = [
  {
    value: 'damaged',
    label: 'Arrived damaged',
    description: 'The work was damaged in shipping or handling.',
  },
  {
    value: 'not_as_described',
    label: 'Not as described',
    description: 'The work differs significantly from the listing.',
  },
  {
    value: 'not_received',
    label: 'Not received',
    description: 'Delivery was confirmed but the work never arrived.',
  },
  {
    value: 'other',
    label: 'Another issue',
    description: 'Something else is wrong with the order.',
  },
];

// ── Spinner ──

function Spinner({ label }: { label?: string }) {
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
        {label || 'Loading…'}
      </p>
    </div>
  );
}

// ── Content ──

function DisputeContent({ orderId }: { orderId: string }) {
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderBasic | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockReason, setBlockReason] = useState<string | null>(null);

  // Form state
  const [disputeType, setDisputeType] = useState<DisputeType | null>(null);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) {
          setBlockReason('Order not found or you do not have access.');
          setLoading(false);
          return;
        }

        const { order: orderData } = await res.json();
        if (!orderData) {
          setBlockReason('Order not found or you do not have access.');
          setLoading(false);
          return;
        }

        const artwork = orderData.artworks as Record<string, string> | null;
        const ord: OrderBasic = {
          id: orderData.id as string,
          status: orderData.status as string,
          inspection_deadline: orderData.inspection_deadline as string | null,
          artwork: artwork ? { title: artwork.title || 'Artwork' } : null,
        };
        setOrder(ord);

        if (ord.status !== 'delivered') {
          setBlockReason('Disputes can only be opened for delivered orders.');
          setLoading(false);
          return;
        }

        if (
          ord.inspection_deadline &&
          new Date(ord.inspection_deadline).getTime() < Date.now()
        ) {
          setBlockReason('The 48-hour inspection window has closed.');
          setLoading(false);
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error('[Dispute] Fetch error:', err);
        setBlockReason('Failed to load order details.');
        setLoading(false);
      }
    }

    load();
  }, [user, orderId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!disputeType || description.length < 20 || !order) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: disputeType,
          description,
          evidence_images: [],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit dispute');
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ──

  if (loading) return <Spinner label="Loading order…" />;

  const shellStyle = {
    background: 'var(--color-warm-white)',
    minHeight: '100vh',
  } as const;

  const pageShell = (children: React.ReactNode) => (
    <div style={shellStyle}>
      <div
        className="px-6 sm:px-10"
        style={{
          maxWidth: '46rem',
          margin: '0 auto',
          paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
        }}
      >
        {children}
      </div>
    </div>
  );

  // ── Blocked ──

  if (blockReason) {
    return pageShell(
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
          — Not available —
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(1.9rem, 3.6vw, 2.6rem)',
            lineHeight: 1.1,
            color: 'var(--color-ink)',
            fontWeight: 400,
            marginBottom: '1.2rem',
          }}
        >
          We can&apos;t open a dispute for this order.
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--color-stone-dark)',
            fontWeight: 300,
            lineHeight: 1.6,
            marginBottom: '2rem',
            maxWidth: '52ch',
          }}
        >
          {blockReason}
        </p>
        <Link
          href={`/orders/${orderId}`}
          className="artwork-primary-cta artwork-primary-cta--compact"
          style={{ minWidth: '14rem' }}
        >
          ← Back to order
        </Link>
      </>
    );
  }

  // ── Success ──

  if (submitted) {
    return pageShell(
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
            fontSize: 'clamp(1.9rem, 3.6vw, 2.6rem)',
            lineHeight: 1.1,
            color: 'var(--color-ink)',
            fontWeight: 400,
            marginBottom: '1.2rem',
          }}
        >
          Your dispute is <em style={{ fontStyle: 'italic' }}>submitted.</em>
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--color-stone-dark)',
            fontWeight: 300,
            lineHeight: 1.6,
            marginBottom: '2rem',
            maxWidth: '52ch',
          }}
        >
          Signo will review within 48 hours. You&apos;ll hear from us by email.
        </p>
        <Link
          href={`/orders/${orderId}`}
          className="artwork-primary-cta artwork-primary-cta--compact"
          style={{ minWidth: '14rem' }}
        >
          ← Back to order
        </Link>
      </>
    );
  }

  // ── Form ──

  return pageShell(
    <>
      <Link
        href={`/orders/${orderId}`}
        className="font-serif"
        style={{
          display: 'inline-block',
          marginBottom: '2rem',
          fontSize: '0.68rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          fontStyle: 'italic',
          color: 'var(--color-stone)',
          textDecoration: 'none',
        }}
      >
        ← Back to order
      </Link>

      <p
        style={{
          fontSize: '0.62rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--color-stone)',
          marginBottom: '1rem',
        }}
      >
        Report an issue
      </p>
      <h1
        className="font-serif"
        style={{
          fontSize: 'clamp(2rem, 4vw, 2.8rem)',
          lineHeight: 1.08,
          letterSpacing: '-0.015em',
          color: 'var(--color-ink)',
          fontWeight: 400,
          marginBottom: '0.8rem',
        }}
      >
        Something isn&apos;t <em style={{ fontStyle: 'italic' }}>right.</em>
      </h1>
      <p
        style={{
          fontSize: '0.92rem',
          fontWeight: 300,
          color: 'var(--color-stone-dark)',
          lineHeight: 1.6,
          marginBottom: '2.4rem',
          maxWidth: '52ch',
        }}
      >
        Tell us what happened. A Signo team member will review your dispute within 48 hours.
        {order?.artwork && (
          <>
            {' '}For <em style={{ fontStyle: 'italic' }}>{order.artwork.title}</em>.
          </>
        )}
      </p>

      <form onSubmit={handleSubmit}>
        {/* Dispute type */}
        <div style={{ marginBottom: '2.2rem' }}>
          <p className="commission-label">What&apos;s the issue?</p>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              borderTop: '1px solid var(--color-border-strong)',
            }}
          >
            {disputeTypes.map((dt) => {
              const active = disputeType === dt.value;
              return (
                <li
                  key={dt.value}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <button
                    type="button"
                    onClick={() => setDisputeType(dt.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '1rem 0',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: active ? 22 : 0,
                        height: 1,
                        background: 'var(--color-ink)',
                        verticalAlign: 'middle',
                        marginRight: active ? 12 : 0,
                        transition: 'width 200ms cubic-bezier(0.22, 1, 0.36, 1), margin 200ms cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                      aria-hidden
                    />
                    <span
                      className="font-serif"
                      style={{
                        fontSize: '1.05rem',
                        color: 'var(--color-ink)',
                        fontWeight: 400,
                        fontStyle: active ? 'italic' : 'normal',
                      }}
                    >
                      {dt.label}
                    </span>
                    <p
                      style={{
                        marginTop: '0.3rem',
                        marginLeft: active ? 34 : 0,
                        fontSize: '0.82rem',
                        color: 'var(--color-stone)',
                        fontWeight: 300,
                        lineHeight: 1.5,
                        transition: 'margin 200ms cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                    >
                      {dt.description}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '2.2rem' }}>
          <label htmlFor="description" className="commission-label">
            Describe the issue
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us what happened in detail…"
            rows={6}
            className="commission-field"
            required
            minLength={20}
            style={{ resize: 'vertical' }}
          />
          <p
            style={{
              marginTop: '0.5rem',
              fontSize: '0.72rem',
              fontWeight: 300,
              fontStyle: description.length > 0 && description.length < 20 ? 'italic' : 'normal',
              color:
                description.length > 0 && description.length < 20
                  ? 'var(--color-terracotta)'
                  : 'var(--color-stone)',
            }}
          >
            {description.length} / 20 characters minimum
          </p>
        </div>

        {/* Photo evidence */}
        <div style={{ marginBottom: '2.2rem' }}>
          <label className="commission-label">Photo evidence</label>
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              borderBottom: '1px solid var(--color-border)',
              padding: '1.4rem 0',
            }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              style={{
                display: 'block',
                width: '100%',
                fontSize: '0.82rem',
                color: 'var(--color-stone-dark)',
                fontWeight: 300,
              }}
            />
            {files && files.length > 0 && (
              <p
                className="font-serif"
                style={{
                  marginTop: '0.6rem',
                  fontStyle: 'italic',
                  fontSize: '0.78rem',
                  color: 'var(--color-stone)',
                }}
              >
                {files.length} file{files.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
          <p
            style={{
              marginTop: '0.5rem',
              fontSize: '0.72rem',
              color: 'var(--color-stone)',
              fontWeight: 300,
              fontStyle: 'italic',
            }}
            className="font-serif"
          >
            {disputeType === 'damaged'
              ? 'Required for damage claims.'
              : 'Recommended to support your claim.'}
          </p>
        </div>

        {error && (
          <p
            className="font-serif"
            style={{
              marginBottom: '1.6rem',
              fontSize: '0.92rem',
              color: 'var(--color-terracotta, #c45d3e)',
              fontStyle: 'italic',
              fontWeight: 400,
              lineHeight: 1.5,
              maxWidth: '52ch',
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!disputeType || description.length < 20 || submitting}
          className="artwork-primary-cta artwork-primary-cta--compact"
          style={{
            minWidth: '18rem',
            opacity: !disputeType || description.length < 20 || submitting ? 0.5 : 1,
          }}
        >
          {submitting ? 'Submitting…' : 'Submit dispute'}
        </button>
      </form>
    </>
  );
}

// ── Page wrapper ──

export default function DisputePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { loading: authLoading } = useRequireAuth();
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setOrderId(p.id));
  }, [params]);

  if (authLoading) return <Spinner />;
  if (!orderId) return <Spinner />;

  return <DisputeContent orderId={orderId} />;
}
