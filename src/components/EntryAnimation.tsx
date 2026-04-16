'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Entry animation with frame-perfect handoff to the homepage.
 *
 * The "Signo" wordmark is rendered at the nav's exact position and font size,
 * then transformed (translate + scale) to appear centred at display size.
 * During the "journey" phase the transform transitions to `none`, so the
 * wordmark smoothly shrinks and glides into its nav position. At settle,
 * it fades out while the real nav wordmark fades in behind it — same position,
 * same size, same color. The user perceives one continuous element.
 *
 * Coordination with Header + Hero uses `body[data-entry-active]` and matching
 * CSS rules in globals.css (opacity: 0 !important during entry, then
 * transition on removal).
 *
 * Return visitors (within 24 h): compressed version — no subtitle, faster journey.
 * After 24 h: full version replays (brand re-introduction).
 * prefers-reduced-motion: skip entirely.
 * Click to skip: jumps to journey phase with compressed timing.
 */

const SESSION_KEY = 'signo_entry_seen';
const TIMESTAMP_KEY = 'signo_entry_last';
const DAY_MS = 24 * 60 * 60 * 1000;
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

type Phase = 'hidden' | 'reveal' | 'hold' | 'journey' | 'settle' | 'done';

interface NavTarget {
  left: number;
  top: number;
  fontSize: number;
  centerTx: number;
  centerTy: number;
  scale: number;
}

/** Measure the real nav wordmark element or approximate from CSS values. */
function measureNav(): NavTarget {
  const el = document.querySelector('[data-nav-wordmark]') as HTMLElement | null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const displayPx = Math.min(96, Math.max(56, vw * 0.09));

  if (el) {
    const rect = el.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(el).fontSize);
    const s = displayPx / fs;
    return {
      left: rect.left,
      top: rect.top,
      fontSize: fs,
      centerTx: vw / 2 - (rect.left + rect.width / 2),
      centerTy: vh / 2 - (rect.top + rect.height / 2),
      scale: s,
    };
  }

  // Fallback: approximate from nav CSS values (px-6 / py-5, sm:px-10 / py-6)
  const fs = 25.6;
  const s = displayPx / fs;
  const approxLeft = vw >= 640 ? 40 : 24;
  const approxTop = vw >= 640 ? 24 : 20;
  return {
    left: approxLeft,
    top: approxTop,
    fontSize: fs,
    centerTx: vw / 2 - approxLeft - fs / 2,
    centerTy: vh / 2 - approxTop - fs / 2,
    scale: s,
  };
}

