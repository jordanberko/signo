'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';

interface ArtworkCardProps {
  id: string;
  title: string;
  artistName: string;
  artistId: string;
  price: number;
  imageUrl: string;
  medium?: string | null;
  category?: 'original' | 'print' | 'digital';
  widthCm?: number | null;
  heightCm?: number | null;
  availability?: 'available' | 'coming_soon' | 'enquire_only';
  /** Hide the category note (useful on filtered views) */
  hideBadge?: boolean;
  /** Pre-fill favourite state (e.g. on /favourites page) */
  initialFavourited?: boolean;
  /** Called after unfavouriting — used by /favourites page to remove from list */
  onUnfavourite?: (id: string) => void;
}

/**
 * ArtworkCard — editorial, Huxley-aligned.
 *
 * No container chrome, no drop shadow, no category badges, no hover-scale.
 * Image dominates. Typography carries hierarchy: serif title, sans artist,
 * muted medium/dimensions caption, serif price.
 *
 * Availability and category are expressed as small uppercase captions
 * above or inside the metadata block — never as coloured pills.
 */
export default function ArtworkCard({
  id,
  title,
  artistName,
  artistId,
  price,
  imageUrl,
  medium,
  category,
  widthCm,
  heightCm,
  availability = 'available',
  hideBadge = false,
  initialFavourited = false,
  onUnfavourite,
}: ArtworkCardProps) {
  const { user } = useAuth();
  const [isFavourited, setIsFavourited] = useState(initialFavourited);
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    setIsFavourited(initialFavourited);
  }, [initialFavourited]);

  const categoryLabel = category
    ? { original: 'Original', print: 'Print', digital: 'Digital' }[category]
    : null;

  const hasDimensions = widthCm && heightCm;

  const availabilityLabel =
    availability === 'coming_soon'
      ? 'Coming soon'
      : availability === 'enquire_only'
      ? 'Enquire'
      : null;

  const handleFavourite = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!user) {
        window.location.href = `/login?redirect=${encodeURIComponent(`/artwork/${id}`)}`;
        return;
      }

      const newState = !isFavourited;
      setIsFavourited(newState);
      if (newState) {
        setPulsing(true);
        setTimeout(() => setPulsing(false), 220);
      }

      try {
        const res = await fetch('/api/favourites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artworkId: id }),
        });
        if (!res.ok) {
          setIsFavourited(!newState);
        } else if (!newState && onUnfavourite) {
          onUnfavourite(id);
        }
      } catch {
        setIsFavourited(!newState);
      }
    },
    [id, isFavourited, user, onUnfavourite]
  );

  return (
    <article className="group relative block">
      {/* Image — 4:5 aspect, full-bleed, no border/shadow */}
      <Link
        href={`/artwork/${id}`}
        className="block overflow-hidden aspect-[4/5] relative no-underline"
        style={{ background: 'var(--color-cream)' }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="block w-full h-full object-cover transition-[transform,filter] group-hover:scale-[1.03] group-hover:grayscale-0"
            style={{
              transitionDuration: 'var(--dur-cinematic), var(--dur-base)',
              transitionTimingFunction: 'var(--ease-out)',
              filter: 'grayscale(8%)',
            }}
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'var(--color-cream)' }}
          >
            <span
              style={{
                fontSize: '0.68rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                fontWeight: 400,
              }}
            >
              No image
            </span>
          </div>
        )}
      </Link>

      {/* Favourite — typographic, top right, fades in on card hover.
          Saved state always visible; unsaved fades in on group hover. No icons. */}
      <button
        onClick={handleFavourite}
        className={`font-serif absolute top-3 right-3 bg-transparent border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300${isFavourited ? ' !opacity-100' : ''}`}
        aria-label={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
        style={{
          padding: '0.3rem 0.55rem',
          fontSize: '0.7rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          fontStyle: 'italic',
          color: isFavourited ? 'var(--color-terracotta)' : 'var(--color-warm-white)',
          background: isFavourited ? 'rgba(252, 251, 248, 0.92)' : 'rgba(26, 26, 24, 0.38)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      >
        <span className={pulsing ? 'save-pulse' : ''}>
          {isFavourited ? 'Saved' : 'Save'}
        </span>
      </button>

      {/* Metadata — typography only, no containers */}
      <div className="pt-4">
        {/* Tiny uppercase caption row */}
        {(!hideBadge && (categoryLabel || availabilityLabel)) && (
          <div
            className="mb-1.5 flex gap-3"
            style={{
              fontSize: '0.62rem',
              fontWeight: 400,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--color-stone)',
            }}
          >
            {!hideBadge && categoryLabel && <span>{categoryLabel}</span>}
            {availabilityLabel && (
              <span style={{ color: 'var(--color-terracotta)' }}>{availabilityLabel}</span>
            )}
          </div>
        )}

        {/* Title — serif */}
        <Link href={`/artwork/${id}`} className="block no-underline">
          <h3
            className="font-serif truncate transition-colors group-hover:text-[color:var(--color-terracotta)]"
            style={{
              fontSize: '1.2rem',
              fontWeight: 400,
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
              color: 'var(--color-ink)',
              margin: 0,
              transitionDuration: 'var(--dur-base)',
              transitionTimingFunction: 'var(--ease-out)',
            }}
          >
            {title}
          </h3>
        </Link>

        {/* Artist — sans */}
        <Link
          href={`/artists/${artistId}`}
          className="block no-underline mt-1"
          style={{
            fontSize: '0.82rem',
            fontWeight: 300,
            color: 'var(--color-stone-dark)',
            transition: 'color var(--dur-base) var(--ease-out)',
          }}
          onMouseOver={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-ink)')}
          onMouseOut={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-stone-dark)')}
        >
          {artistName}
        </Link>

        {/* Medium + dimensions — tiny caption */}
        {(medium || hasDimensions) && (
          <div
            className="mt-2"
            style={{
              fontSize: '0.72rem',
              fontWeight: 300,
              color: 'var(--color-stone)',
              letterSpacing: '0.02em',
            }}
          >
            {medium}
            {medium && hasDimensions ? ' · ' : ''}
            {hasDimensions && `${Math.round(widthCm)} × ${Math.round(heightCm)} cm`}
          </div>
        )}

        {/* Price — serif, right-leaning weight */}
        <p
          className="font-serif mt-2"
          style={{
            fontSize: '1rem',
            fontWeight: 400,
            color: 'var(--color-ink)',
            margin: '0.5rem 0 0',
          }}
        >
          {formatPrice(price)}
        </p>
      </div>
    </article>
  );
}
