'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ArtworkCard from '@/components/ui/ArtworkCard';

/**
 * Signo homepage — pure shop structure, metrics matched to wallofart.com:
 *
 *   1. Hero          — split installation photography, headline + CTAs
 *   2. NewArrivals   — 2-col mobile / 4-col desktop artwork grid
 *                      (16px column gap, 32px row gap on desktop)
 *   3. ShopByStyle   — one-click routes into the browse catalogue
 *
 * ~16px outer gutters throughout, modest heading sizes (~1.2rem), small
 * quiet card typography. The 0%-commission pitch and seller ledger live
 * on /pricing and /how-it-works — the homepage sells the art.
 */

// Shared outer gutter — matches the WoA ~16px page margin.
const GUTTER = 'clamp(0.75rem, 1.2vw, 1rem)';

// Gallery installation photographs for the hero — shown as side-by-side
// pairs (Wall of Art-style split hero). Each image spans ~50vw, so the
// sources render close to native resolution instead of stretching to
// full viewport width.
const HERO_PAIRS: [string, string][] = [
  [
    '/hero/hero_2_large_red_abstract.webp',
    '/hero/hero_5_botanical_still_life.webp',
  ],
  [
    '/hero/hero_4_oak_concrete_salon.webp',
    '/hero/hero_3_coral_salon_hang.webp',
  ],
];

// Styles mirrored from the browse page's filter vocabulary — each chip
// deep-links into /browse?style=…
const FEATURED_STYLES = [
  'Abstract',
  'Landscape',
  'Minimalist',
  'Botanical',
  'Portrait',
  'Still Life',
  'Contemporary',
  'Geometric',
];

interface FeaturedArtwork {
  id: string;
  title: string;
  artistName: string;
  artistId: string;
  price: number;
  imageUrl: string;
  medium: string;
  category: 'original' | 'print' | 'digital';
  widthCm?: number | null;
  heightCm?: number | null;
  availability?: string;
}

// Distinguish `failed` from `loaded-with-empty-array` so a transient API
// failure renders a graceful fallback section rather than silently
// collapsing the new-arrivals grid (error-states audit P1-12).
type FeaturedLoadStatus = 'loading' | 'loaded' | 'failed';