export default function EntryAnimation() {
  const [phase, setPhase] = useState<Phase>('hidden');
  const [compressed, setCompressed] = useState(false);
  const [nav, setNav] = useState<NavTarget | null>(null);

  /* ── Initialise: decide which version, measure nav, lock scroll ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    // Wait one frame so the nav is fully laid out before measuring
    const raf = requestAnimationFrame(() => {
      const lastStr = localStorage.getItem(TIMESTAMP_KEY);
      const isReturn = lastStr
        ? Date.now() - parseInt(lastStr, 10) < DAY_MS
        : false;

      sessionStorage.setItem(SESSION_KEY, '1');
      localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));

      setNav(measureNav());
      setCompressed(isReturn);

      document.body.style.overflow = 'hidden';
      document.body.dataset.entryActive = '';

      setPhase('reveal');
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  /* ── Phase sequencer ── */
  useEffect(() => {
    if (phase === 'hidden' || phase === 'done') return;

    const t: ReturnType<typeof setTimeout>[] = [];
    const after = (fn: () => void, ms: number) => t.push(setTimeout(fn, ms));

    if (compressed) {
      // Compressed: ~1250ms total
      switch (phase) {
        case 'reveal':
          after(() => setPhase('journey'), 300);
          break;
        case 'journey':
          after(() => setPhase('settle'), 800);
          break;
        case 'settle':
          // Release the homepage 50ms into settle so the nav wordmark
          // fades in while the entry wordmark fades out.
          after(() => {
            delete document.body.dataset.entryActive;
            document.body.style.overflow = '';
          }, 50);
          after(() => setPhase('done'), 250);
          break;
      }
    } else {
      // Full: ~2800ms total
      // reveal 0–1000 | hold 1000–1500 | journey 1500–2600 | settle 2600–2900
      switch (phase) {
        case 'reveal':
          after(() => setPhase('hold'), 1000);
          break;
        case 'hold':
          after(() => setPhase('journey'), 500);
          break;
        case 'journey':
          after(() => setPhase('settle'), 1100);
          break;
        case 'settle':
          after(() => {
            delete document.body.dataset.entryActive;
            document.body.style.overflow = '';
          }, 50);
          after(() => setPhase('done'), 300);
          break;
      }
    }

    return () => t.forEach(clearTimeout);
  }, [phase, compressed]);

  /* ── Click to skip: jump to journey with compressed timing ── */
  const skip = useCallback(() => {
    if (phase === 'hidden' || phase === 'done' || phase === 'settle' || phase === 'journey') return;
    setCompressed(true);
    setPhase('journey');
  }, [phase]);

  if (phase === 'hidden' || phase === 'done' || !nav) return null;

  const isJourneying = phase === 'journey' || phase === 'settle';
  const isSettling = phase === 'settle';
  const dur = compressed ? 800 : 1000;
  const centerTransform = `translate(${nav.centerTx}px, ${nav.centerTy}px) scale(${nav.scale})`;

  return (
    <div
      className="fixed inset-0"
      style={{
        zIndex: 99999,
        cursor: isSettling ? 'default' : 'pointer',
        pointerEvents: isSettling ? 'none' : 'auto',
      }}
      onClick={skip}
      role="presentation"
      aria-hidden
    >
      {/* ── Cream background — dissolves during journey, revealing the hero ── */}
      <div
        className="absolute inset-0"
        style={{
          background: 'var(--color-warm-white)',
          opacity: isJourneying ? 0 : 1,
          transition: isJourneying ? `opacity ${dur}ms ${EASE_OUT}` : undefined,
        }}
      />

      {/* ── Subtitle — full version only, reveal + hold phases ── */}
      {!compressed && (phase === 'reveal' || phase === 'hold') && (
        <p
          style={{
            position: 'absolute',
            left: '50%',
            top: 'calc(50% + clamp(44px, 5vw, 64px))',
            transform: 'translateX(-50%)',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            fontSize: '0.72rem',
            fontWeight: 300,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--color-stone-dark)',
            margin: 0,
            whiteSpace: 'nowrap',
            opacity: phase === 'hold' ? 1 : 0,
            animation:
              phase === 'reveal'
                ? `entry-sub-in 350ms ${EASE_OUT} 600ms forwards`
                : undefined,
          }}
        >
          Curated Australian art
        </p>
      )}

      {/* ── Wordmark — positioned at nav location, transformed to centre ──
           During reveal/hold: transform places it centred at display scale.
           During journey: transform transitions to `none` → it arrives at the
           nav position at nav size. Color shifts from ink to white.
           During settle: opacity fades to 0 while the real nav wordmark
           fades in behind it — frame-perfect handoff. */}
      <span
        className="font-serif"
        style={{
          position: 'fixed',
          left: nav.left,
          top: nav.top,
          fontSize: `${nav.fontSize}px`,
          lineHeight: 1,
          fontWeight: 400,
          letterSpacing: '-0.01em',
          transformOrigin: 'center',
          zIndex: 1,
          margin: 0,
          padding: 0,

          transform: isJourneying ? 'none' : centerTransform,
          color: isJourneying ? '#fff' : 'var(--color-ink)',

          opacity: (() => {
            if (isSettling) return 0;
            if (phase === 'reveal' && !compressed) return 0; // keyframe handles fade-in
            return 1;
          })(),

          transition: (() => {
            if (isSettling) return `opacity 200ms ${EASE_OUT}`;
            if (phase === 'journey')
              return `transform ${dur}ms ${EASE_OUT}, color ${dur}ms ${EASE_OUT}, opacity 200ms ${EASE_OUT}`;
            return undefined;
          })(),

          animation:
            phase === 'reveal' && !compressed
              ? `entry-wordmark-in 900ms ${EASE_OUT} forwards`
              : undefined,
        }}
      >
        Signo
      </span>

      <style>{`
        @keyframes entry-wordmark-in {
          from { opacity: 0; letter-spacing: -0.03em; }
          to   { opacity: 1; letter-spacing: -0.01em; }
        }
        @keyframes entry-sub-in {
          from { opacity: 0; transform: translateX(-50%) translateY(6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
