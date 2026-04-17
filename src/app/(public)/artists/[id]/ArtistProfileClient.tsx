'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/components/providers/AuthProvider';
import type { Profile, Artwork, Review, StudioPost } from '@/lib/types/database';
import ArtworkCard from '@/components/ui/ArtworkCard';

// ── Props ──

interface ArtistProfileClientProps {
  artist: Profile;
  artworks: Artwork[];
  reviews: (Review & {
    profiles: { full_name: string | null; avatar_url: string | null } | null;
  })[];
  salesCount: number;
  avgRating: number;
  initialFollowerCount?: number;
  featuredArtworks?: Artwork[];
  studioPosts?: StudioPost[];
}

type SortKey = 'newest' | 'price-asc' | 'price-desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
];

const BUDGET_OPTIONS = [
  'Under $200',
  '$200 \u2013 $500',
  '$500 \u2013 $1,000',
  '$1,000 \u2013 $5,000',
  '$5,000+',
];

// ── Editorial star rating — ink filled circles replacing pill-stars ──

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span
      aria-label={`${rating.toFixed(1)} out of 5`}
      style={{
        letterSpacing: '0.12em',
        fontSize: '0.82rem',
        color: 'var(--color-ink)',
        fontWeight: 300,
      }}
    >
      {'★'.repeat(rounded)}
      <span style={{ color: 'var(--color-border-strong)' }}>
        {'★'.repeat(5 - rounded)}
      </span>
    </span>
  );
}

