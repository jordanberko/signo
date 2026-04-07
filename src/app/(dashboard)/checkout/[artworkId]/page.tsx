'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ImageIcon,
  Loader2,
  Lock,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
  Download,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { formatPrice, calculateCommission } from '@/lib/utils';

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

const AU_STATES = [
  'ACT',
  'NSW',
  'NT',
  'QLD',
  'SA',
  'TAS',
  'VIC',
  'WA',
];

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
  const [saveAddress, setSaveAddress] = useState(true);

  const [address, setAddress] = useState<ShippingAddress>({
    street: '',
    city: '',
    state: 'VIC',
    postcode: '',
    country: 'Australia',
  });

  // Resolve params (Next.js 16 — params is a Promise)
  useEffect(() => {
    params.then((p) => setArtworkId(p.artworkId));
  }, [params]);

  // Fetch artwork + saved address via server API route
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
        console.log('[Checkout] Data loaded:', data);

        if (!res.ok) {
          setError(data.error || 'This artwork is not available for purchase.');
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

        // Load saved address if available
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
        console.error('[Checkout] Load error:', err);
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
  const shippingCost = isDigital ? 0 : 0; // Free shipping (included in price)
  const totalPrice = artwork ? artwork.price_aud + shippingCost : 0;

  const commission = artwork ? calculateCommission(totalPrice) : null;
  const isOwnArtwork = user && artwork && user.id === artwork.artist_id;

  const addressValid =
    isDigital ||
    (address.street.trim().length > 0 &&
      address.city.trim().length > 0 &&
      address.postcode.trim().length >= 4);

  async function handleCheckout() {
    if (!artwork || !user) return;

    if (isOwnArtwork) {
      setError("You can't purchase your own artwork.");
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
          saveAddress,
          origin: window.location.origin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  // ── Loading / error states ──

  if (authLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div style={{ width: 32, height: 32, border: '3px solid #E5E2DB', borderTopColor: '#2C2C2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style></div>;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="h-12 w-12 text-muted mx-auto mb-4" />
        <h1 className="font-editorial text-2xl font-medium mb-2">
          Artwork not available
        </h1>
        <p className="text-muted mb-6">
          {error || 'This artwork may have been sold or removed.'}
        </p>
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-accent hover:text-primary transition-colors"
        >
          Browse Artwork
        </Link>
      </div>
    );
  }

  const thumbnail = artwork.images[0];

  // ── Render ──

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        href={`/artwork/${artwork.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to artwork
      </Link>

      <h1 className="font-editorial text-2xl md:text-3xl font-medium mb-8">
        Checkout
      </h1>

      {error && (
        <div className="mb-6 p-4 bg-error/5 border border-error/20 rounded-xl text-error text-sm animate-fade-in">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
        {/* ── Left: Form ── */}
        <div className="lg:col-span-3 space-y-8">
          {/* Artwork summary (mobile) */}
          <div className="lg:hidden bg-white border border-border rounded-2xl p-4 flex gap-4">
            <div className="w-20 h-20 rounded-xl bg-muted-bg flex-shrink-0 overflow-hidden">
              {thumbnail ? (
                <Image
                  src={thumbnail}
                  alt={artwork.title}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-border" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{artwork.title}</p>
              <p className="text-xs text-muted">
                by {artwork.artist?.full_name || 'Unknown Artist'}
              </p>
              <p className="font-bold text-lg mt-1">
                {formatPrice(artwork.price_aud)}
              </p>
            </div>
          </div>

          {/* Shipping address (physical only) */}
          {!isDigital && (
            <div className="bg-white border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-muted-bg rounded-full flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-muted" />
                </div>
                <div>
                  <h2 className="font-medium">Shipping Address</h2>
                  <p className="text-xs text-muted">
                    Where should we deliver your artwork?
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="street"
                    className="block text-xs font-medium tracking-wide uppercase text-muted mb-1.5"
                  >
                    Street Address <span className="text-error">*</span>
                  </label>
                  <input
                    id="street"
                    type="text"
                    value={address.street}
                    onChange={(e) =>
                      setAddress({ ...address, street: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm placeholder:text-warm-gray"
                    placeholder="123 Collins Street"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="city"
                      className="block text-xs font-medium tracking-wide uppercase text-muted mb-1.5"
                    >
                      City <span className="text-error">*</span>
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={address.city}
                      onChange={(e) =>
                        setAddress({ ...address, city: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm placeholder:text-warm-gray"
                      placeholder="Melbourne"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="state"
                      className="block text-xs font-medium tracking-wide uppercase text-muted mb-1.5"
                    >
                      State
                    </label>
                    <select
                      id="state"
                      value={address.state}
                      onChange={(e) =>
                        setAddress({ ...address, state: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm"
                    >
                      {AU_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="postcode"
                      className="block text-xs font-medium tracking-wide uppercase text-muted mb-1.5"
                    >
                      Postcode <span className="text-error">*</span>
                    </label>
                    <input
                      id="postcode"
                      type="text"
                      value={address.postcode}
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          postcode: e.target.value.replace(/\D/g, '').slice(0, 4),
                        })
                      }
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm placeholder:text-warm-gray"
                      placeholder="3000"
                      maxLength={4}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="country"
                      className="block text-xs font-medium tracking-wide uppercase text-muted mb-1.5"
                    >
                      Country
                    </label>
                    <input
                      id="country"
                      type="text"
                      value={address.country}
                      disabled
                      className="w-full px-4 py-3 bg-muted-bg border border-border rounded-xl text-sm text-muted"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-muted">
                    Save this address for future purchases
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Digital download info */}
          {isDigital && (
            <div className="bg-white border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-accent-subtle rounded-full flex items-center justify-center">
                  <Download className="h-4 w-4 text-accent-dark" />
                </div>
                <div>
                  <h2 className="font-medium">Digital Download</h2>
                  <p className="text-xs text-muted">
                    You&apos;ll receive a download link after payment. No shipping required.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Trust signals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2.5 p-3 bg-cream rounded-xl">
              <Lock className="h-4 w-4 text-muted flex-shrink-0" />
              <span className="text-xs text-muted">Secure payment via Stripe</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-cream rounded-xl">
              <ShieldCheck className="h-4 w-4 text-muted flex-shrink-0" />
              <span className="text-xs text-muted">Buyer protection included</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-cream rounded-xl">
              {isDigital ? (
                <>
                  <Download className="h-4 w-4 text-muted flex-shrink-0" />
                  <span className="text-xs text-muted">Instant digital delivery</span>
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4 text-muted flex-shrink-0" />
                  <span className="text-xs text-muted">Tracked shipping within 5 days</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Order Summary ── */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-border rounded-2xl p-6 lg:sticky lg:top-24">
            <h2 className="font-editorial text-lg font-medium mb-5">
              Order Summary
            </h2>

            {/* Artwork */}
            <div className="flex gap-4 mb-5 pb-5 border-b border-border">
              <div className="w-24 h-24 rounded-xl bg-muted-bg flex-shrink-0 overflow-hidden">
                {thumbnail ? (
                  <Image
                    src={thumbnail}
                    alt={artwork.title}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-border" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm leading-tight">
                  {artwork.title}
                </p>
                <p className="text-xs text-muted mt-1">
                  by {artwork.artist?.full_name || 'Unknown Artist'}
                </p>
                {artwork.medium && (
                  <p className="text-xs text-warm-gray mt-0.5">
                    {artwork.medium}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-1.5">
                  {isDigital ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                      Digital
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 bg-muted-bg text-muted rounded-full flex items-center gap-1">
                      <Package className="h-2.5 w-2.5" />
                      {artwork.category === 'print' ? 'Print' : 'Original'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="space-y-2.5 mb-5 pb-5 border-b border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Artwork</span>
                <span>{formatPrice(artwork.price_aud)}</span>
              </div>
              {!isDigital && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Shipping</span>
                  <span className="text-green-700 font-medium">Free</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center mb-6">
              <span className="font-medium">Total</span>
              <span className="font-bold text-xl">
                {formatPrice(totalPrice)}
              </span>
            </div>

            {/* Pay button */}
            {isOwnArtwork ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <p className="text-sm text-amber-800">
                  You can&apos;t purchase your own artwork.
                </p>
              </div>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={submitting || (!isDigital && !addressValid)}
                className="w-full py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-accent hover:text-primary transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Redirecting to payment...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Pay {formatPrice(totalPrice)}
                  </>
                )}
              </button>
            )}

            <p className="text-[11px] text-warm-gray text-center mt-3">
              You&apos;ll be redirected to Stripe&apos;s secure checkout.
              Payment is held in escrow until delivery is confirmed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
