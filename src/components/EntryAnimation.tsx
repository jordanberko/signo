'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'signo_entry_seen';
const TOTAL_DURATION = 2800; // ms — remove overlay after animation

export default function EntryAnimation() {
  const [show, setShow] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Skip if already seen this session, or reduced motion preferred
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    sessionStorage.setItem(STORAGE_KEY, '1');
    setShow(true);

    // Start fade-out near end
    const fadeTimer = setTimeout(() => setFadeOut(true), TOTAL_DURATION - 600);
    // Remove from DOM after fade completes
    const removeTimer = setTimeout(() => setShow(false), TOTAL_DURATION);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!show) return null;

  return (
    <>
      <style>{`
        @keyframes entry-wordmark {
          from { letter-spacing: -0.02em; opacity: 0; }
          to   { letter-spacing: 0.1em;  opacity: 1; }
        }
        @keyframes entry-dot {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes entry-subtitle {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes entry-fade-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>
      <div
        className="fixed inset-0 flex flex-col items-center justify-center"
        style={{
          zIndex: 99999,
          background: 'var(--color-sand, #f5f2ed)',
          animation: fadeOut ? 'entry-fade-out 0.6s ease-out forwards' : undefined,
        }}
      >
        {/* Wordmark */}
        <div className="flex items-baseline">
          <span
            style={{
              fontFamily: 'var(--font-satoshi), Helvetica Neue, Helvetica, Arial, sans-serif',
              fontSize: 'clamp(48px, 8vw, 80px)',
              fontWeight: 600,
              color: 'var(--color-primary, #1a1a1a)',
              animation: 'entry-wordmark 1s cubic-bezier(0.22, 1, 0.36, 1) forwards',
              opacity: 0,
            }}
          >
            SIGNO
          </span>
          <span
            style={{
              fontFamily: 'var(--font-satoshi), Helvetica Neue, Helvetica, Arial, sans-serif',
              fontSize: 'clamp(48px, 8vw, 80px)',
              fontWeight: 600,
              fontStyle: 'italic',
              color: 'var(--color-accent, #6b7c4e)',
              animation: 'entry-dot 0.4s ease-out 1s forwards',
              opacity: 0,
            }}
          >
            .
          </span>
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: 'var(--font-satoshi), Helvetica Neue, Helvetica, Arial, sans-serif',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--color-muted, #7a7a72)',
            marginTop: '12px',
            animation: 'entry-subtitle 0.6s ease-out 1.4s forwards',
            opacity: 0,
          }}
        >
          Curated Australian Art
        </p>
      </div>
    </>
  );
}
