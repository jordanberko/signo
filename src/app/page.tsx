'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ScrollReveal from '@/components/ui/ScrollReveal';
import ArtworkCard from '@/components/ui/ArtworkCard';

/**
 * Signo homepage — clean, image-first, gallery-shop structure.
 *
 *   1. Hero          — full-bleed installation photography, headline + CTAs
 *   2. NewArrivals   — responsive grid of the latest works (the artwork
 *                      leads; the interface stays quiet)
 *   3. ShopByStyle   — one-click routes into the browse catalogue
 *   4. ZeroCommission— the platform's differentiator, stated plainly
 *   5. SellCTA       — "the ledger": animated 0%-commission maths for artists
 *
 * White ground, near-black ink, generous whitespace. No entry animation,
 * no hidden content — everything reachable within one click.
 */

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
      <ScrollReveal>
        <ZeroCommission />
      </ScrollReveal>
      <SellCTA />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HERO — Wall of Art-style split hero: two installation photographs
   side by side with a thin uniform gap, sitting BELOW the solid nav
   (matching outer margins, nothing hidden behind the bar). Pairs
   crossfade slowly; headline + CTAs overlay the bottom-left.
   ══════════════════════════════════════════════════════════════════ */

const HERO_GUTTER = 'clamp(0.75rem, 1.2vw, 1rem)'; // ≈12–16px, WoA-style

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
        paddingTop: `calc(clamp(3.6rem, 3vw + 2.6rem, 4.2rem) + ${HERO_GUTTER})`,
        paddingLeft: HERO_GUTTER,
        paddingRight: HERO_GUTTER,
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
              gap: HERO_GUTTER,
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
    <div className="flex items-baseline justify-between mb-8">
      <h2
        style={{
          fontSize: 'clamp(1.3rem, 2.4vw, 1.7rem)',
          fontWeight: 500,
          letterSpacing: '-0.02em',
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
    <section className="py-14 md:py-20">
      <div className="px-6 sm:px-10">
        <SectionHeader
          title="New arrivals"
          action={{ href: '/browse', label: 'View all' }}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-12 sm:gap-x-8">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} aria-hidden>
                  <div className="skeleton aspect-[4/5] w-full" />
                  <div className="skeleton mt-4 h-4 w-3/4" />
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
    <section className="py-14 md:py-20">
      <div className="px-6 sm:px-10">
        <SectionHeader title="The collection" />
        <p
          style={{
            fontSize: '1rem',
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
      </div>
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
      className="py-14 md:py-20"
      style={{ borderTop: '1px solid var(--color-border)' }}
    >
      <div className="px-6 sm:px-10">
        <SectionHeader
          title="Shop by style"
          action={{ href: '/collections', label: 'Curated collections' }}
        />
        <div className="flex flex-wrap gap-3">
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
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ZERO COMMISSION — the differentiator, stated plainly on a quiet
   grey band. Big numeral anchor, short copy, one link.
   ══════════════════════════════════════════════════════════════════ */

function ZeroCommission() {
  return (
    <section className="py-16 md:py-24" style={{ background: 'var(--color-cream)' }}>
      <div className="px-6 sm:px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div
            style={{
              fontSize: 'clamp(5rem, 11vw, 8.5rem)',
              lineHeight: 0.9,
              letterSpacing: '-0.04em',
              color: 'var(--color-ink)',
              fontWeight: 500,
            }}
          >
            0
            <span
              style={{
                fontSize: '0.4em',
                verticalAlign: 'super',
                color: 'var(--color-terracotta)',
              }}
            >
              %
            </span>
          </div>
          <div>
            <h2
              style={{
                fontSize: 'clamp(1.4rem, 2.6vw, 2rem)',
                fontWeight: 500,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                color: 'var(--color-ink)',
                margin: 0,
              }}
            >
              Commission-free. Artists keep everything they earn.
            </h2>
            <p
              style={{
                fontSize: '0.92rem',
                color: 'var(--color-text-muted)',
                maxWidth: 440,
                lineHeight: 1.7,
                marginTop: '1rem',
              }}
            >
              $30/month after your first sale. Stripe processing is the only
              deduction — no listing fees, no hidden cuts.
            </p>
            <div className="mt-6">
              <Link href="/pricing" className="editorial-link no-underline">
                See full pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SELL CTA — The Ledger
   Radical-transparency spread structured as a financial ledger.
   Numerals count up in sequence; the 0% snap-lands between sale price
   and Stripe fee; a double-rule precedes the "You receive" total.
   ══════════════════════════════════════════════════════════════════ */

function useCountUp({
  target,
  start,
  delay = 0,
  duration = 900,
  decimals = 0,
}: {
  target: number;
  start: boolean;
  delay?: number;
  duration?: number;
  decimals?: number;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) {
      setValue(0);
      return;
    }

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setValue(target);
      return;
    }

    let rafId: number | null = null;
    let startTime: number | null = null;

    const delayTimer = setTimeout(() => {
      function step(timestamp: number) {
        if (startTime === null) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic — matches --ease-out voice
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = target * eased;
        const factor = Math.pow(10, decimals);
        setValue(Math.round(current * factor) / factor);
        if (progress < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          setValue(target);
        }
      }
      rafId = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(delayTimer);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [target, start, delay, duration, decimals]);

  return value;
}

function fmtAUD(n: number, decimals = 2) {
  return n.toLocaleString('en-AU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function LedgerRow({
  label,
  value,
  isTotal = false,
}: {
  label: string;
  value: React.ReactNode;
  isTotal?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        padding: isTotal ? '1.25rem 0 1.35rem' : '0.95rem 0',
      }}
    >
      <span
        style={{
          fontSize: '0.8rem',
          fontWeight: 400,
          letterSpacing: '0.02em',
          color: 'var(--color-stone-dark)',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        aria-hidden
        style={{
          flex: 1,
          overflow: 'hidden',
          color: 'var(--color-stone)',
          letterSpacing: '0.4em',
          whiteSpace: 'nowrap',
          fontSize: '0.85rem',
          margin: '0 0.65rem',
          userSelect: 'none',
          transform: 'translateY(-0.18em)',
        }}
      >
        {'.'.repeat(200)}
      </span>
      <span
        style={{
          fontSize: isTotal
            ? 'clamp(1.55rem, 3.2vw, 2.3rem)'
            : 'clamp(1.35rem, 2.8vw, 2rem)',
          letterSpacing: '-0.02em',
          color: 'var(--color-ink)',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 500,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SellCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);
  const [zeroLanded, setZeroLanded] = useState(false);
  const [doubleRuleDrawn, setDoubleRuleDrawn] = useState(false);

  // Observe visibility — trigger once when section is 15% visible
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Timeline — the sequence is the message
  //   t=0      top rule draws (700ms)
  //   t=500    sale price counts up (900ms → lands at 1400)
  //   t=1500   0% snap-lands (350ms → settles at 1850)
  //   t=1900   Stripe processing counts up (600ms → lands at 2500)
  //   t=2600   double-rule draws (cascades ~450ms)
  //   t=2900   "You receive" counts up (900ms → lands at 3800)
  const salePrice = useCountUp({
    target: 5000,
    start: started,
    delay: 500,
    duration: 900,
    decimals: 2,
  });
  const stripeFee = useCountUp({
    target: 87.8,
    start: started,
    delay: 1900,
    duration: 600,
    decimals: 2,
  });
  const received = useCountUp({
    target: 4912.2,
    start: started,
    delay: 2900,
    duration: 900,
    decimals: 2,
  });

  useEffect(() => {
    if (!started) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setZeroLanded(true);
      setDoubleRuleDrawn(true);
      return;
    }

    const t1 = setTimeout(() => setZeroLanded(true), 1500);
    const t2 = setTimeout(() => setDoubleRuleDrawn(true), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [started]);

  const EASE = 'var(--ease-out)';

  return (
    <section ref={sectionRef} className="pt-16 md:pt-24 pb-20 md:pb-28">
      <div className="px-6 sm:px-10">
        <div style={{ maxWidth: 760 }}>
          {/* Kicker */}
          <div
            style={{
              fontSize: '0.68rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--color-stone)',
              fontWeight: 500,
              marginBottom: '1.2rem',
            }}
          >
            For artists · The ledger
          </div>

          {/* Headline — establishes the scenario */}
          <h2
            style={{
              fontSize: 'clamp(1.8rem, 3.6vw, 2.7rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              color: 'var(--color-ink)',
              fontWeight: 500,
              margin: 0,
              marginBottom: '2.8rem',
            }}
          >
            The maths of a $5,000 sale.
          </h2>

          {/* Top rule — draws in on entry */}
          <div
            style={{
              height: 1,
              background: 'var(--color-ink)',
              transformOrigin: 'left',
              transform: started ? 'scaleX(1)' : 'scaleX(0)',
              transition: `transform var(--dur-slow) ${EASE}`,
            }}
          />

          {/* Ledger rows */}
          <LedgerRow label="Sale price" value={`$${fmtAUD(salePrice, 2)}`} />
          <div style={{ borderBottom: '1px solid var(--color-border)' }} />

          <LedgerRow
            label="Platform commission"
            value={
              <span
                style={{
                  display: 'inline-block',
                  transform: zeroLanded ? 'scale(1)' : 'scale(0.9)',
                  opacity: zeroLanded ? 1 : 0,
                  transition: `transform var(--dur-base) ${EASE}, opacity var(--dur-base) ${EASE}`,
                  color: 'var(--color-terracotta)',
                  transformOrigin: 'right center',
                }}
              >
                0%
              </span>
            }
          />
          <div style={{ borderBottom: '1px solid var(--color-border)' }} />

          <LedgerRow
            label="Stripe processing"
            value={`$${fmtAUD(stripeFee, 2)}`}
          />

          {/* Double rule — accounting convention for totals, two-line cascade */}
          <div style={{ marginTop: '0.75rem' }}>
            <div
              style={{
                height: 1,
                background: 'var(--color-ink)',
                transformOrigin: 'left',
                transform: doubleRuleDrawn ? 'scaleX(1)' : 'scaleX(0)',
                transition: `transform 450ms ${EASE}`,
              }}
            />
            <div style={{ height: 2 }} />
            <div
              style={{
                height: 1,
                background: 'var(--color-ink)',
                transformOrigin: 'left',
                transform: doubleRuleDrawn ? 'scaleX(1)' : 'scaleX(0)',
                transition: `transform 450ms ${EASE} 80ms`,
              }}
            />
          </div>

          <LedgerRow
            label="You receive"
            value={`$${fmtAUD(received, 2)}`}
            isTotal
          />

          {/* Bottom rule — closes the ledger */}
          <div
            style={{
              height: 1,
              background: 'var(--color-ink)',
              transformOrigin: 'left',
              transform: doubleRuleDrawn ? 'scaleX(1)' : 'scaleX(0)',
              transition: `transform 450ms ${EASE} 160ms`,
            }}
          />

          {/* Supporting caption */}
          <p
            style={{
              fontSize: '0.9rem',
              color: 'var(--color-stone-dark)',
              lineHeight: 1.75,
              marginTop: '2.4rem',
              maxWidth: 460,
            }}
          >
            $30/month after your first sale. No listing fees. No hidden
            deductions. You set the price, you set the terms.
          </p>

          {/* CTA */}
          <div className="mt-8">
            <Link href="/register?role=artist" className="btn-primary no-underline">
              List your first work
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
