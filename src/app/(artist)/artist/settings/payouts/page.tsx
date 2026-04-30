'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import EditorialSpinner from '@/components/ui/EditorialSpinner';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';

// ── Types ──

interface ConnectStatus {
  connected: boolean;
  accountId: string | null;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  bankLast4?: string | null;
  bankName?: string | null;
}

const KICKER: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
};

function PayoutsContent() {
  const { loading: authLoading } = useRequireAuth('artist');
  const searchParams = useSearchParams();
  const onboarded = searchParams.get('onboarded');
  const refresh = searchParams.get('refresh');

  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/connect/status');
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      setStatus(data);
    } catch {
      setError('Unable to load payout status. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (onboarded === 'true') {
      setShowSuccess(true);
      fetchStatus();
      const t = setTimeout(() => setShowSuccess(false), 8000);
      return () => clearTimeout(t);
    }
  }, [onboarded, fetchStatus]);

  async function handleContinueOnboarding() {
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/connect/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: window.location.origin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate link');
      if (!data.url) throw new Error('Stripe did not return a redirect URL. Please try again.');
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      // Always re-enable the button. On success the page is about to
      // navigate, so the briefly re-enabled state is invisible to the
      // user; on any failure mode (API error, missing URL, network throw)
      // the button is unstuck so the user can retry.
      setActionLoading(false);
    }
  }

  useEffect(() => {
    if (refresh === 'true' && status?.connected && !status?.detailsSubmitted) {
      handleContinueOnboarding();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, status]);

  async function handleStartOnboarding() {
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: window.location.origin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start onboarding');
      if (!data.url) throw new Error('Stripe did not return a redirect URL. Please try again.');
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      // Always re-enable the button — see the same comment in
      // handleContinueOnboarding for the rationale.
      setActionLoading(false);
    }
  }

  if (authLoading || loading) return <EditorialSpinner />;

  const isFullyConnected =
    status?.connected && status?.detailsSubmitted && status?.payoutsEnabled;
  const isPartiallyConnected = status?.connected && !status?.detailsSubmitted;

  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      <div
        className="px-6 sm:px-10"
        style={{
          maxWidth: '52rem',
          margin: '0 auto',
          paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
        }}
      >
        <Link
          href="/artist/dashboard"
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
          ← The studio
        </Link>

        {/* Header */}
        <header
          style={{
            marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)',
            borderBottom: '1px solid var(--color-border-strong)',
            paddingBottom: 'clamp(1.8rem, 3vw, 2.6rem)',
          }}
        >
          <p style={{ ...KICKER, marginBottom: '1rem' }}>
            The Studio · Payouts
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
            Where the <em style={{ fontStyle: 'italic' }}>money lands.</em>
          </h1>
          <p
            style={{
              fontSize: '0.92rem',
              fontWeight: 300,
              color: 'var(--color-stone-dark)',
              lineHeight: 1.6,
              maxWidth: '52ch',
            }}
          >
            Connect a bank account through Stripe. When a work sells and the
            inspection window closes, funds flow straight to you.
          </p>
        </header>

        {/* Success */}
        {showSuccess && (
          <div
            style={{
              marginBottom: '2rem',
              padding: '1.2rem 0',
              borderTop: '1px solid var(--color-ink)',
              borderBottom: '1px solid var(--color-ink)',
            }}
          >
            <p style={{ ...KICKER, marginBottom: '0.4rem' }}>— Updated —</p>
            <p
              className="font-serif"
              style={{
                fontSize: '0.92rem',
                fontStyle: 'italic',
                color: 'var(--color-ink)',
              }}
            >
              ✓ Your Stripe Connect account has been updated. Changes may
              take a moment to reflect.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              marginBottom: '2rem',
              padding: '1.2rem 0',
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
              — {error}
            </p>
          </div>
        )}

        {/* Fully connected */}
        {isFullyConnected && (
          <>
            <section style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
              <p style={{ ...KICKER, marginBottom: '1rem' }}>— Status —</p>
              <p
                className="font-serif"
                style={{
                  fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)',
                  lineHeight: 1.2,
                  color: 'var(--color-ink)',
                  fontWeight: 400,
                  marginBottom: '1.6rem',
                }}
              >
                Payouts <em style={{ fontStyle: 'italic' }}>enabled.</em>
              </p>
              <dl
                style={{
                  margin: 0,
                  padding: 0,
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                {[
                  status?.bankLast4
                    ? {
                        term: 'Bank account',
                        val: `${status.bankName || 'Bank'} · •••• ${status.bankLast4}`,
                      }
                    : null,
                  {
                    term: 'Card payments',
                    val: status?.chargesEnabled ? 'Enabled' : 'Disabled',
                  },
                  {
                    term: 'Payouts',
                    val: status?.payoutsEnabled ? 'Enabled' : 'Disabled',
                  },
                ]
                  .filter((r): r is { term: string; val: string } => r !== null)
                  .map((row) => (
                    <div
                      key={row.term}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        padding: '1.1rem 0',
                        borderBottom: '1px solid var(--color-border)',
                        gap: '1rem',
                      }}
                    >
                      <dt style={KICKER}>{row.term}</dt>
                      <dd
                        className="font-serif"
                        style={{
                          margin: 0,
                          fontSize: '0.95rem',
                          color: 'var(--color-ink)',
                          textAlign: 'right',
                        }}
                      >
                        {row.val}
                      </dd>
                    </div>
                  ))}
              </dl>
            </section>

            <section>
              <p style={{ ...KICKER, marginBottom: '1rem' }}>
                — Stripe dashboard —
              </p>
              <p
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 300,
                  color: 'var(--color-stone-dark)',
                  lineHeight: 1.6,
                  marginBottom: '1.4rem',
                  maxWidth: '52ch',
                }}
              >
                Update bank details, review payout history, and manage tax
                information in your Stripe Express dashboard.
              </p>
              <a
                href="https://connect.stripe.com/express_login"
                target="_blank"
                rel="noopener noreferrer"
                className="editorial-link"
              >
                Open Stripe dashboard →
              </a>
            </section>
          </>
        )}

        {/* Partially connected */}
        {isPartiallyConnected && (
          <section style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
            <p
              style={{
                ...KICKER,
                color: 'var(--color-terracotta, #c45d3e)',
                marginBottom: '1rem',
              }}
            >
              — Setup incomplete —
            </p>
            <p
              className="font-serif"
              style={{
                fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)',
                lineHeight: 1.2,
                color: 'var(--color-ink)',
                fontWeight: 400,
                marginBottom: '0.9rem',
              }}
            >
              A few details <em style={{ fontStyle: 'italic' }}>still to go.</em>
            </p>
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
              You started setting up payouts but didn&apos;t finish. Complete
              the Stripe onboarding flow to start receiving payouts.
            </p>
            <button
              onClick={handleContinueOnboarding}
              disabled={actionLoading}
              className="artwork-primary-cta"
            >
              {actionLoading
                ? 'Redirecting to Stripe…'
                : 'Complete payout setup'}
            </button>
          </section>
        )}

        {/* Not connected */}
        {!status?.connected && (
          <>
            <section style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
              <p style={{ ...KICKER, marginBottom: '1rem' }}>— Begin —</p>
              <p
                className="font-serif"
                style={{
                  fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)',
                  lineHeight: 1.2,
                  color: 'var(--color-ink)',
                  fontWeight: 400,
                  marginBottom: '0.9rem',
                }}
              >
                Connect a <em style={{ fontStyle: 'italic' }}>bank account.</em>
              </p>
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
                Setup is handled through Stripe Connect and takes about two
                minutes. You&apos;ll verify identity, add bank details, then
                return here.
              </p>
              <button
                onClick={handleStartOnboarding}
                disabled={actionLoading}
                className="artwork-primary-cta"
              >
                {actionLoading ? 'Setting up…' : 'Connect bank account'}
              </button>
            </section>

            <section>
              <p style={{ ...KICKER, marginBottom: '1.2rem' }}>
                — How payouts flow —
              </p>
              <ol
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  borderTop: '1px solid var(--color-border-strong)',
                }}
              >
                {[
                  {
                    num: '01',
                    title: 'A work sells',
                    detail: 'The buyer pays. Funds are held in escrow by Stripe.',
                  },
                  {
                    num: '02',
                    title: 'The buyer confirms delivery',
                    detail: 'A 48-hour inspection window begins.',
                  },
                  {
                    num: '03',
                    title: 'Funds release',
                    detail:
                      'The full sale amount (minus Stripe processing) transfers to your bank.',
                  },
                ].map((step) => (
                  <li
                    key={step.num}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      display: 'grid',
                      gridTemplateColumns: '3.2rem 1fr',
                      alignItems: 'baseline',
                      gap: '1.4rem',
                      padding: '1.4rem 0',
                    }}
                  >
                    <span
                      className="font-serif"
                      style={{
                        fontStyle: 'italic',
                        fontSize: '0.9rem',
                        color: 'var(--color-stone)',
                      }}
                    >
                      {step.num}
                    </span>
                    <div>
                      <p
                        className="font-serif"
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 400,
                          color: 'var(--color-ink)',
                          margin: 0,
                        }}
                      >
                        {step.title}
                      </p>
                      <p
                        style={{
                          marginTop: '0.3rem',
                          fontSize: '0.88rem',
                          fontWeight: 300,
                          color: 'var(--color-stone-dark)',
                          lineHeight: 1.6,
                        }}
                      >
                        {step.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}

        {/* Fee note */}
        <section
          style={{
            marginTop: 'clamp(2.4rem, 4vw, 3.4rem)',
            padding: '1.6rem 0',
            borderTop: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <p style={{ ...KICKER, marginBottom: '0.7rem' }}>— The numbers —</p>
          <p
            className="font-serif"
            style={{
              fontSize: '1rem',
              fontStyle: 'italic',
              color: 'var(--color-ink)',
              lineHeight: 1.5,
              marginBottom: '0.5rem',
            }}
          >
            Zero commission.
          </p>
          <p
            style={{
              fontSize: '0.88rem',
              fontWeight: 300,
              color: 'var(--color-stone-dark)',
              lineHeight: 1.7,
              maxWidth: '54ch',
            }}
          >
            You keep 100% of every sale. The only deduction is
            Stripe&apos;s processing fee (~1.75% + 30¢). On a $500 sale, you
            receive $491.95.
          </p>
        </section>
      </div>
    </div>
  );
}

export default function PayoutsPage() {
  return (
    <Suspense fallback={<EditorialSpinner />}>
      <PayoutsContent />
    </Suspense>
  );
}
