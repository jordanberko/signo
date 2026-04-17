'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import ArtworkCard from '@/components/ui/ArtworkCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { formatPrice, getStatusStyle, formatStatus } from '@/lib/utils';

// ── Types ──

interface RecentOrder {
  id: string;
  artworkTitle: string;
  artworkImage: string | null;
  artistName: string;
  price: number;
  date: string;
  status: string;
}

// ── Editorial helpers (local) ──

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: '0.62rem',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'var(--color-stone)',
        fontWeight: 400,
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function QuickLink({
  href,
  label,
  detail,
}: {
  href: string;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="dashboard-quick-link"
      style={{
        display: 'block',
        padding: '1.2rem 0',
        borderTop: '1px solid var(--color-border)',
        textDecoration: 'none',
      }}
    >
      <p
        className="font-serif"
        style={{
          fontSize: '1.15rem',
          fontWeight: 400,
          color: 'var(--color-ink)',
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '0.78rem',
          color: 'var(--color-stone)',
          fontWeight: 300,
          marginTop: '0.2rem',
        }}
      >
        {detail}
      </p>
    </Link>
  );
}

// ── Component ──

function DashboardContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const { user } = useAuth();

  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [favourites, setFavourites] = useState<
    {
      id: string;
      title: string;
      price_aud: number;
      images: string[];
      medium: string | null;
      category: 'original' | 'print' | 'digital';
      artistName: string;
      artistId: string;
    }[]
  >([]);
  const [favouritesCount, setFavouritesCount] = useState(0);
  const isArtist = user?.role === 'artist';

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const timer = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 5000);

    async function fetchOrders() {
      try {
        const res = await fetch('/api/orders', { signal: controller.signal });

        if (!res.ok) {
          console.error('[Dashboard] Orders API error:', res.status);
          return;
        }

        const data = await res.json();

        if (cancelled) return;

        const ordersList = data.orders || [];
        setTotalOrders(ordersList.length);

        setOrders(
          ordersList.slice(0, 5).map((o: Record<string, unknown>) => {
            const artwork = o.artworks as Record<string, unknown> | null;
            const artist = o.profiles as Record<string, string> | null;
            const images = (artwork?.images as string[]) || [];
            return {
              id: o.id as string,
              artworkTitle: (artwork?.title as string) || 'Unknown',
              artworkImage: images[0] || null,
              artistName: artist?.full_name || 'Unknown Artist',
              price: (o.total_amount_aud as number) || 0,
              date: new Date(o.created_at as string).toLocaleDateString(
                'en-AU',
                { day: 'numeric', month: 'short', year: 'numeric' }
              ),
              status: o.status as string,
            };
          })
        );
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[Dashboard] Orders fetch error:', err);
        }
      } finally {
        clearTimeout(timer);
        if (!cancelled) setLoading(false);
      }
    }

    fetchOrders();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [user]);

  // Fetch favourites preview
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function fetchFavourites() {
      try {
        const res = await fetch('/api/favourites/list?sort=recent');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setFavouritesCount(data.count || 0);
        setFavourites((data.artworks || []).slice(0, 4));
      } catch {
        // Ignore
      }
    }

    fetchFavourites();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const firstName = user?.full_name?.split(' ')[0] || '';

  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      <div
        className="px-6 sm:px-10"
        style={{
          maxWidth: '84rem',
          margin: '0 auto',
          paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
        }}
      >
        {error === 'unauthorized' && (
          <p
            className="font-serif"
            style={{
              marginBottom: '2rem',
              fontSize: '0.92rem',
              color: 'var(--color-terracotta, #c45d3e)',
              fontStyle: 'italic',
              fontWeight: 400,
              lineHeight: 1.5,
              maxWidth: '56ch',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            You don&apos;t have permission to access that page. If you believe this is an error, please contact support.
          </p>
        )}

        {/* ── Editorial header ── */}
        <header style={{ marginBottom: 'clamp(2.8rem, 5vw, 4rem)' }}>
          <Kicker>The Studio — Your account</Kicker>
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(2.2rem, 4.4vw, 3.4rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.015em',
              color: 'var(--color-ink)',
              fontWeight: 400,
              marginTop: '1rem',
              marginBottom: '0.9rem',
              maxWidth: '18ch',
            }}
          >
            Welcome back{firstName ? <>, <em style={{ fontStyle: 'italic' }}>{firstName}.</em></> : '.'}
          </h1>
          <p
            style={{
              fontSize: '0.95rem',
              fontWeight: 300,
              lineHeight: 1.6,
              color: 'var(--color-stone-dark)',
              maxWidth: '46ch',
            }}
          >
            Your orders, the works you&apos;ve saved, and everything attached to your Signo account.
          </p>
        </header>

        {/* ── Main grid: 8/4 split ── */}
        <div
          className="grid grid-cols-1 lg:grid-cols-12"
          style={{ gap: 'clamp(2.5rem, 4vw, 4rem)', alignItems: 'start' }}
        >
          {/* Left: orders + favourites (8/12) */}
          <div className="lg:col-span-8" style={{ minWidth: 0 }}>
            {/* ── Recent orders ── */}
            <section style={{ marginBottom: 'clamp(3rem, 5vw, 4.5rem)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  paddingBottom: '1rem',
                  marginBottom: '1.4rem',
                  borderBottom: '1px solid var(--color-border-strong)',
                  gap: '1rem',
                }}
              >
                <div>
                  <Kicker>01 · Recent orders</Kicker>
                  <h2
                    className="font-serif"
                    style={{
                      fontSize: '1.6rem',
                      fontWeight: 400,
                      color: 'var(--color-ink)',
                      marginTop: '0.3rem',
                      lineHeight: 1.2,
                    }}
                  >
                    {totalOrders === 0 ? 'No acquisitions yet' : `${totalOrders} acquisition${totalOrders === 1 ? '' : 's'}`}
                  </h2>
                </div>
                {totalOrders > 5 && (
                  <Link href="/orders" className="editorial-link">
                    View all
                  </Link>
                )}
              </div>

              {loading ? (
                <p
                  className="font-serif"
                  style={{
                    padding: '2.5rem 0',
                    fontStyle: 'italic',
                    color: 'var(--color-stone)',
                    fontSize: '1rem',
                  }}
                >
                  Retrieving your orders…
                </p>
              ) : orders.length === 0 ? (
                <div style={{ padding: '2rem 0', maxWidth: '44ch' }}>
                  <p
                    className="font-serif"
                    style={{
                      fontSize: '1.2rem',
                      lineHeight: 1.4,
                      color: 'var(--color-ink)',
                      fontStyle: 'italic',
                      fontWeight: 400,
                    }}
                  >
                    You haven&apos;t acquired any work yet.
                  </p>
                  <p
                    style={{
                      marginTop: '0.8rem',
                      fontSize: '0.88rem',
                      color: 'var(--color-stone-dark)',
                      fontWeight: 300,
                      lineHeight: 1.6,
                    }}
                  >
                    Discover original work from Australian artists.
                  </p>
                  <Link
                    href="/browse"
                    className="editorial-link"
                    style={{ marginTop: '1.4rem', display: 'inline-block' }}
                  >
                    Start exploring
                  </Link>
                </div>
              ) : (
                <>
                  {/* Desktop table — hairline ruled, dense */}
                  <div className="hidden md:block">
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.88rem',
                      }}
                    >
                      <thead>
                        <tr>
                          {['Work', 'Artist', 'Price', 'Date', 'Status', ''].map((h) => (
                            <th
                              key={h}
                              style={{
                                textAlign: 'left',
                                padding: '0.7rem 1rem 0.7rem 0',
                                fontSize: '0.6rem',
                                letterSpacing: '0.2em',
                                textTransform: 'uppercase',
                                color: 'var(--color-stone)',
                                fontWeight: 400,
                                borderBottom: '1px solid var(--color-border)',
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr
                            key={order.id}
                            style={{ borderBottom: '1px solid var(--color-border)' }}
                          >
                            <td style={{ padding: '1rem 1rem 1rem 0' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                <div
                                  style={{
                                    width: 44,
                                    height: 44,
                                    background: 'var(--color-cream)',
                                    flexShrink: 0,
                                    overflow: 'hidden',
                                  }}
                                >
                                  {order.artworkImage && (
                                    <Image
                                      src={order.artworkImage}
                                      alt={order.artworkTitle}
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
                                    fontSize: '0.96rem',
                                    color: 'var(--color-ink)',
                                    maxWidth: '22ch',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {order.artworkTitle}
                                </span>
                              </div>
                            </td>
                            <td
                              style={{
                                padding: '1rem 1rem 1rem 0',
                                color: 'var(--color-stone-dark)',
                                fontWeight: 300,
                              }}
                            >
                              {order.artistName}
                            </td>
                            <td
                              className="font-serif"
                              style={{
                                padding: '1rem 1rem 1rem 0',
                                color: 'var(--color-ink)',
                              }}
                            >
                              {formatPrice(order.price)}
                            </td>
                            <td
                              style={{
                                padding: '1rem 1rem 1rem 0',
                                color: 'var(--color-stone)',
                                fontWeight: 300,
                                fontSize: '0.82rem',
                              }}
                            >
                              {order.date}
                            </td>
                            <td style={{ padding: '1rem 1rem 1rem 0' }}>
                              <span className={`status-pill ${getStatusStyle(order.status)}`}>
                                {formatStatus(order.status)}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: '1rem 0',
                                textAlign: 'right',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Link
                                href={`/orders/${order.id}`}
                                className="editorial-link"
                                style={{ fontSize: '0.68rem' }}
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile list */}
                  <ul
                    className="md:hidden"
                    style={{ listStyle: 'none', padding: 0, margin: 0 }}
                  >
                    {orders.map((order) => (
                      <li
                        key={order.id}
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                      >
                        <Link
                          href={`/orders/${order.id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.95rem',
                            padding: '1rem 0',
                            textDecoration: 'none',
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
                            {order.artworkImage && (
                              <Image
                                src={order.artworkImage}
                                alt={order.artworkTitle}
                                width={56}
                                height={56}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              className="font-serif"
                              style={{
                                fontSize: '1rem',
                                color: 'var(--color-ink)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                margin: 0,
                              }}
                            >
                              {order.artworkTitle}
                            </p>
                            <p
                              style={{
                                fontSize: '0.76rem',
                                color: 'var(--color-stone)',
                                marginTop: '0.15rem',
                                fontWeight: 300,
                              }}
                            >
                              {order.artistName} · {order.date}
                            </p>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.7rem',
                                marginTop: '0.3rem',
                              }}
                            >
                              <span
                                className="font-serif"
                                style={{ fontSize: '0.94rem', color: 'var(--color-ink)' }}
                              >
                                {formatPrice(order.price)}
                              </span>
                              <span className={`status-pill ${getStatusStyle(order.status)}`}>
                                {formatStatus(order.status)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            {/* ── Favourites ── */}
            <section>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  paddingBottom: '1rem',
                  marginBottom: '1.6rem',
                  borderBottom: '1px solid var(--color-border-strong)',
                  gap: '1rem',
                }}
              >
                <div>
                  <Kicker>02 · Saved works</Kicker>
                  <h2
                    className="font-serif"
                    style={{
                      fontSize: '1.6rem',
                      fontWeight: 400,
                      color: 'var(--color-ink)',
                      marginTop: '0.3rem',
                      lineHeight: 1.2,
                    }}
                  >
                    {favouritesCount === 0
                      ? 'Nothing saved yet'
                      : `${favouritesCount} work${favouritesCount === 1 ? '' : 's'} held`}
                  </h2>
                </div>
                {favouritesCount > 4 && (
                  <Link href="/favourites" className="editorial-link">
                    View all
                  </Link>
                )}
              </div>

              {favourites.length === 0 ? (
                <div style={{ padding: '1rem 0', maxWidth: '42ch' }}>
                  <p
                    className="font-serif"
                    style={{
                      fontSize: '1.1rem',
                      lineHeight: 1.5,
                      color: 'var(--color-ink)',
                      fontStyle: 'italic',
                    }}
                  >
                    A holding place for the works you&apos;re considering.
                  </p>
                  <p
                    style={{
                      marginTop: '0.8rem',
                      fontSize: '0.84rem',
                      color: 'var(--color-stone-dark)',
                      fontWeight: 300,
                      lineHeight: 1.6,
                    }}
                  >
                    Save a work from any listing to find it here later.
                  </p>
                  <Link
                    href="/browse"
                    className="editorial-link"
                    style={{ marginTop: '1.2rem', display: 'inline-block' }}
                  >
                    Browse the collection
                  </Link>
                </div>
              ) : (
                <div
                  className="grid grid-cols-2 md:grid-cols-4"
                  style={{ columnGap: '1.6rem', rowGap: '2.4rem' }}
                >
                  {favourites.map((artwork) => (
                    <ArtworkCard
                      key={artwork.id}
                      id={artwork.id}
                      title={artwork.title}
                      artistName={artwork.artistName}
                      artistId={artwork.artistId}
                      price={artwork.price_aud}
                      imageUrl={artwork.images?.[0] || ''}
                      medium={artwork.medium}
                      category={artwork.category}
                      initialFavourited
                      hideBadge
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right column: quick links + artist CTA (4/12) */}
          <aside className="lg:col-span-4" style={{ minWidth: 0 }}>
            {/* Quick links — typographic stack, no cards */}
            <div style={{ marginBottom: 'clamp(2.5rem, 4vw, 3.5rem)' }}>
              <Kicker>Navigate</Kicker>
              <div style={{ marginTop: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                <QuickLink href="/browse" label="Browse the collection" detail="Discover new work" />
                <QuickLink
                  href="/orders"
                  label="Orders"
                  detail={`${totalOrders} ${totalOrders === 1 ? 'order' : 'orders'}`}
                />
                <QuickLink
                  href="/favourites"
                  label="Saved works"
                  detail={`${favouritesCount} held`}
                />
                <QuickLink href="/following" label="Following" detail="Artists you track" />
                <QuickLink href="/messages" label="Messages" detail="Conversations" />
                <QuickLink href="/settings" label="Settings" detail="Account & preferences" />
              </div>
            </div>

            {/* Artist CTA — full-bleed ink editorial */}
            <div
              style={{
                background: 'var(--color-ink)',
                color: 'var(--color-warm-white)',
                padding: 'clamp(1.8rem, 3vw, 2.4rem)',
              }}
            >
              <p
                style={{
                  fontSize: '0.6rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'rgba(252, 251, 248, 0.55)',
                  marginBottom: '0.9rem',
                }}
              >
                {isArtist ? 'The Artist Panel' : 'Sell through Signo'}
              </p>
              <p
                className="font-serif"
                style={{
                  fontSize: '1.35rem',
                  lineHeight: 1.25,
                  fontWeight: 400,
                  color: 'var(--color-warm-white)',
                }}
              >
                {isArtist ? (
                  <>
                    Your <em style={{ fontStyle: 'italic' }}>storefront</em>, listings, and earnings.
                  </>
                ) : (
                  <>
                    $30 a month. <em style={{ fontStyle: 'italic' }}>Zero commission.</em>
                  </>
                )}
              </p>
              <p
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 300,
                  color: 'rgba(252, 251, 248, 0.72)',
                  marginTop: '0.8rem',
                  lineHeight: 1.6,
                  maxWidth: '32ch',
                }}
              >
                {isArtist
                  ? 'Manage your listings, orders, and payouts from the artist panel.'
                  : 'Keep 100% of every sale. Flat subscription, no surprises.'}
              </p>
              <Link
                href={isArtist ? '/artist/dashboard' : '/artist/onboarding'}
                className="font-serif"
                style={{
                  display: 'inline-block',
                  marginTop: '1.4rem',
                  padding: '0.8rem 1.3rem',
                  background: 'var(--color-warm-white)',
                  color: 'var(--color-ink)',
                  fontSize: '0.72rem',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  fontStyle: 'italic',
                  textDecoration: 'none',
                  fontWeight: 400,
                }}
              >
                {isArtist ? 'Open artist panel' : 'Start selling'}
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function BuyerDashboardPage() {
  const { loading: authLoading } = useRequireAuth();
  if (authLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          background: 'var(--color-warm-white)',
        }}
      >
        <p
          className="font-serif"
          style={{
            fontStyle: 'italic',
            fontSize: '0.92rem',
            color: 'var(--color-stone)',
          }}
        >
          Loading…
        </p>
      </div>
    );
  }

  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
