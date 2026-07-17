'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ArtworkCard from '@/components/ui/ArtworkCard';

/**
 * Signo homepage — pure shop structure, metrics matched to wallofart.com:
 *
 *   1. Hero          — two 4:5 portrait images, caption links below
 *   2. NewArrivals   — 2-col mobile / 4-col desktop artwork grid
 *                      (16px column gap, 32px row gap on desktop)
 *   3. ShopByStyle   — one-click routes into the browse catalogue
 *
 * ~16px outer gutters throughout, modest heading sizes (~1.2rem), small
 * quiet card typography. The 0%-commission pitch and seller ledger live
 * on /pricing and /how-it-works — the homepage sells the art.
 */

// Shared outer gutter — WoA uses a fixed 16px for page margins, the gap
// between the hero images, and the product-grid column gap, so every
// vertical line on the page aligns.
const GUTTER = '1rem';

// Hero blocks — WoA hero-banner format: two 4:5 portrait images
// (aspect-ratio 0.8, exactly their value) side by side on desktop,
// stacked full-width on mobile, each with a small caption link BELOW
// the image. No overlay text, no slideshow.
const HERO_BLOCKS = [
  {
    src: '/hero/hero_2_large_red_abstract.webp',
    href: '/browse',
    caption: 'Shop original artwork',
    alt: 'Large red abstract painting hung in a gallery interior',
  },
  {
    src: '/hero/hero_4_oak_concrete_salon.webp',
    href: '/artists',
    caption: 'Meet the artists',
    alt: 'Salon wall of original paintings in an oak and concrete interior',
  },
];

// Second image banner near the foot of the page — same WoA format,
// using the remaining two installation photographs.
const FOOTER_BLOCKS = [
  {
    src: '/hero/hero_5_botanical_still_life.webp',
    href: '/collections',
    caption: 'Explore curated collections',
    alt: 'Botanical still-life painting propped in a sunlit interior',
  },
  {
    src: '/hero/hero_3_coral_salon_hang.webp',
    href: '/just-sold',
    caption: 'Recently acquired',
    alt: 'Coral-toned salon hang of original paintings',
  },
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
      <FooterBanner />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HERO — exact WoA hero-banner format: two 4:5 portrait images in a
   1fr/1fr grid with a 16px gap (stacked full-width on mobile), sitting
   below the solid nav. Small caption links under each image; the page
   headline is present for SEO/screen readers only.
   ══════════════════════════════════════════════════════════════════ */

function ImagePair({
  blocks,
  priority = false,
}: {
  blocks: typeof HERO_BLOCKS;
  priority?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: GUTTER }}>
      {blocks.map((block, i) => (
        <div key={block.src}>
          <Link
            href={block.href}
            className="block relative overflow-hidden no-underline"
            style={{ aspectRatio: '4 / 5', background: 'var(--color-cream)' }}
          >
            <Image
              src={block.src}
              alt={block.alt}
              fill
              priority={priority && i === 0}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </Link>
          {/* Caption link below the image — WoA image-block text row */}
          <div className="mt-3 md:mt-4">
            <Link
              href={block.href}
              className="footer-link no-underline"
              style={{ fontSize: '0.82rem', fontWeight: 400 }}
            >
              {block.caption} →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function Hero() {
  return (
    <section
      style={{
        // Clear the fixed nav (~4.05rem) plus one gutter of breathing room.
        paddingTop: `calc(clamp(3.6rem, 3vw + 2.6rem, 4.2rem) + ${GUTTER})`,
        paddingLeft: GUTTER,
        paddingRight: GUTTER,
      }}
      aria-label="Gallery installation"
    >
      <h1 className="sr-only">
        Original art, direct from Australian artists — zero commission.
      </h1>
      <ImagePair blocks={HERO_BLOCKS} priority />
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FOOTER BANNER — second WoA-style image pair near the foot of the
   page, beneath Shop by style.
   ══════════════════════════════════════════════════════════════════ */

function FooterBanner() {
  return (
    <section
      className="pb-10 md:pb-14"
      style={{ paddingLeft: GUTTER, paddingRight: GUTTER }}
      aria-label="Collections and recent acquisitions"
    >
      <ImagePair blocks={FOOTER_BLOCKS} />
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

