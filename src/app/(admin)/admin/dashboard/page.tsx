'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import EditorialSpinner from '@/components/ui/EditorialSpinner';

interface PlatformStats {
  totalUsers: number;
  totalArtists: number;
  totalBuyers: number;
  totalArtworks: number;
  pendingReviews: number;
  approvedArtworks: number;
  totalOrders: number;
  totalRevenue: number;
  openDisputes: number;
}

const KICKER: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
  fontWeight: 400,
  margin: 0,
};

export default function AdminDashboardPage() {
  const { loading: authLoading } = useRequireAuth('admin');
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalArtists: 0,
    totalBuyers: 0,
    totalArtworks: 0,
    pendingReviews: 0,
    approvedArtworks: 0,
    totalOrders: 0,
    totalRevenue: 0,
    openDisputes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/stats');
        const json = await res.json();
        if (!res.ok) {
          console.error('[AdminDashboard] API error:', json.error);
          return;
        }
        setStats(json.data);
      } catch (err) {
        console.error('[AdminDashboard] Stats fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [authLoading]);

  if (authLoading || loading) {
    return <EditorialSpinner label="Overview" headline="Gathering the numbers\u2026" />;
  }

  const metrics: Array<{ kicker: string; value: string; note?: string }> = [
    {
      kicker: '— Users —',
      value: stats.totalUsers.toLocaleString('en-AU'),
      note: `${stats.totalArtists} artists · ${stats.totalBuyers} buyers`,
    },
    {
      kicker: '— Artworks —',
      value: stats.totalArtworks.toLocaleString('en-AU'),
      note: `${stats.approvedArtworks} approved · ${stats.pendingReviews} pending`,
    },
    {
      kicker: '— Revenue —',
      value: formatPrice(stats.totalRevenue),
      note: `${stats.totalOrders} orders`,
    },
    {
      kicker: '— Disputes —',
      value: stats.openDisputes.toLocaleString('en-AU'),
      note: stats.openDisputes === 0 ? 'All clear.' : 'Open',
    },
  ];

  const queues: Array<{ href: string; kicker: string; headline: string; detail: string }> = [
    {
      href: '/admin/reviews',
      kicker: '01',
      headline: 'Review queue',
      detail: `${stats.pendingReviews} work${stats.pendingReviews === 1 ? '' : 's'} waiting.`,
    },
    {
      href: '/admin/users',
      kicker: '02',
      headline: 'Manage users',
      detail: `${stats.totalUsers.toLocaleString('en-AU')} accounts on the platform.`,
    },
    {
      href: '/admin/disputes',
      kicker: '03',
      headline: 'Disputes',
      detail: stats.openDisputes === 0 ? 'No open disputes.' : `${stats.openDisputes} awaiting resolution.`,
    },
  ];

  return (
    <div
      className="px-6 sm:px-10"
      style={{
        maxWidth: '84rem',
        margin: '0 auto',
        paddingTop: 'clamp(3rem, 5vw, 4.5rem)',
        paddingBottom: 'clamp(5rem, 8vw, 7rem)',
      }}
    >
      {/* ── Heading ── */}
      <div style={{ marginBottom: 'clamp(3rem, 5vw, 4.5rem)' }}>
        <p style={KICKER}>— Overview —</p>
        <h1
          className="font-serif"
          style={{
            marginTop: '1.2rem',
            fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.015em',
            color: 'var(--color-ink)',
            fontWeight: 400,
            maxWidth: '18ch',
          }}
        >
          The state of the <em style={{ fontStyle: 'italic' }}>collection</em>, today.
        </h1>
      </div>

      {/* ── Metrics ── */}
      <section
        style={{
          borderTop: '1px solid var(--color-border-strong)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
          gap: 0,
        }}
      >
        {metrics.map((m, i) => (
          <div
            key={m.kicker}
            style={{
              padding: '2rem 2rem 2rem 0',
              borderRight:
                i < metrics.length - 1 ? '1px solid var(--color-border)' : 'none',
              paddingLeft: i === 0 ? 0 : '2rem',
            }}
          >
            <p style={KICKER}>{m.kicker}</p>
            <p
              className="font-serif"
              style={{
                marginTop: '1rem',
                fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
                lineHeight: 1,
                letterSpacing: '-0.01em',
                color: 'var(--color-ink)',
                fontWeight: 400,
              }}
            >
              {m.value}
            </p>
            {m.note && (
              <p
                style={{
                  marginTop: '0.8rem',
                  fontSize: '0.78rem',
                  color: 'var(--color-stone-dark)',
                  fontWeight: 300,
                }}
              >
                {m.note}
              </p>
            )}
          </div>
        ))}
      </section>

      {/* ── Queues ── */}
      <section style={{ marginTop: 'clamp(4rem, 6vw, 5.5rem)' }}>
        <p style={KICKER}>— Your desk —</p>
        <h2
          className="font-serif"
          style={{
            marginTop: '1rem',
            marginBottom: '2.4rem',
            fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)',
            lineHeight: 1.2,
            letterSpacing: '-0.005em',
            color: 'var(--color-ink)',
            fontWeight: 400,
            fontStyle: 'italic',
          }}
        >
          Where attention is needed.
        </h2>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid var(--color-border)' }}>
          {queues.map((q) => (
            <li key={q.href} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <Link
                href={q.href}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '4rem 1fr auto',
                  alignItems: 'baseline',
                  gap: '2rem',
                  padding: '1.6rem 0',
                  textDecoration: 'none',
                  transition: 'color var(--dur-fast) var(--ease-out)',
                }}
                className="artist-row"
              >
                <span
                  className="font-serif"
                  style={{
                    fontStyle: 'italic',
                    fontSize: '1.1rem',
                    color: 'var(--color-stone)',
                  }}
                >
                  {q.kicker}
                </span>
                <div>
                  <p
                    className="font-serif"
                    style={{
                      fontSize: '1.15rem',
                      color: 'var(--color-ink)',
                      margin: 0,
                    }}
                  >
                    {q.headline}
                  </p>
                  <p
                    style={{
                      marginTop: '0.4rem',
                      fontSize: '0.85rem',
                      color: 'var(--color-stone-dark)',
                      fontWeight: 300,
                    }}
                  >
                    {q.detail}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: '0.68rem',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--color-ink)',
                    borderBottom: '1px solid var(--color-stone)',
                    paddingBottom: '0.2rem',
                  }}
                >
                  Open
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
