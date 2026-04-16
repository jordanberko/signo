'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';

// ── Types ──

interface OrderDetail {
  id: string;
  total_amount_aud: number | null;
  status: string;
  buyer_first_name: string;
  artwork: {
    title: string;
    images: string[];
  } | null;
  artist: {
    full_name: string | null;
  } | null;
}

const KICKER: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
};

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 10;
    let stopped = false;

    async function poll() {
      while (attempts < MAX_ATTEMPTS && !stopped) {
        attempts++;
        try {
          const res = await fetch(`/api/checkout/success?session_id=${encodeURIComponent(sessionId!)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.order) {
              if (!stopped) setOrder(data.order);
              break;
            }
          }
        } catch {
          // ignore, keep polling
        }
        if (attempts < MAX_ATTEMPTS && !stopped) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      if (!stopped) {
        setLoading(false);
        if (attempts >= MAX_ATTEMPTS) setTimedOut(true);
      }
    }

    poll();
    return () => { stopped = true; };
  }, [sessionId]);

  if (loading) {
    return (
      <div
        style={{
          background: 'var(--color-warm-white)',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          className="font-serif"
          style={{ fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--color-stone)' }}
        >
          One moment — finalising your acquisition.
        </p>
      </div>
    );
  }

  // Generic fallback if order not found after polling
  if (!order || timedOut) {
    return (
      <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
        <div
          className="px-6 sm:px-10"
          style={{
            maxWidth: '48rem',
            margin: '0 auto',
            paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
            paddingBottom: 'clamp(4rem, 7vw, 6rem)',
          }}
        >
          <p style={{ ...KICKER, marginBottom: '1.2rem' }}>The acquisition is complete</p>
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.015em',
              color: 'var(--color-ink)',
              fontWeight: 400,
              marginBottom: '1.6rem',
            }}
          >
            Thank you for your <em style={{ fontStyle: 'italic' }}>purchase.</em>
          </h1>
          <p
            style={{
              fontSize: '0.95rem',
              color: 'var(--color-stone-dark)',
              fontWeight: 300,
              lineHeight: 1.7,
              maxWidth: '52ch',
              marginBottom: '2.4rem',
            }}
          >
            Your funds are held in escrow until the work is delivered. The artist has been
            notified. Tracking will arrive in your inbox within 7 days.
          </p>
          <Link href="/orders" className="editorial-link">
            View your acquisitions &rarr;
          </Link>
        </div>
      </div>
    );
  }

  const thumb = order.artwork?.images?.[0] ?? null;

  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      <div
        className="px-6 sm:px-10"
        style={{
          maxWidth: '48rem',
          margin: '0 auto',
          paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
          paddingBottom: 'clamp(5rem, 9vw, 8rem)',
        }}
      >
        {/* Kicker */}
        <p style={{ ...KICKER, marginBottom: '1.2rem' }}>The acquisition is complete</p>

        {/* Headline */}
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.015em',
            color: 'var(--color-ink)',
            fontWeight: 400,
            marginBottom: 'clamp(2rem, 4vw, 3rem)',
          }}
        >
          Thank you, <em style={{ fontStyle: 'italic' }}>{order.buyer_first_name}.</em>
        </h1>

        {/* Artwork image */}
        {thumb && (
          <div
            style={{
              maxWidth: '360px',
              marginBottom: 'clamp(2rem, 4vw, 3rem)',
            }}
          >
            <div
              style={{
                position: 'relative',
                aspectRatio: '4/5',
                border: '1px solid var(--color-ink)',
                overflow: 'hidden',
              }}
            >
              <Image
                src={thumb}
                alt={order.artwork?.title ?? 'Artwork'}
                fill
                style={{ objectFit: 'cover' }}
                sizes="360px"
              />
            </div>
          </div>
        )}

        {/* Work details */}
        <div style={{ marginBottom: 'clamp(2rem, 4vw, 3rem)' }}>
          {order.artist?.full_name && (
            <p
              style={{
                fontSize: '0.78rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                marginBottom: '0.4rem',
              }}
            >
              {order.artist.full_name}
            </p>
          )}
          {order.artwork?.title && (
            <p
              className="font-serif"
              style={{
                fontStyle: 'italic',
                fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
                color: 'var(--color-ink)',
                marginBottom: '0.6rem',
              }}
            >
              {order.artwork.title}
            </p>
          )}
          {order.total_amount_aud != null && (
            <p
              style={{
                fontSize: '0.92rem',
                color: 'var(--color-stone-dark)',
                fontWeight: 300,
              }}
            >
              {formatPrice(order.total_amount_aud)}
            </p>
          )}
        </div>

        {/* Escrow reassurance */}
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: 'clamp(1.5rem, 3vw, 2rem)',
            marginBottom: 'clamp(2rem, 4vw, 3rem)',
          }}
        >
          <p
            style={{
              fontSize: '0.92rem',
              color: 'var(--color-stone-dark)',
              fontWeight: 300,
              lineHeight: 1.75,
              maxWidth: '54ch',
            }}
          >
            Your funds are held in escrow until the work is delivered.{' '}
            The artist has been notified.{' '}
            Tracking will arrive in your inbox within 7 days.
          </p>
        </div>

        {/* CTA */}
        <Link href="/orders" className="editorial-link">
          View your acquisitions &rarr;
        </Link>
      </div>
    </div>
  );
}

function CheckoutSuccessFallback() {
  return (
    <div
      style={{
        background: 'var(--color-warm-white)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <p
        className="font-serif"
        style={{ fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--color-stone)' }}
      >
        One moment — finalising your acquisition.
      </p>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<CheckoutSuccessFallback />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
