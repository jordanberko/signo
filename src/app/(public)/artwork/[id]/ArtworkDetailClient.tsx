'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import ArtworkCard from '@/components/ui/ArtworkCard';
import ArtworkViewer from '@/components/ui/ArtworkViewer';

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
  availability: 'available' | 'coming_soon' | 'enquire_only';
  available_from: string | null;
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
  artistArtworks: { id: string; title: string; images: string[] }[];
}

// ── Fallback blur placeholder (cream background SVG, base64-encoded) ──
const FALLBACK_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjUiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjUiIGZpbGw9IiNmN2Y1ZjAiLz48L3N2Zz4=';

// ── Main component ──

export default function ArtworkDetailClient({
  artwork,
  relatedArtworks,
  suggestedArtworks,
  artistArtworkCount,
  artistArtworks,
}: Props) {
  const [selectedImage, setSelectedImage] = useState(0);
  // Controls opacity fade on image switch
  const [imageVisible, setImageVisible] = useState(true);
  // Viewing mode state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerSourceRect, setViewerSourceRect] = useState<DOMRect | null>(null);
  const mainImageRef = useRef<HTMLButtonElement>(null);

  function openViewer() {
    const rect = mainImageRef.current?.getBoundingClientRect();
    setViewerSourceRect(rect || null);
    setViewerOpen(true);
  }

  function closeViewer() {
    setViewerOpen(false);
  }

  function switchImage(i: number) {
    if (i === selectedImage) return;
    setImageVisible(false);
    setTimeout(() => {
      setSelectedImage(i);
      setImageVisible(true);
    }, 150);
  }
  const [messagingLoading, setMessagingLoading] = useState(false);
  const [isFavourited, setIsFavourited] = useState(false);
  const [favouriteCount, setFavouriteCount] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const isOwnArtwork = user?.id === artwork.artist.id;

  const isComingSoon = artwork.availability === 'coming_soon';
  const isEnquireOnly = artwork.availability === 'enquire_only';
  const isAvailable = artwork.availability === 'available';

  const availableFromDate = artwork.available_from ? new Date(artwork.available_from) : null;
  const isAvailableFromFuture = availableFromDate && availableFromDate > new Date();

  async function handleNotifyMe() {
    const email = user?.email || notifyEmail;
    if (!email) return;

    setNotifyLoading(true);
    try {
      const res = await fetch('/api/artworks/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId: artwork.id, email }),
      });
      if (res.ok) setNotifySuccess(true);
    } catch {
      // noop
    } finally {
      setNotifyLoading(false);
    }
  }

  function handleEnquire() {
    handleMessageArtist();
  }

  const buyButtonRef = useRef<HTMLElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const el = buyButtonRef.current;
    if (!el) return;

    const mql = window.matchMedia('(max-width: 767px)');
    if (!mql.matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );

    observer.observe(el);

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
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(`/artwork/${artwork.id}`)}`;
      return;
    }

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

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: artwork.title, url });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch {}
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

  // Typographic details rows
  const detailRows: { label: string; value: string }[] = [];
  if (artwork.medium) detailRows.push({ label: 'Medium', value: artwork.medium });
  if (artwork.style) detailRows.push({ label: 'Style', value: artwork.style });
  if (hasDimensions) {
    const dim = `${artwork.width_cm} × ${artwork.height_cm}${artwork.depth_cm ? ` × ${artwork.depth_cm}` : ''} cm`;
    detailRows.push({ label: 'Dimensions', value: dim });
  }
  detailRows.push({ label: 'Category', value: categoryLabel });
  if (artwork.is_framed) detailRows.push({ label: 'Presentation', value: 'Framed — ready to hang' });
  if (artwork.shipping_weight_kg) detailRows.push({ label: 'Weight', value: `${artwork.shipping_weight_kg} kg` });

  return (
    <>
      <div style={{ background: 'var(--color-warm-white)' }}>
        {/* ── Breadcrumb ── */}
        <nav
          className="px-6 sm:px-10"
          style={{
            paddingTop: '2.6rem',
            paddingBottom: '1.2rem',
            fontSize: '0.68rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
          }}
        >
          <Link href="/browse" className="footer-link">
            Browse
          </Link>
          <span style={{ margin: '0 10px' }}>/</span>
          <Link href={`/browse?category=${artwork.category}`} className="footer-link">
            {categoryLabel}s
          </Link>
          <span style={{ margin: '0 10px' }}>/</span>
          <span style={{ color: 'var(--color-stone-dark)' }}>{artwork.title}</span>
        </nav>

        {/* ── Hero: image + metadata ── */}
        <div className="px-6 sm:px-10" style={{ paddingBottom: '5rem' }}>
          <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 'clamp(2rem, 5vw, 5rem)' }}>
            {/* Image column — sticky on desktop */}
            <div className="lg:col-span-5">
              {/* Sticky scope: main image + thumbnails */}
              <div className="lg:sticky" style={{ top: 'calc(5rem + 2rem)', zIndex: 2 }}>
              <button
                ref={mainImageRef}
                type="button"
                onClick={openViewer}
                className="relative block w-full cursor-zoom-in group"
                style={{
                  background: 'var(--color-cream)',
                  aspectRatio: '4 / 5',
                  overflow: 'hidden',
                }}
              >
                {/* Fix 8: keyed by selectedImage so React treats it as a new node on switch,
                    enabling the CSS opacity fade-in. placeholder="blur" for lazy-load shimmer. */}
                {images[selectedImage] ? (
                  <div
                    key={selectedImage}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: imageVisible ? 1 : 0,
                      transition: 'opacity 300ms var(--ease-out)',
                    }}
                  >
                    <Image
                      src={images[selectedImage]}
                      alt={artwork.title}
                      fill
                      className="object-contain transition-transform duration-700"
                      style={{ transformOrigin: 'center' }}
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      priority
                      placeholder="blur"
                      blurDataURL={FALLBACK_BLUR}
                    />
                  </div>
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ color: 'var(--color-stone)', fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                  >
                    No image available
                  </div>
                )}

                {images.length > 1 && (
                  <>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        switchImage(selectedImage === 0 ? images.length - 1 : selectedImage - 1);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.stopPropagation();
                          switchImage(selectedImage === 0 ? images.length - 1 : selectedImage - 1);
                        }
                      }}
                      aria-label="Previous image"
                      className="font-serif absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        color: 'var(--color-ink)',
                        background: 'var(--color-warm-white)',
                        padding: '0.45rem 0.9rem',
                        cursor: 'pointer',
                        fontSize: '0.64rem',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        fontStyle: 'italic',
                      }}
                    >
                      ← Prev
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        switchImage(selectedImage === images.length - 1 ? 0 : selectedImage + 1);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.stopPropagation();
                          switchImage(selectedImage === images.length - 1 ? 0 : selectedImage + 1);
                        }
                      }}
                      aria-label="Next image"
                      className="font-serif absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        color: 'var(--color-ink)',
                        background: 'var(--color-warm-white)',
                        padding: '0.45rem 0.9rem',
                        cursor: 'pointer',
                        fontSize: '0.64rem',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        fontStyle: 'italic',
                      }}
                    >
                      Next →
                    </span>
                  </>
                )}
              </button>

              {/* Thumbnails — inside sticky scope so they stay visible while metadata scrolls */}
              {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide" style={{ marginTop: '1.1rem' }}>
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => switchImage(i)}
                      className="relative flex-shrink-0"
                      style={{
                        width: 80,
                        height: 100,
                        overflow: 'hidden',
                        opacity: selectedImage === i ? 1 : 0.55,
                        borderBottom: selectedImage === i
                          ? '1px solid var(--color-ink)'
                          : '1px solid transparent',
                        paddingBottom: 4,
                        transition: 'opacity var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
                      }}
                      aria-label={`Image ${i + 1}`}
                    >
                      <Image src={img} alt={`${artwork.title} — ${i + 1}`} fill className="object-cover" sizes="80px" />
                    </button>
                  ))}
                </div>
              )}
              </div>{/* close sticky scope */}
            </div>

            {/* Metadata column — scrolls naturally */}
            <div className="lg:col-span-7">
                {/* Category label */}
                <p
                  style={{
                    fontSize: '0.62rem',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'var(--color-stone)',
                    marginBottom: '1rem',
                  }}
                >
                  {categoryLabel}{artwork.is_framed ? ' · Framed' : ''}
                </p>

                {/* Title */}
                <h1
                  className="font-serif"
                  style={{
                    fontSize: 'clamp(2rem, 4vw, 3rem)',
                    lineHeight: 1.08,
                    letterSpacing: '-0.015em',
                    color: 'var(--color-ink)',
                    fontWeight: 400,
                    marginBottom: '0.5rem',
                  }}
                >
                  {artwork.title}
                </h1>

                {/* Artist line — typographic, not a card */}
                <p
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 300,
                    color: 'var(--color-stone-dark)',
                    marginBottom: '2.2rem',
                  }}
                >
                  <Link
                    href={`/artists/${artist.id}`}
                    className="footer-link"
                    style={{ fontStyle: 'italic' }}
                  >
                    {artist.full_name}
                  </Link>
                  {artist.location && (
                    <>
                      <span style={{ margin: '0 8px', color: 'var(--color-stone)' }}>·</span>
                      <span>{artist.location}</span>
                    </>
                  )}
                </p>

                {/* Price — serif, restrained */}
                <p
                  className="font-serif"
                  style={{
                    fontSize: '1.8rem',
                    color: 'var(--color-ink)',
                    fontWeight: 400,
                    letterSpacing: '-0.01em',
                    marginBottom: '1.8rem',
                  }}
                >
                  {formatPrice(artwork.price_aud)}
                </p>

                {/* CTAs */}
                <div style={{ marginBottom: '2.4rem' }}>
                  {!isOwnArtwork && isAvailable && (
                    <Link
                      ref={buyButtonRef as React.RefObject<HTMLAnchorElement | null>}
                      href={`/checkout/${artwork.id}`}
                      className="artwork-primary-cta"
                    >
                      Acquire this work
                    </Link>
                  )}

                  {!isOwnArtwork && isComingSoon && (
                    <div ref={buyButtonRef as React.RefObject<HTMLDivElement | null>}>
                      <p
                        className="font-serif"
                        style={{
                          fontSize: '0.72rem',
                          letterSpacing: '0.2em',
                          textTransform: 'uppercase',
                          color: 'var(--color-accent)',
                          marginBottom: '1rem',
                          fontStyle: 'italic',
                        }}
                      >
                        —{' '}
                        {isAvailableFromFuture
                          ? `Available ${availableFromDate!.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`
                          : 'Coming soon'}
                      </p>
                      {notifySuccess ? (
                        <div>
                          <p
                            style={{
                              fontSize: '0.62rem',
                              letterSpacing: '0.22em',
                              textTransform: 'uppercase',
                              color: 'var(--color-stone)',
                              marginBottom: '0.5rem',
                            }}
                          >
                            — Noted —
                          </p>
                          <p
                            className="font-serif"
                            style={{
                              fontSize: '1.05rem',
                              lineHeight: 1.4,
                              fontWeight: 400,
                              fontStyle: 'italic',
                              color: 'var(--color-ink)',
                              maxWidth: '34ch',
                            }}
                          >
                            You&apos;ll hear from us the moment this work opens for acquisition.
                          </p>
                        </div>
                      ) : (
                        <div>
                          {!user && (
                            <input
                              type="email"
                              placeholder="Your email address"
                              value={notifyEmail}
                              onChange={(e) => setNotifyEmail(e.target.value)}
                              className="browse-search-input"
                              style={{ fontSize: '0.95rem', marginBottom: '0.9rem' }}
                            />
                          )}
                          <button
                            onClick={handleNotifyMe}
                            disabled={notifyLoading || (!user && !notifyEmail)}
                            className="editorial-link"
                            style={{ opacity: notifyLoading || (!user && !notifyEmail) ? 0.5 : 1 }}
                          >
                            {notifyLoading ? 'Subscribing…' : 'Notify me'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {!isOwnArtwork && isEnquireOnly && (
                    <button
                      ref={buyButtonRef as React.RefObject<HTMLButtonElement | null>}
                      onClick={handleEnquire}
                      disabled={messagingLoading}
                      className="artwork-primary-cta"
                    >
                      {messagingLoading ? 'Opening…' : 'Enquire about this work'}
                    </button>
                  )}

                  {/* Secondary actions — typographic links, not buttons */}
                  {!isOwnArtwork && (
                    <div
                      className="flex items-center"
                      style={{ gap: 24, marginTop: '1.6rem' }}
                    >
                      {isAvailable && (
                        <button
                          onClick={handleMessageArtist}
                          disabled={messagingLoading}
                          className="footer-link"
                          style={{
                            fontSize: '0.72rem',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            fontWeight: 400,
                          }}
                        >
                          {messagingLoading ? 'Opening…' : 'Message artist'}
                        </button>
                      )}
                      <button
                        onClick={handleFavourite}
                        style={{
                          fontSize: '0.72rem',
                          letterSpacing: '0.15em',
                          textTransform: 'uppercase',
                          color: isFavourited ? 'var(--color-terracotta)' : 'var(--color-stone-dark)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          fontWeight: 400,
                          transition: 'color var(--dur-fast) var(--ease-out)',
                        }}
                        aria-label={isFavourited ? 'Remove from favourites' : 'Save to favourites'}
                      >
                        {isFavourited ? 'Saved' : 'Save'}
                      </button>
                      <button
                        onClick={handleShare}
                        className="footer-link"
                        style={{
                          fontSize: '0.72rem',
                          letterSpacing: '0.15em',
                          textTransform: 'uppercase',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          fontWeight: 400,
                        }}
                      >
                        {shareCopied ? 'Link copied' : 'Share'}
                      </button>
                    </div>
                  )}

                  {favouriteCount > 0 && (
                    <p
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--color-stone)',
                        marginTop: '1.2rem',
                        fontWeight: 300,
                      }}
                    >
                      {isFavourited
                        ? favouriteCount === 1
                          ? 'Saved by you.'
                          : `Saved by you and ${favouriteCount - 1} ${favouriteCount - 1 === 1 ? 'other' : 'others'}.`
                        : `Saved by ${favouriteCount} ${favouriteCount === 1 ? 'collector' : 'collectors'}.`}
                    </p>
                  )}
                </div>

                {/* Details — typographic rows, hairline dividers */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                  <h2
                    style={{
                      fontSize: '0.62rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: 'var(--color-stone)',
                      marginBottom: '1rem',
                      fontWeight: 400,
                    }}
                  >
                    Details
                  </h2>
                  <ul className="list-none p-0 m-0">
                    {detailRows.map((row) => (
                      <li
                        key={row.label}
                        className="flex justify-between"
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 300,
                          padding: '0.55rem 0',
                          borderBottom: '1px solid var(--color-border)',
                          color: 'var(--color-stone-dark)',
                        }}
                      >
                        <span>{row.label}</span>
                        <span style={{ color: 'var(--color-ink)' }}>{row.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Description */}
                {artwork.description && (
                  <div style={{ marginTop: '2.4rem' }}>
                    <h2
                      style={{
                        fontSize: '0.62rem',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: 'var(--color-stone)',
                        marginBottom: '1rem',
                        fontWeight: 400,
                      }}
                    >
                      About this work
                    </h2>
                    <p
                      style={{
                        fontSize: '0.95rem',
                        lineHeight: 1.7,
                        fontWeight: 300,
                        color: 'var(--color-stone-dark)',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {artwork.description}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {artwork.tags && artwork.tags.length > 0 && (
                  <div style={{ marginTop: '2rem' }}>
                    <p
                      style={{
                        fontSize: '0.62rem',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: 'var(--color-stone)',
                        marginBottom: '0.6rem',
                        fontWeight: 400,
                      }}
                    >
                      Tagged
                    </p>
                    <p style={{ fontSize: '0.82rem', fontWeight: 300 }}>
                      {artwork.tags.map((tag, i) => (
                        <span key={tag}>
                          <Link
                            href={`/browse?q=${encodeURIComponent(tag)}`}
                            className="footer-link"
                            style={{ fontStyle: 'italic' }}
                          >
                            {tag}
                          </Link>
                          {i < artwork.tags.length - 1 && (
                            <span style={{ color: 'var(--color-stone)' }}>, </span>
                          )}
                        </span>
                      ))}
                    </p>
                  </div>
                )}

                {/* Shipping & protection — typographic list, no cream cards */}
                <div style={{ marginTop: '2.4rem' }}>
                  <h2
                    style={{
                      fontSize: '0.62rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: 'var(--color-stone)',
                      marginBottom: '1rem',
                      fontWeight: 400,
                    }}
                  >
                    Shipping &amp; protection
                  </h2>
                  <ul className="list-none p-0 m-0" style={{ fontSize: '0.85rem', fontWeight: 300, color: 'var(--color-stone-dark)', lineHeight: 1.7 }}>
                    <li>Tracked shipping within seven days of purchase.</li>
                    <li>Forty-eight-hour inspection window before payout is released.</li>
                    <li>Full refund if damaged in transit.</li>
                    <li>Escrow protection — payment held until receipt is confirmed.</li>
                  </ul>
                </div>

                {/* ── Artist — inline in metadata column for sticky scroll depth ── */}
                <div style={{ marginTop: '3rem', borderTop: '1px solid var(--color-border)', paddingTop: '2.4rem' }}>
                  <p
                    style={{
                      fontSize: '0.62rem',
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: 'var(--color-stone)',
                      marginBottom: '1rem',
                    }}
                  >
                    The Artist
                  </p>
                  <h2
                    className="font-serif"
                    style={{
                      fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)',
                      lineHeight: 1.1,
                      letterSpacing: '-0.015em',
                      color: 'var(--color-ink)',
                      fontWeight: 400,
                    }}
                  >
                    {artist.full_name}
                  </h2>
                  {artist.location && (
                    <p
                      style={{
                        fontSize: '0.88rem',
                        color: 'var(--color-stone-dark)',
                        fontWeight: 300,
                        marginTop: '0.5rem',
                        fontStyle: 'italic',
                      }}
                    >
                      {artist.location}
                    </p>
                  )}
                  <p
                    style={{
                      fontSize: '0.72rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--color-stone)',
                      marginTop: '1rem',
                    }}
                  >
                    {artistArtworkCount} {artistArtworkCount === 1 ? 'work' : 'works'} listed
                  </p>
                  {artist.bio && (
                    <p
                      style={{
                        fontSize: '0.95rem',
                        lineHeight: 1.75,
                        fontWeight: 300,
                        color: 'var(--color-stone-dark)',
                        marginTop: '1.5rem',
                        maxWidth: '52ch',
                      }}
                    >
                      {artist.bio}
                    </p>
                  )}
                  <Link
                    href={`/artists/${artist.id}`}
                    className="editorial-link no-underline"
                    style={{ marginTop: '1.6rem', display: 'inline-block' }}
                  >
                    View storefront
                  </Link>
                </div>
            </div>
          </div>
        </div>

        {/* ── More by this artist ── */}
        {relatedArtworks.length > 0 && (
          <>
            <div style={{ borderTop: '1px solid var(--color-border)' }} />
            <section className="px-6 sm:px-10" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
              <div className="flex items-end justify-between" style={{ marginBottom: '2.4rem' }}>
                <div>
                  <p
                    style={{
                      fontSize: '0.62rem',
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: 'var(--color-stone)',
                      marginBottom: '0.6rem',
                    }}
                  >
                    Also by {artist.full_name}
                  </p>
                  <h2
                    className="font-serif"
                    style={{
                      fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)',
                      lineHeight: 1.1,
                      color: 'var(--color-ink)',
                      fontWeight: 400,
                    }}
                  >
                    From the studio
                  </h2>
                </div>
                <Link href={`/artists/${artist.id}`} className="link-underline" style={{ fontSize: '0.82rem', color: 'var(--color-ink)', textDecoration: 'none' }}>
                  View all
                </Link>
              </div>
              <div
                className="grid grid-cols-2 md:grid-cols-4"
                style={{ columnGap: '1.8rem', rowGap: '3rem' }}
              >
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
            </section>
          </>
        )}

        {/* ── You may also like ── */}
        {suggestedArtworks.length > 0 && (
          <>
            <div style={{ borderTop: '1px solid var(--color-border)' }} />
            <section className="px-6 sm:px-10" style={{ paddingTop: '4rem', paddingBottom: '6rem' }}>
              <div style={{ marginBottom: '2.4rem' }}>
                <p
                  style={{
                    fontSize: '0.62rem',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'var(--color-stone)',
                    marginBottom: '0.6rem',
                  }}
                >
                  Further reading
                </p>
                <h2
                  className="font-serif"
                  style={{
                    fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)',
                    lineHeight: 1.1,
                    color: 'var(--color-ink)',
                    fontWeight: 400,
                  }}
                >
                  Works in a similar hand
                </h2>
              </div>
              <div
                className="hidden md:grid grid-cols-4"
                style={{ columnGap: '1.8rem', rowGap: '3rem' }}
              >
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
              <div className="md:hidden flex gap-5 overflow-x-auto pb-4 scrollbar-hide" style={{ margin: '0 -1.5rem', padding: '0 1.5rem' }}>
                {suggestedArtworks.map((a) => (
                  <div key={a.id} className="flex-shrink-0" style={{ width: 220 }}>
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

              {/* Fix 6: Browse all [style] link */}
              {(artwork.style || artwork.category) && (
                <div style={{ marginTop: '2.4rem' }}>
                  <Link
                    href={
                      artwork.style
                        ? `/browse?style=${encodeURIComponent(artwork.style)}`
                        : `/browse?category=${encodeURIComponent(artwork.category)}`
                    }
                    className="editorial-link"
                  >
                    Browse all{' '}
                    <em style={{ fontStyle: 'italic' }}>
                      {artwork.style || artwork.category}
                    </em>{' '}
                    →
                  </Link>
                </div>
              )}
            </section>
          </>
        )}

        {/* Mobile spacer */}
        <div className="h-20 md:hidden" />
      </div>

      {/* ── Sticky Buy Bar (mobile) ── */}
      {!isOwnArtwork && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
          style={{
            transform: showStickyBar ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform var(--dur-base) var(--ease-out)',
          }}
        >
          <div
            className="flex items-center justify-between gap-4"
            style={{
              background: 'var(--color-warm-white)',
              borderTop: '1px solid var(--color-border)',
              padding: '14px 20px',
              paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            {isAvailable && (
              <>
                <div className="min-w-0 flex-1">
                  <p
                    className="font-serif"
                    style={{ fontSize: '1.05rem', color: 'var(--color-ink)', lineHeight: 1.2 }}
                  >
                    {formatPrice(artwork.price_aud)}
                  </p>
                  <p
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--color-stone)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginTop: 2,
                    }}
                    className="truncate"
                  >
                    {artwork.title}
                  </p>
                </div>
                <Link href={`/checkout/${artwork.id}`} className="artwork-primary-cta artwork-primary-cta--compact">
                  Acquire
                </Link>
              </>
            )}

            {isComingSoon && (
              <>
                <div className="min-w-0 flex-1">
                  <p
                    style={{
                      fontSize: '0.7rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--color-accent)',
                    }}
                  >
                    {isAvailableFromFuture
                      ? `Available ${availableFromDate!.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`
                      : 'Coming Soon'}
                  </p>
                </div>
                {notifySuccess ? (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--color-success)',
                    }}
                  >
                    Notified
                  </span>
                ) : (
                  <button
                    onClick={handleNotifyMe}
                    disabled={notifyLoading || (!user && !notifyEmail)}
                    className="editorial-link"
                    style={{ opacity: notifyLoading || (!user && !notifyEmail) ? 0.5 : 1 }}
                  >
                    {notifyLoading ? 'Saving…' : 'Notify me'}
                  </button>
                )}
              </>
            )}

            {isEnquireOnly && (
              <>
                <div className="min-w-0 flex-1">
                  <p
                    className="font-serif"
                    style={{ fontSize: '1.05rem', color: 'var(--color-ink)', lineHeight: 1.2 }}
                  >
                    {formatPrice(artwork.price_aud)}
                  </p>
                  <p
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--color-stone)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginTop: 2,
                    }}
                    className="truncate"
                  >
                    {artwork.title}
                  </p>
                </div>
                <button
                  onClick={handleEnquire}
                  disabled={messagingLoading}
                  className="artwork-primary-cta artwork-primary-cta--compact"
                >
                  Enquire
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Viewing mode — shared-element transition ── */}
      {viewerOpen && images.length > 0 && (
        <ArtworkViewer
          images={images}
          initialImageIndex={selectedImage}
          artworkTitle={artwork.title}
          artistName={artist.full_name || 'Artist'}
          sourceRect={viewerSourceRect}
          onClose={closeViewer}
        />
      )}
    </>
  );
}
