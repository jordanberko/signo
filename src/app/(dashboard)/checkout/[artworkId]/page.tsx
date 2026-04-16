'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { formatPrice } from '@/lib/utils';

// ── Types ──

interface ArtworkCheckout {
  id: string;
  title: string;
  price_aud: number;
  category: 'original' | 'print' | 'digital' | null;
  images: string[];
  medium: string | null;
  artist_id: string;
  shipping_weight_kg: number | null;
  artist: {
    full_name: string | null;
  };
}

interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

// ── Spinner ──

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
        style={{
          fontStyle: 'italic',
          fontSize: '0.95rem',
          color: 'var(--color-stone)',
        }}
      >
        {label}
      </p>
    </div>
  );
}

// ── Component ──

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ artworkId: string }>;
}) {
  const { loading: authLoading } = useRequireAuth();
  const router = useRouter();
  const { user } = useAuth();

  const [artworkId, setArtworkId] = useState<string | null>(null);
  const [artwork, setArtwork] = useState<ArtworkCheckout | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true);

  const [address, setAddress] = useState<ShippingAddress>({
    street: '',
    city: '',
    state: 'VIC',
    postcode: '',
    country: 'Australia',
  });

  useEffect(() => {
    params.then((p) => setArtworkId(p.artworkId));
  }, [params]);

  useEffect(() => {
    if (!artworkId) return;

    async function fetchCheckoutData() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(`/api/checkout/artwork?id=${artworkId}`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const data = await res.json();
        if (!res.ok) {
          setError(
            data.error || 'This artwork is not available for purchase.'
          );
          setLoading(false);
          return;
        }

        const raw = data.artwork;
        const profile = raw.profiles as Record<string, string> | null;
        setArtwork({
          id: raw.id,
          title: raw.title,
          price_aud: raw.price_aud,
          category: raw.category as ArtworkCheckout['category'],
          images: (raw.images as string[]) || [],
          medium: raw.medium,
          artist_id: raw.artist_id,
          shipping_weight_kg: raw.shipping_weight_kg,
          artist: {
            full_name: profile?.full_name || null,
          },
        });

        if (data.address && data.address.street) {
          setAddress({
            street: data.address.street || '',
            city: data.address.city || '',
            state: data.address.state || 'VIC',
            postcode: data.address.postcode || '',
            country: data.address.country || 'Australia',
          });
        }
      } catch (err) {
        setError(
          (err as Error).name === 'AbortError'
            ? 'Request timed out. Please refresh the page.'
            : 'Failed to load artwork details.'
        );
      } finally {
        setLoading(false);
      }
    }

    const safetyTimeout = setTimeout(() => setLoading(false), 10000);
    fetchCheckoutData().then(() => clearTimeout(safetyTimeout));
  }, [artworkId]);

  const isDigital = artwork?.category === 'digital';
  const shippingCost = 0;
  const totalPrice = artwork ? artwork.price_aud + shippingCost : 0;
  const isOwnArtwork = user && artwork && user.id === artwork.artist_id;

  const addressValid =
    isDigital ||
    (address.street.trim().length > 0 &&
      address.city.trim().length > 0 &&
      address.postcode.trim().length >= 4);

  async function handleCheckout() {
    if (!artwork || !user) return;

    if (isOwnArtwork) {
      setError("You can't purchase your own work.");
      return;
    }

    if (!isDigital && !addressValid) {
      setError('Please fill in your shipping address.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkId: artwork.id,
          shippingAddress: isDigital ? null : address,
          saveAddress: saveAddressToProfile,
          origin: window.location.origin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  if (authLoading) return <EditorialSpinner />;
  if (loading) return <EditorialSpinner label="Preparing checkout…" />;

  // ── Not available ──
  if (!artwork) {
    return (
      <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
        <div
          className="px-6 sm:px-10"
          style={{
            maxWidth: '46rem',
            margin: '0 auto',
            paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
            paddingBottom: 'clamp(4rem, 7vw, 6rem)',
          }}
        >
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
            This work can&apos;t be purchased right now.
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
            {error || 'It may have sold, or the listing has been withdrawn.'}
          </p>
          <Link
            href="/browse"
            className="artwork-primary-cta artwork-primary-cta--compact"
            style={{ minWidth: '14rem' }}
          >
            Browse the collection
          </Link>
        </div>
      </div>
    );
  }

  const thumbnail = artwork.images[0];

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
        {/* ── Back link ── */}
        <Link
          href={`/artwork/${artwork.id}`}
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
          ← Back to the work
        </Link>

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
            The final <em style={{ fontStyle: 'italic', textTransform: 'none' }}>handshake</em>
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
            Confirm your <em style={{ fontStyle: 'italic' }}>acquisition.</em>
          </h1>
          <p
            style={{
              fontSize: '0.92rem',
              fontWeight: 300,
              color: 'var(--color-stone-dark)',
              lineHeight: 1.6,
              maxWidth: '56ch',
            }}
          >
            Payment is held in escrow by Signo until you&apos;ve received the
            work and confirmed you&apos;re satisfied.
          </p>
        </header>

        {error && (
          <p
            className="font-serif"
            style={{
              marginBottom: '2rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--color-border)',
              fontSize: '0.92rem',
              fontStyle: 'italic',
              color: 'var(--color-terracotta, #c45d3e)',
            }}
          >
            — {error}
          </p>
        )}

        <div
          className="grid grid-cols-1 lg:grid-cols-12"
          style={{ gap: 'clamp(2.4rem, 4vw, 4rem)' }}
        >
          {/* ── Left: Form ── */}
          <div className="lg:col-span-7">
            {/* Mobile summary strip */}
            <div
              className="lg:hidden"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.2rem',
                paddingBottom: '1.6rem',
                marginBottom: '2rem',
                borderBottom: '1px solid var(--color-border-strong)',
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  background: 'var(--color-cream)',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {thumbnail && (
                  <Image
                    src={thumbnail}
                    alt={artwork.title}
                    width={72}
                    height={72}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  className="font-serif"
                  style={{
                    fontSize: '1rem',
                    color: 'var(--color-ink)',
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {artwork.title}
                </p>
                <p
                  style={{
                    marginTop: '0.2rem',
                    fontSize: '0.78rem',
                    color: 'var(--color-stone-dark)',
                    fontWeight: 300,
                    fontStyle: 'italic',
                  }}
                >
                  {artwork.artist.full_name || 'Unknown'}
                </p>
                <p
                  className="font-serif"
                  style={{
                    marginTop: '0.3rem',
                    fontSize: '1.05rem',
                    color: 'var(--color-ink)',
                  }}
                >
                  {formatPrice(artwork.price_aud)}
                </p>
              </div>
            </div>

            {!isDigital && (
              <section style={{ marginBottom: '3rem' }}>
                <p
                  style={{
                    fontSize: '0.62rem',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'var(--color-stone)',
                    marginBottom: '1rem',
                  }}
                >
                  01 · Shipping
                </p>
                <h2
                  className="font-serif"
                  style={{
                    fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)',
                    lineHeight: 1.15,
                    color: 'var(--color-ink)',
                    fontWeight: 400,
                    marginBottom: '0.6rem',
                  }}
                >
                  Where should this{' '}
                  <em style={{ fontStyle: 'italic' }}>arrive?</em>
                </h2>
                <p
                  className="font-serif"
                  style={{
                    fontStyle: 'italic',
                    fontSize: '0.85rem',
                    color: 'var(--color-stone-dark)',
                    fontWeight: 300,
                    marginBottom: '0.8rem',
                  }}
                >
                  <em>Signo currently ships within Australia.</em>
                </p>
                <p
                  style={{
                    fontSize: '0.88rem',
                    color: 'var(--color-stone-dark)',
                    fontWeight: 300,
                    marginBottom: '2rem',
                  }}
                >
                  Tracked delivery within 7 days, included in the price.
                </p>

                <div style={{ marginBottom: '1.8rem' }}>
                  <label htmlFor="street" className="commission-label">
                    Street
                  </label>
                  <input
                    id="street"
                    type="text"
                    value={address.street}
                    onChange={(e) =>
                      setAddress({ ...address, street: e.target.value })
                    }
                    className="commission-field"
                    placeholder="123 Collins Street"
                  />
                </div>

                <div
                  className="grid grid-cols-1 sm:grid-cols-2"
                  style={{ gap: '1.4rem', marginBottom: '1.8rem' }}
                >
                  <div>
                    <label htmlFor="city" className="commission-label">
                      City
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={address.city}
                      onChange={(e) =>
                        setAddress({ ...address, city: e.target.value })
                      }
                      className="commission-field"
                      placeholder="Melbourne"
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className="commission-label">
                      State
                    </label>
                    <select
                      id="state"
                      value={address.state}
                      onChange={(e) =>
                        setAddress({ ...address, state: e.target.value })
                      }
                      className="commission-field"
                    >
                      {AU_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div
                  className="grid grid-cols-1 sm:grid-cols-2"
                  style={{ gap: '1.4rem', marginBottom: '1.8rem' }}
                >
                  <div>
                    <label htmlFor="postcode" className="commission-label">
                      Postcode
                    </label>
                    <input
                      id="postcode"
                      type="text"
                      value={address.postcode}
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          postcode: e.target.value
                            .replace(/\D/g, '')
                            .slice(0, 4),
                        })
                      }
                      className="commission-field"
                      placeholder="3000"
                      maxLength={4}
                    />
                  </div>
                  <div>
                    <p className="commission-label">Country</p>
                    <p
                      className="font-serif"
                      style={{
                        fontSize: '1rem',
                        fontStyle: 'italic',
                        color: 'var(--color-stone-dark)',
                        padding: '0.9rem 0',
                        borderBottom: '1px solid var(--color-border)',
                        margin: 0,
                      }}
                    >
                      Australia
                    </p>
                  </div>
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.7rem',
                    cursor: 'pointer',
                    marginTop: '0.4rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={saveAddressToProfile}
                    onChange={(e) =>
                      setSaveAddressToProfile(e.target.checked)
                    }
                    style={{
                      width: 14,
                      height: 14,
                      accentColor: 'var(--color-ink)',
                    }}
                  />
                  <span
                    className="font-serif"
                    style={{
                      fontSize: '0.85rem',
                      fontStyle: 'italic',
                      color: 'var(--color-stone-dark)',
                    }}
                  >
                    Keep this address on file for next time
                  </span>
                </label>
              </section>
            )}

            {isDigital && (
              <section style={{ marginBottom: '3rem' }}>
                <p
                  style={{
                    fontSize: '0.62rem',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'var(--color-stone)',
                    marginBottom: '1rem',
                  }}
                >
                  01 · Delivery
                </p>
                <h2
                  className="font-serif"
                  style={{
                    fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)',
                    lineHeight: 1.15,
                    color: 'var(--color-ink)',
                    fontWeight: 400,
                    marginBottom: '0.6rem',
                  }}
                >
                  A <em style={{ fontStyle: 'italic' }}>digital</em> work.
                </h2>
                <p
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--color-stone-dark)',
                    fontWeight: 300,
                    lineHeight: 1.6,
                    maxWidth: '52ch',
                  }}
                >
                  Once payment clears, a download link will appear on your
                  order page and in an email from Signo. No shipping required.
                </p>
              </section>
            )}

            {/* Trust notes — typographic */}
            <section
              style={{
                borderTop: '1px solid var(--color-border-strong)',
                paddingTop: '1.6rem',
              }}
            >
              <p
                style={{
                  fontSize: '0.62rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--color-stone)',
                  marginBottom: '1rem',
                }}
              >
                You are covered by
              </p>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'grid',
                  gap: '0.9rem',
                }}
              >
                {[
                  {
                    title: 'Escrow',
                    detail:
                      'Funds are held by Signo and released to the artist only after you confirm the work.',
                  },
                  {
                    title: 'Secure payment',
                    detail: 'Processed by Stripe. Signo never sees your card.',
                  },
                  {
                    title: isDigital
                      ? 'Instant delivery'
                      : 'Tracked delivery',
                    detail: isDigital
                      ? 'Download link available immediately after payment.'
                      : 'Shipped within seven days with live tracking.',
                  },
                ].map((t) => (
                  <li
                    key={t.title}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '1.2rem',
                    }}
                  >
                    <span
                      className="font-serif"
                      style={{
                        fontSize: '0.78rem',
                        fontStyle: 'italic',
                        color: 'var(--color-ink)',
                        width: '9rem',
                        flexShrink: 0,
                      }}
                    >
                      {t.title}
                    </span>
                    <span
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--color-stone-dark)',
                        fontWeight: 300,
                        lineHeight: 1.5,
                      }}
                    >
                      {t.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* ── Right: Order summary ── */}
          <aside className="lg:col-span-5">
            <div
              style={{
                position: 'sticky',
                top: '7rem',
                borderTop: '1px solid var(--color-border-strong)',
                paddingTop: '1.6rem',
              }}
            >
              <p
                style={{
                  fontSize: '0.62rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--color-stone)',
                  marginBottom: '1.2rem',
                }}
              >
                02 · Order
              </p>

              {/* Hidden on mobile since we already show a summary strip above */}
              <div
                className="hidden lg:flex"
                style={{
                  gap: '1.4rem',
                  paddingBottom: '1.6rem',
                  marginBottom: '1.6rem',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div
                  style={{
                    width: 112,
                    height: 112,
                    background: 'var(--color-cream)',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {thumbnail && (
                    <Image
                      src={thumbnail}
                      alt={artwork.title}
                      width={112}
                      height={112}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    className="font-serif"
                    style={{
                      fontSize: '1.1rem',
                      color: 'var(--color-ink)',
                      lineHeight: 1.25,
                      margin: 0,
                    }}
                  >
                    {artwork.title}
                  </p>
                  <p
                    style={{
                      marginTop: '0.3rem',
                      fontSize: '0.82rem',
                      fontStyle: 'italic',
                      color: 'var(--color-stone-dark)',
                    }}
                  >
                    {artwork.artist.full_name || 'Unknown'}
                  </p>
                  {artwork.medium && (
                    <p
                      style={{
                        marginTop: '0.2rem',
                        fontSize: '0.76rem',
                        color: 'var(--color-stone)',
                        fontWeight: 300,
                      }}
                    >
                      {artwork.medium}
                    </p>
                  )}
                  <p
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.6rem',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'var(--color-stone)',
                    }}
                  >
                    {isDigital
                      ? 'Digital'
                      : artwork.category === 'print'
                        ? 'Print'
                        : 'Original'}
                  </p>
                </div>
              </div>

              {/* Price breakdown as typographic dl */}
              <dl
                style={{
                  margin: 0,
                  padding: 0,
                  marginBottom: '1.4rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    padding: '0.7rem 0',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <dt
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--color-stone-dark)',
                      fontWeight: 300,
                    }}
                  >
                    Work
                  </dt>
                  <dd
                    className="font-serif"
                    style={{
                      margin: 0,
                      fontSize: '0.95rem',
                      color: 'var(--color-ink)',
                    }}
                  >
                    {formatPrice(artwork.price_aud)}
                  </dd>
                </div>
                {!isDigital && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      padding: '0.7rem 0',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <dt
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--color-stone-dark)',
                        fontWeight: 300,
                      }}
                    >
                      Shipping
                    </dt>
                    <dd
                      className="font-serif"
                      style={{
                        margin: 0,
                        fontSize: '0.95rem',
                        color: 'var(--color-ink)',
                        fontStyle: 'italic',
                      }}
                    >
                      Included
                    </dd>
                  </div>
                )}
              </dl>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  paddingTop: '1rem',
                  marginBottom: '2rem',
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
                  Total
                </span>
                <span
                  className="font-serif"
                  style={{
                    fontSize: 'clamp(1.6rem, 3vw, 2rem)',
                    color: 'var(--color-ink)',
                    fontWeight: 400,
                  }}
                >
                  {formatPrice(totalPrice)}
                </span>
              </div>

              {isOwnArtwork ? (
                <p
                  className="font-serif"
                  style={{
                    padding: '1rem 1.2rem',
                    borderTop: '1px solid var(--color-terracotta, #c45d3e)',
                    borderBottom:
                      '1px solid var(--color-terracotta, #c45d3e)',
                    fontSize: '0.9rem',
                    fontStyle: 'italic',
                    color: 'var(--color-ink)',
                    textAlign: 'center',
                  }}
                >
                  You can&apos;t purchase your own work.
                </p>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={submitting || (!isDigital && !addressValid)}
                  className="artwork-primary-cta"
                  style={{
                    width: '100%',
                    opacity:
                      submitting || (!isDigital && !addressValid) ? 0.5 : 1,
                  }}
                >
                  {submitting
                    ? 'Redirecting to Stripe…'
                    : `Pay ${formatPrice(totalPrice)}`}
                </button>
              )}

              <p
                className="font-serif"
                style={{
                  marginTop: '1rem',
                  fontSize: '0.72rem',
                  fontStyle: 'italic',
                  color: 'var(--color-stone)',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                You&apos;ll be handed over to Stripe&apos;s secure checkout.
                Funds are held in escrow until delivery is confirmed.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
