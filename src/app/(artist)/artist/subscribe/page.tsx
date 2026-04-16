'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { useAuth } from '@/components/providers/AuthProvider';

// ── Feature list ──

const FEATURES = [
  'Your own public artist storefront.',
  'Unlimited listings — no per-item fees.',
  'Zero commission — you keep every cent of every sale.',
  'Direct messaging with buyers and collectors.',
  'Earnings ledger and payout tracking.',
  'AI-assisted quality review within 24–48 hours.',
  'Escrow protection and buyer guarantee.',
];

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

// ── Inner component ──

function SubscribeContent() {
  const searchParams = useSearchParams();
  const cancelled = searchParams.get('cancelled') === 'true';
  const { user } = useAuth();

  const subscriptionStatus = user?.subscription_status || 'trial';
  const gracePeriodDeadline = user?.grace_period_deadline || null;

  const daysRemaining = gracePeriodDeadline
    ? Math.max(
        0,
        Math.ceil(
          (new Date(gracePeriodDeadline).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubscribe() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/create-subscription-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: window.location.origin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout');

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('[Subscribe] Error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  // ── Copy for each status ──

  type Copy = {
    kicker: string;
    headline: React.ReactNode;
    intro: string;
    notice?: { kind: 'info' | 'warn' | 'error'; title: string; body: React.ReactNode };
    ctaLabel?: string;
    showFeatures: boolean;
    showCta: boolean;
  };

  let copy: Copy;
  if (subscriptionStatus === 'trial') {
    copy = {
      kicker: '— Signo for artists —',
      headline: (
        <>
          One plan. <em style={{ fontStyle: 'italic' }}>Zero commission.</em>
        </>
      ),
      intro:
        'Thirty dollars a month, and Signo takes not a cent more. You keep every sale.',
      notice: {
        kind: 'info',
        title: 'On the free plan.',
        body: 'No payment is needed until your first sale. Once a work changes hands, your subscription begins — and we give you time to set up a card.',
      },
      showFeatures: true,
      showCta: false,
    };
  } else if (subscriptionStatus === 'pending_activation') {
    copy = {
      kicker: '— Action required —',
      headline: (
        <>
          Add a <em style={{ fontStyle: 'italic' }}>payment method</em>.
        </>
      ),
      intro:
        'Your first sale has completed. Set up your monthly subscription to keep your listings visible.',
      notice: {
        kind: 'warn',
        title: 'First sale completed.',
        body: (
          <>
            Set up your $30 monthly subscription to keep selling.
            {daysRemaining > 0 && (
              <>
                {' '}You have <em style={{ fontStyle: 'italic' }}>{daysRemaining}
                {' '}day{daysRemaining !== 1 ? 's' : ''}</em> to add a card.
              </>
            )}
          </>
        ),
      },
      ctaLabel: 'Add payment method',
      showFeatures: true,
      showCta: true,
    };
  } else if (subscriptionStatus === 'active') {
    copy = {
      kicker: '— Status —',
      headline: (
        <>
          Your subscription is <em style={{ fontStyle: 'italic' }}>active.</em>
        </>
      ),
      intro:
        '$30 per month, billed monthly in AUD. Your listings are live.',
      showFeatures: true,
      showCta: false,
    };
  } else if (subscriptionStatus === 'past_due') {
    copy = {
      kicker: '— Payment failed —',
      headline: (
        <>
          Update your <em style={{ fontStyle: 'italic' }}>card</em>.
        </>
      ),
      intro:
        'Your last payment did not clear. Update your payment method to keep your listings live.',
      ctaLabel: 'Update payment method',
      showFeatures: false,
      showCta: true,
    };
  } else if (subscriptionStatus === 'paused') {
    copy = {
      kicker: '— Paused —',
      headline: (
        <>
          Bring your listings <em style={{ fontStyle: 'italic' }}>back.</em>
        </>
      ),
      intro:
        'Subscribe to reactivate your listings and start selling again.',
      ctaLabel: 'Reactivate subscription',
      showFeatures: true,
      showCta: true,
    };
  } else {
    copy = {
      kicker: '— Cancelled —',
      headline: (
        <>
          Come <em style={{ fontStyle: 'italic' }}>back</em> to the wall.
        </>
      ),
      intro: 'Resubscribe to restore your listings and continue selling.',
      ctaLabel: 'Resubscribe',
      showFeatures: true,
      showCta: true,
    };
  }

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
        <header style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
          <p style={{ ...KICKER, marginBottom: '1rem' }}>{copy.kicker}</p>
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
            {copy.headline}
          </h1>
          <p
            style={{
              fontSize: '0.95rem',
              fontWeight: 300,
              color: 'var(--color-stone-dark)',
              lineHeight: 1.6,
              maxWidth: '56ch',
            }}
          >
            {copy.intro}
          </p>
        </header>

        {/* Cancelled banner */}
        {cancelled && (
          <div
            style={{
              marginBottom: '2rem',
              padding: '1.2rem 0',
              borderTop: '1px solid var(--color-border-strong)',
              borderBottom: '1px solid var(--color-border-strong)',
            }}
          >
            <p style={{ ...KICKER, marginBottom: '0.4rem' }}>— Checkout cancelled —</p>
            <p
              className="font-serif"
              style={{
                fontSize: '0.92rem',
                fontStyle: 'italic',
                color: 'var(--color-ink)',
              }}
            >
              You can try again whenever you&apos;re ready.
            </p>
          </div>
        )}

        {/* Notice */}
        {copy.notice && (
          <section
            style={{
              marginBottom: 'clamp(2rem, 3vw, 2.8rem)',
              padding: '1.6rem 0',
              borderTop:
                copy.notice.kind === 'error'
                  ? '1px solid var(--color-terracotta, #c45d3e)'
                  : '1px solid var(--color-border-strong)',
              borderBottom:
                copy.notice.kind === 'error'
                  ? '1px solid var(--color-terracotta, #c45d3e)'
                  : '1px solid var(--color-border-strong)',
            }}
          >
            <p
              className="font-serif"
              style={{
                fontSize: '1.05rem',
                fontStyle: 'italic',
                color: 'var(--color-ink)',
                marginBottom: '0.5rem',
              }}
            >
              {copy.notice.title}
            </p>
            <p
              style={{
                fontSize: '0.9rem',
                fontWeight: 300,
                color: 'var(--color-stone-dark)',
                lineHeight: 1.7,
              }}
            >
              {copy.notice.body}
            </p>
          </section>
        )}

        {/* Price + features */}
        <section
          style={{
            marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)',
            paddingBottom: '2rem',
            borderBottom: '1px solid var(--color-border-strong)',
          }}
        >
          <dl style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
            <dd
              className="font-serif"
              style={{
                margin: 0,
                fontSize: 'clamp(3rem, 6vw, 4.6rem)',
                fontWeight: 400,
                color: 'var(--color-ink)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              $30
            </dd>
            <dt
              className="font-serif"
              style={{
                fontSize: '1rem',
                fontStyle: 'italic',
                color: 'var(--color-stone)',
              }}
            >
              per month, billed in AUD.
            </dt>
          </dl>
          <p
            className="font-serif"
            style={{
              marginTop: '1rem',
              fontSize: '0.85rem',
              fontStyle: 'italic',
              color: 'var(--color-stone)',
            }}
          >
            Cancel anytime. You keep 100% of every sale (minus Stripe
            processing fees of ~1.75% + 30¢).
          </p>
        </section>

        {/* Features */}
        {copy.showFeatures && (
          <section style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
            <p style={{ ...KICKER, marginBottom: '1.2rem' }}>— What&apos;s included —</p>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                borderTop: '1px solid var(--color-border)',
              }}
            >
              {FEATURES.map((text) => (
                <li
                  key={text}
                  style={{
                    padding: '1rem 0',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '1rem',
                  }}
                >
                  <span
                    className="font-serif"
                    style={{
                      fontStyle: 'italic',
                      color: 'var(--color-stone)',
                      fontSize: '0.85rem',
                      flexShrink: 0,
                    }}
                  >
                    —
                  </span>
                  <span
                    className="font-serif"
                    style={{
                      fontSize: '1rem',
                      color: 'var(--color-ink)',
                      fontWeight: 400,
                    }}
                  >
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CTA */}
        {copy.showCta && (
          <section style={{ marginBottom: '2rem' }}>
            {error && (
              <p
                className="font-serif"
                style={{
                  fontSize: '0.9rem',
                  fontStyle: 'italic',
                  color: 'var(--color-terracotta, #c45d3e)',
                  marginBottom: '1rem',
                }}
              >
                — {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={loading}
              className="artwork-primary-cta"
            >
              {loading ? 'Redirecting to Stripe…' : copy.ctaLabel}
            </button>
          </section>
        )}

        {/* Active state: contact support */}
        {subscriptionStatus === 'active' && (
          <p
            className="font-serif"
            style={{
              fontSize: '0.88rem',
              fontStyle: 'italic',
              color: 'var(--color-stone-dark)',
              lineHeight: 1.6,
              marginTop: '2rem',
            }}
          >
            To cancel or update billing, contact us at{' '}
            <a
              href="mailto:support@signoart.com.au"
              style={{ color: 'var(--color-ink)', textDecoration: 'underline' }}
            >
              support@signoart.com.au
            </a>
            .
          </p>
        )}

        {/* Fine print */}
        <p
          className="font-serif"
          style={{
            marginTop: '2.4rem',
            fontSize: '0.78rem',
            fontStyle: 'italic',
            color: 'var(--color-stone)',
            lineHeight: 1.7,
          }}
        >
          By subscribing you agree to Signo&apos;s{' '}
          <Link
            href="/terms"
            style={{
              color: 'var(--color-ink)',
              textDecoration: 'underline',
            }}
          >
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            style={{
              color: 'var(--color-ink)',
              textDecoration: 'underline',
            }}
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  const { loading: authLoading } = useRequireAuth('artist');
  if (authLoading) return <EditorialSpinner />;
  return (
    <Suspense fallback={<EditorialSpinner />}>
      <SubscribeContent />
    </Suspense>
  );
}
