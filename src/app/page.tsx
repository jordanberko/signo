'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Palette, ShieldCheck, DollarSign, Truck } from 'lucide-react';
import ArtworkCard from '@/components/ui/ArtworkCard';
import { createClient } from '@/lib/supabase/client';

interface FeaturedArtwork {
  id: string;
  title: string;
  artistName: string;
  artistId: string;
  price: number;
  imageUrl: string;
  medium: string;
  category: 'original' | 'print' | 'digital';
}

export default function HomePage() {
  const [artworks, setArtworks] = useState<FeaturedArtwork[]>([]);

  useEffect(() => {
    async function fetchFeatured() {
      const supabase = createClient();
      const { data } = await supabase
        .from('artworks')
        .select('id, title, price_aud, images, medium, category, artist_id, users!artworks_artist_id_fkey(id, full_name)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(8);

      if (data && data.length > 0) {
        setArtworks(data.map((a: Record<string, unknown>) => ({
          id: a.id as string,
          title: a.title as string,
          artistName: (a.users as Record<string, string>)?.full_name || 'Unknown',
          artistId: a.artist_id as string,
          price: a.price_aud as number,
          imageUrl: ((a.images as string[]) || [])[0] || '',
          medium: a.medium as string,
          category: a.category as 'original' | 'print' | 'digital',
        })));
      }
    }
    fetchFeatured();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-2xl space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Discover Australian Art,{' '}
              <span className="text-accent">Support Artists Directly</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300">
              A curated marketplace where artists keep 83.5% of every sale.
              Find originals, prints, and digital art from talented Australian creators.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/browse"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-light transition-colors"
              >
                Browse Artwork
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/register?role=artist"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-primary transition-colors"
              >
                Start Selling
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-muted-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Why Artists Choose Signo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                icon: DollarSign,
                title: 'Only 16.5% Commission',
                description: 'Keep 83.5% of every sale — half the commission of other platforms.',
              },
              {
                icon: Palette,
                title: 'Three Art Types',
                description: 'Sell originals, prints, and digital downloads all in one place.',
              },
              {
                icon: ShieldCheck,
                title: 'Fast Review',
                description: 'AI-assisted quality review with 24-48 hour turnaround.',
              },
              {
                icon: Truck,
                title: 'Secure Payments',
                description: 'Escrow protection for buyers, guaranteed payouts for artists.',
              },
            ].map((item) => (
              <div key={item.title} className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-accent/10 rounded-full">
                  <item.icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="text-sm text-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Artwork */}
      {artworks.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold">Featured Artwork</h2>
              <Link
                href="/browse"
                className="text-sm font-medium text-accent hover:text-accent-light transition-colors inline-flex items-center gap-1"
              >
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {artworks.map((artwork) => (
                <ArtworkCard key={artwork.id} {...artwork} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA for Artists */}
      <section className="py-16 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Share Your Art with Australia?
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Join Signo and start selling your artwork today. Simple uploads,
            transparent pricing, and fast payouts — the way it should be.
          </p>
          <Link
            href="/register?role=artist"
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-primary font-semibold rounded-lg text-lg hover:bg-accent-light transition-colors"
          >
            Create Your Artist Profile
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
