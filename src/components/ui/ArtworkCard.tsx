'use client';

import { useState, useCallback } from 'react';
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
  /** Hide the category badge (useful on filtered views) */
  hideBadge?: boolean;
  /** Use natural aspect ratio for masonry layouts instead of fixed 3:4 */
  masonry?: boolean;
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
  hideBadge = false,
  masonry = false,
  initialFavourited = false,
  onUnfavourite,
}: ArtworkCardProps) {
  const { user } = useAuth();
  const [isFavourited, setIsFavourited] = useState(initialFavourited);
  const [heartAnimating, setHeartAnimating] = useState(false);

  const categoryLabel = category
    ? { original: 'Original', print: 'Print', digital: 'Digital' }[category]
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

      // Only animate the pop on favouriting, not unfavouriting
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
          // Revert on error
          setIsFavourited(!newState);
        } else if (!newState && onUnfavourite) {
          // Successfully unfavourited — notify parent
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
      className="group relative rounded-xl bg-[#FAFAF7] overflow-hidden transition-all duration-300 ease-out md:hover:-translate-y-1 md:hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      style={{ minWidth: 0 }}
    >
      {/* Image */}
      <Link
        href={`/artwork/${id}`}
        className={`block overflow-hidden ${masonry ? '' : 'aspect-[3/4]'} bg-muted-bg`}
      >
        {imageUrl ? (
          <div className={`relative w-full ${masonry ? '' : 'h-full'}`}>
            <img
              src={imageUrl}
              alt={title}
              className={`block w-full ${masonry ? '' : 'h-full object-cover'} transition-transform duration-300 ease-out md:group-hover:scale-[1.03]`}
              loading="lazy"
            />
            {/* Hover overlay — desktop only */}
            <div className="hidden md:flex absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 items-center justify-center">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-sm">
                <Eye className="h-3.5 w-3.5" />
                View
              </span>
            </div>
          </div>
        ) : (
          <div className={`w-full ${masonry ? 'aspect-[3/4]' : 'h-full'} bg-gradient-to-br from-muted-bg to-border flex items-center justify-center`}>
            <span className="text-warm-gray text-xs tracking-widest uppercase">
              No image
            </span>
          </div>
        )}
      </Link>

      {/* Favourite Button */}
      <button
        onClick={handleFavourite}
        className={`absolute top-3 right-3 p-2.5 rounded-full transition-all duration-300 shadow-sm ${
          isFavourited
            ? 'bg-white opacity-100'
            : 'bg-white/90 backdrop-blur-sm opacity-0 md:group-hover:opacity-100'
        } hover:scale-110`}
        aria-label={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
        style={{
          transform: heartAnimating ? 'scale(1.3)' : undefined,
          transition: heartAnimating ? 'transform 150ms ease-out' : 'transform 150ms ease-in, opacity 300ms',
        }}
      >
        <Heart
          className="h-4 w-4 transition-colors duration-200"
          fill={isFavourited ? '#D85A30' : 'none'}
          stroke={isFavourited ? '#D85A30' : 'currentColor'}
        />
      </button>

      {/* Category Badge */}
      {!hideBadge && categoryLabel && (
        <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-[11px] font-medium tracking-wide uppercase rounded-full shadow-sm">
          {categoryLabel}
        </span>
      )}

      {/* Details */}
      <div className="px-3.5 pt-3 pb-3.5 space-y-1">
        <Link href={`/artwork/${id}`} className="block">
          <h3 className="font-editorial font-medium text-foreground truncate hover:text-accent-dark transition-colors duration-300 text-sm">
            {title}
          </h3>
        </Link>
        <Link
          href={`/artists/${artistId}`}
          className="block text-xs text-muted hover:text-accent-dark transition-colors duration-300"
        >
          {artistName}
        </Link>
        {medium && (
          <p className="text-[11px] text-warm-gray tracking-wide">{medium}</p>
        )}
        <p className="font-medium text-foreground text-sm pt-0.5 tracking-wide">
          {formatPrice(price)}
        </p>
      </div>
    </div>
  );
}
