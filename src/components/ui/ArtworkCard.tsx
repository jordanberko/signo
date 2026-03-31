import Link from 'next/link';
import { Heart, Eye } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

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
}: ArtworkCardProps) {
  const categoryLabel = category
    ? { original: 'Original', print: 'Print', digital: 'Digital' }[category]
    : null;

  return (
    <div className="group relative">
      {/* Image */}
      <Link
        href={`/artwork/${id}`}
        className="block aspect-[3/4] overflow-hidden rounded-lg bg-muted-bg"
      >
        {imageUrl ? (
          <div className="relative w-full h-full">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              loading="lazy"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-sm">
                <Eye className="h-3.5 w-3.5" />
                View
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted-bg to-border flex items-center justify-center">
            <span className="text-warm-gray text-xs tracking-widest uppercase">
              No image
            </span>
          </div>
        )}
      </Link>

      {/* Favourite Button */}
      <button
        className="absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110 shadow-sm"
        aria-label="Add to favourites"
      >
        <Heart className="h-4 w-4 text-foreground" />
      </button>

      {/* Category Badge */}
      {!hideBadge && categoryLabel && (
        <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-[11px] font-medium tracking-wide uppercase rounded-full shadow-sm">
          {categoryLabel}
        </span>
      )}

      {/* Details */}
      <div className="pt-3.5 space-y-1">
        <Link href={`/artwork/${id}`} className="block">
          <h3 className="font-editorial font-medium text-foreground truncate hover:text-accent transition-colors duration-300">
            {title}
          </h3>
        </Link>
        <Link
          href={`/artists/${artistId}`}
          className="block text-sm text-muted link-underline hover:text-accent transition-colors duration-300"
        >
          {artistName}
        </Link>
        {medium && (
          <p className="text-xs text-warm-gray tracking-wide">{medium}</p>
        )}
        <p className="font-medium text-foreground pt-0.5 tracking-wide">
          {formatPrice(price)}
        </p>
      </div>
    </div>
  );
}
