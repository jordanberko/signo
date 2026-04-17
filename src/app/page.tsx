'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import EntryAnimation from '@/components/EntryAnimation';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { formatPrice } from '@/lib/utils';

/**
 * Signo homepage — five-section editorial structure.
 *
 *   1. Hero          — gallery installation photographs (100vh, click indices)
 *   2. Proposition   — zero commission value prop, dramatic "0%" anchor
 *   3. RecentlyListed — typographic list with cursor-follow image preview
 *   4. BrowseBreak   — editorial invitation to /browse
 *   5. SellCTA       — full-bleed artist call-to-action
 *
 * Typography is designed, not typeset — deliberate scale contrast between
 * the 0% display numeral (~9rem), serif headings (~2-5rem), and body (~0.88rem).
 * Upright ↔ italic shifts within headlines create internal tension.
 * Padding is tight: content flows like a single editorial spread, not islands.
 */

// Gallery installation photographs for the hero.
const HERO_SLIDES = [
  '/hero/36bc29c9-fbb9-4d66-917f-ed742abc97d4.png',
  '/hero/89a3a75a-34a9-42b4-a9bb-afe63c1d612a.png',
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

export default function HomePage() {
  const [featured, setFeatured] = useState<FeaturedArtwork[]>([]);

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
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[Home] Load error:', err);
        }
      }
    }
    load();
    return () => clearTimeout(timeout);
  }, []);

  const featuredList = featured.slice(0, 8);

  return (
    <div>
      <EntryAnimation />
      <Hero />
      <ScrollReveal>
        <Proposition />
      </ScrollReveal>
      <RecentlyListed artworks={featuredList} />
      <BrowseBreak />
      <SellCTA />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HERO — gallery installation photographs, slow crossfade
   Typography: kicker (0.62rem caps) + split-treatment tagline.
   "Where art" upright serif, "finds its people." italic serif —
   the style shift creates internal tension in one statement.
   ══════════════════════════════════════════════════════════════════ */

function Hero() {
  const [index, setIndex] = useState(0);
  const [tick, setTick] = useState(0);
  const slides = HERO_SLIDES;
  const count = slides.length;

  useEffect(() => {
    if (count < 2) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 9000);
    return () => clearInterval(id);
  }, [count, tick]);

  const goTo = (i: number) => {
    setIndex(i);
    setTick((t) => t + 1);
  };

  return (
    <section
      className="relative overflow-hidden"
      style={{ height: '100vh' }}
      aria-label="Gallery installation"
    >
      {slides.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0"
          style={{
            opacity: i === index ? 1 : 0,
            transition: 'opacity var(--dur-cinematic) var(--ease-out)',
          }}
          aria-hidden={i !== index}
        >
          <Image
            src={src}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover"
            style={{
              animation: i === index ? 'ken-burns 20s var(--ease-out) forwards' : undefined,
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, transparent 50%, rgba(26,26,24,0.6) 100%)',
            }}
          />
        </div>
      ))}

      {/* Text overlay — bottom-left */}
      <div
        className="absolute z-10 hero-overlay-text"
        style={{
          left: 'clamp(1.5rem, 4vw, 3rem)',
          right: 'clamp(1.5rem, 4vw, 3rem)',
          bottom: 'clamp(2.5rem, 6vw, 4rem)',
          maxWidth: 720,
        }}
      >
        <div
          className="mb-5"
          style={{
            fontSize: '0.62rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            fontWeight: 400,
            color: 'rgba(252, 251, 248, 0.72)',
          }}
        >
          Australian artists · est. 2026
        </div>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(3rem, 7vw, 5.5rem)',
            fontWeight: 400,
            lineHeight: 1.0,
            letterSpacing: '-0.025em',
            color: 'var(--color-warm-white)',
            margin: 0,
          }}
        >
          Where art<br />
          <em style={{ fontStyle: 'italic' }}>finds its people.</em>
        </h1>
      </div>

      {/* Numbered indices — bottom-right */}
      {count > 1 && (
        <div
          className="absolute z-10 flex items-baseline hero-slide-indices"
          style={{
            right: 'clamp(1.5rem, 4vw, 3rem)',
            bottom: 'clamp(2.5rem, 6vw, 4rem)',
            gap: '1.25rem',
          }}
          aria-label="Hero slide selector"
        >
          {slides.map((_, i) => {
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
                  fontSize: '0.62rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  fontWeight: 400,
                  color: active
                    ? 'rgba(252, 251, 248, 0.95)'
                    : 'rgba(252, 251, 248, 0.5)',
                  borderBottom: active
                    ? '1px solid rgba(252, 251, 248, 0.95)'
                    : '1px solid transparent',
                  transition: 'color var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      'rgba(252, 251, 248, 0.85)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      'rgba(252, 251, 248, 0.5)';
                  }
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PROPOSITION — the single value-prop beat, right after the hero
   Dramatic scale contrast: "0%" at ~9rem display, "commission."
   continuation at ~2.4rem italic, body at 0.88rem.
   Three typographic scales in one section = designed, not typeset.
   ══════════════════════════════════════════════════════════════════ */

function Proposition() {
  return (
    <section
      className="pt-14 md:pt-20 pb-8 md:pb-10"
      style={{ borderTop: '1px solid var(--color-border)' }}
    >
      <div className="px-6 sm:px-10">
        <div style={{ maxWidth: 800 }}>
          {/* Massive display numeral — the visual anchor */}
          <div
            className="font-serif"
            style={{
              fontSize: 'clamp(5rem, 11vw, 9rem)',
              lineHeight: 0.85,
              letterSpacing: '-0.04em',
              color: 'var(--color-ink)',
              fontWeight: 400,
            }}
          >
            0
            <span
              style={{
                fontSize: '0.35em',
                verticalAlign: 'super',
                color: 'var(--color-terracotta)',
                letterSpacing: 0,
                fontStyle: 'italic',
              }}
            >
              %
            </span>
          </div>

          {/* Italic serif continuation — reads as one thought with the numeral */}
          <h2
            className="font-serif"
            style={{
              fontSize: 'clamp(1.5rem, 2.8vw, 2.4rem)',
              fontWeight: 400,
              fontStyle: 'italic',
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
              color: 'var(--color-ink)',
              margin: 0,
              marginTop: 'clamp(0.8rem, 1.5vw, 1.2rem)',
            }}
          >
            commission. Artists keep<br />
            everything they earn.
          </h2>

          {/* Supporting detail */}
          <p
            style={{
              fontSize: '0.88rem',
              fontWeight: 300,
              color: 'var(--color-text-muted)',
              maxWidth: 400,
              lineHeight: 1.7,
              marginTop: '1.5rem',
            }}
          >
            $30/month after your first sale.
            Stripe processing is the only deduction.
          </p>

          <div className="mt-6">
            <Link href="/pricing" className="editorial-link no-underline">
              Read the full ledger
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   RECENTLY LISTED — typographic rows with cursor-follow preview
   Header uses italic serif for warmth. Rows have 3-scale hierarchy:
   title (serif 1.5rem) → artist (sans 0.82rem) → price (serif 1rem).
   ══════════════════════════════════════════════════════════════════ */

function RecentlyListed({ artworks }: { artworks: FeaturedArtwork[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: React.MouseEvent) => {
    setMouse({ x: e.clientX, y: e.clientY });
  }, []);

  if (artworks.length < 3) return null;

  return (
    <section
      className="py-6 md:py-10"
      style={{ borderTop: '1px solid var(--color-border)' }}
    >
      <div className="px-6 sm:px-10">
        {/* Header */}
        <div
            className="flex items-baseline justify-between mb-8 pb-3"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h2
              className="font-serif"
              style={{
                fontSize: '1.35rem',
                fontWeight: 400,
                fontStyle: 'italic',
                color: 'var(--color-ink)',
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              Recently listed
            </h2>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 400,
                color: 'var(--color-stone)',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              {artworks.length} works
            </span>
          </div>

        {/* List */}
        <ul className="list-none p-0 m-0" onMouseMove={handleMove}>
          {artworks.map((art, i) => (
            <li
              key={art.id}
              style={{
                opacity: 0,
                animation: `fade-up 400ms var(--ease-out) ${i * 40}ms forwards`,
              }}
            >
              <Link
                href={`/artwork/${art.id}`}
                className="no-underline block"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1fr) auto auto',
                  gap: 'clamp(1rem, 3vw, 3rem)',
                  alignItems: 'center',
                  padding: '1.15rem 0',
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-ink)',
                  transition: 'color var(--dur-base) var(--ease-out)',
                }}
                onMouseOver={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  const name = el.querySelector('.fl-name') as HTMLElement | null;
                  if (name) name.style.color = 'var(--color-terracotta)';
                }}
                onMouseOut={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  const name = el.querySelector('.fl-name') as HTMLElement | null;
                  if (name) name.style.color = 'var(--color-ink)';
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Mobile-only inline thumbnail */}
                  {art.imageUrl && (
                    <div
                      className="block md:hidden shrink-0 overflow-hidden"
                      style={{
                        width: 64,
                        height: 80,
                        border: '1px solid var(--color-ink)',
                        background: 'var(--color-cream)',
                        position: 'relative',
                      }}
                    >
                      <Image
                        src={art.imageUrl}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div
                    className="fl-name font-serif"
                    style={{
                      fontSize: 'clamp(1.2rem, 2.2vw, 1.5rem)',
                      letterSpacing: '-0.01em',
                      fontWeight: 400,
                      transition: 'color var(--dur-base) var(--ease-out)',
                      lineHeight: 1.2,
                      minWidth: 0,
                    }}
                  >
                    {art.title}
                    <span
                      style={{
                        fontWeight: 300,
                        color: 'var(--color-text-muted)',
                        fontSize: '0.8rem',
                        fontFamily: 'var(--font-sans)',
                        marginLeft: '0.8rem',
                      }}
                    >
                      {art.artistName}
                    </span>
                  </div>
                </div>
                <div
                  className="hidden md:block"
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 300,
                    color: 'var(--color-text-muted)',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {art.medium}
                </div>
                <div
                  className="font-serif"
                  style={{
                    fontSize: '1rem',
                    fontWeight: 400,
                    minWidth: 80,
                    textAlign: 'right',
                    color: 'var(--color-ink)',
                  }}
                >
                  {formatPrice(art.price)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Floating cursor preview.
          Uses translate3d rather than left/top so mousemove updates are
          composited instead of triggering layout every frame. */}
      <div
        ref={previewRef}
        className="hidden md:block"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 260,
          height: 320,
          pointerEvents: 'none',
          zIndex: 'var(--z-cursor)',
          overflow: 'hidden',
          opacity: hoverIdx !== null ? 1 : 0,
          transition: 'opacity var(--dur-base) var(--ease-out)',
          border: '1px solid var(--color-ink)',
          transform: `translate3d(${mouse.x + 24}px, ${mouse.y - 160}px, 0)`,
          willChange: 'transform',
          background: 'var(--color-cream)',
        }}
        aria-hidden
      >
        {hoverIdx !== null && artworks[hoverIdx]?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artworks[hoverIdx].imageUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   BROWSE BREAK — editorial invitation after the list
   One italic serif sentence + editorial link. Tight, minimal.
   ══════════════════════════════════════════════════════════════════ */

function BrowseBreak() {
  return (
    <section
      className="py-6 md:py-10"
      style={{ borderTop: '1px solid var(--color-border)' }}
    >
      <div className="px-6 sm:px-10">
        <p
          className="font-serif"
          style={{
            fontSize: 'clamp(1.4rem, 2.6vw, 2rem)',
            fontWeight: 400,
            fontStyle: 'italic',
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
            color: 'var(--color-ink)',
            margin: 0,
            maxWidth: 520,
          }}
        >
          These are just the latest arrivals.
        </p>
        <div className="mt-6">
          <Link href="/browse" className="editorial-link no-underline">
            Browse the full collection
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SELL CTA — The Ledger
   Radical-transparency typographic spread structured as a financial
   ledger. No imagery, no overlay — the argument IS the structure.
   Top rule draws; numerals count up in sequence; the 0% snap-lands
   between sale price and Stripe fee; a double-rule precedes the
   "You receive" total (accounting convention made live).
   Motion communicates the message: the count-up is the proof.
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
          fontSize: '0.78rem',
          fontWeight: 300,
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
        className="font-serif"
        style={{
          fontSize: isTotal
            ? 'clamp(1.55rem, 3.2vw, 2.3rem)'
            : 'clamp(1.35rem, 2.8vw, 2rem)',
          letterSpacing: '-0.02em',
          color: 'var(--color-ink)',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 400,
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
    <section
      ref={sectionRef}
      className="pt-14 md:pt-20 pb-20 md:pb-28"
      style={{
        background: 'var(--color-warm-white)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <div className="px-6 sm:px-10">
        <div style={{ maxWidth: 760 }}>
          {/* Kicker */}
          <div
            style={{
              fontSize: '0.62rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--color-stone)',
              fontWeight: 400,
              marginBottom: '1.2rem',
            }}
          >
            For artists · The ledger
          </div>

          {/* Headline — establishes the scenario */}
          <h2
            className="font-serif"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              color: 'var(--color-ink)',
              fontWeight: 400,
              margin: 0,
              marginBottom: '2.8rem',
            }}
          >
            The maths of a{' '}
            <em style={{ fontStyle: 'italic' }}>$5,000 sale.</em>
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
                  fontStyle: 'italic',
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
              fontWeight: 300,
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
            <Link href="/register" className="editorial-link no-underline">
              List your first work
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
