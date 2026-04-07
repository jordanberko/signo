'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Heart, ArrowRight, Loader2, ChevronDown } from 'lucide-react';
import ArtworkCard from '@/components/ui/ArtworkCard';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';

// ── Types ──

interface FavouritedArtwork {
  id: string;
  title: string;
  price_aud: number;
  images: string[];
  medium: string | null;
  category: 'original' | 'print' | 'digital';
  artist_id: string;
  artistName: string;
  artistId: string;
  favouritedAt: string;
}

const SORT_OPTIONS = [
  { label: 'Recently saved', value: 'recent' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Artist name A-Z', value: 'artist' },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

// ── Component ──

export default function FavouritesPage() {
  const { loading: authLoading } = useRequireAuth();
  const [artworks, setArtworks] = useState<FavouritedArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortValue>('recent');
  const [sortOpen, setSortOpen] = useState(false);
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  const fetchFavourites = useCallback(
    async (sortBy: SortValue) => {
      try {
        setError(null);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(`/api/favourites/list?sort=${sortBy}`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          throw new Error('Failed to load favourites');
        }

        const data = await res.json();
        setArtworks(data.artworks || []);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[Favourites]', err);
          setError('Failed to load favourites. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (authLoading) return;
    fetchFavourites(sort);
  }, [authLoading, sort, fetchFavourites]);

  // Handle unfavourite — fade out then remove from list
  const handleUnfavourite = useCallback((artworkId: string) => {
    setRemoving((prev) => new Set(prev).add(artworkId));
    // Remove from list after fade-out animation completes
    setTimeout(() => {
      setArtworks((prev) => prev.filter((a) => a.id !== artworkId));
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(artworkId);
        return next;
      });
    }, 400);
  }, []);

  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Recently saved';

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-border border-t-primary rounded-full animate-spin" />
        <style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-editorial text-3xl md:text-4xl font-medium">
            Your Favourites
          </h1>
          <p className="text-muted mt-1.5">
            {loading
              ? 'Loading your saved artwork...'
              : artworks.length > 0
                ? `${artworks.length} saved artwork${artworks.length === 1 ? '' : 's'}`
                : 'Artwork you\u2019ve saved'}
          </p>
        </div>

        {/* Sort dropdown */}
        {artworks.length > 0 && !loading && (
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-full text-sm font-medium hover:border-accent/40 transition-colors bg-white"
            >
              {sortLabel}
              <ChevronDown
                className={`h-4 w-4 text-muted transition-transform ${sortOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {sortOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setSortOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-white border border-border rounded-xl shadow-lg z-20 py-1 animate-fade-in">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSort(option.value);
                        setSortOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        sort === option.value
                          ? 'text-accent-dark font-medium bg-cream'
                          : 'text-foreground hover:bg-cream/50'
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

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : error ? (
        <div className="text-center py-24">
          <p className="text-error mb-4">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchFavourites(sort);
            }}
            className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-full hover:bg-accent transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : artworks.length === 0 ? (
        /* Empty state */
        <div className="text-center py-24">
          <div className="w-20 h-20 bg-muted-bg rounded-full flex items-center justify-center mx-auto mb-5">
            <Heart className="h-10 w-10 text-muted" />
          </div>
          <h2 className="font-editorial text-2xl font-medium mb-2">
            No saved artwork yet
          </h2>
          <p className="text-muted mb-8 max-w-md mx-auto">
            Tap the heart on any artwork to save it here
          </p>
          <Link
            href="/browse"
            className="group inline-flex items-center gap-2 px-8 py-3 bg-primary text-white text-sm font-semibold rounded-full hover:bg-accent transition-colors duration-300"
          >
            Browse Artwork
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      ) : (
        /* Masonry grid */
        <div
          style={{
            columnCount: 4,
            columnGap: 16,
          }}
        >
          <style>{`
            @media (max-width: 1023px) { .masonry-favs { column-count: 3 !important; } }
            @media (max-width: 767px) { .masonry-favs { column-count: 2 !important; } }
            @media (max-width: 479px) { .masonry-favs { column-count: 1 !important; } }
          `}</style>
          <div
            className="masonry-favs"
            style={{ columnCount: 'inherit', columnGap: 'inherit' }}
          >
            {artworks.map((artwork) => (
              <div
                key={artwork.id}
                className="mb-4"
                style={{
                  breakInside: 'avoid',
                  opacity: removing.has(artwork.id) ? 0 : 1,
                  transform: removing.has(artwork.id)
                    ? 'scale(0.95)'
                    : 'scale(1)',
                  transition: 'opacity 400ms ease-out, transform 400ms ease-out',
                }}
              >
                <ArtworkCard
                  id={artwork.id}
                  title={artwork.title}
                  artistName={artwork.artistName}
                  artistId={artwork.artistId}
                  price={artwork.price_aud}
                  imageUrl={artwork.images?.[0] || ''}
                  medium={artwork.medium}
                  category={artwork.category}
                  masonry
                  initialFavourited
                  onUnfavourite={handleUnfavourite}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
