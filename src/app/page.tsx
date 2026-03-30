'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Minus } from 'lucide-react';
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
        .select('id, title, price_aud, images, medium, category, artist_id, profiles!artworks_artist_id_fkey(id, full_name)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(8);

      if (data && data.length > 0) {
        setArtworks(data.map((a: Record<string, unknown>) => ({
          id: a.id as string,
          title: a.title as string,
          artistName: (a.profiles as Record<string, string>)?.full_name || 'Unknown',
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
      {/* ==================== HERO ==================== */}
      <section className="relative bg-primary text-white overflow-hidden texture-grain">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 md:py-40 relative z-10">
          <div className="max-w-3xl animate-fade-up">
            <p className="text-accent text-sm font-medium tracking-[0.2em] uppercase mb-6">
              Australian Art Marketplace
            </p>
            <h1 className="font-editorial text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.1] tracking-tight">
              Where Art Finds{' '}
              <span className="italic text-accent">Its People</span>
            </h1>
            <p className="mt-8 text-lg md:text-xl text-gray-400 max-w-xl leading-relaxed">
              A curated collection of originals, prints, and digital works from
              Australia&apos;s most exciting artists. Fair for creators, inspiring for collectors.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-10">
              <Link
                href="/browse"
                className="group inline-flex items-center justify-center gap-3 px-7 py-3.5 bg-accent text-primary font-semibold rounded-full hover:bg-accent-light transition-all duration-300"
              >
                Explore the Collection
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-white/30 text-white font-medium rounded-full hover:bg-white hover:text-primary transition-all duration-300"
              >
                Start Selling
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative element */}
        <div className="absolute top-0 right-0 w-1/3 h-full opacity-[0.03]">
          <div className="w-full h-full" style={{ background: 'radial-gradient(circle at 70% 30%, white 0%, transparent 70%)' }} />
        </div>
      </section>

      {/* ==================== MARQUEE STATS ==================== */}
      <section className="border-b border-border bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            {[
              { value: '83.5%', label: 'Goes to artists' },
              { value: '16.5%', label: 'Platform fee' },
              { value: '24-48h', label: 'Review turnaround' },
              { value: '100%', label: 'Buyer protection' },
            ].map((stat) => (
              <div key={stat.label} className="py-8 md:py-10 text-center">
                <p className="font-editorial text-2xl md:text-3xl font-semibold text-primary">{stat.value}</p>
                <p className="text-xs md:text-sm text-muted mt-1 tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FEATURED ARTWORK ==================== */}
      {artworks.length > 0 && (
        <section className="py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="text-accent text-sm font-medium tracking-[0.15em] uppercase mb-3">Curated Selection</p>
                <h2 className="font-editorial text-3xl md:text-4xl font-medium">Recently Added</h2>
              </div>
              <Link
                href="/browse"
                className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-accent transition-colors group"
              >
                View all artwork
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10 stagger-children">
              {artworks.map((artwork) => (
                <ArtworkCard key={artwork.id} {...artwork} />
              ))}
            </div>
            <div className="sm:hidden text-center mt-10">
              <Link
                href="/browse"
                className="inline-flex items-center gap-2 text-sm font-medium text-accent"
              >
                View all artwork <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ==================== WHY SIGNO ==================== */}
      <section className="py-20 md:py-28 bg-primary text-white relative texture-grain overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-xl mb-16">
            <p className="text-accent text-sm font-medium tracking-[0.15em] uppercase mb-3">Why Signo</p>
            <h2 className="font-editorial text-3xl md:text-4xl font-medium leading-snug">
              Built for artists,{' '}
              <span className="italic text-accent">loved by collectors</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 rounded-2xl overflow-hidden">
            {[
              {
                number: '01',
                title: 'Fair Commission',
                description: 'Just 16.5%. Artists keep 83.5% of every sale — less than half of what other platforms charge.',
              },
              {
                number: '02',
                title: 'Curated Quality',
                description: 'Every piece is reviewed before listing. AI-assisted quality checks with 24-48 hour turnaround.',
              },
              {
                number: '03',
                title: 'Escrow Protection',
                description: 'Payments held securely until delivery is confirmed. Peace of mind for both sides.',
              },
              {
                number: '04',
                title: 'Three Art Types',
                description: 'Sell originals, limited-edition prints, and digital downloads — all from one storefront.',
              },
              {
                number: '05',
                title: 'Guaranteed Payouts',
                description: 'After the buyer inspection window closes, your earnings are released automatically.',
              },
              {
                number: '06',
                title: 'Dual Marketplace',
                description: 'Every member can both buy and sell. List your art one day, collect someone else\'s the next.',
              },
            ].map((item) => (
              <div key={item.number} className="bg-primary p-8 md:p-10 group hover:bg-white/5 transition-colors duration-500">
                <span className="text-accent/60 text-sm font-mono tracking-wider">{item.number}</span>
                <h3 className="font-editorial text-xl font-medium mt-3 mb-3 group-hover:text-accent transition-colors duration-300">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS (SIMPLE) ==================== */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-accent text-sm font-medium tracking-[0.15em] uppercase mb-3">How It Works</p>
            <h2 className="font-editorial text-3xl md:text-4xl font-medium">Simple for everyone</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20 max-w-4xl mx-auto">
            {/* For Sellers */}
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="divider-accent" />
                <h3 className="font-editorial text-xl font-medium">Selling</h3>
              </div>
              <div className="space-y-6">
                {[
                  { step: 'Upload', desc: 'Add photos, set your price, describe your work.' },
                  { step: 'Review', desc: 'Our team reviews quality within 24-48 hours.' },
                  { step: 'Sell', desc: 'Your art goes live. When it sells, you keep 83.5%.' },
                  { step: 'Get paid', desc: 'Funds released after buyer confirms delivery.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-5 group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center text-xs font-medium text-muted group-hover:border-accent group-hover:text-accent transition-colors">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.step}</p>
                      <p className="text-sm text-muted mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* For Buyers */}
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="divider-accent" />
                <h3 className="font-editorial text-xl font-medium">Buying</h3>
              </div>
              <div className="space-y-6">
                {[
                  { step: 'Discover', desc: 'Browse by style, medium, price, or artist.' },
                  { step: 'Purchase', desc: 'Secure checkout. Payment held in escrow.' },
                  { step: 'Receive', desc: 'Tracked shipping within 5 business days.' },
                  { step: 'Enjoy', desc: '48-hour inspection window. Full buyer protection.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-5 group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center text-xs font-medium text-muted group-hover:border-accent group-hover:text-accent transition-colors">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.step}</p>
                      <p className="text-sm text-muted mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== COMMISSION COMPARISON ==================== */}
      <section className="py-16 md:py-20 bg-muted-bg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-accent text-sm font-medium tracking-[0.15em] uppercase mb-3">The Signo Difference</p>
          <h2 className="font-editorial text-3xl md:text-4xl font-medium mb-4">
            Keep more of what you earn
          </h2>
          <p className="text-muted mb-12 max-w-lg mx-auto">
            On a $500 sale, here&apos;s what artists actually take home:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-6 border border-border">
              <p className="text-xs text-muted tracking-wider uppercase mb-3">Traditional Galleries</p>
              <p className="font-editorial text-3xl font-semibold text-error/80">$200</p>
              <p className="text-xs text-muted mt-2">60% commission</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-border">
              <p className="text-xs text-muted tracking-wider uppercase mb-3">Other Platforms</p>
              <p className="font-editorial text-3xl font-semibold text-warm-gray">$325</p>
              <p className="text-xs text-muted mt-2">35% commission</p>
            </div>
            <div className="bg-white rounded-xl p-6 border-2 border-accent relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-accent text-white text-[10px] font-semibold tracking-wider uppercase rounded-full">
                Signo
              </div>
              <p className="text-xs text-muted tracking-wider uppercase mb-3">With Signo</p>
              <p className="font-editorial text-3xl font-semibold text-accent">$417</p>
              <p className="text-xs text-muted mt-2">Only 16.5% commission</p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-editorial text-4xl md:text-5xl font-medium leading-tight max-w-2xl mx-auto">
            Ready to discover your next{' '}
            <span className="italic text-accent">favourite piece?</span>
          </h2>
          <p className="text-muted mt-6 text-lg max-w-lg mx-auto">
            Join a community that values artists and celebrates creativity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link
              href="/browse"
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white font-semibold rounded-full hover:bg-accent transition-all duration-300 text-lg"
            >
              Browse Artwork
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-primary text-primary font-semibold rounded-full hover:bg-primary hover:text-white transition-all duration-300 text-lg"
            >
              Join Signo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
