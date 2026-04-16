'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ArtworkCard from '@/components/ui/ArtworkCard';

interface CollectionDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  curator_note: string | null;
  artworks: Array<{
    id: string;
    title: string;
    artist_id: string;
    price_aud: number;
    images: string[];
    medium: string | null;
    category: 'original' | 'print' | 'digital' | null;
    width_cm: number | null;
    height_cm: number | null;
    artist: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  }>;
}

export default function CollectionDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!slug) return;

    async function fetchData() {
      try {
        const [collectionRes, favsRes] = await Promise.all([
          fetch(`/api/collections/${slug}`),
          fetch('/api/favourites/ids'),
        ]);

        if (collectionRes.ok) {
          const json = await collectionRes.json();
          setCollection(json.data);
          if (json.data?.title) {
            document.title = `${json.data.title} | Signo`;
          }
        } else {
          setNotFound(true);
        }

        if (favsRes.ok) {
          const favsJson = await favsRes.json();
          setFavouriteIds(new Set(favsJson.ids || []));
        }
      } catch (err) {
        console.error('[CollectionDetail] Fetch error:', err);
        setNotFound(true);
      } finally {
        setLoaded(true);
      }
    }
    fetchData();
  }, [slug]);

  if (!loaded) {
    return (
      <div
        className="px-6 sm:px-10"
        style={{ background: 'var(--color-warm-white)', minHeight: '60vh', paddingTop: '6rem' }}
      >
        <p
          className="font-serif"
          style={{
            fontSize: '1.1rem',
            fontStyle: 'italic',
            color: 'var(--color-stone)',
            fontWeight: 300,
          }}
        >
          Loading the edit…
        </p>
      </div>
    );
  }

  if (notFound || !collection) {
    return (
      <div
        className="px-6 sm:px-10"
        style={{
          background: 'var(--color-warm-white)',
          paddingTop: 'clamp(5rem, 10vw, 8rem)',
          paddingBottom: '6rem',
          maxWidth: '46ch',
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
          Not found
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            lineHeight: 1.1,
            color: 'var(--color-ink)',
            fontWeight: 400,
          }}
        >
          This collection isn&apos;t currently published.
        </h1>
        <p
          style={{
            marginTop: '1rem',
            fontSize: '0.88rem',
            color: 'var(--color-stone-dark)',
            fontWeight: 300,
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}
        >
          The edit may have been retired, or the address may be mistyped.
        </p>
        <Link href="/collections" className="editorial-link">
          All Collections
        </Link>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--color-warm-white)' }}>
      {/* ── Back breadcrumb ── */}
      <div
        className="px-6 sm:px-10"
        style={{ paddingTop: '2.2rem' }}
      >
        <Link
          href="/collections"
          style={{
            fontSize: '0.64rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            textDecoration: 'none',
            transition: 'color 200ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          onMouseOver={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-ink)')}
          onMouseOut={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-stone)')}
        >
          ← All Collections
        </Link>
      </div>

      {/* ── Editorial header ── */}
      <header
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(2.5rem, 5vw, 4rem)',
          paddingBottom: 'clamp(2.5rem, 5vw, 4rem)',
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 'clamp(2rem, 5vw, 5rem)' }}>
          <div className="lg:col-span-7">
            <p
              style={{
                fontSize: '0.68rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                marginBottom: '1.2rem',
              }}
            >
              Curated Collection
            </p>
            <h1
              className="font-serif"
              style={{
                fontSize: 'clamp(2.6rem, 6vw, 4.8rem)',
                lineHeight: 1.02,
                letterSpacing: '-0.015em',
                color: 'var(--color-ink)',
                fontWeight: 400,
                maxWidth: '18ch',
              }}
            >
              {collection.title}
            </h1>
          </div>
          {collection.description && (
            <div className="lg:col-span-5" style={{ alignSelf: 'end' }}>
              <p
                style={{
                  fontSize: '1rem',
                  fontWeight: 300,
                  lineHeight: 1.65,
                  color: 'var(--color-stone-dark)',
                  maxWidth: '42ch',
                }}
              >
                {collection.description}
              </p>
              <p
                style={{
                  marginTop: '1.4rem',
                  fontSize: '0.62rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--color-stone)',
                }}
              >
                {collection.artworks.length} {collection.artworks.length === 1 ? 'work' : 'works'}
              </p>
            </div>
          )}
        </div>
      </header>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── Curator's note — editorial pullquote ── */}
      {collection.curator_note && (
        <section
          className="px-6 sm:px-10"
          style={{ paddingTop: 'clamp(3.5rem, 7vw, 6rem)', paddingBottom: 'clamp(3.5rem, 7vw, 6rem)' }}
        >
          <div
            className="grid grid-cols-1 lg:grid-cols-12"
            style={{ gap: 'clamp(1.6rem, 4vw, 4rem)' }}
          >
            <div className="lg:col-span-3">
              <p
                style={{
                  fontSize: '0.62rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--color-stone)',
                }}
              >
                Curator&apos;s Note
              </p>
            </div>
            <div className="lg:col-span-8">
              <p
                className="font-serif"
                style={{
                  fontSize: 'clamp(1.4rem, 2.4vw, 2.1rem)',
                  lineHeight: 1.35,
                  color: 'var(--color-ink)',
                  fontWeight: 400,
                  fontStyle: 'italic',
                  letterSpacing: '-0.005em',
                  maxWidth: '42ch',
                }}
              >
                &ldquo;{collection.curator_note}&rdquo;
              </p>
            </div>
          </div>
        </section>
      )}

      {collection.curator_note && <div style={{ borderTop: '1px solid var(--color-border)' }} />}

      {/* ── Artwork Grid ── */}
      <section
        className="px-6 sm:px-10"
        style={{ paddingTop: 'clamp(3rem, 5vw, 4rem)', paddingBottom: '6rem' }}
      >
        {collection.artworks.length === 0 ? (
          <div style={{ maxWidth: '46ch' }}>
            <p
              className="font-serif"
              style={{
                fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)',
                lineHeight: 1.2,
                color: 'var(--color-ink)',
              }}
            >
              This edit is being assembled.
            </p>
            <p
              style={{
                marginTop: '0.8rem',
                fontSize: '0.88rem',
                color: 'var(--color-stone-dark)',
                fontWeight: 300,
                lineHeight: 1.6,
              }}
            >
              Works will appear here as they are approved.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-12">
            {collection.artworks.map((artwork) => (
              <ArtworkCard
                key={artwork.id}
                id={artwork.id}
                title={artwork.title}
                artistName={artwork.artist?.full_name || 'Unknown'}
                artistId={artwork.artist_id}
                price={artwork.price_aud}
                imageUrl={(artwork.images || [])[0] || ''}
                medium={artwork.medium}
                category={artwork.category || undefined}
                widthCm={artwork.width_cm}
                heightCm={artwork.height_cm}
                initialFavourited={favouriteIds.has(artwork.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
