'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin,
  Star,
  Calendar,
  Globe,
  Heart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  UserPlus,
  UserCheck,
  UserMinus,
  Palette,
  Loader2,
  X,
  Check,
  Camera,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/components/providers/AuthProvider';
import type { Profile, Artwork, Review, StudioPost } from '@/lib/types/database';
import ArtworkCard from '@/components/ui/ArtworkCard';

// ── Instagram icon (not in this lucide version) ──

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

// ── Star rating display ──

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={s <= Math.round(rating) ? 'text-accent fill-accent' : 'text-border'}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

// ── Sort options ──

type SortKey = 'newest' | 'price-asc' | 'price-desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
];

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

// ── Component ──

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
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [followLoading, setFollowLoading] = useState(false);
  const [followHovered, setFollowHovered] = useState(false);
  const isOwnProfile = user?.id === artist.id;

  // Carousel state
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const hasFeatured = featuredArtworks.length > 0;

  // Auto-advance carousel
  useEffect(() => {
    if (!hasFeatured || carouselPaused || featuredArtworks.length <= 1) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % featuredArtworks.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [hasFeatured, carouselPaused, featuredArtworks.length]);

  const goToSlide = useCallback((index: number) => {
    setCarouselIndex(index);
  }, []);

  const goPrev = useCallback(() => {
    setCarouselIndex((prev) => (prev - 1 + featuredArtworks.length) % featuredArtworks.length);
  }, [featuredArtworks.length]);

  const goNext = useCallback(() => {
    setCarouselIndex((prev) => (prev + 1) % featuredArtworks.length);
  }, [featuredArtworks.length]);

  // Fetch follow status on mount
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
        // Ignore — keep server-side defaults
      }
    }
    fetchFollowStatus();
  }, [artist.id]);

  // Toggle follow / unfollow
  const handleFollowToggle = useCallback(async () => {
    if (!user) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    if (followLoading) return;
    setFollowLoading(true);

    // Optimistic update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount((c) => (wasFollowing ? c - 1 : c + 1));

    try {
      const res = wasFollowing
        ? await fetch(`/api/follows?followedId=${artist.id}`, { method: 'DELETE' })
        : await fetch('/api/follows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ followedId: artist.id }),
          });

      if (!res.ok) {
        // Revert on error
        setIsFollowing(wasFollowing);
        setFollowerCount((c) => (wasFollowing ? c + 1 : c - 1));
      }
    } catch {
      // Revert on error
      setIsFollowing(wasFollowing);
      setFollowerCount((c) => (wasFollowing ? c + 1 : c - 1));
    } finally {
      setFollowLoading(false);
    }
  }, [user, isFollowing, followLoading, artist.id]);

  // Commission enquiry state
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionDescription, setCommissionDescription] = useState('');
  const [commissionSize, setCommissionSize] = useState('');
  const [commissionBudget, setCommissionBudget] = useState('');
  const [commissionTimeline, setCommissionTimeline] = useState('');
  const [commissionSending, setCommissionSending] = useState(false);
  const [commissionError, setCommissionError] = useState<string | null>(null);
  const [commissionSent, setCommissionSent] = useState(false);

  const BUDGET_OPTIONS = [
    'Under $200',
    '$200 \u2013 $500',
    '$500 \u2013 $1,000',
    '$1,000 \u2013 $5,000',
    '$5,000+',
  ];

  const handleCommissionSubmit = useCallback(async () => {
    if (!user) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    if (!commissionDescription.trim() || !commissionBudget) return;

    setCommissionSending(true);
    setCommissionError(null);

    try {
      // 1. Create or find conversation with the artist
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

      // 2. Build the structured commission message
      const messageContent = [
        '\u2728 Commission Enquiry',
        '',
        `Description: ${commissionDescription.trim()}`,
        `Size: ${commissionSize.trim() || 'Not specified'}`,
        `Budget: ${commissionBudget}`,
        `Timeline: ${commissionTimeline.trim() || 'Flexible'}`,
      ].join('\n');

      // 3. Send the message
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
      // Reset form after brief delay then close
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

  // Lightbox state for studio posts
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Relative time helper
  const timeAgo = useCallback((dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
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

  const memberSince = new Date(artist.created_at).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  });

  // Sort artworks
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
        // already newest-first from query
        break;
    }
    return sorted;
  }, [artworks, sort]);

  return (
    <div className="min-h-screen">
      {/* ═══════════════════════════════════════════
          FEATURED ARTWORKS CAROUSEL
      ═══════════════════════════════════════════ */}
      {hasFeatured && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
          <div
            className="relative w-full overflow-hidden rounded-xl md:rounded-2xl bg-warm-gray/10"
            style={{ maxHeight: 600 }}
            onMouseEnter={() => setCarouselPaused(true)}
            onMouseLeave={() => setCarouselPaused(false)}
          >
            {/* Slides */}
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
            >
              {featuredArtworks.map((artwork) => (
                <Link
                  key={artwork.id}
                  href={`/artwork/${artwork.id}`}
                  className="relative w-full flex-shrink-0 block"
                  style={{ minWidth: '100%' }}
                >
                  <div className="relative w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px]">
                    <Image
                      src={(artwork.images as string[])?.[0] || '/placeholder.jpg'}
                      alt={artwork.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1152px) 100vw, 1152px"
                      priority={carouselIndex === 0}
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/50 to-transparent" />
                    {/* Title & price */}
                    <div className="absolute bottom-0 inset-x-0 p-5 md:p-8">
                      <h3 className="text-white font-editorial text-lg md:text-2xl font-medium drop-shadow-sm">
                        {artwork.title}
                      </h3>
                      <p className="text-white/90 text-sm md:text-base mt-1 drop-shadow-sm">
                        {formatPrice(artwork.price_aud)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Prev / Next arrows */}
            {featuredArtworks.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); goPrev(); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-md transition-colors z-10"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-5 w-5 text-primary" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); goNext(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-md transition-colors z-10"
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-5 w-5 text-primary" />
                </button>
              </>
            )}

            {/* Dot indicators */}
            {featuredArtworks.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                {featuredArtworks.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToSlide(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === carouselIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          ARTIST HEADER
      ═══════════════════════════════════════════ */}
      <div className="bg-cream border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <Avatar
                avatarUrl={artist.avatar_url}
                name={artist.full_name ?? ''}
                size={140}
                className="border-4 border-white shadow-lg w-28 h-28 md:!w-36 md:!h-36"
              />
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div>
                <h1 className="font-editorial text-3xl md:text-4xl font-semibold">
                  {artist.full_name ?? 'Artist'}
                </h1>

                {/* Location & date */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-sm text-muted">
                  {artist.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {artist.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Member since {memberSince}
                  </span>
                </div>
              </div>

              {/* Bio */}
              {artist.bio && (
                <p className="text-muted leading-relaxed max-w-2xl whitespace-pre-line">
                  {artist.bio}
                </p>
              )}

              {/* Social links */}
              {(instagram || tiktok || facebook || youtube || website) && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  {instagram && (
                    <a
                      href={
                        instagram.startsWith('http')
                          ? instagram
                          : `https://instagram.com/${instagram.replace('@', '')}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-muted hover:text-accent-dark transition-colors"
                    >
                      <InstagramIcon className="h-4 w-4" />
                      <span className="link-underline">Instagram</span>
                    </a>
                  )}
                  {tiktok && (
                    <a
                      href={
                        tiktok.startsWith('http')
                          ? tiktok
                          : `https://tiktok.com/@${tiktok.replace('@', '')}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-muted hover:text-accent-dark transition-colors"
                    >
                      <TikTokIcon className="h-4 w-4" />
                      <span className="link-underline">TikTok</span>
                    </a>
                  )}
                  {facebook && (
                    <a
                      href={facebook.startsWith('http') ? facebook : `https://facebook.com/${facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-muted hover:text-accent-dark transition-colors"
                    >
                      <FacebookIcon className="h-4 w-4" />
                      <span className="link-underline">Facebook</span>
                    </a>
                  )}
                  {youtube && (
                    <a
                      href={youtube.startsWith('http') ? youtube : `https://youtube.com/@${youtube.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-muted hover:text-accent-dark transition-colors"
                    >
                      <YouTubeIcon className="h-4 w-4" />
                      <span className="link-underline">YouTube</span>
                    </a>
                  )}
                  {website && (
                    <a
                      href={website.startsWith('http') ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-muted hover:text-accent-dark transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                      <span className="link-underline">Website</span>
                    </a>
                  )}
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center justify-center md:justify-start gap-6 pt-2">
                <div className="text-center md:text-left">
                  <p className="text-xl font-bold">{artworks.length}</p>
                  <p className="text-xs text-muted uppercase tracking-wide">Artworks</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center md:text-left">
                  <p className="text-xl font-bold">{followerCount}</p>
                  <p className="text-xs text-muted uppercase tracking-wide">
                    {followerCount === 1 ? 'Follower' : 'Followers'}
                  </p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center md:text-left">
                  <p className="text-xl font-bold">{salesCount}</p>
                  <p className="text-xs text-muted uppercase tracking-wide">Sales</p>
                </div>
                {reviews.length > 0 && (
                  <>
                    <div className="w-px h-8 bg-border" />
                    <div className="text-center md:text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xl font-bold">{avgRating.toFixed(1)}</p>
                        <Star className="h-4 w-4 text-accent-dark fill-accent" />
                      </div>
                      <p className="text-xs text-muted uppercase tracking-wide">
                        {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
                {!isOwnProfile && (
                  <button
                    onClick={handleFollowToggle}
                    onMouseEnter={() => setFollowHovered(true)}
                    onMouseLeave={() => setFollowHovered(false)}
                    disabled={followLoading}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-full transition-all duration-300 ${
                      isFollowing
                        ? followHovered
                          ? 'bg-red-50 text-red-600 border-2 border-red-300'
                          : 'bg-accent text-white border-2 border-accent'
                        : 'bg-primary text-white border-2 border-primary hover:bg-accent hover:border-accent'
                    } ${followLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {isFollowing ? (
                      followHovered ? (
                        <>
                          <UserMinus className="h-4 w-4" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4" />
                          Following
                        </>
                      )
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Follow
                      </>
                    )}
                  </button>
                )}
                <button className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-border text-sm font-semibold rounded-full hover:border-warm-gray transition-colors">
                  <MessageCircle className="h-4 w-4" />
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
                    className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-accent text-accent text-sm font-semibold rounded-full hover:bg-accent hover:text-white transition-colors"
                  >
                    <Palette className="h-4 w-4" />
                    Commission a Piece
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          ARTWORK GRID
      ═══════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Section header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-editorial text-xl md:text-2xl font-medium">
            Artworks
            <span className="text-muted ml-2 text-lg font-normal">({artworks.length})</span>
          </h2>

          {artworks.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-full text-sm hover:border-warm-gray transition-colors"
              >
                {SORT_OPTIONS.find((o) => o.value === sort)?.label}
                <ChevronDown className="h-3.5 w-3.5 text-muted" />
              </button>

              {showSortMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white border border-border rounded-xl shadow-lg py-1 animate-scale-in origin-top-right">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => { setSort(option.value); setShowSortMenu(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          sort === option.value
                            ? 'text-accent font-medium bg-accent-subtle/50'
                            : 'hover:bg-muted-bg'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {artworks.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
            <p className="text-muted">This artist hasn&apos;t listed any artwork yet.</p>
            <p className="text-sm text-warm-gray mt-1">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
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
      </div>

      {/* ═══════════════════════════════════════════
          IN THE STUDIO
      ═══════════════════════════════════════════ */}
      {studioPosts.length > 0 && (
        <div className="border-t border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="flex items-center gap-3 mb-8">
              <Camera className="h-5 w-5 text-accent-dark" />
              <h2 className="font-editorial text-xl md:text-2xl font-medium">In The Studio</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {studioPosts.map((post) => (
                <div
                  key={post.id}
                  className="group cursor-pointer"
                  onClick={() => setLightboxImage(post.image_url)}
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <Image
                      src={post.image_url}
                      alt={post.caption || 'Studio post'}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                  </div>
                  {post.caption && (
                    <p className="text-sm text-muted mt-2 line-clamp-3">{post.caption}</p>
                  )}
                  <p className="text-xs text-warm-gray mt-1">{timeAgo(post.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          STUDIO LIGHTBOX
      ═══════════════════════════════════════════ */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] w-full">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <Image
              src={lightboxImage}
              alt="Studio post"
              width={1200}
              height={1200}
              className="w-full h-auto max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          COMMISSION ENQUIRY MODAL
      ═══════════════════════════════════════════ */}
      {showCommissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { if (!commissionSending) { setShowCommissionModal(false); setCommissionError(null); } }}
          />
          <dialog
            open
            className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                <Palette className="h-5 w-5 text-accent" />
                Commission a Piece
              </h2>
              <button
                type="button"
                onClick={() => { if (!commissionSending) { setShowCommissionModal(false); setCommissionError(null); } }}
                className="text-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted">
              Send a commission enquiry to {artist.full_name ?? 'this artist'}. They&apos;ll receive it as a message.
            </p>

            {commissionSent ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <p className="font-medium text-green-700">Enquiry sent!</p>
                <p className="text-sm text-muted">Check your messages for the artist&apos;s reply.</p>
              </div>
            ) : (
              <>
                {/* Description */}
                <div>
                  <label
                    htmlFor="commission-description"
                    className="block text-xs font-medium tracking-wide uppercase text-muted mb-2"
                  >
                    What would you like commissioned? <span className="text-error">*</span>
                  </label>
                  <textarea
                    id="commission-description"
                    value={commissionDescription}
                    onChange={(e) => setCommissionDescription(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20 resize-none"
                    placeholder="Describe the artwork you have in mind..."
                  />
                </div>

                {/* Size */}
                <div>
                  <label
                    htmlFor="commission-size"
                    className="block text-xs font-medium tracking-wide uppercase text-muted mb-2"
                  >
                    Approximate Size
                  </label>
                  <input
                    id="commission-size"
                    type="text"
                    value={commissionSize}
                    onChange={(e) => setCommissionSize(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                    placeholder="e.g. 60 x 80 cm"
                  />
                </div>

                {/* Budget */}
                <div>
                  <label
                    htmlFor="commission-budget"
                    className="block text-xs font-medium tracking-wide uppercase text-muted mb-2"
                  >
                    Budget Range <span className="text-error">*</span>
                  </label>
                  <select
                    id="commission-budget"
                    value={commissionBudget}
                    onChange={(e) => setCommissionBudget(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm transition-colors appearance-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                  >
                    <option value="">Select a budget range</option>
                    {BUDGET_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Timeline */}
                <div>
                  <label
                    htmlFor="commission-timeline"
                    className="block text-xs font-medium tracking-wide uppercase text-muted mb-2"
                  >
                    Timeline
                  </label>
                  <input
                    id="commission-timeline"
                    type="text"
                    value={commissionTimeline}
                    onChange={(e) => setCommissionTimeline(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                    placeholder="e.g. Within 3 months"
                  />
                </div>

                {commissionError && (
                  <p className="text-sm text-error">{commissionError}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleCommissionSubmit}
                    disabled={commissionSending || !commissionDescription.trim() || !commissionBudget}
                    className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-full hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {commissionSending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Enquiry'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCommissionModal(false); setCommissionError(null); }}
                    disabled={commissionSending}
                    className="px-5 py-2.5 text-sm text-muted hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </dialog>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          REVIEWS
      ═══════════════════════════════════════════ */}
      <div className="border-t border-border bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          {/* Reviews header */}
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-editorial text-xl md:text-2xl font-medium">Reviews</h2>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2">
                <StarRating rating={avgRating} />
                <span className="text-sm text-muted">
                  {avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                </span>
              </div>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl bg-white/50">
              <Star className="h-8 w-8 text-border mx-auto mb-3" />
              <p className="text-muted font-medium">No reviews yet</p>
              <p className="text-sm text-warm-gray mt-1 max-w-md mx-auto">
                This artist&apos;s first collectors will be the first to share their experience.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => {
                const reviewer = review.profiles as { full_name: string | null; avatar_url: string | null } | null;
                const reviewerName = reviewer?.full_name ?? 'Anonymous';
                const reviewDate = new Date(review.created_at).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                });

                return (
                  <div
                    key={review.id}
                    className="bg-white border border-border rounded-2xl p-6"
                  >
                    <div className="flex items-start gap-4">
                      {/* Reviewer avatar */}
                      <Avatar
                        avatarUrl={reviewer?.avatar_url}
                        name={reviewerName}
                        size={40}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-sm">{reviewerName}</p>
                          <p className="text-xs text-warm-gray flex-shrink-0">{reviewDate}</p>
                        </div>
                        <div className="mt-1">
                          <StarRating rating={review.rating} size={14} />
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted leading-relaxed mt-3">
                            {review.comment}
                          </p>
                        )}

                        {/* Artist response */}
                        {review.artist_response && (
                          <div className="mt-4 pl-4 border-l-2 border-accent/30">
                            <p className="text-xs font-medium text-accent-dark mb-1">
                              Response from {artist.full_name}
                            </p>
                            <p className="text-sm text-muted leading-relaxed">
                              {review.artist_response}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
