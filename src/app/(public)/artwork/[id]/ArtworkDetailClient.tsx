'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Heart,
  Share2,
  MessageCircle,
  ShieldCheck,
  Truck,
  RotateCcw,
  Lock,
  X,
  ChevronLeft,
  ChevronRight,
  Ruler,
  MapPin,
  ArrowRight,
  Frame,
  Loader2,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import ArtworkCard from '@/components/ui/ArtworkCard';

// ── Types ──

export interface ArtworkDetail {
  id: string;
  title: string;
  description: string | null;
  category: 'original' | 'print' | 'digital';
  medium: string | null;
  style: string | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  price_aud: number;
  is_framed: boolean;
  images: string[];
  tags: string[];
  shipping_weight_kg: number | null;
  artist: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    location: string | null;
  };
}

export interface RelatedArtwork {
  id: string;
  title: string;
  price_aud: number;
  images: string[];
  medium: string | null;
  category: 'original' | 'print' | 'digital';
  artist_id: string;
  artistName: string;
}

interface Props {
  artwork: ArtworkDetail;
  relatedArtworks: RelatedArtwork[];
  suggestedArtworks: RelatedArtwork[];
  artistArtworkCount: number;
}

// ── Lightbox ──

function Lightbox({
  images,
  initialIndex,
  onClose,
  title,
}: {
  images: string[];
  initialIndex: number;
  onClose: () => void;
  title: string;
}) {
  const [index, setIndex] = useState(initialIndex);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft')
        setIndex((i) => (i === 0 ? images.length - 1 : i - 1));
      if (e.key === 'ArrowRight')
        setIndex((i) => (i === images.length - 1 ? 0 : i + 1));
    },
    [images.length, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={() =>
              setIndex((i) => (i === 0 ? images.length - 1 : i - 1))
            }
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() =>
              setIndex((i) => (i === images.length - 1 ? 0 : i + 1))
            }
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <div className="relative max-w-[90vw] max-h-[90vh]">
        <img
          src={images[index]}
          alt={`${title} — image ${index + 1}`}
          className="max-w-full max-h-[90vh] object-contain"
        />
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === index ? 'bg-white' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──

