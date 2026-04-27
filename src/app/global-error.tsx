'use client';

import { useEffect } from 'react';

// Inline styles only — this file replaces the root layout when the
// layout itself has crashed, so globals.css and next/font are not
// guaranteed to be available. Hex colors and system-font fallbacks
// keep the gallery aesthetic alive even when everything else is gone.

const SERIF = '"Instrument Serif", Georgia, "Times New Roman", serif';
const SANS = '"Outfit", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

const INK = '#1a1a18';
const TERRACOTTA = '#c45d3e';
const STONE = '#b8b2a4';
const STONE_DARK = '#8a8478';
const WARM_WHITE = '#fcfbf8';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Error — Signo</title>
      </head>
      <body
        style={{
          margin: 0,
          backgroundColor: WARM_WHITE,
          color: INK,
          fontFamily: SANS,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <main
          style={{
            maxWidth: '60rem',
            margin: '0 auto',
            padding: '8rem 1.5rem 4rem',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <p
            style={{
              fontSize: '0.68rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: STONE,
              fontWeight: 400,
              margin: 0,
              marginBottom: '1.5rem',
            }}
          >
            Error
          </p>
          <h1
            style={{
              fontFamily: SERIF,
              fontSize: 'clamp(2.8rem, 6vw, 5.5rem)',
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: INK,
              maxWidth: 900,
              margin: 0,
            }}
          >
            The room has<br />
            <em style={{ color: TERRACOTTA, fontStyle: 'italic' }}>
              gone dark.
            </em>
          </h1>
          <p
            style={{
              fontSize: '0.9rem',
              fontWeight: 300,
              lineHeight: 1.7,
              color: STONE_DARK,
              maxWidth: 420,
              marginTop: '2rem',
            }}
          >
            Something deeper than a single page has interrupted the site.
            Try reloading; if it persists, please come back shortly.
          </p>
          <div style={{ marginTop: '2.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                fontSize: '1rem',
                color: INK,
                background: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${INK}`,
                padding: 0,
                paddingBottom: '0.2rem',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            {/*
              Bare <a> on purpose: the React tree is in an unknown state when
              global-error fires (the root layout has thrown), so next/link's
              client-side router can't be trusted. A hard browser navigation
              is the only reliable escape hatch.
            */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                fontSize: '1rem',
                color: INK,
                textDecoration: 'none',
                borderBottom: `1px solid ${INK}`,
                paddingBottom: '0.2rem',
              }}
            >
              Return home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
