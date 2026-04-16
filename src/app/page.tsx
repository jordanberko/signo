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
  const sellCtaImage = featured.find((a) => a.imageUrl)?.imageUrl ?? null;

  return (
    <div>
      <EntryAnimation />
      <Hero />
      <ScrollReveal>
        <Proposition />
      </ScrollReveal>
      <RecentlyListed artworks={featuredList} />
      <BrowseBreak />
      <SellCTA imageUrl={sellCtaImage} />
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
            transition: 'opacity 1500ms cubic-bezier(0.22, 1, 0.36, 1)',
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
              animation: i === index ? 'ken-burns 20s cubic-bezier(0.22, 1, 0.36, 1) forwards' : undefined,
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
                  transition: 'color 350ms cubic-bezier(0.22, 1, 0.36, 1), border-color 350ms cubic-bezier(0.22, 1, 0.36, 1)',
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
      className="py-14 md:py-20"
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
      className="py-12 md:py-16"
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
                animation: `fade-up 400ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 40}ms forwards`,
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
                  transition: 'color 350ms cubic-bezier(0.22, 1, 0.36, 1)',
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
                      transition: 'color 350ms cubic-bezier(0.22, 1, 0.36, 1)',
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

      {/* Floating cursor preview */}
      <div
        ref={previewRef}
        className="hidden md:block"
        style={{
          position: 'fixed',
          width: 260,
          height: 320,
          pointerEvents: 'none',
          zIndex: 100,
          overflow: 'hidden',
          opacity: hoverIdx !== null ? 1 : 0,
          transition: 'opacity 350ms cubic-bezier(0.22, 1, 0.36, 1)',
          border: '1px solid var(--color-ink)',
          left: mouse.x + 24,
          top: mouse.y - 160,
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
      className="py-14 md:py-20"
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
   SELL CTA — full-bleed image (or cream fallback), artist-facing
   Single consolidated artist call-to-action.
   ══════════════════════════════════════════════════════════════════ */

function SellCTA({ imageUrl }: { imageUrl: string | null }) {
  if (imageUrl) {
    return (
      <section
        className="relative overflow-hidden"
        style={{ height: '55vh', minHeight: 440 }}
      >
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'rgba(26,26,24,0.6)' }}
        />
        <div
          className="absolute z-10"
          style={{
            left: 'clamp(1.5rem, 4vw, 2.5rem)',
            right: 'clamp(1.5rem, 4vw, 2.5rem)',
            bottom: 'clamp(2.5rem, 5vw, 3.5rem)',
            maxWidth: 560,
          }}
        >
          <ScrollReveal>
            <div
              className="mb-5"
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                fontWeight: 400,
                color: 'rgba(252, 251, 248, 0.65)',
              }}
            >
              For artists
            </div>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
                color: 'var(--color-warm-white)',
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
                fontWeight: 400,
                margin: 0,
              }}
            >
              Your art,<br />
              <em style={{ fontStyle: 'italic' }}>your terms.</em>
            </h2>
            <p
              style={{
                fontSize: '0.88rem',
                fontWeight: 300,
                color: 'rgba(252, 251, 248, 0.68)',
                lineHeight: 1.7,
                marginTop: '1.2rem',
                marginBottom: '1.6rem',
                maxWidth: 420,
              }}
            >
              Join a growing community of Australian artists selling directly to
              collectors. Zero commission. Zero platform fees.
            </p>
            <Link
              href="/register"
              className="inline-block no-underline"
              style={{
                fontSize: '0.68rem',
                fontWeight: 400,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--color-warm-white)',
                paddingBottom: '0.25rem',
                borderBottom: '1px solid rgba(252, 251, 248, 0.45)',
                transition: 'border-color 350ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.borderBottomColor =
                  'rgba(252, 251, 248, 0.95)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.borderBottomColor =
                  'rgba(252, 251, 248, 0.45)')
              }
            >
              Start selling on Signo
            </Link>
          </ScrollReveal>
        </div>
      </section>
    );
  }

  // Cream fallback — no featured image available
  return (
    <section
      className="py-16 md:py-20"
      style={{
        background: 'var(--color-cream)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <div className="px-6 sm:px-10">
        <div style={{ maxWidth: 560 }}>
          <ScrollReveal>
            <div
              className="mb-5"
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                fontWeight: 400,
              }}
            >
              For artists
            </div>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
                fontWeight: 400,
                color: 'var(--color-ink)',
                margin: 0,
              }}
            >
              Your art,<br />
              <em style={{ fontStyle: 'italic', color: 'var(--color-terracotta)' }}>
                your terms.
              </em>
            </h2>
            <p
              style={{
                fontSize: '0.88rem',
                fontWeight: 300,
                lineHeight: 1.7,
                color: 'var(--color-stone-dark)',
                maxWidth: 420,
                marginTop: '1.2rem',
              }}
            >
              Join a growing community of Australian artists selling directly to
              collectors. Zero commission. Zero platform fees.
            </p>
            <div className="mt-8">
              <Link href="/register" className="editorial-link no-underline">
                Start selling on Signo
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
