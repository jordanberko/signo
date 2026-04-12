'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Eye } from 'lucide-react';
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
  /** Hide the category badge (useful on filtered views) */
  hideBadge?: boolean;
  /** Pre-fill favourite state (e.g. on /favourites page) */
  initialFavourited?: boolean;
  /** Called after unfavouriting — used by /favourites page to remove from list */
  onUnfavourite?: (id: string) => void;
}

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
  hideBadge = false,
  initialFavourited = false,
  onUnfavourite,
}: ArtworkCardProps) {
  const { user } = useAuth();
  const [isFavourited, setIsFavourited] = useState(initialFavourited);
  const [heartAnimating, setHeartAnimating] = useState(false);

  // Sync favourite state when the prop updates (e.g. after async fetch completes)
  useEffect(() => {
    setIsFavourited(initialFavourited);
  }, [initialFavourited]);

  const categoryLabel = category
    ? { original: 'Original', print: 'Print', digital: 'Digital' }[category]
    : null;

  const hasDimensions = widthCm && heightCm;

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
        setHeartAnimating(true);
        setTimeout(() => setHeartAnimating(false), 300);
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
    <div
      className="group relative rounded-[10px] bg-white border border-border overflow-hidden transition-all duration-300 ease-out md:hover:-translate-y-1 md:hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)]"
      style={{ minWidth: 0 }}
    >
      {/* Image — 4:5 aspect ratio */}
      <Link
        href={`/artwork/${id}`}
        className="block overflow-hidden aspect-[4/5] bg-muted-bg relative"
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={title}
              className="block w-full h-full object-cover transition-transform duration-500 ease-out md:group-hover:scale-[1.03]"
              loading="lazy"
            />
            {/* Quick View overlay — desktop only */}
            <div className="hidden md:flex absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 items-end justify-center pb-4">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-[rgba(26,26,26,0.85)] backdrop-blur-sm rounded-full text-xs font-semibold text-white opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                <Eye className="h-3.5 w-3.5" />
                Quick View
              </span>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted-bg to-border flex items-center justify-center">
            <span className="text-warm-gray text-xs tracking-widest uppercase">
              No image
            </span>
          </div>
        )}
      </Link>

      {/* Favourite Heart — top right */}
      <button
        onClick={handleFavourite}
        className={`absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 shadow-sm ${
          isFavourited
            ? 'bg-white opacity-100'
            : 'bg-[rgba(255,255,255,0.92)] backdrop-blur-sm opacity-0 md:group-hover:opacity-100'
        } hover:scale-110`}
        aria-label={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
        style={{
          transform: heartAnimating ? 'scale(1.3)' : undefined,
          transition: heartAnimating ? 'transform 150ms ease-out' : 'transform 150ms ease-in, opacity 300ms',
        }}
      >
        <Heart
          className="h-4 w-4 transition-colors duration-200"
          fill={isFavourited ? '#dc2626' : 'none'}
          stroke={isFavourited ? '#dc2626' : '#1a1a1a'}
        />
      </button>

      {/* Category Badge — top left */}
      {!hideBadge && categoryLabel && (
        <span className="absolute top-3 left-3 px-2.5 py-1 bg-[rgba(255,255,255,0.92)] backdrop-blur-sm text-[10.5px] font-bold tracking-wider uppercase rounded text-foreground">
          {categoryLabel}
        </span>
      )}

      {/* Info Section */}
      <div className="p-4 space-y-1.5">
        <Link href={`/artwork/${id}`} className="block">
          <h3 className="font-editorial font-medium text-foreground truncate hover:text-accent transition-colors duration-200 text-[15px] leading-snug">
            {title}
          </h3>
        </Link>

        <Link
          href={`/artists/${artistId}`}
          className="block text-[13px] text-muted hover:text-accent transition-colors duration-200"
        >
          {artistName}
        </Link>

        {/* Medium + Dimensions pills */}
        {(medium || hasDimensions) && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {medium && (
              <span className="px-2 py-0.5 bg-sand rounded text-[11.5px] text-muted leading-relaxed">
                {medium}
              </span>
            )}
            {hasDimensions && (
              <span className="px-2 py-0.5 bg-sand rounded text-[11.5px] text-muted leading-relaxed">
                {Math.round(widthCm)} &times; {Math.round(heightCm)} cm
              </span>
            )}
          </div>
        )}

        <p className="font-semibold text-foreground text-lg pt-0.5 tracking-tight">
          {formatPrice(price)}
        </p>
      </div>
    </div>
  );
}
