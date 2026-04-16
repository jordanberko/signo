'use client';

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';

/**
 * ArtworkViewer — gallery white-cube viewing mode for a single artwork.
 *
 * Cycles through the uploaded images/photos of ONE artwork (front view,
 * detail shot, angle, back, etc.) — NOT different artworks by the artist.
 *
 * Pure white (#ffffff) background. Image constrained to 70vw × 70vh,
 * centred with generous negative space — more wall than painting.
 *
 * Chrome (absolutely positioned, fades in after image arrives):
 *   • Top-right: editorial "Close" link
 *   • Bottom-left: serif pagination numerals (one per photo)
 *   • Bottom-centre: caption — artist name · italic title
 *
 * Entry/exit: shared-element FLIP transition (550ms, primary ease-out).
 * Navigation: ← → arrows, swipe, or click pagination numerals.
 */

interface Props {
  images: string[];
  initialImageIndex: number;
  artworkTitle: string;
  artistName: string;
  sourceRect: DOMRect | null;
  onClose: () => void;
}

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const DUR = 550;

export default function ArtworkViewer({
  images,
  initialImageIndex,
  artworkTitle,
  artistName,
  sourceRect,
  onClose,
}: Props) {
  const [index, setIndex] = useState(initialImageIndex);
  const [phase, setPhase] = useState<'measure' | 'enter' | 'open' | 'exit'>(
    'measure'
  );
  const [flipTransform, setFlipTransform] = useState('');
  const imgWrapRef = useRef<HTMLDivElement>(null);
  const sourceRectRef = useRef(sourceRect);
  const prefersReduced = useRef(false);

  const count = images.length;
  const image = images[index] || '';

  /* ── Reduced motion check ── */
  useEffect(() => {
    prefersReduced.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  /* ── Scroll lock ── */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  /* ── FLIP entry: measure → invert → play ── */
  useLayoutEffect(() => {
    if (phase !== 'measure') return;

    if (!sourceRectRef.current || prefersReduced.current) {
      setPhase('open');
      return;
    }

    const el = imgWrapRef.current;
    if (!el) {
      setPhase('open');
      return;
    }

    const target = el.getBoundingClientRect();
    const src = sourceRectRef.current;

    const sx = src.width / target.width;
    const sy = src.height / target.height;
    const s = Math.max(sx, sy);

    const tx = src.left + src.width / 2 - (target.left + target.width / 2);
    const ty = src.top + src.height / 2 - (target.top + target.height / 2);

    setFlipTransform(`translate(${tx}px, ${ty}px) scale(${s})`);
    setPhase('enter');
  }, [phase]);

  /* ── Trigger entry animation after inverted position paints ── */
  useEffect(() => {
    if (phase !== 'enter') return;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFlipTransform('');
        setPhase('open');
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  /* ── Close with reverse FLIP ── */
  const handleClose = useCallback(() => {
    if (phase === 'exit') return;

    if (sourceRectRef.current && !prefersReduced.current) {
      const el = imgWrapRef.current;
      if (el) {
        const target = el.getBoundingClientRect();
        const src = sourceRectRef.current;
        const sx = src.width / target.width;
        const sy = src.height / target.height;
        const s = Math.max(sx, sy);
        const tx =
          src.left + src.width / 2 - (target.left + target.width / 2);
        const ty =
          src.top + src.height / 2 - (target.top + target.height / 2);
        setFlipTransform(`translate(${tx}px, ${ty}px) scale(${s})`);
      }
    }

    setPhase('exit');
    setTimeout(onClose, DUR);
  }, [phase, onClose]);

  /* ── Keyboard: ← → Escape ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
      if (count <= 1) return;
      if (e.key === 'ArrowLeft')
        setIndex((i) => (i > 0 ? i - 1 : count - 1));
      if (e.key === 'ArrowRight')
        setIndex((i) => (i < count - 1 ? i + 1 : 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose, count]);

  /* ── Mobile swipe ── */
  const touchX = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null || count <= 1) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 60) {
      setIndex((i) =>
        dx > 0 ? (i > 0 ? i - 1 : count - 1) : i < count - 1 ? i + 1 : 0
      );
    }
    touchX.current = null;
  }

  /* ── Preload adjacent images ── */
  useEffect(() => {
    if (count <= 1) return;
    [-1, 1].forEach((offset) => {
      const idx = (index + offset + count) % count;
      const src = images[idx];
      if (src) {
        const img = new window.Image();
        img.src = src;
      }
    });
  }, [index, images, count]);

  /* ── Crossfade key (remounts <img> for fade-in animation) ── */
  const [fadeKey, setFadeKey] = useState(0);
  useEffect(() => {
    setFadeKey((k) => k + 1);
  }, [index]);

  const showChrome = phase === 'open';

  return (
    <div
      className="fixed inset-0 z-[500]"
      style={{
        background:
          phase === 'measure' ? 'rgba(255,255,255,0)' : '#ffffff',
        transition: `background ${DUR}ms ${EASE_OUT}`,
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label="Artwork viewing mode"
    >
      {/* ── Close — top right ── */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: 'clamp(1.5rem, 3vw, 2.5rem)',
          right: 'clamp(1.5rem, 4vw, 3rem)',
          zIndex: 10,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.68rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase' as const,
          color: 'var(--color-stone-dark)',
          padding: '0.5rem',
          opacity: showChrome ? 1 : 0,
          transition: `opacity 350ms ${EASE_OUT} 200ms`,
          fontWeight: 400,
          fontFamily: 'inherit',
        }}
        aria-label="Close viewing mode"
      >
        Close
      </button>

      {/* ── Artwork — centred in viewport, constrained to 70vw × 70vh ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          ref={imgWrapRef}
          style={{
            maxWidth: '70vw',
            maxHeight: '70vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: flipTransform || 'none',
            transition:
              phase === 'open' || phase === 'exit'
                ? `transform ${DUR}ms ${EASE_OUT}`
                : 'none',
            transformOrigin: 'center center',
            pointerEvents: 'auto',
          }}
        >
          {image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={`viewer-${index}-${fadeKey}`}
              src={image}
              alt={`${artworkTitle} — photo ${index + 1}`}
              style={{
                maxWidth: '70vw',
                maxHeight: '70vh',
                objectFit: 'contain',
                display: 'block',
                opacity: phase === 'exit' || phase === 'enter' ? 1 : 0,
                animation:
                  phase === 'open'
                    ? `fade-in 350ms ${EASE_OUT} forwards`
                    : 'none',
              }}
              draggable={false}
            />
          )}
        </div>
      </div>

      {/* ── Pagination — bottom left (one numeral per photo of this artwork) ── */}
      {count > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: 'clamp(1.5rem, 4vh, 3rem)',
            left: 'clamp(1.5rem, 4vw, 3rem)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'baseline',
            gap: 'clamp(0.4rem, 0.8vw, 0.8rem)',
            opacity: showChrome ? 1 : 0,
            transition: `opacity 350ms ${EASE_OUT} 200ms`,
            pointerEvents: showChrome ? 'auto' : 'none',
          }}
        >
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className="font-serif"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.2rem 0.1rem',
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                fontWeight: 400,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                color:
                  i === index
                    ? 'var(--color-ink)'
                    : 'var(--color-stone)',
                transition: `color 350ms ${EASE_OUT}`,
              }}
              aria-label={`View photo ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* ── Caption — bottom centre ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 'clamp(1.5rem, 4vh, 3rem)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          textAlign: 'center',
          opacity: showChrome ? 1 : 0,
          transition: `opacity 350ms ${EASE_OUT} 200ms`,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          paddingBottom: '0.3rem',
        }}
      >
        <span
          style={{
            fontSize: '0.82rem',
            fontWeight: 300,
            color: 'var(--color-stone-dark)',
          }}
        >
          {artistName}
        </span>
        <span
          style={{
            display: 'inline-block',
            width: '1px',
            height: '0.75em',
            background: 'var(--color-stone)',
            margin: '0 0.75em',
            verticalAlign: 'middle',
            opacity: 0.4,
          }}
        />
        <span
          className="font-serif"
          style={{
            fontSize: '0.88rem',
            fontStyle: 'italic',
            color: 'var(--color-ink)',
          }}
        >
          {artworkTitle}
        </span>
      </div>
    </div>
  );
}