export default function HomePage() {
  const [featured, setFeatured] = useState<FeaturedArtwork[]>([]);
  const [loadStatus, setLoadStatus] = useState<FeaturedLoadStatus>('loading');

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    async function load() {
      try {
        const res = await fetch('/api/artworks/featured?limit=12', {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const json = await res.json();
          setFeatured((json.data || []) as FeaturedArtwork[]);
          setLoadStatus('loaded');
        } else {
          setLoadStatus('failed');
        }
      } catch (err) {
        clearTimeout(timeout);
        if ((err as Error).name !== 'AbortError') {
          console.error('[Home] Load error:', err);
        }
        setLoadStatus('failed');
      }
    }
    load();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div>
      <Hero />
      {loadStatus === 'failed' ? (
        <FeaturedFallback />
      ) : (
        <NewArrivals artworks={featured.slice(0, 8)} loading={loadStatus === 'loading'} />
      )}
      <ShopByStyle />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HERO — Wall of Art-style split hero: two installation photographs
   side by side with a thin uniform gap, sitting BELOW the solid nav
   (matching outer margins, nothing hidden behind the bar). Pairs
   crossfade slowly; headline + CTAs overlay the bottom-left.
   ══════════════════════════════════════════════════════════════════ */



function Hero() {
  const [index, setIndex] = useState(0);
  const [tick, setTick] = useState(0);
  const pairs = HERO_PAIRS;
  const count = pairs.length;

  useEffect(() => {
    if (count < 2) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 8000);
    return () => clearInterval(id);
  }, [count, tick]);

  const goTo = (i: number) => {
    setIndex(i);
    setTick((t) => t + 1);
  };

  return (
    <section
      className="relative"
      style={{
        // Clear the fixed nav (~4.05rem) plus one gutter of breathing room,
        // so the imagery starts below the bar with WoA-style spacing.
        paddingTop: `calc(clamp(3.6rem, 3vw + 2.6rem, 4.2rem) + ${GUTTER})`,
        paddingLeft: GUTTER,
        paddingRight: GUTTER,
      }}
      aria-label="Gallery installation"
    >
      {/* Split image field — two images side by side at EVERY viewport
          size (WoA keeps the split on mobile too; each image is a tall
          portrait crop). */}
      <div
        className="relative overflow-hidden"
        style={{ height: 'min(76svh, 780px)' }}
      >
        {pairs.map((pair, i) => (
          <div
            key={pair[0]}
            className="absolute inset-0 grid grid-cols-2"
            style={{
              gap: GUTTER,
              opacity: i === index ? 1 : 0,
              transition: 'opacity var(--dur-cinematic) var(--ease-out)',
            }}
            aria-hidden={i !== index}
          >
            {pair.map((src, i2) => (
              <div key={src} className="relative overflow-hidden">
                <Image
                  src={src}
                  alt=""
                  fill
                  priority={i === 0 && i2 === 0}
                  sizes="50vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ))}

        {/* Single bottom gradient across BOTH columns (gutter included) so
            the white overlay text stays legible where it crosses the gap. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, transparent 42%, rgba(16,16,16,0.55) 100%)',
          }}
        />

        {/* Text overlay — bottom-left */}
        <div
          className="absolute z-10"
          style={{
            left: 'clamp(1.5rem, 3vw, 2.5rem)',
            right: 'clamp(1.5rem, 3vw, 2.5rem)',
            bottom: 'clamp(2rem, 4vw, 3rem)',
            maxWidth: 720,
          }}
        >
          <div
            className="mb-5"
            style={{
              fontSize: '0.68rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            Australian art marketplace · Zero commission
          </div>
          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 4rem)',
              fontWeight: 500,
              lineHeight: 1.04,
              letterSpacing: '-0.025em',
              color: '#fff',
              margin: 0,
            }}
          >
            Original art, direct
            <br />
            from the artist.
          </h1>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/browse" className="btn-primary btn-primary--inverse no-underline">
              Browse artwork
            </Link>
            <Link href="/register?role=artist" className="btn-outline btn-outline--inverse no-underline">
              Start selling
            </Link>
          </div>
        </div>

        {/* Numbered indices — bottom-right */}
        {count > 1 && (
          <div
            className="absolute z-10 hidden sm:flex items-baseline"
            style={{
              right: 'clamp(1.5rem, 3vw, 2.5rem)',
              bottom: 'clamp(2rem, 4vw, 3rem)',
              gap: '1.25rem',
            }}
            aria-label="Hero slide selector"
          >
            {pairs.map((_, i) => {
              const active = i === index;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Show slide ${i + 1}`}
                  aria-current={active ? 'true' : undefined}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '0.35rem 0',
                    cursor: 'pointer',
                    fontSize: '0.68rem',
                    letterSpacing: '0.22em',
                    fontWeight: 500,
                    color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)',
                    borderBottom: active
                      ? '1px solid rgba(255,255,255,0.95)'
                      : '1px solid transparent',
                    transition:
                      'color var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SECTION HEADER — shared shop-style row: title left, action right.
   ══════════════════════════════════════════════════════════════════ */

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex items-baseline justify-between mb-6 lg:mb-10">
      {/* WoA-scale heading: ~18–21px, medium weight, quiet. */}
      <h2
        style={{
          fontSize: 'clamp(1.1rem, 1.6vw, 1.3rem)',
          fontWeight: 500,
          letterSpacing: '-0.01em',
          color: 'var(--color-ink)',
          margin: 0,
        }}
      >
        {title}
      </h2>
      {action && (
        <Link href={action.href} className="editorial-link no-underline shrink-0">
          {action.label}
        </Link>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   NEW ARRIVALS — the artwork leads. Responsive card grid with
   skeletons while loading; hidden entirely only when the marketplace
   is genuinely near-empty.
   ══════════════════════════════════════════════════════════════════ */

function NewArrivals({
  artworks,
  loading,
}: {
  artworks: FeaturedArtwork[];
  loading: boolean;
}) {
  if (!loading && artworks.length < 3) return null;

  return (
    <section
      className="py-10 md:py-14"
      style={{ paddingLeft: GUTTER, paddingRight: GUTTER }}
    >
      <SectionHeader
        title="New arrivals"
        action={{ href: '/browse', label: 'View all' }}
      />
      {/* WoA grid metrics: 2 cols / 8px gap on mobile, 4 cols with
          16px column + 32px row gap on desktop. */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-x-4 lg:gap-y-8">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} aria-hidden>
                <div className="skeleton aspect-[3/4] w-full" />
                <div className="skeleton mt-3 h-3.5 w-3/4" />
                <div className="skeleton mt-2 h-3 w-1/2" />
              </div>
            ))
            : artworks.map((art) => (
                <ArtworkCard
                  key={art.id}
                  id={art.id}
                  title={art.title}
                  artistName={art.artistName}
                  artistId={art.artistId}
                  price={art.price}
                  imageUrl={art.imageUrl}
                  medium={art.medium}
                  category={art.category}
                  widthCm={art.widthCm}
                  heightCm={art.heightCm}
                  availability={
                    art.availability as
                      | 'available'
                      | 'coming_soon'
                      | 'enquire_only'
                      | undefined
                  }
                />
              ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FEATURED FALLBACK — graceful degradation when the featured fetch
   fails: neutral pitch for /browse, no error language.
   ══════════════════════════════════════════════════════════════════ */

function FeaturedFallback() {
  return (
    <section
      className="py-10 md:py-14"
      style={{ paddingLeft: GUTTER, paddingRight: GUTTER }}
    >
      <SectionHeader title="The collection" />
      <p
        style={{
          fontSize: '0.9rem',
          color: 'var(--color-stone-dark)',
          lineHeight: 1.7,
          maxWidth: 520,
          marginBottom: '1.5rem',
        }}
      >
        A growing edit of original works by Australian artists. Browse the
        full catalogue — by medium, style, or price — to find the piece
        that finds you.
      </p>
      <Link href="/browse" className="btn-outline no-underline">
        Browse all works
      </Link>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SHOP BY STYLE — one-click routes into the catalogue. Mirrors the
   browse page's style filters so each chip lands on a filtered grid.
   ══════════════════════════════════════════════════════════════════ */

function ShopByStyle() {
  return (
    <section
      className="py-10 md:py-14"
      style={{
        borderTop: '1px solid var(--color-border)',
        paddingLeft: GUTTER,
        paddingRight: GUTTER,
      }}
    >
      <SectionHeader
        title="Shop by style"
        action={{ href: '/collections', label: 'Curated collections' }}
      />
      <div className="flex flex-wrap gap-2">
        {FEATURED_STYLES.map((style) => (
          <Link
            key={style}
            href={`/browse?style=${encodeURIComponent(style)}`}
            className="style-chip"
          >
            {style}
          </Link>
        ))}
      </div>
    </section>
  );
}