export default function ArtworkDetailClient({
  artwork,
  relatedArtworks,
  suggestedArtworks,
  artistArtworkCount,
}: Props) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [messagingLoading, setMessagingLoading] = useState(false);
  const [isFavourited, setIsFavourited] = useState(false);
  const [favouriteCount, setFavouriteCount] = useState(0);
  const [heartAnimating, setHeartAnimating] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const isOwnArtwork = user?.id === artwork.artist.id;
  const buyButtonRef = useRef<HTMLAnchorElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Intersection Observer — show sticky bar when main Buy Now scrolls out of view
  useEffect(() => {
    const el = buyButtonRef.current;
    if (!el) return;

    // Only observe on mobile-sized screens
    const mql = window.matchMedia('(max-width: 767px)');
    if (!mql.matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(el);

    // Re-check on resize (e.g. rotating phone)
    function handleChange(e: MediaQueryListEvent) {
      if (!e.matches) {
        setShowStickyBar(false);
      } else if (el) {
        observer.observe(el);
      }
    }
    mql.addEventListener('change', handleChange);

    return () => {
      observer.disconnect();
      mql.removeEventListener('change', handleChange);
    };
  }, []);

  // Load favourite state
  useEffect(() => {
    fetch(`/api/favourites?artworkId=${artwork.id}`)
      .then((r) => r.json())
      .then((data) => {
        setIsFavourited(data.isFavourited ?? false);
        setFavouriteCount(data.count ?? 0);
      })
      .catch(() => {});
  }, [artwork.id]);

  function handleFavourite() {
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(`/artwork/${artwork.id}`)}`;
      return;
    }

    const newState = !isFavourited;
    setIsFavourited(newState);
    setFavouriteCount((c) => c + (newState ? 1 : -1));

    if (newState) {
      setHeartAnimating(true);
      setTimeout(() => setHeartAnimating(false), 300);
    }

    fetch('/api/favourites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artworkId: artwork.id }),
    }).catch(() => {
      setIsFavourited(!newState);
      setFavouriteCount((c) => c + (newState ? -1 : 1));
    });
  }

  async function handleMessageArtist() {
    console.log('[Artwork] Message Artist clicked for artwork:', artwork.id);

    if (!user) {
      console.log('[Artwork] User not logged in, redirecting to login');
      window.location.href = `/login?redirect=${encodeURIComponent(`/artwork/${artwork.id}`)}`;
      return;
    }

    console.log('[Artwork] Creating conversation with artist:', artwork.artist.id);
    setMessagingLoading(true);
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_2: artwork.artist.id,
          artwork_id: artwork.id,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        console.log('[Artwork] Conversation created/found:', json.data?.id);
        console.log('[Artwork] Navigating to /messages/' + json.data?.id);
        router.push(`/messages/${json.data.id}`);
      } else {
        console.error('[Artwork] Failed to create conversation:', json.error);
        setMessagingLoading(false);
      }
    } catch (err) {
      console.error('[Artwork] Message artist error:', err);
      setMessagingLoading(false);
    }
  }

  const images = artwork.images || [];
  const artist = artwork.artist;

  const categoryLabel = {
    original: 'Original',
    print: 'Print',
    digital: 'Digital',
  }[artwork.category];

  const hasDimensions = artwork.width_cm && artwork.height_cm;

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-muted">
          <Link href="/browse" className="hover:text-accent-dark transition-colors">
            Browse
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/browse?category=${artwork.category}`}
            className="hover:text-accent-dark transition-colors capitalize"
          >
            {categoryLabel}s
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{artwork.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          {/* ── Image Gallery ── */}
          <div className="space-y-4">
            {/* Primary Image */}
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="relative w-full aspect-[4/3] bg-muted-bg rounded-xl overflow-hidden cursor-zoom-in group"
            >
              {images[selectedImage] ? (
                <Image
                  src={images[selectedImage]}
                  alt={artwork.title}
                  fill
                  className="object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted">
                  No image available
                </div>
              )}

              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage((i) =>
                        i === 0 ? images.length - 1 : i - 1
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        setSelectedImage((i) =>
                          i === 0 ? images.length - 1 : i - 1
                        );
                      }
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage((i) =>
                        i === images.length - 1 ? 0 : i + 1
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        setSelectedImage((i) =>
                          i === images.length - 1 ? 0 : i + 1
                        );
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </>
              )}
            </button>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      selectedImage === i
                        ? 'border-accent ring-1 ring-accent/30'
                        : 'border-transparent hover:border-warm-gray'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${artwork.title} — photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Artwork Info ── */}
          <div className="space-y-6">
            {/* Title & Category */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 bg-muted-bg text-[11px] font-medium tracking-wide uppercase rounded-full">
                  {categoryLabel}
                </span>
                {artwork.is_framed && (
                  <span className="px-2.5 py-1 bg-accent-subtle text-[11px] font-medium tracking-wide uppercase rounded-full text-accent-dark flex items-center gap-1">
                    <Frame className="h-3 w-3" />
                    Framed
                  </span>
                )}
              </div>
              <h1 className="font-editorial text-3xl md:text-4xl font-medium">
                {artwork.title}
              </h1>
            </div>

            {/* Artist card */}
            <Link
              href={`/artists/${artist.id}`}
              className="flex items-center gap-3.5 p-3 -mx-3 rounded-xl hover:bg-cream transition-colors group"
            >
              <div className="w-11 h-11 rounded-full bg-muted-bg flex-shrink-0 overflow-hidden">
                {artist.avatar_url ? (
                  <img
                    src={artist.avatar_url}
                    alt={artist.full_name ?? ''}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted">
                    {(artist.full_name || '?')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm group-hover:text-accent-dark transition-colors">
                  {artist.full_name}
                </p>
                {artist.location && (
                  <p className="text-xs text-muted flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {artist.location}
                  </p>
                )}
              </div>
            </Link>

            {/* Price */}
            <p className="text-3xl font-bold tracking-tight">
              {formatPrice(artwork.price_aud)}
            </p>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <Link
                ref={buyButtonRef}
                href={`/checkout/${artwork.id}`}
                className="block w-full py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-accent transition-colors duration-300 text-center text-lg"
              >
                Buy Now
              </Link>
              <div className="flex gap-3">
                {!isOwnArtwork && (
                  <button
                    onClick={handleMessageArtist}
                    disabled={messagingLoading}
                    className="flex-1 py-2.5 border-2 border-border rounded-full flex items-center justify-center gap-2 hover:border-accent hover:text-accent-dark transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {messagingLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                    Message Artist
                  </button>
                )}
                <button
                  onClick={handleFavourite}
                  className={`py-2.5 px-4 border-2 rounded-full flex items-center justify-center gap-2 transition-all text-sm font-medium ${
                    isFavourited
                      ? 'border-[#D85A30]/30 text-[#D85A30]'
                      : 'border-border hover:border-[#D85A30]/40 hover:text-[#D85A30]'
                  }`}
                  aria-label={isFavourited ? 'Remove from favourites' : 'Save to favourites'}
                  style={{
                    transform: heartAnimating ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 150ms ease-out, border-color 200ms, color 200ms',
                  }}
                >
                  <Heart
                    className="h-4 w-4"
                    fill={isFavourited ? '#D85A30' : 'none'}
                    stroke={isFavourited ? '#D85A30' : 'currentColor'}
                  />
                </button>
                <button
                  className="py-2.5 px-4 border-2 border-border rounded-full flex items-center justify-center gap-2 hover:border-accent hover:text-accent-dark transition-colors text-sm font-medium"
                  aria-label="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Favourite count — social proof */}
            {favouriteCount > 0 && (
              <p className={`text-xs flex items-center gap-1.5 ${isFavourited ? 'text-accent-dark' : 'text-warm-gray'}`}>
                <Heart
                  className="h-3 w-3"
                  fill={isFavourited ? 'currentColor' : 'none'}
                  stroke="currentColor"
                />
                {isFavourited
                  ? favouriteCount === 1
                    ? 'You favourited this'
                    : `You and ${favouriteCount - 1} ${favouriteCount - 1 === 1 ? 'other' : 'others'} favourited this`
                  : `${favouriteCount} ${favouriteCount === 1 ? 'favourite' : 'favourites'}`}
              </p>
            )}

            {/* Details grid */}
            <div className="border-t border-border pt-5">
              <h2 className="text-xs font-medium tracking-wide uppercase text-muted mb-3">
                Details
              </h2>
              <div className="grid grid-cols-2 gap-y-2.5 text-sm">
                {artwork.medium && (
                  <>
                    <span className="text-muted">Medium</span>
                    <span className="font-medium">{artwork.medium}</span>
                  </>
                )}
                {artwork.style && (
                  <>
                    <span className="text-muted">Style</span>
                    <span className="font-medium">{artwork.style}</span>
                  </>
                )}
                {hasDimensions && (
                  <>
                    <span className="text-muted flex items-center gap-1">
                      <Ruler className="h-3 w-3" /> Dimensions
                    </span>
                    <span className="font-medium">
                      {artwork.width_cm} × {artwork.height_cm}
                      {artwork.depth_cm ? ` × ${artwork.depth_cm}` : ''} cm
                    </span>
                  </>
                )}
                {artwork.is_framed && (
                  <>
                    <span className="text-muted">Framed</span>
                    <span className="font-medium text-accent-dark">Yes — ready to hang</span>
                  </>
                )}
                {artwork.shipping_weight_kg && (
                  <>
                    <span className="text-muted">Weight</span>
                    <span className="font-medium">
                      {artwork.shipping_weight_kg} kg
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            {artwork.description && (
              <div className="border-t border-border pt-5">
                <h2 className="text-xs font-medium tracking-wide uppercase text-muted mb-3">
                  About this piece
                </h2>
                <div className="text-sm text-muted leading-relaxed whitespace-pre-line">
                  {artwork.description}
                </div>
              </div>
            )}

            {/* Tags */}
            {artwork.tags && artwork.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {artwork.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/browse?q=${encodeURIComponent(tag)}`}
                    className="px-3 py-1 bg-cream border border-border text-xs rounded-full text-muted hover:border-accent hover:text-accent-dark transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Shipping & Returns */}
            <div className="border-t border-border pt-5">
              <h2 className="text-xs font-medium tracking-wide uppercase text-muted mb-3">
                Shipping &amp; Protection
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-3.5 bg-cream rounded-xl">
                  <Truck className="h-5 w-5 text-accent-dark flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">Tracked Shipping</p>
                    <p className="text-xs text-muted mt-0.5">
                      Ships within 5 business days
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 bg-cream rounded-xl">
                  <ShieldCheck className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">48-Hour Inspection</p>
                    <p className="text-xs text-muted mt-0.5">
                      Review before payout is released
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 bg-cream rounded-xl">
                  <RotateCcw className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">Damage Guarantee</p>
                    <p className="text-xs text-muted mt-0.5">
                      Full refund if damaged in transit
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 bg-cream rounded-xl">
                  <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">Escrow Protection</p>
                    <p className="text-xs text-muted mt-0.5">
                      Payment held securely until confirmed
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Artist Section ── */}
        <div className="mt-16 pt-10 border-t border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-editorial text-xl font-medium">
              About the artist
            </h2>
            <Link
              href={`/artists/${artist.id}`}
              className="text-sm text-accent-dark font-medium hover:underline flex items-center gap-1"
            >
              View storefront <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row items-start gap-5 p-6 bg-cream rounded-2xl">
            <Link
              href={`/artists/${artist.id}`}
              className="w-20 h-20 rounded-full bg-muted-bg flex-shrink-0 overflow-hidden"
            >
              {artist.avatar_url ? (
                <img
                  src={artist.avatar_url}
                  alt={artist.full_name ?? ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted">
                  {(artist.full_name || '?')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                href={`/artists/${artist.id}`}
                className="font-editorial text-lg font-medium hover:text-accent-dark transition-colors"
              >
                {artist.full_name}
              </Link>
              {artist.location && (
                <p className="text-sm text-muted flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {artist.location}
                </p>
              )}
              <p className="text-xs text-muted mt-1">
                {artistArtworkCount} {artistArtworkCount === 1 ? 'artwork' : 'artworks'} listed
              </p>
              {artist.bio && (
                <p className="text-sm text-muted leading-relaxed mt-3 line-clamp-3">
                  {artist.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Related Artworks ── */}
        {relatedArtworks.length > 0 && (
          <div className="mt-16 pt-10 border-t border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-editorial text-xl font-medium">
                More by {artist.full_name}
              </h2>
              <Link
                href={`/artists/${artist.id}`}
                className="text-sm text-accent-dark font-medium hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-10">
              {relatedArtworks.map((a) => (
                <ArtworkCard
                  key={a.id}
                  id={a.id}
                  title={a.title}
                  artistName={a.artistName}
                  artistId={a.artist_id}
                  price={a.price_aud}
                  imageUrl={a.images?.[0] || ''}
                  medium={a.medium}
                  category={a.category}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── You may also like ── */}
      {suggestedArtworks.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="pt-10 border-t border-border">
            <h2 className="font-editorial text-xl font-medium mb-6">
              You may also like
            </h2>
            {/* Desktop: 4 grid, Mobile: horizontal scroll */}
            <div className="hidden md:grid grid-cols-4 gap-x-5 gap-y-10">
              {suggestedArtworks.map((a) => (
                <ArtworkCard
                  key={a.id}
                  id={a.id}
                  title={a.title}
                  artistName={a.artistName}
                  artistId={a.artist_id}
                  price={a.price_aud}
                  imageUrl={a.images?.[0] || ''}
                  medium={a.medium}
                  category={a.category}
                />
              ))}
            </div>
            <div className="md:hidden flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
              {suggestedArtworks.map((a) => (
                <div key={a.id} className="flex-shrink-0 w-[200px] snap-start">
                  <ArtworkCard
                    id={a.id}
                    title={a.title}
                    artistName={a.artistName}
                    artistId={a.artist_id}
                    price={a.price_aud}
                    imageUrl={a.images?.[0] || ''}
                    medium={a.medium}
                    category={a.category}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom spacer — prevents sticky bar from overlapping content */}
      <div className="h-20 md:hidden" />

      {/* ── Sticky Buy Bar (mobile only) ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
        style={{
          transform: showStickyBar ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          className="bg-white border-t border-border flex items-center justify-between gap-4"
          style={{
            padding: '12px 16px',
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-foreground leading-tight">
              {formatPrice(artwork.price_aud)}
            </p>
            <p className="text-[13px] text-stone truncate leading-tight mt-0.5">
              {artwork.title}
            </p>
          </div>
          <Link
            href={`/checkout/${artwork.id}`}
            className="flex-shrink-0 px-6 py-2.5 bg-accent text-white font-semibold rounded-full text-sm hover:bg-accent-dark transition-colors"
          >
            Buy Now
          </Link>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <Lightbox
          images={images}
          initialIndex={selectedImage}
          onClose={() => setLightboxOpen(false)}
          title={artwork.title}
        />
      )}
    </>
  );
}
