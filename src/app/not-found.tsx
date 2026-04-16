import Link from 'next/link';

export default function NotFound() {
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
          404
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
          This work<br />
          <em style={{ color: 'var(--color-terracotta)', fontStyle: 'italic' }}>
            is no longer on view.
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
          The page you&apos;re looking for may have been moved, or it may never
          have existed. Try browsing the marketplace, or return home.
        </p>
        <div className="mt-10 flex gap-8">
          <Link href="/" className="editorial-link no-underline">
            Return home
          </Link>
          <Link href="/browse" className="editorial-link no-underline">
            Browse artwork
          </Link>
        </div>
      </div>
    </div>
  );
}
