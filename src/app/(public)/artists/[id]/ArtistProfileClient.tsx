'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin,
  Star,
  Calendar,
  Globe,
  Heart,
  ChevronDown,
  MessageCircle,
  UserPlus,
} from 'lucide-react';
import { formatPrice, getInitials } from '@/lib/utils';
import type { Profile, Artwork, Review } from '@/lib/types/database';
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
}

// ── Component ──

export default function ArtistProfileClient({
  artist,
  artworks,
  reviews,
  salesCount,
  avgRating,
}: ArtistProfileClientProps) {
  const [sort, setSort] = useState<SortKey>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const socialLinks = (artist.social_links ?? {}) as Record<string, string>;
  const instagram = socialLinks.instagram;
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
          ARTIST HEADER
      ═══════════════════════════════════════════ */}
      <div className="bg-cream border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {artist.avatar_url ? (
                <Image
                  src={artist.avatar_url}
                  alt={artist.full_name ?? 'Artist'}
                  width={140}
                  height={140}
                  className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-accent-subtle border-4 border-white shadow-lg flex items-center justify-center">
                  <span className="font-editorial text-3xl md:text-4xl font-medium text-accent">
                    {getInitials(artist.full_name ?? '?')}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div>
                <h1 className="font-editorial text-3xl md:text-4xl font-medium">
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
              {(instagram || website) && (
                <div className="flex items-center justify-center md:justify-start gap-3">
                  {instagram && (
                    <a
                      href={
                        instagram.startsWith('http')
                          ? instagram
                          : `https://instagram.com/${instagram.replace('@', '')}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-muted hover:text-accent transition-colors"
                    >
                      <InstagramIcon className="h-4 w-4" />
                      <span className="link-underline">{instagram.startsWith('@') ? instagram : `@${instagram}`}</span>
                    </a>
                  )}
                  {website && (
                    <a
                      href={website.startsWith('http') ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-muted hover:text-accent transition-colors"
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
                  <p className="text-xl font-bold">{salesCount}</p>
                  <p className="text-xs text-muted uppercase tracking-wide">Sales</p>
                </div>
                {reviews.length > 0 && (
                  <>
                    <div className="w-px h-8 bg-border" />
                    <div className="text-center md:text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xl font-bold">{avgRating.toFixed(1)}</p>
                        <Star className="h-4 w-4 text-accent fill-accent" />
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
                <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-full hover:bg-accent transition-colors duration-300">
                  <UserPlus className="h-4 w-4" />
                  Follow
                </button>
                <button className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-border text-sm font-semibold rounded-full hover:border-warm-gray transition-colors">
                  <MessageCircle className="h-4 w-4" />
                  Message
                </button>
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
                      {reviewer?.avatar_url ? (
                        <Image
                          src={reviewer.avatar_url}
                          alt={reviewerName}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-accent-subtle flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-accent">
                            {getInitials(reviewerName)}
                          </span>
                        </div>
                      )}

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
                            <p className="text-xs font-medium text-accent mb-1">
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
