'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AnalyticsChart from '@/components/ui/AnalyticsChart';
import EditorialSpinner from '@/components/ui/EditorialSpinner';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { formatPrice } from '@/lib/utils';

type Period = 7 | 30 | 90;

interface AnalyticsData {
  profileViews: Array<{ date: string; count: number }>;
  totalProfileViews: number;
  favourites: Array<{ date: string; count: number }>;
  totalFavourites: number;
  followers: Array<{ date: string; count: number }>;
  totalFollowers: number;
  sales: Array<{ date: string; count: number; revenue: number }>;
  totalSales: number;
  totalRevenue: number;
  artworks: Array<{
    id: string;
    title: string;
    imageUrl: string;
    status: string;
    price: number;
    favouriteCount: number;
    listedDate: string;
  }>;
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 7, label: 'Seven days' },
  { value: 30, label: 'Thirty days' },
  { value: 90, label: 'Ninety days' },
];

const KICKER: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
};

const CHART_INK = '#1a1a18';

export default function AnalyticsPage() {
  const { loading: authLoading } = useRequireAuth('artist');
  const [period, setPeriod] = useState<Period>(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/artist/analytics?period=${p}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) fetchAnalytics(period);
  }, [period, authLoading, fetchAnalytics]);

  if (authLoading) return <EditorialSpinner />;

  const metrics = data
    ? [
        { label: 'Profile views', value: data.totalProfileViews.toLocaleString() },
        { label: 'Favourites', value: data.totalFavourites.toLocaleString() },
        { label: 'New followers', value: data.totalFollowers.toLocaleString() },
        { label: 'Revenue', value: formatPrice(data.totalRevenue) },
      ]
    : [];

  const charts = data
    ? [
        {
          title: 'Profile views',
          data: data.profileViews.map((d) => ({ date: d.date, value: d.count })),
        },
        {
          title: 'Favourites',
          data: data.favourites.map((d) => ({ date: d.date, value: d.count })),
        },
        {
          title: 'New followers',
          data: data.followers.map((d) => ({ date: d.date, value: d.count })),
        },
        {
          title: 'Revenue',
          data: data.sales.map((d) => ({ date: d.date, value: d.revenue })),
          formatter: (v: number) => formatPrice(v),
        },
      ]
    : [];

  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      <div
        className="px-6 sm:px-10"
        style={{
          maxWidth: '78rem',
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

        <header
          style={{
            marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.4rem',
          }}
        >
          <div>
            <p style={{ ...KICKER, marginBottom: '1rem' }}>
              The Studio · Analytics
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
              The <em style={{ fontStyle: 'italic' }}>pulse</em> of your practice.
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
              Profile views, favourites, followers, revenue — charted over
              the window of your choosing.
            </p>
          </div>

          {/* Period selector — typographic */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: '1.4rem',
              alignSelf: 'flex-start',
            }}
          >
            <span style={KICKER}>Over the last</span>
            {PERIOD_OPTIONS.map((opt) => {
              const active = period === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className="font-serif"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.92rem',
                    fontStyle: active ? 'italic' : 'normal',
                    color: active ? 'var(--color-ink)' : 'var(--color-stone)',
                    borderBottom: active
                      ? '1px solid var(--color-ink)'
                      : '1px solid transparent',
                    paddingBottom: '0.15rem',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </header>

        {loading && !data ? (
          <p
            className="font-serif"
            style={{
              fontStyle: 'italic',
              fontSize: '0.95rem',
              color: 'var(--color-stone)',
              padding: '3rem 0',
            }}
          >
            Counting the numbers…
          </p>
        ) : data ? (
          <>
            {/* Metrics dl */}
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
                  gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
                  margin: 0,
                }}
              >
                {metrics.map((m, i) => (
                  <div
                    key={m.label}
                    style={{
                      padding: '1.8rem 1.6rem',
                      borderLeft:
                        i === 0 ? 'none' : '1px solid var(--color-border)',
                    }}
                  >
                    <dt style={{ ...KICKER, marginBottom: '0.9rem' }}>
                      {m.label}
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
                      }}
                    >
                      {m.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Charts */}
            <section
              className="grid grid-cols-1 md:grid-cols-2"
              style={{
                columnGap: '2.4rem',
                rowGap: '3rem',
                marginBottom: 'clamp(3rem, 5vw, 4.5rem)',
              }}
            >
              {charts.map((c) => (
                <figure
                  key={c.title}
                  style={{
                    margin: 0,
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: '1.2rem',
                  }}
                >
                  <figcaption
                    style={{ ...KICKER, marginBottom: '1rem' }}
                  >
                    {c.title}
                  </figcaption>
                  <AnalyticsChart
                    data={c.data}
                    color={CHART_INK}
                    valueFormatter={c.formatter}
                  />
                </figure>
              ))}
            </section>

            {/* Artwork performance */}
            {data.artworks.length > 0 && (
              <section>
                <p style={{ ...KICKER, marginBottom: '1rem' }}>
                  — Artwork performance —
                </p>
                <p
                  className="font-serif"
                  style={{
                    fontSize: '0.88rem',
                    fontStyle: 'italic',
                    color: 'var(--color-stone)',
                    marginBottom: '1.4rem',
                  }}
                >
                  Sorted by favourites · all time.
                </p>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    borderTop: '1px solid var(--color-border-strong)',
                  }}
                >
                  <thead>
                    <tr>
                      {['Work', 'Status', 'Price', 'Favourites'].map(
                        (h, i) => (
                          <th
                            key={h}
                            style={{
                              ...KICKER,
                              padding: '1rem 0.8rem',
                              textAlign: i >= 2 ? 'right' : 'left',
                              borderBottom:
                                '1px solid var(--color-border)',
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
                    {data.artworks.map((artwork) => (
                      <tr
                        key={artwork.id}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                        }}
                      >
                        <td style={{ padding: '1.2rem 0.8rem' }}>
                          <Link
                            href={`/artwork/${artwork.id}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '1rem',
                              textDecoration: 'none',
                              color: 'inherit',
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
                              {artwork.imageUrl && (
                                <Image
                                  src={artwork.imageUrl}
                                  alt={artwork.title}
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
                                maxWidth: 220,
                              }}
                            >
                              {artwork.title}
                            </span>
                          </Link>
                        </td>
                        <td
                          style={{
                            ...KICKER,
                            padding: '1.2rem 0.8rem',
                            fontSize: '0.58rem',
                          }}
                        >
                          {artwork.status.replace('_', ' ')}
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
                          {formatPrice(artwork.price)}
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
                          {artwork.favouriteCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
        ) : (
          <div
            style={{
              paddingTop: '2rem',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <p
              className="font-serif"
              style={{
                fontSize: '1.1rem',
                fontStyle: 'italic',
                color: 'var(--color-ink)',
              }}
            >
              Unable to load the data.
            </p>
            <button
              onClick={() => fetchAnalytics(period)}
              className="editorial-link"
              style={{
                marginTop: '1rem',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
