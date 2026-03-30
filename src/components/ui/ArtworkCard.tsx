import Link from 'next/link';
import { Heart } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface ArtworkCardProps {
  id: string;
  title: string;
  artistName: string;
  artistId: string;
  price: number;
  imageUrl: string;
  medium: string;
  category: 'original' | 'print' | 'digital';
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
}: ArtworkCardProps) {
  const categoryLabel = {
    original: 'Original',
    print: 'Print',
    digital: 'Digital',
  }[category];

  return (
    <div className="group relative bg-white rounded-lg overflow-hidden border border-border hover:shadow-lg transition-shadow duration-300">
      {/* Image */}
      <Link href={`/artwork/${id}`} className="block aspect-[3/4] overflow-hidden bg-muted-bg">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-xs">No image</span>
          </div>
        )}
      </Link>

      {/* Favourite Button */}
      <button
        className="absolute top-3 right-3 p-2 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
        aria-label="Add to favourites"
      >
        <Heart className="h-4 w-4 text-foreground" />
      </button>

      {/* Category Badge */}
      <span className="absolute top-3 left-3 px-2 py-1 bg-white/90 text-xs font-medium rounded">
        {categoryLabel}
      </span>

      {/* Details */}
      <div className="p-4 space-y-1">
        <Link href={`/artwork/${id}`} className="block">
          <h3 className="font-medium text-foreground truncate hover:text-accent transition-colors">
            {title}
          </h3>
        </Link>
        <Link
          href={`/artists/${artistId}`}
          className="block text-sm text-muted hover:text-accent transition-colors"
        >
          {artistName}
        </Link>
        <p className="text-xs text-muted">{medium}</p>
        <p className="font-semibold text-foreground pt-1">{formatPrice(price)}</p>
      </div>
    </div>
  );
}
