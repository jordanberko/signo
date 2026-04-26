'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

/**
 * PREVIEW ROUTE — delete after object-position values are dialled in.
 * Mirrors the homepage Hero with HERO_SLIDES refactored from string[]
 * to {src, objectPosition}[] so each slide can declare its own focal
 * point. object-position applies on every slide (active and inactive)
 * so framing is correct from the instant a slide fades in; the Ken
 * Burns animation stays conditional on the active slide.
 */

const HERO_SLIDES = [
  {
    src: '/hero/hero_2_large_red_abstract.webp',
    objectPosition: '40% 45%',
  },
  {
    src: '/hero/hero_5_botanical_still_life.webp',
    objectPosition: '55% 45%',
  },
  {
    src: '/hero/hero_4_oak_concrete_salon.webp',
    objectPosition: '65% 50%',
  },
  {
    src: '/hero/hero_3_coral_salon_hang.webp',
    objectPosition: '60% 45%',
  },
];

export default function HeroPreviewMobileFixPage() {
  return <Hero />;
}

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
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 7000);
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
      {slides.map((slide, i) => (
        <div
          key={slide.src}
          className="absolute inset-0"
          style={{
            opacity: i === index ? 1 : 0,
            transition: 'opacity var(--dur-cinematic) var(--ease-out)',
          }}
          aria-hidden={i !== index}
        >
          <Image
            src={slide.src}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover"
            style={{
              objectPosition: slide.objectPosition,
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
