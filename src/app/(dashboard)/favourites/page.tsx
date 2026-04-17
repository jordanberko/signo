'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ArtworkCard from '@/components/ui/ArtworkCard';
import EditorialSpinner from '@/components/ui/EditorialSpinner';
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
  { label: 'Price, low to high', value: 'price_asc' },
  { label: 'Price, high to low', value: 'price_desc' },
  { label: 'Artist, A–Z', value: 'artist' },
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

  const fetchFavourites = useCallback(async (sortBy: SortValue) => {
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
  }, []);

  useEffect(() => {
    if (authLoading) return;
    fetchFavourites(sort);
  }, [authLoading, sort, fetchFavourites]);

  const handleUnfavourite = useCallback((artworkId: string) => {
    setRemoving((prev) => new Set(prev).add(artworkId));
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

  if (authLoading) return <EditorialSpinner />;

  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      <div
        className="px-6 sm:px-10"
        style={{
          maxWidth: '78rem',
          margin: '0 auto',
          paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
        }}
      >
        {/* ── Editorial header ── */}
        <header
          style={{
            marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.6rem',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                marginBottom: '1rem',
              }}
            >
              The Studio · Saved works
            </p>
            <h1
              className="font-serif"
              style={{
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.015em',
                color: 'var(--color-ink)',
                fontWeight: 400,
                marginBottom: '0.7rem',
              }}
            >
              Works you&apos;re <em style={{ fontStyle: 'italic' }}>holding.</em>
            </h1>
            <p
              style={{
                fontSize: '0.92rem',
                fontWeight: 300,
                color: 'var(--color-stone-dark)',
                lineHeight: 1.6,
              }}
            >
              {loading
                ? 'Gathering your list…'
                : artworks.length > 0
                  ? `${artworks.length} work${artworks.length === 1 ? '' : 's'} set aside for a second look.`
                  : 'A quiet shelf for works you want to return to.'}
            </p>
          </div>

          {/* Sort — hairline text control */}
          {artworks.length > 0 && !loading && (
            <div style={{ position: 'relative', alignSelf: 'flex-start' }}>
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="font-serif"
                style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: '0.5rem',
                  fontSize: '0.72rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  fontStyle: 'italic',
                  color: 'var(--color-ink)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.3rem 0',
                  borderBottom: '1px solid var(--color-border-strong)',
                }}
              >
                <span
                  style={{
                    fontStyle: 'normal',
                    fontFamily: 'inherit',
                    color: 'var(--color-stone)',
                    letterSpacing: '0.22em',
                  }}
                >
                  Sort —
                </span>
                {sortLabel}
                <span
                  aria-hidden
                  style={{
                    fontStyle: 'normal',
                    fontSize: '0.65rem',
                    color: 'var(--color-stone)',
                    transform: sortOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform var(--dur-fast) var(--ease-out)',
                    display: 'inline-block',
                  }}
                >
                  ▾
                </span>
              </button>
              {sortOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                    onClick={() => setSortOpen(false)}
                  />
                  <ul
                    style={{
                      position: 'absolute',
                      left: 0,
                      marginTop: '0.6rem',
                      minWidth: '16rem',
                      background: 'var(--color-warm-white)',
                      border: '1px solid var(--color-border-strong)',
                      zIndex: 20,
                      listStyle: 'none',
                      padding: 0,
                    }}
                  >
                    {SORT_OPTIONS.map((option, i) => {
                      const active = sort === option.value;
                      return (
                        <li
                          key={option.value}
                          style={{
                            borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                          }}
                        >
                          <button
                            onClick={() => {
                              setSort(option.value);
                              setSortOpen(false);
                            }}
                            className="font-serif"
                            style={{
                              display: 'block',
                              width: '100%',
                              textAlign: 'left',
                              padding: '0.85rem 1.1rem',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.92rem',
                              fontStyle: active ? 'italic' : 'normal',
                              color: active
                                ? 'var(--color-ink)'
                                : 'var(--color-stone-dark)',
                              fontWeight: 400,
                            }}
                          >
                            {active && (
                              <span
                                aria-hidden
                                style={{
                                  display: 'inline-block',
                                  width: 16,
                                  height: 1,
                                  background: 'var(--color-ink)',
                                  verticalAlign: 'middle',
                                  marginRight: 10,
                                }}
                              />
                            )}
                            {option.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          )}
        </header>

        {loading ? (
          <div style={{ padding: '3rem 0' }}>
            <p
              className="font-serif"
              style={{
                fontStyle: 'italic',
                fontSize: '0.95rem',
                color: 'var(--color-stone)',
                marginBottom: '2.4rem',
              }}
            >
              Loading…
            </p>
            <div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              style={{ columnGap: '1.8rem', rowGap: '3rem' }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i}>
                  <div
                    className="aspect-[4/5]"
                    style={{ background: 'var(--color-cream)' }}
                  />
                  <div
                    style={{
                      marginTop: '0.9rem',
                      height: 1,
                      background: 'var(--color-border)',
                      width: '60%',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div
            style={{
              paddingTop: '2rem',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <p
              className="font-serif"
              style={{
                fontSize: '0.92rem',
                color: 'var(--color-terracotta, #c45d3e)',
                fontStyle: 'italic',
                marginBottom: '1.4rem',
              }}
            >
              {error}
            </p>
            <button
              onClick={() => {
                setLoading(true);
                fetchFavourites(sort);
              }}
              className="editorial-link"
            >
              Try again
            </button>
          </div>
        ) : artworks.length === 0 ? (
          <div
            style={{
              paddingTop: '2rem',
              borderTop: '1px solid var(--color-border)',
              maxWidth: '46ch',
            }}
          >
            <p
              className="font-serif"
              style={{
                fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)',
                lineHeight: 1.2,
                color: 'var(--color-ink)',
                fontStyle: 'italic',
                fontWeight: 400,
                marginTop: '1.4rem',
              }}
            >
              Nothing saved yet.
            </p>
            <p
              style={{
                marginTop: '1rem',
                fontSize: '0.9rem',
                color: 'var(--color-stone-dark)',
                fontWeight: 300,
                lineHeight: 1.6,
              }}
            >
              When a work catches your eye, mark it <em style={{ fontStyle: 'italic' }}>Save</em>{' '}
              from its card or page — it will live here until you&apos;re ready to return.
            </p>
            <Link
              href="/browse"
              className="editorial-link"
              style={{ marginTop: '1.6rem', display: 'inline-block' }}
            >
              Browse the collection
            </Link>
          </div>
        ) : (
          <div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            style={{
              columnGap: '1.8rem',
              rowGap: '3.2rem',
              borderTop: '1px solid var(--color-border-strong)',
              paddingTop: '2.4rem',
            }}
          >
            {artworks.map((artwork) => (
              <div
                key={artwork.id}
                style={{
                  opacity: removing.has(artwork.id) ? 0 : 1,
                  transform: removing.has(artwork.id)
                    ? 'translateY(-4px)'
                    : 'translateY(0)',
                  transition:
                    'opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)',
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
                  initialFavourited
                  onUnfavourite={handleUnfavourite}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
