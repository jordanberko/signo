'use client';

import Link from 'next/link';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="min-h-[80vh] flex items-center"
      style={{ paddingTop: '8rem' }}
    >
      <div className="px-6 sm:px-10 w-full">
        <div
          className="mb-6"
          style={{
            fontSize: '0.68rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            fontWeight: 400,
          }}
        >
          Error
        </div>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(2.8rem, 6vw, 5.5rem)',
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: 'var(--color-ink)',
            maxWidth: 900,
            margin: 0,
          }}
        >
          Something<br />
          <em style={{ color: 'var(--color-terracotta)', fontStyle: 'italic' }}>
            slipped out of frame.
          </em>
        </h1>
        <p
          style={{
            fontSize: '0.9rem',
            fontWeight: 300,
            lineHeight: 1.7,
            color: 'var(--color-stone-dark)',
            maxWidth: 420,
            marginTop: '2rem',
          }}
        >
          An unexpected error interrupted this page. You can try reloading, or
          head back to the home page.
        </p>
        <div className="mt-10 flex gap-8">
          <button
            type="button"
            onClick={() => reset()}
            className="editorial-link bg-transparent border-0 cursor-pointer p-0"
            style={{ paddingBottom: '0.2rem' }}
          >
            Try again
          </button>
          <Link href="/" className="editorial-link no-underline">
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
