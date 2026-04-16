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
            fontWeight: 300,
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
              fontWeight: 300,
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
                fontWeight: 300,
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
            <ul className="list-none p-0 m-0">
              {artworks.map((item, i) => (
                <SoldRow key={item.artworkId} item={item} isFirst={i === 0} />
              ))}
              <li style={{ borderTop: '1px solid var(--color-border)', height: 0 }} />
            </ul>

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

function SoldRow({ item, isFirst }: { item: SoldArtwork; isFirst: boolean }) {
  const hasDimensions = item.widthCm && item.heightCm;

  return (
    <li
      style={{
        borderTop: '1px solid var(--color-border)',
        borderTopWidth: isFirst ? '1px' : '1px',
      }}
    >
      <Link
        href={`/artwork/${item.artworkId}`}
        className="artist-row"
        style={{
          display: 'grid',
          gridTemplateColumns: '72px minmax(0,1fr) auto',
          gap: 'clamp(1rem, 3vw, 2.4rem)',
          alignItems: 'center',
          padding: '1.6rem 0',
          textDecoration: 'none',
        }}
      >
        {/* Thumbnail */}
        <div
          className="relative flex-shrink-0"
          style={{
            width: 72,
            height: 90,
            background: 'var(--color-cream)',
            overflow: 'hidden',
          }}
        >
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover"
              style={{ filter: 'grayscale(12%)' }}
              loading="lazy"
            />
          ) : null}
        </div>

        {/* Title · artist · details */}
        <div className="min-w-0">
          <h2
            className="font-serif"
            style={{
              fontSize: 'clamp(1.15rem, 1.8vw, 1.55rem)',
              lineHeight: 1.2,
              color: 'var(--color-ink)',
              fontWeight: 400,
              letterSpacing: '-0.01em',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.title}
          </h2>
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--color-stone-dark)',
              fontStyle: 'italic',
              marginTop: '0.25rem',
              fontWeight: 300,
            }}
          >
            {item.artistName}
          </p>
          {(item.medium || hasDimensions) && (
            <p
              style={{
                marginTop: '0.35rem',
                fontSize: '0.72rem',
                color: 'var(--color-stone)',
                fontWeight: 300,
                letterSpacing: '0.02em',
              }}
            >
              {item.medium}
              {item.medium && hasDimensions ? ' · ' : ''}
              {hasDimensions && `${Math.round(item.widthCm!)} × ${Math.round(item.heightCm!)} cm`}
            </p>
          )}
        </div>

        {/* Price + time */}
        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
          <p
            className="font-serif"
            style={{
              fontSize: 'clamp(1rem, 1.4vw, 1.2rem)',
              color: 'var(--color-ink)',
              fontWeight: 400,
              margin: 0,
            }}
          >
            {formatPrice(item.price)}
          </p>
          <p
            style={{
              marginTop: '0.35rem',
              fontSize: '0.62rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--color-stone)',
            }}
          >
            {timeAgo(item.soldAt)}
          </p>
        </div>
      </Link>
    </li>
  );
}
