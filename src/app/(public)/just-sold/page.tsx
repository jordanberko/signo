'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} ${weeks === 1 ? 'wk' : 'wks'} ago`;
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
    <div style={{ background: 'var(--color-warm-white)' }}>
      {/* ── Editorial header ── */}
      <header
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(4rem, 9vw, 7rem)',
          paddingBottom: 'clamp(2.5rem, 5vw, 4rem)',
        }}
      >
        <p
          style={{
            fontSize: '0.68rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            marginBottom: '1.2rem',
          }}
        >
          The Ledger
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(2.6rem, 6vw, 4.8rem)',
            lineHeight: 1.02,
            letterSpacing: '-0.015em',
            color: 'var(--color-ink)',
            fontWeight: 400,
            maxWidth: '22ch',
          }}
        >
          Recently <em style={{ fontStyle: 'italic' }}>placed</em> — works already in their new homes.
        </h1>
        <p
          style={{
            marginTop: '1.6rem',
            fontSize: '0.92rem',
            fontWeight: 400,
            lineHeight: 1.6,
            color: 'var(--color-stone-dark)',
            maxWidth: '46ch',
          }}
        >
          {!loading && artworks.length > 0
            ? `${artworks.length} ${artworks.length === 1 ? 'work' : 'works'} shown. Every sale goes directly to the studio — Signo takes no commission.`
            : 'Every sale goes directly to the studio — Signo takes no commission.'}
        </p>
      </header>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── Ledger ── */}
      <section
        className="px-6 sm:px-10"
        style={{ paddingTop: '3rem', paddingBottom: '6rem' }}
      >
        {loading ? (
          <p
            className="font-serif"
            style={{
              fontSize: '1.1rem',
              fontStyle: 'italic',
              color: 'var(--color-stone)',
              fontWeight: 400,
            }}
          >
            Loading the ledger…
          </p>
        ) : artworks.length === 0 ? (
          <div style={{ maxWidth: '46ch', paddingTop: '2rem', paddingBottom: '4rem' }}>
            <p
              className="font-serif"
              style={{
                fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                lineHeight: 1.15,
                color: 'var(--color-ink)',
              }}
            >
              No recent sales to record.
            </p>
            <p
              style={{
                marginTop: '1rem',
                marginBottom: '2rem',
                fontSize: '0.88rem',
                color: 'var(--color-stone-dark)',
                fontWeight: 400,
                lineHeight: 1.6,
              }}
            >
              When a work finds its home, it is logged here.
            </p>
            <Link href="/browse" className="editorial-link">
              Browse current works
            </Link>
          </div>
        ) : (
          <>
            {/* Same card-grid vocabulary as browse and the homepage —
                image-first, uncropped tiles, quiet metadata. */}
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-x-4 lg:gap-y-8">
              {artworks.map((item) => (
                <SoldCard key={item.artworkId} item={item} />
              ))}
            </div>

            {hasMore && (
              <div style={{ marginTop: '3.5rem' }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="editorial-link"
                  style={{
                    background: 'transparent',
                    cursor: loadingMore ? 'default' : 'pointer',
                    opacity: loadingMore ? 0.55 : 1,
                  }}
                >
                  {loadingMore ? 'Loading…' : 'Load earlier sales'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/**
 * SoldCard — mirrors ArtworkCard's shop-card sizing so sold works read
 * as part of the same catalogue, with a sold marker instead of save
 * actions. Photo fills the uniform tile (object-cover), matching
 * ArtworkCard's treatment.
 */
function SoldCard({ item }: { item: SoldArtwork }) {
  const hasDimensions = item.widthCm && item.heightCm;

  return (
    <article className="group relative block">
      <Link
        href={`/artwork/${item.artworkId}`}
        className="block overflow-hidden aspect-[3/4] relative no-underline"
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.title}
            className="block w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
            style={{
              transitionDuration: 'var(--dur-slow)',
              transitionTimingFunction: 'var(--ease-out)',
            }}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full" style={{ background: 'var(--color-cream)' }} />
        )}
      </Link>

      <div className="pt-3">
        {/* Sold marker + recency */}
        <div
          className="mb-1.5 flex gap-3"
          style={{
            fontSize: '0.62rem',
            fontWeight: 500,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ color: 'var(--color-terracotta)' }}>Sold</span>
          <span style={{ color: 'var(--color-stone)' }}>{timeAgo(item.soldAt)}</span>
        </div>

        <Link href={`/artwork/${item.artworkId}`} className="block no-underline">
          <h2
            className="truncate transition-colors group-hover:text-[color:var(--color-terracotta)]"
            style={{
              fontSize: '0.85rem',
              fontWeight: 500,
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
              color: 'var(--color-ink)',
              margin: 0,
              transitionDuration: 'var(--dur-base)',
              transitionTimingFunction: 'var(--ease-out)',
            }}
          >
            {item.title}
          </h2>
        </Link>

        <p
          className="mt-1"
          style={{
            fontSize: '0.78rem',
            fontWeight: 400,
            color: 'var(--color-stone-dark)',
            margin: '0.25rem 0 0',
          }}
        >
          {item.artistName}
        </p>

        {(item.medium || hasDimensions) && (
          <p
            className="mt-2"
            style={{
              fontSize: '0.72rem',
              fontWeight: 400,
              color: 'var(--color-stone)',
              letterSpacing: '0.02em',
              margin: '0.5rem 0 0',
            }}
          >
            {item.medium}
            {item.medium && hasDimensions ? ' · ' : ''}
            {hasDimensions && `${Math.round(item.widthCm!)} × ${Math.round(item.heightCm!)} cm`}
          </p>
        )}

        <p
          style={{
            fontSize: '0.85rem',
            fontWeight: 500,
            color: 'var(--color-ink)',
            margin: '0.4rem 0 0',
          }}
        >
          {formatPrice(item.price)}
        </p>
      </div>
    </article>
  );
}
