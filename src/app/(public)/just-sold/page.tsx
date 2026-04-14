'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface SoldArtwork {
  artworkId: string;
  title: string;
  imageUrl: string;
  medium: string | null;
  widthCm: number | null;
  heightCm: number | null;
  price: number;
  artistName: string;
  artistId: string;
  soldAt: string;
}

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
}

const PAGE_SIZE = 30;

export default function JustSoldPage() {
  const [artworks, setArtworks] = useState<SoldArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const fetchSold = useCallback(async (limit: number) => {
    try {
      const res = await fetch(`/api/artworks/just-sold?limit=${limit}`);
      if (res.ok) {
        const json = await res.json();
        const data = (json.data || []) as SoldArtwork[];
        setArtworks(data);
        // If we got exactly the limit, there might be more
        setHasMore(data.length >= limit);
      }
    } catch (err) {
      console.error('[JustSold] Fetch error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchSold(PAGE_SIZE);
  }, [fetchSold]);

  function handleLoadMore() {
    setLoadingMore(true);
    fetchSold(artworks.length + PAGE_SIZE);
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="pt-16 pb-10 md:pt-24 md:pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-accent-dark text-xs font-semibold tracking-[0.2em] uppercase mb-3">
            Recent Sales
          </p>
          <h1 className="font-editorial text-4xl md:text-5xl lg:text-6xl font-medium text-primary">
            Just Sold
          </h1>
          <p className="mt-4 text-lg text-muted max-w-md mx-auto">
            See what collectors are buying on Signo.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="pb-20 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            /* Loading skeleton */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-10">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/5] bg-sand rounded-lg" />
                  <div className="pt-4 space-y-2">
                    <div className="h-4 bg-sand rounded w-3/4" />
                    <div className="h-3 bg-sand/60 rounded w-1/2" />
                    <div className="h-4 bg-sand rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : artworks.length === 0 ? (
            /* Empty state */
            <div className="text-center py-20">
              <p className="text-muted text-lg mb-6">No recent sales to show yet.</p>
              <Link
                href="/browse"
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-dark transition-colors"
              >
                Browse Artwork
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-10">
                {artworks.map((item) => (
                  <SoldCard key={item.artworkId} item={item} />
                ))}
              </div>

              {hasMore && (
                <div className="text-center mt-12">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-6 py-3 border border-border text-primary font-medium rounded-full hover:bg-cream transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function SoldCard({ item }: { item: SoldArtwork }) {
  const hasDimensions = item.widthCm && item.heightCm;

  return (
    <div className="group relative rounded-[10px] bg-white border border-border overflow-hidden transition-all duration-300 ease-out md:hover:-translate-y-1 md:hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)]">
      {/* Image */}
      <Link
        href={`/artwork/${item.artworkId}`}
        className="block overflow-hidden aspect-[4/5] bg-muted-bg relative"
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="block w-full h-full object-cover transition-transform duration-500 ease-out md:group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted-bg to-border flex items-center justify-center">
            <span className="text-warm-gray text-xs tracking-widest uppercase">No image</span>
          </div>
        )}

        {/* Sold badge */}
        <span className="absolute top-3 left-3 bg-black/60 text-white text-xs font-medium px-2 py-0.5 rounded-full">
          Sold
        </span>
      </Link>

      {/* Info */}
      <div className="p-4 space-y-1.5">
        <Link href={`/artwork/${item.artworkId}`} className="block">
          <h3 className="font-editorial font-medium text-foreground truncate hover:text-accent transition-colors duration-200 text-[15px] leading-snug">
            {item.title}
          </h3>
        </Link>

        <Link
          href={`/artists/${item.artistId}`}
          className="block text-[13px] text-muted hover:text-accent transition-colors duration-200"
        >
          {item.artistName}
        </Link>

        {(item.medium || hasDimensions) && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {item.medium && (
              <span className="px-2 py-0.5 bg-sand rounded text-[11.5px] text-muted leading-relaxed">
                {item.medium}
              </span>
            )}
            {hasDimensions && (
              <span className="px-2 py-0.5 bg-sand rounded text-[11.5px] text-muted leading-relaxed">
                {Math.round(item.widthCm!)} &times; {Math.round(item.heightCm!)} cm
              </span>
            )}
          </div>
        )}

        <p className="font-semibold text-foreground text-lg pt-0.5 tracking-tight">
          Sold for {formatPrice(item.price)}
        </p>

        <p className="text-xs text-muted">
          {timeAgo(item.soldAt)}
        </p>
      </div>
    </div>
  );
}
