import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import ArtworkCard from '@/components/ui/ArtworkCard';
import { appUrl } from '@/lib/urls';
import { getCollectionBySlug } from '@/lib/collections';

// Curated edits change rarely — serve from cache, refresh in the background.
export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
};

// ── SEO Metadata ──
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);

  if (!collection) {
    return { title: 'Collection Not Found' };
  }

  const count = collection.artworks.length;
  const base =
    collection.description ||
    collection.curator_note ||
    `A curated collection of original Australian art on Signo.`;
  const description = `${base}${count > 0 ? ` ${count} work${count === 1 ? '' : 's'}.` : ''}`.slice(0, 200);

  const url = `${appUrl()}/collections/${slug}`;
  const ogImage = collection.cover_image_url || collection.artworks[0]?.images?.[0];

  return {
    title: collection.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${collection.title} | Signo`,
      description,
      url,
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage, alt: collection.title }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: `${collection.title} | Signo`,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function CollectionDetailPage({ params }: Props) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);

  // Unpublished / missing → real 404 so it is never soft-indexed.
  if (!collection) {
    notFound();
  }

  const baseUrl = appUrl();
  const collectionUrl = `${baseUrl}/collections/${slug}`;

  // ── JSON-LD: the collection as a page, its works as an ItemList, and a
  // breadcrumb trail (Home › Collections › This edit). ──
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: collection.title,
        description: collection.description || collection.curator_note || undefined,
        url: collectionUrl,
        ...(collection.cover_image_url ? { image: collection.cover_image_url } : {}),
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: collection.artworks.length,
          itemListElement: collection.artworks.map((a, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${baseUrl}/artwork/${a.id}`,
            name: a.title,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Collections', item: `${baseUrl}/collections` },
          { '@type': 'ListItem', position: 3, name: collection.title, item: collectionUrl },
        ],
      },
    ],
  };
  const cleanJsonLd = JSON.parse(JSON.stringify(jsonLd));

  return (
    <div style={{ background: 'var(--color-warm-white)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanJsonLd) }}
      />

      {/* ── Back breadcrumb ── */}
      <div className="px-6 sm:px-10" style={{ paddingTop: '2.2rem' }}>
        <Link
          href="/collections"
          className="collection-back-link"
          style={{
            fontSize: '0.64rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            textDecoration: 'none',
          }}
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
                  fontWeight: 400,
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
                fontWeight: 400,
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
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