export default function ArtistProfileClient({
  artist,
  artworks,
  reviews,
  salesCount,
  avgRating,
  initialFollowerCount = 0,
  featuredArtworks = [],
  studioPosts = [],
}: ArtistProfileClientProps) {
  const { user } = useAuth();
  const [sort, setSort] = useState<SortKey>('newest');

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [followLoading, setFollowLoading] = useState(false);
  const [followPulsing, setFollowPulsing] = useState(false);
  const isOwnProfile = user?.id === artist.id;

  // Carousel
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const hasFeatured = featuredArtworks.length > 0;

  useEffect(() => {
    if (!hasFeatured || carouselPaused || featuredArtworks.length <= 1) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % featuredArtworks.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [hasFeatured, carouselPaused, featuredArtworks.length]);

  const goToSlide = useCallback((index: number) => setCarouselIndex(index), []);
  const goPrev = useCallback(() => {
    setCarouselIndex((prev) => (prev - 1 + featuredArtworks.length) % featuredArtworks.length);
  }, [featuredArtworks.length]);
  const goNext = useCallback(() => {
    setCarouselIndex((prev) => (prev + 1) % featuredArtworks.length);
  }, [featuredArtworks.length]);

  // Follow status
  useEffect(() => {
    async function fetchFollowStatus() {
      try {
        const res = await fetch(`/api/follows?artistId=${artist.id}`);
        if (res.ok) {
          const data = await res.json();
          setIsFollowing(data.isFollowing);
          setFollowerCount(data.followerCount);
        }
      } catch {
        // noop
      }
    }
    fetchFollowStatus();
  }, [artist.id]);

  const handleFollowToggle = useCallback(async () => {
    if (!user) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    if (followLoading) return;
    setFollowLoading(true);

    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount((c) => (wasFollowing ? c - 1 : c + 1));
    if (!wasFollowing) {
      setFollowPulsing(true);
      setTimeout(() => setFollowPulsing(false), 220);
    }

    try {
      const res = wasFollowing
        ? await fetch(`/api/follows?followedId=${artist.id}`, { method: 'DELETE' })
        : await fetch('/api/follows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ followedId: artist.id }),
          });

      if (!res.ok) {
        setIsFollowing(wasFollowing);
        setFollowerCount((c) => (wasFollowing ? c + 1 : c - 1));
      }
    } catch {
      setIsFollowing(wasFollowing);
      setFollowerCount((c) => (wasFollowing ? c + 1 : c - 1));
    } finally {
      setFollowLoading(false);
    }
  }, [user, isFollowing, followLoading, artist.id]);

  // Commission modal
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionDescription, setCommissionDescription] = useState('');
  const [commissionSize, setCommissionSize] = useState('');
  const [commissionBudget, setCommissionBudget] = useState('');
  const [commissionTimeline, setCommissionTimeline] = useState('');
  const [commissionSending, setCommissionSending] = useState(false);
  const [commissionError, setCommissionError] = useState<string | null>(null);
  const [commissionSent, setCommissionSent] = useState(false);

  const handleCommissionSubmit = useCallback(async () => {
    if (!user) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    if (!commissionDescription.trim() || !commissionBudget) return;

    setCommissionSending(true);
    setCommissionError(null);

    try {
      const convRes = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_2: artist.id }),
      });
      if (!convRes.ok) {
        const err = await convRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to start conversation');
      }
      const { data: conversation } = await convRes.json();

      const messageContent = [
        'Commission Enquiry',
        '',
        `Description: ${commissionDescription.trim()}`,
        `Size: ${commissionSize.trim() || 'Not specified'}`,
        `Budget: ${commissionBudget}`,
        `Timeline: ${commissionTimeline.trim() || 'Flexible'}`,
      ].join('\n');

      const msgRes = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversation.id,
          content: messageContent,
        }),
      });
      if (!msgRes.ok) {
        const err = await msgRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send message');
      }

      setCommissionSent(true);
      setTimeout(() => {
        setShowCommissionModal(false);
        setCommissionSent(false);
        setCommissionDescription('');
        setCommissionSize('');
        setCommissionBudget('');
        setCommissionTimeline('');
      }, 2000);
    } catch (err) {
      setCommissionError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCommissionSending(false);
    }
  }, [user, artist.id, commissionDescription, commissionSize, commissionBudget, commissionTimeline]);

  // Studio lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const timeAgo = useCallback((dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }, []);

  const socialLinks = (artist.social_links ?? {}) as Record<string, string>;
  const instagram = socialLinks.instagram;
  const tiktok = socialLinks.tiktok;
  const facebook = socialLinks.facebook;
  const youtube = socialLinks.youtube;
  const website = socialLinks.website;

  const socialEntries: { label: string; href: string }[] = [];
  if (instagram) {
    socialEntries.push({
      label: 'Instagram',
      href: instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace('@', '')}`,
    });
  }
  if (tiktok) {
    socialEntries.push({
      label: 'TikTok',
      href: tiktok.startsWith('http') ? tiktok : `https://tiktok.com/@${tiktok.replace('@', '')}`,
    });
  }
  if (facebook) {
    socialEntries.push({
      label: 'Facebook',
      href: facebook.startsWith('http') ? facebook : `https://facebook.com/${facebook}`,
    });
  }
  if (youtube) {
    socialEntries.push({
      label: 'YouTube',
      href: youtube.startsWith('http') ? youtube : `https://youtube.com/@${youtube.replace('@', '')}`,
    });
  }
  if (website) {
    socialEntries.push({
      label: 'Website',
      href: website.startsWith('http') ? website : `https://${website}`,
    });
  }

  const memberSince = new Date(artist.created_at).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  });

  const sortedArtworks = useMemo(() => {
    const sorted = [...artworks];
    switch (sort) {
      case 'price-asc':
        sorted.sort((a, b) => a.price_aud - b.price_aud);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price_aud - a.price_aud);
        break;
      default:
        break;
    }
    return sorted;
  }, [artworks, sort]);

  const handleMessageArtist = useCallback(async () => {
    if (!user) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_2: artist.id }),
      });
      if (res.ok) {
        const { data } = await res.json();
        window.location.href = `/messages/${data.id}`;
      }
    } catch {
      // noop
    }
  }, [user, artist.id]);

  return (
    <div style={{ background: 'var(--color-warm-white)' }}>
      {/* ── Featured carousel: full-bleed editorial hero ── */}
      {hasFeatured && (
        <div
          className="relative w-full overflow-hidden"
          style={{ background: 'var(--color-cream)' }}
          onMouseEnter={() => setCarouselPaused(true)}
          onMouseLeave={() => setCarouselPaused(false)}
        >
          <div
            className="flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
          >
            {featuredArtworks.map((artwork) => (
              <Link
                key={artwork.id}
                href={`/artwork/${artwork.id}`}
                className="relative w-full flex-shrink-0 block"
                style={{ minWidth: '100%' }}
              >
                <div
                  className="relative w-full"
                  style={{ height: 'clamp(380px, 62vh, 640px)' }}
                >
                  <Image
                    src={(artwork.images as string[])?.[0] || '/placeholder.jpg'}
                    alt={artwork.title}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    priority={carouselIndex === 0}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(26,26,24,0.55) 0%, rgba(26,26,24,0.05) 40%, transparent 75%)',
                    }}
                  />
                  <div
                    className="absolute bottom-0 left-0 right-0 px-6 sm:px-10"
                    style={{ paddingBottom: 'clamp(2rem, 5vw, 4rem)' }}
                  >
                    <p
                      style={{
                        fontSize: '0.62rem',
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.7)',
                        marginBottom: '0.6rem',
                      }}
                    >
                      Featured work
                    </p>
                    <h3
                      className="font-serif"
                      style={{
                        color: '#fff',
                        fontSize: 'clamp(1.8rem, 3.5vw, 3rem)',
                        lineHeight: 1.08,
                        letterSpacing: '-0.015em',
                        fontWeight: 400,
                        fontStyle: 'italic',
                      }}
                    >
                      {artwork.title}
                    </h3>
                    <p
                      style={{
                        color: 'rgba(255,255,255,0.85)',
                        fontSize: '0.9rem',
                        fontWeight: 300,
                        marginTop: '0.4rem',
                      }}
                    >
                      {formatPrice(artwork.price_aud)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {featuredArtworks.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  goPrev();
                }}
                className="absolute left-6 top-1/2 -translate-y-1/2 z-10"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '0.68rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  padding: 8,
                }}
                aria-label="Previous featured"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  goNext();
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 z-10"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '0.68rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  padding: 8,
                }}
                aria-label="Next featured"
              >
                Next →
              </button>
              <div
                className="absolute z-10"
                style={{
                  bottom: 24,
                  right: 40,
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.68rem',
                  letterSpacing: '0.18em',
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {String(carouselIndex + 1).padStart(2, '0')} / {String(featuredArtworks.length).padStart(2, '0')}
              </div>
              <div
                className="absolute left-6 sm:left-10 z-10 flex gap-2"
                style={{ bottom: 30 }}
              >
                {featuredArtworks.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToSlide(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    style={{
                      width: i === carouselIndex ? 24 : 10,
                      height: 1,
                      background: i === carouselIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'width var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out)',
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Artist header: editorial split ── */}
      <header
        className="px-6 sm:px-10"
        style={{ paddingTop: 'clamp(3.5rem, 7vw, 6rem)', paddingBottom: 'clamp(2.5rem, 5vw, 4rem)' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 'clamp(2rem, 5vw, 5rem)' }}>
          {/* Left: portrait + name block */}
          <div className="lg:col-span-5">
            <div
              style={{
                width: 'clamp(120px, 14vw, 160px)',
                marginBottom: '1.8rem',
              }}
            >
              <Avatar
                avatarUrl={artist.avatar_url}
                name={artist.full_name ?? ''}
                size={160}
                className="!w-full !h-auto aspect-square"
              />
            </div>
            <p
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                marginBottom: '1rem',
              }}
            >
              Artist · Member since {memberSince}
            </p>
            <h1
              className="font-serif"
              style={{
                fontSize: 'clamp(2.6rem, 6vw, 4.4rem)',
                lineHeight: 1.02,
                letterSpacing: '-0.02em',
                color: 'var(--color-ink)',
                fontWeight: 400,
              }}
            >
              {artist.full_name ?? 'Artist'}
            </h1>
            {artist.location && (
              <p
                className="font-serif"
                style={{
                  fontSize: '1.05rem',
                  color: 'var(--color-stone-dark)',
                  fontStyle: 'italic',
                  marginTop: '0.6rem',
                }}
              >
                {artist.location}
              </p>
            )}
          </div>

          {/* Right: bio + stats + actions */}
          <div className="lg:col-span-7">
            {artist.bio && (
              <p
                style={{
                  fontSize: '1rem',
                  lineHeight: 1.75,
                  fontWeight: 300,
                  color: 'var(--color-stone-dark)',
                  maxWidth: '60ch',
                  whiteSpace: 'pre-line',
                }}
              >
                {artist.bio}
              </p>
            )}

            {/* Stats row — typographic, no dividers */}
            <div
              className="flex flex-wrap"
              style={{ gap: 'clamp(2rem, 5vw, 3.5rem)', marginTop: '2.4rem' }}
            >
              <Stat label="Works" value={String(artworks.length)} />
              <Stat
                label={followerCount === 1 ? 'Follower' : 'Followers'}
                value={String(followerCount)}
              />
              <Stat label={salesCount === 1 ? 'Sale' : 'Sales'} value={String(salesCount)} />
              {reviews.length > 0 && (
                <Stat
                  label={`${reviews.length} review${reviews.length !== 1 ? 's' : ''}`}
                  value={avgRating.toFixed(1)}
                  valueSuffix="★"
                />
              )}
            </div>

            {/* Actions — typographic editorial links */}
            <div
              className="flex flex-wrap items-center"
              style={{ gap: 'clamp(1.5rem, 3vw, 2.4rem)', marginTop: '2.4rem' }}
            >
              {!isOwnProfile && (
                <button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className="editorial-link"
                  style={{
                    color: isFollowing ? 'var(--color-terracotta)' : 'var(--color-ink)',
                    borderColor: isFollowing ? 'var(--color-terracotta)' : 'var(--color-stone)',
                    opacity: followLoading ? 0.5 : 1,
                    transition: 'color var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)',
                  }}
                >
                  <span className={followPulsing ? 'save-pulse' : ''}>
                    {isFollowing ? 'Following' : 'Follow artist'}
                  </span>
                </button>
              )}
              <button
                onClick={handleMessageArtist}
                className="editorial-link"
              >
                Message
              </button>
              {!isOwnProfile && artist.accepts_commissions && (
                <button
                  onClick={() => {
                    if (!user) {
                      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
                      return;
                    }
                    setShowCommissionModal(true);
                  }}
                  className="editorial-link"
                >
                  Commission a piece
                </button>
              )}
            </div>

            {/* Social links — inline italic */}
            {socialEntries.length > 0 && (
              <p
                style={{
                  marginTop: '2rem',
                  fontSize: '0.82rem',
                  fontWeight: 300,
                  color: 'var(--color-stone-dark)',
                }}
              >
                <span
                  style={{
                    fontSize: '0.62rem',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'var(--color-stone)',
                    marginRight: 12,
                  }}
                >
                  Also on
                </span>
                {socialEntries.map((s, i) => (
                  <span key={s.label}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-link"
                      style={{ fontStyle: 'italic' }}
                    >
                      {s.label}
                    </a>
                    {i < socialEntries.length - 1 && (
                      <span style={{ color: 'var(--color-stone)' }}>, </span>
                    )}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* ── Artworks grid ── */}
      <div style={{ borderTop: '1px solid var(--color-border)' }} />
      <section className="px-6 sm:px-10" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
        <div className="flex items-end justify-between" style={{ marginBottom: '2.6rem' }}>
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
              The collection
            </p>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
                lineHeight: 1.08,
                color: 'var(--color-ink)',
                fontWeight: 400,
              }}
            >
              {artworks.length} {artworks.length === 1 ? 'work' : 'works'} available
            </h2>
          </div>

          {artworks.length > 1 && (
            <div className="flex gap-4">
              {SORT_OPTIONS.map((opt) => {
                const active = sort === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSort(opt.value)}
                    style={{
                      fontSize: '0.72rem',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      fontWeight: active ? 400 : 300,
                      color: active ? 'var(--color-ink)' : 'var(--color-stone-dark)',
                      background: 'none',
                      border: 'none',
                      borderBottom: active
                        ? '1px solid var(--color-ink)'
                        : '1px solid transparent',
                      paddingBottom: 2,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {artworks.length === 0 ? (
          <div style={{ padding: '5rem 0', maxWidth: '46ch' }}>
            <p
              className="font-serif"
              style={{
                fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                lineHeight: 1.15,
                color: 'var(--color-ink)',
              }}
            >
              No works yet in this studio.
            </p>
            <p
              style={{
                marginTop: '1rem',
                fontSize: '0.88rem',
                color: 'var(--color-stone-dark)',
                fontWeight: 300,
              }}
            >
              Follow the artist to be notified when new work is listed.
            </p>
          </div>
        ) : (
          <div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            style={{ columnGap: '1.8rem', rowGap: '3.5rem' }}
          >
            {sortedArtworks.map((artwork) => (
              <ArtworkCard
                key={artwork.id}
                id={artwork.id}
                title={artwork.title}
                artistName={artist.full_name ?? 'Unknown'}
                artistId={artist.id}
                price={artwork.price_aud}
                imageUrl={(artwork.images as string[])?.[0] || ''}
                medium={artwork.medium ?? ''}
                category={artwork.category as 'original' | 'print' | 'digital'}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── In the studio ── */}
      {studioPosts.length > 0 && (
        <>
          <div style={{ borderTop: '1px solid var(--color-border)' }} />
          <section className="px-6 sm:px-10" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
            <p
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                marginBottom: '0.6rem',
              }}
            >
              In the studio
            </p>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
                lineHeight: 1.08,
                color: 'var(--color-ink)',
                fontWeight: 400,
                marginBottom: '2.4rem',
              }}
            >
              Process &amp; practice
            </h2>

            <div
              className="grid grid-cols-2 md:grid-cols-3"
              style={{ columnGap: '1.8rem', rowGap: '3rem' }}
            >
              {studioPosts.map((post) => (
                <div
                  key={post.id}
                  className="cursor-pointer group"
                  onClick={() => setLightboxImage(post.image_url)}
                >
                  <div
                    className="relative img-zoom"
                    style={{ aspectRatio: '1 / 1', background: 'var(--color-cream)' }}
                  >
                    <Image
                      src={post.image_url}
                      alt={post.caption || 'Studio post'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                  </div>
                  {post.caption && (
                    <p
                      className="font-serif"
                      style={{
                        fontSize: '0.92rem',
                        fontStyle: 'italic',
                        color: 'var(--color-stone-dark)',
                        marginTop: '0.9rem',
                        lineHeight: 1.55,
                        fontWeight: 300,
                      }}
                    >
                      {post.caption}
                    </p>
                  )}
                  <p
                    style={{
                      fontSize: '0.62rem',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'var(--color-stone)',
                      marginTop: '0.5rem',
                    }}
                  >
                    {timeAgo(post.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ── Studio lightbox ── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(26,26,24,0.94)' }}
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            aria-label="Close"
            className="font-serif absolute top-6 right-6"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              padding: 8,
              fontSize: '0.72rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              fontStyle: 'italic',
            }}
          >
            Close
          </button>
          <div className="relative max-w-3xl max-h-[85vh] w-full">
            <Image
              src={lightboxImage}
              alt="Studio post"
              width={1200}
              height={1200}
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}

      {/* ── Commission enquiry modal ── */}
      {showCommissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(26,26,24,0.45)' }}
            onClick={() => {
              if (!commissionSending) {
                setShowCommissionModal(false);
                setCommissionError(null);
              }
            }}
          />
          <dialog
            open
            className="relative z-10"
            style={{
              background: 'var(--color-warm-white)',
              border: '1px solid var(--color-border-strong)',
              maxWidth: 480,
              width: '100%',
              padding: '2.4rem',
            }}
          >
            <div className="flex items-start justify-between" style={{ marginBottom: '1.4rem' }}>
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
                  Commission enquiry
                </p>
                <h2
                  className="font-serif"
                  style={{
                    fontSize: '1.6rem',
                    lineHeight: 1.15,
                    color: 'var(--color-ink)',
                    fontWeight: 400,
                  }}
                >
                  Commission a piece from {artist.full_name ?? 'this artist'}.
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!commissionSending) {
                    setShowCommissionModal(false);
                    setCommissionError(null);
                  }
                }}
                aria-label="Close"
                className="font-serif"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-stone)',
                  cursor: 'pointer',
                  padding: '0.2rem 0',
                  fontSize: '0.72rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  fontStyle: 'italic',
                }}
              >
                Close
              </button>
            </div>

            {commissionSent ? (
              <div style={{ padding: '2rem 0', textAlign: 'center' }}>
                <p
                  style={{
                    fontSize: '0.62rem',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'var(--color-stone)',
                    marginBottom: '0.8rem',
                  }}
                >
                  — Received —
                </p>
                <p
                  className="font-serif"
                  style={{
                    fontSize: '1.6rem',
                    color: 'var(--color-ink)',
                    fontStyle: 'italic',
                    fontWeight: 400,
                    lineHeight: 1.2,
                  }}
                >
                  Enquiry sent.
                </p>
                <p
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--color-stone-dark)',
                    marginTop: '0.5rem',
                    fontWeight: 300,
                  }}
                >
                  Check your messages for the artist&apos;s reply.
                </p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1.4rem' }}>
                  <label
                    htmlFor="commission-description"
                    className="commission-label"
                  >
                    What would you like commissioned? *
                  </label>
                  <textarea
                    id="commission-description"
                    value={commissionDescription}
                    onChange={(e) => setCommissionDescription(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="Describe the artwork you have in mind…"
                    className="commission-field"
                  />
                </div>
                <div style={{ marginBottom: '1.4rem' }}>
                  <label htmlFor="commission-size" className="commission-label">
                    Approximate size
                  </label>
                  <input
                    id="commission-size"
                    type="text"
                    value={commissionSize}
                    onChange={(e) => setCommissionSize(e.target.value)}
                    placeholder="e.g. 60 × 80 cm"
                    className="commission-field"
                  />
                </div>
                <div style={{ marginBottom: '1.4rem' }}>
                  <label htmlFor="commission-budget" className="commission-label">
                    Budget *
                  </label>
                  <select
                    id="commission-budget"
                    value={commissionBudget}
                    onChange={(e) => setCommissionBudget(e.target.value)}
                    className="commission-field"
                  >
                    <option value="">Select a budget range</option>
                    {BUDGET_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '1.6rem' }}>
                  <label htmlFor="commission-timeline" className="commission-label">
                    Timeline
                  </label>
                  <input
                    id="commission-timeline"
                    type="text"
                    value={commissionTimeline}
                    onChange={(e) => setCommissionTimeline(e.target.value)}
                    placeholder="e.g. Within three months"
                    className="commission-field"
                  />
                </div>

                {commissionError && (
                  <p
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--color-error)',
                      marginBottom: '1rem',
                      fontWeight: 300,
                    }}
                  >
                    {commissionError}
                  </p>
                )}

                <div className="flex items-center" style={{ gap: 24 }}>
                  <button
                    type="button"
                    onClick={handleCommissionSubmit}
                    disabled={commissionSending || !commissionDescription.trim() || !commissionBudget}
                    className="artwork-primary-cta"
                    style={{
                      width: 'auto',
                      opacity:
                        commissionSending || !commissionDescription.trim() || !commissionBudget
                          ? 0.5
                          : 1,
                    }}
                  >
                    {commissionSending ? 'Sending…' : 'Send enquiry'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCommissionModal(false);
                      setCommissionError(null);
                    }}
                    disabled={commissionSending}
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
                    Cancel
                  </button>
                </div>
              </>
            )}
          </dialog>
        </div>
      )}

      {/* ── Reviews ── */}
      <div style={{ borderTop: '1px solid var(--color-border)' }} />
      <section className="px-6 sm:px-10" style={{ paddingTop: '4rem', paddingBottom: '6rem' }}>
        <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 'clamp(2rem, 5vw, 5rem)' }}>
          <div className="lg:col-span-4">
            <p
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                marginBottom: '0.6rem',
              }}
            >
              Collector reviews
            </p>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
                lineHeight: 1.08,
                color: 'var(--color-ink)',
                fontWeight: 400,
              }}
            >
              {reviews.length > 0 ? (
                <>
                  {avgRating.toFixed(1)}{' '}
                  <span style={{ fontStyle: 'italic', color: 'var(--color-stone-dark)' }}>
                    / 5
                  </span>
                </>
              ) : (
                'Not yet reviewed.'
              )}
            </h2>
            {reviews.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <Stars rating={avgRating} />
                <p
                  style={{
                    fontSize: '0.72rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--color-stone)',
                    marginTop: '0.5rem',
                  }}
                >
                  {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-8">
            {reviews.length === 0 ? (
              <p
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 300,
                  color: 'var(--color-stone-dark)',
                  maxWidth: '50ch',
                  lineHeight: 1.7,
                }}
              >
                The first collectors of this artist will be the first to share their experience.
              </p>
            ) : (
              <ul className="list-none p-0 m-0">
                {reviews.map((review) => {
                  const reviewer = review.profiles as
                    | { full_name: string | null; avatar_url: string | null }
                    | null;
                  const reviewerName = reviewer?.full_name ?? 'Anonymous';
                  const reviewDate = new Date(review.created_at).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  });

                  return (
                    <li
                      key={review.id}
                      style={{
                        padding: '1.8rem 0',
                        borderBottom: '1px solid var(--color-border)',
                      }}
                    >
                      <div className="flex items-start justify-between" style={{ marginBottom: '0.6rem' }}>
                        <div>
                          <p
                            style={{
                              fontSize: '0.95rem',
                              color: 'var(--color-ink)',
                              fontWeight: 400,
                            }}
                          >
                            {reviewerName}
                          </p>
                          <div style={{ marginTop: '0.3rem' }}>
                            <Stars rating={review.rating} />
                          </div>
                        </div>
                        <p
                          style={{
                            fontSize: '0.68rem',
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            color: 'var(--color-stone)',
                          }}
                        >
                          {reviewDate}
                        </p>
                      </div>
                      {review.comment && (
                        <p
                          className="font-serif"
                          style={{
                            fontSize: '1rem',
                            fontStyle: 'italic',
                            lineHeight: 1.65,
                            color: 'var(--color-stone-dark)',
                            marginTop: '0.8rem',
                            maxWidth: '60ch',
                          }}
                        >
                          &ldquo;{review.comment}&rdquo;
                        </p>
                      )}
                      {review.artist_response && (
                        <div
                          style={{
                            marginTop: '1.1rem',
                            paddingLeft: '1.2rem',
                            borderLeft: '1px solid var(--color-terracotta)',
                          }}
                        >
                          <p
                            style={{
                              fontSize: '0.62rem',
                              letterSpacing: '0.22em',
                              textTransform: 'uppercase',
                              color: 'var(--color-terracotta)',
                              marginBottom: '0.5rem',
                            }}
                          >
                            {artist.full_name} responded
                          </p>
                          <p
                            style={{
                              fontSize: '0.92rem',
                              fontWeight: 300,
                              lineHeight: 1.65,
                              color: 'var(--color-stone-dark)',
                            }}
                          >
                            {review.artist_response}
                          </p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ── Discover more artists ── */}
      <div style={{ borderTop: '1px solid var(--color-border)' }} />
      <div
        className="px-6 sm:px-10"
        style={{ paddingTop: '2.5rem', paddingBottom: '3.5rem' }}
      >
        <Link
          href="/artists"
          className="editorial-link"
        >
          Discover more artists →
        </Link>
      </div>
    </div>
  );
}

// ── Typographic stat ──

function Stat({
  label,
  value,
  valueSuffix,
}: {
  label: string;
  value: string;
  valueSuffix?: string;
}) {
  return (
    <div>
      <p
        className="font-serif"
        style={{
          fontSize: 'clamp(1.8rem, 2.6vw, 2.2rem)',
          lineHeight: 1,
          color: 'var(--color-ink)',
          fontWeight: 400,
          letterSpacing: '-0.01em',
        }}
      >
        {value}
        {valueSuffix && (
          <span
            style={{
              fontSize: '0.7em',
              color: 'var(--color-stone)',
              marginLeft: 4,
              fontStyle: 'italic',
            }}
          >
            {valueSuffix}
          </span>
        )}
      </p>
      <p
        style={{
          fontSize: '0.62rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--color-stone)',
          marginTop: '0.5rem',
        }}
      >
        {label}
      </p>
    </div>
  );
}
