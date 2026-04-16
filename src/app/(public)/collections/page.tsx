'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface CollectionCard {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  artwork_count: number;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionCard[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function fetchCollections() {
      try {
        const res = await fetch('/api/collections');
        const json = await res.json();
        if (res.ok) {
          setCollections(json.data || []);
        }
      } catch (err) {
        console.error('[Collections] Fetch error:', err);
      } finally {
        setLoaded(true);
      }
    }
    fetchCollections();
  }, []);

  return (
    <div style={{ background: 'var(--color-warm-white)' }}>
      {/* ── Editorial header ── */}
      <header
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(4rem, 9vw, 7rem)',
          paddingBottom: 'clamp(2.5rem, 5vw, 4rem)',
        }}
      >
        <p
          style={{
            fontSize: '0.68rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            marginBottom: '1.2rem',
          }}
        >
          Curated
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(2.6rem, 6vw, 4.8rem)',
            lineHeight: 1.02,
            letterSpacing: '-0.015em',
            color: 'var(--color-ink)',
            fontWeight: 400,
            maxWidth: '22ch',
          }}
        >
          Collections, <em style={{ fontStyle: 'italic' }}>thoughtfully grouped.</em>
        </h1>
        <p
          style={{
            marginTop: '1.6rem',
            fontSize: '0.92rem',
            fontWeight: 300,
            lineHeight: 1.6,
            color: 'var(--color-stone-dark)',
            maxWidth: '46ch',
          }}
        >
          {loaded && collections.length > 0
            ? `${collections.length} curated ${collections.length === 1 ? 'edit' : 'edits'} — handpicked threads running through the roster, from quiet interiors to the edge of abstraction.`
            : 'Handpicked threads running through the roster, from quiet interiors to the edge of abstraction.'}
        </p>
      </header>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── Grid ── */}
      <section
        className="px-6 sm:px-10"
        style={{ paddingTop: 'clamp(3rem, 5vw, 4.5rem)', paddingBottom: 'clamp(4rem, 7vw, 6rem)' }}
      >
        {!loaded ? (
          <p
            className="font-serif"
            style={{
              fontSize: '1.1rem',
              fontStyle: 'italic',
              color: 'var(--color-stone)',
              fontWeight: 300,
            }}
          >
            Loading the edits…
          </p>
        ) : collections.length === 0 ? (
          <div style={{ maxWidth: '46ch', paddingTop: '2rem', paddingBottom: '5rem' }}>
            <p
              className="font-serif"
              style={{
                fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                lineHeight: 1.15,
                color: 'var(--color-ink)',
              }}
            >
              New collections are being assembled.
            </p>
            <p
              style={{
                marginTop: '1rem',
                fontSize: '0.88rem',
                color: 'var(--color-stone-dark)',
                fontWeight: 300,
                lineHeight: 1.6,
              }}
            >
              Curatorial edits are published monthly.
            </p>
            <Link
              href="/browse"
              className="editorial-link"
              style={{ marginTop: '1.6rem', display: 'inline-block' }}
            >
              Browse current works →
            </Link>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            style={{ gap: 'clamp(2rem, 4vw, 3.5rem)' }}
          >
            {collections.map((collection, i) => {
              const num = String(i + 1).padStart(2, '0');
              return (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  className="img-zoom"
                  style={{
                    display: 'block',
                    textDecoration: 'none',
                  }}
                >
                  {/* Cover */}
                  <div
                    style={{
                      aspectRatio: '4 / 5',
                      background: 'var(--color-cream)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {collection.cover_image_url ? (
                      <Image
                        src={collection.cover_image_url}
                        alt={collection.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.62rem',
                            letterSpacing: '0.22em',
                            textTransform: 'uppercase',
                            color: 'var(--color-stone)',
                          }}
                        >
                          Collection
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Meta */}
                  <div
                    style={{
                      marginTop: '1.4rem',
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      gap: '1.2rem',
                      alignItems: 'baseline',
                    }}
                  >
                    <span
                      className="font-serif"
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--color-stone)',
                        fontStyle: 'italic',
                        fontWeight: 400,
                      }}
                    >
                      {num}
                    </span>
                    <h2
                      className="font-serif"
                      style={{
                        fontSize: 'clamp(1.3rem, 2vw, 1.7rem)',
                        lineHeight: 1.2,
                        color: 'var(--color-ink)',
                        fontWeight: 400,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {collection.title}
                    </h2>
                    <span
                      style={{
                        fontSize: '0.62rem',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: 'var(--color-stone)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {collection.artwork_count} {collection.artwork_count === 1 ? 'work' : 'works'}
                    </span>
                  </div>
                  {collection.description && (
                    <p
                      style={{
                        marginTop: '0.6rem',
                        marginLeft: 'calc(0.82rem + 1.2rem)',
                        fontSize: '0.86rem',
                        color: 'var(--color-stone-dark)',
                        fontWeight: 300,
                        lineHeight: 1.55,
                        maxWidth: '38ch',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {collection.description}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
