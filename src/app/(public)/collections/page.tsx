'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';

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
    <div className="min-h-[60vh]">
      {/* Header */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal>
            <p className="text-accent-dark text-xs font-semibold tracking-[0.2em] uppercase mb-3">
              CURATED
            </p>
            <h1 className="font-editorial text-4xl md:text-6xl font-bold text-primary">
              Collections
            </h1>
            <p className="mt-4 text-muted text-lg max-w-md mx-auto">
              Handpicked artwork, thoughtfully grouped.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Grid */}
      <section className="pb-20 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!loaded ? (
            <div className="text-center py-16">
              <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted text-lg">No collections yet. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection, i) => (
                <ScrollReveal key={collection.id} delay={i * 100}>
                  <Link
                    href={`/collections/${collection.slug}`}
                    className="group block rounded-2xl border border-border overflow-hidden bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)]"
                  >
                    {/* Cover Image */}
                    <div className="aspect-[16/10] bg-muted-bg relative overflow-hidden">
                      {collection.cover_image_url ? (
                        <img
                          src={collection.cover_image_url}
                          alt={collection.title}
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center">
                          <span className="text-warm-gray/60 text-xs tracking-widest uppercase">
                            Collection
                          </span>
                        </div>
                      )}
                      {/* Artwork count badge */}
                      <span className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/60 text-white text-xs font-medium rounded-full">
                        {collection.artwork_count} {collection.artwork_count === 1 ? 'work' : 'works'}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="p-5">
                      <h2 className="font-editorial text-xl font-medium text-primary group-hover:text-accent-dark transition-colors">
                        {collection.title}
                      </h2>
                      {collection.description && (
                        <p className="mt-2 text-sm text-muted line-clamp-2">
                          {collection.description}
                        </p>
                      )}
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
