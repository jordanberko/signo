'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ArtworkCard from '@/components/ui/ArtworkCard';
import ScrollReveal from '@/components/ui/ScrollReveal';

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
          // Set document title
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !collection) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Collection not found</h1>
        <p className="text-muted mb-4">This collection doesn&apos;t exist or isn&apos;t published yet.</p>
        <Link href="/collections" className="text-accent-dark font-medium hover:underline">
          Back to Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh]">
      {/* Back link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link
          href="/collections"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All Collections
        </Link>
      </div>

      {/* Header */}
      <section className="py-12 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal>
            <p className="text-accent-dark text-xs font-semibold tracking-[0.2em] uppercase mb-3">
              CURATED COLLECTION
            </p>
            <h1 className="font-editorial text-4xl md:text-6xl font-medium text-primary">
              {collection.title}
            </h1>
            {collection.description && (
              <p className="mt-4 text-muted text-lg max-w-xl mx-auto leading-relaxed">
                {collection.description}
              </p>
            )}
          </ScrollReveal>
        </div>
      </section>

      {/* Curator Note */}
      {collection.curator_note && (
        <section className="pb-12 md:pb-16">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <div className="bg-cream border border-border rounded-2xl p-6 md:p-8">
                <p className="text-xs font-semibold tracking-[0.15em] uppercase text-accent-dark mb-3">
                  Curator&apos;s Note
                </p>
                <p className="text-foreground text-sm md:text-base leading-relaxed italic">
                  &ldquo;{collection.curator_note}&rdquo;
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Artwork Grid */}
      <section className="pb-20 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {collection.artworks.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted">No artworks in this collection yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
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
        </div>
      </section>
    </div>
  );
}
