'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Palette, DollarSign } from 'lucide-react';
import ArtworkCard from '@/components/ui/ArtworkCard';
import HeroRibbons from '@/components/ui/HeroRibbons';
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

// Placeholder cards — unified muted sage/stone backgrounds
const PLACEHOLDER_CARDS = [
  { id: 'p1', ratio: 'aspect-[3/4]', title: 'Morning Light No. 3', artist: 'Sarah Chen', price: 480 },
  { id: 'p2', ratio: 'aspect-[4/5]', title: 'Coastal Fragment', artist: 'James Wu', price: 650 },
  { id: 'p3', ratio: 'aspect-[3/4]', title: 'Untitled (Dusk)', artist: 'Mia Torres', price: 375 },
  { id: 'p4', ratio: 'aspect-[2/3]', title: 'Still Life VII', artist: 'Liam Oakes', price: 520 },
  { id: 'p5', ratio: 'aspect-[4/5]', title: 'Blue Hour', artist: 'Sarah Chen', price: 790 },
  { id: 'p6', ratio: 'aspect-[3/4]', title: 'Autumn in Eltham', artist: 'Mia Torres', price: 425 },
  { id: 'p7', ratio: 'aspect-[2/3]', title: 'Ochre Study', artist: 'James Wu', price: 350 },
  { id: 'p8', ratio: 'aspect-[4/5]', title: 'Stillwater', artist: 'Liam Oakes', price: 580 },
];

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            const children = entry.target.querySelectorAll('.stagger-item');
            children.forEach((child, i) => {
              (child as HTMLElement).style.transitionDelay = `${i * 80}ms`;
              child.classList.add('revealed');
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -60px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

export default function HomePage() {
  const [artworks, setArtworks] = useState<FeaturedArtwork[]>([]);
  const [newArrivals, setNewArrivals] = useState<FeaturedArtwork[]>([]);
  const [loaded, setLoaded] = useState(false);

  const featuredRef = useScrollReveal();
  const arrivalsRef = useScrollReveal();
  const spotlightRef = useScrollReveal();
  const whyRef = useScrollReveal();
  const howRef = useScrollReveal();
  const ctaRef = useScrollReveal();

  useEffect(() => {
    async function fetchArt() {
      const supabase = createClient();

      const { data } = await supabase
        .from('artworks')
        .select('id, title, price_aud, images, medium, category, artist_id, profiles!artworks_artist_id_fkey(id, full_name)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(12);

      if (data && data.length > 0) {
        const mapped = data.map((a: Record<string, unknown>) => ({
          id: a.id as string,
          title: a.title as string,
          artistName: (a.profiles as Record<string, string>)?.full_name || 'Unknown',
          artistId: a.artist_id as string,
          price: a.price_aud as number,
          imageUrl: ((a.images as string[]) || [])[0] || '',
          medium: a.medium as string,
          category: a.category as 'original' | 'print' | 'digital',
        }));
        setArtworks(mapped.slice(0, 8));
        setNewArrivals(mapped.slice(0, 6));
      }
      setLoaded(true);
    }
    fetchArt();
  }, []);

  return (
    <div className="texture-grain relative">
      {/* ==================== HERO ==================== */}
      <section className="pt-16 pb-12 md:pt-28 md:pb-20 relative overflow-hidden">
        <HeroRibbons />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-xl mx-auto text-center animate-fade-up">
            <h1 className="text-3xl md:text-[2.75rem] lg:text-5xl font-medium leading-[1.15] tracking-tight text-primary">
              Where Art Finds{' '}
              <span className="font-editorial italic text-[#B8965A]">Its People</span>
            </h1>
            <p className="mt-5 text-[15px] text-[#8A8880] max-w-sm mx-auto leading-relaxed">
              A curated marketplace for Australian artists. Zero commission. You keep everything you earn.
            </p>

            <div className="flex items-center justify-center gap-6 mt-10">
              <Link
                href="/browse"
                className="group inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-primary text-sm font-medium rounded-full hover:bg-accent-light transition-all duration-300"
              >
                Browse Artwork
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/register"
                className="group inline-flex items-center gap-1.5 text-sm text-[#8A8880] hover:text-primary transition-colors"
              >
                Start selling
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== TICKER ==================== */}
      <div className="border-t border-b border-[#E0DDD6] overflow-hidden py-3">
        <div className="flex animate-[slide-ticker_30s_linear_infinite] whitespace-nowrap">
          {[...Array(3)].map((_, i) => (
            <span key={i} className="text-xs tracking-[0.15em] text-[#8A8880] uppercase mr-12">
              Originals &nbsp;&middot;&nbsp; Prints &nbsp;&middot;&nbsp; Digital Downloads &nbsp;&middot;&nbsp; Direct from the Studio &nbsp;&middot;&nbsp; Zero Commission &nbsp;&middot;&nbsp; Australian Artists &nbsp;&middot;&nbsp; Curated Quality &nbsp;&middot;&nbsp;
            </span>
          ))}
        </div>
        <style jsx>{`
          @keyframes slide-ticker {
            from { transform: translateX(0); }
            to { transform: translateX(-33.333%); }
          }
        `}</style>
      </div>

      {/* ==================== FEATURED ARTWORK GRID ==================== */}
      <section ref={featuredRef} className="scroll-reveal py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <h2 className="text-xl md:text-2xl font-medium text-primary">Featured</h2>
            <Link
              href="/browse"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs tracking-wide text-[#8A8880] hover:text-primary transition-colors group"
            >
              View all
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {artworks.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 stagger-children">
              {artworks.map((artwork) => (
                <ArtworkCard key={artwork.id} {...artwork} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {PLACEHOLDER_CARDS.map((card) => (
                <div key={card.id} className="group cursor-pointer stagger-item scroll-reveal">
                  <div className={`${card.ratio} rounded-[10px] bg-[#E8E6DF] overflow-hidden relative transition-all duration-500 group-hover:-translate-y-[3px] group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]`}>
                    <div className="absolute inset-0 scale-100 group-hover:scale-[1.02] transition-transform duration-700 ease-out" />
                  </div>
                  <div className="pt-3 space-y-0.5">
                    <p className="text-[14px] font-medium text-primary truncate">{card.title}</p>
                    <p className="text-[13px] text-[#8A8880]">{card.artist}</p>
                    <p className="text-[14px] font-medium text-primary">${card.price}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="sm:hidden text-center mt-10">
            <Link
              href="/browse"
              className="inline-flex items-center gap-1.5 text-xs tracking-wide text-[#8A8880] hover:text-primary transition-colors"
            >
              View all artwork <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== NEW ARRIVALS — HORIZONTAL SCROLL ==================== */}
      {newArrivals.length > 0 && (
        <section ref={arrivalsRef} className="scroll-reveal py-24 md:py-32 border-t border-[#E0DDD6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs tracking-[0.15em] text-[#8A8880] uppercase mb-2">Just Listed</p>
                <h2 className="font-editorial text-xl md:text-2xl text-primary">New Arrivals</h2>
              </div>
              <Link
                href="/browse?sort=newest"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs tracking-wide text-[#8A8880] hover:text-primary transition-colors group"
              >
                See all new
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="flex gap-5 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scrollbar-hide">
              {newArrivals.map((artwork) => (
                <div key={artwork.id} className="flex-shrink-0 w-[240px] sm:w-[260px] snap-start">
                  <ArtworkCard {...artwork} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================== ARTIST SPOTLIGHT ==================== */}
      <section ref={spotlightRef} className="scroll-reveal py-24 md:py-32 border-t border-[#E0DDD6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20 items-center">
            {/* Visual */}
            <div className="relative">
              <div className="aspect-[4/3] rounded-[10px] bg-[#E8E6DF] overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Palette className="h-10 w-10 text-[#8A8880]/30 mx-auto mb-3" />
                    <span className="text-[#8A8880]/50 text-xs tracking-widest uppercase">Artist Spotlight</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div>
              <p className="text-xs tracking-[0.15em] text-[#8A8880] uppercase mb-4">For Artists</p>
              <h2 className="font-editorial text-2xl md:text-3xl text-primary leading-snug">
                Your art, your earnings.{' '}
                <span className="italic">No commission.</span>
              </h2>
              <p className="mt-5 text-[15px] text-[#8A8880] leading-relaxed">
                Signo charges a flat $30/month subscription. You keep 100% of every sale —
                the only deduction is Stripe&apos;s payment processing fee (~1.75% + 30c).
              </p>
              <div className="flex items-center gap-6 mt-8">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-primary text-sm font-medium rounded-full hover:bg-accent-light transition-all duration-300"
                >
                  Start Selling
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="group inline-flex items-center gap-1.5 text-sm text-[#8A8880] hover:text-primary transition-colors"
                >
                  How It Works
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== WHY SIGNO — 3 CARDS ==================== */}
      <section ref={whyRef} className="scroll-reveal py-24 md:py-32 border-t border-[#E0DDD6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs tracking-[0.15em] text-[#8A8880] uppercase mb-3">Why Signo</p>
            <h2 className="font-editorial text-2xl md:text-3xl text-primary">
              Built for artists, loved by collectors
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {[
              {
                icon: DollarSign,
                title: 'Zero Commission',
                description: 'Artists keep 100% of every sale. Just a flat $30/month subscription to list on the platform.',
              },
              {
                icon: ShieldCheck,
                title: 'Buyer Protection',
                description: 'Payments held in escrow until delivery is confirmed. 48-hour inspection window on every order.',
              },
              {
                icon: Palette,
                title: 'Curated Quality',
                description: 'Every piece is reviewed before listing. Sell originals, prints, and digital downloads from one storefront.',
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className="stagger-item scroll-reveal bg-[#E8E6DF] rounded-[10px] p-8 transition-all duration-300"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <h3 className="font-editorial text-base text-primary">{item.title}</h3>
                </div>
                <p className="text-[#8A8880] text-[14px] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section ref={howRef} className="scroll-reveal py-24 md:py-32 border-t border-[#E0DDD6]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs tracking-[0.15em] text-[#8A8880] uppercase mb-3">How It Works</p>
            <h2 className="font-editorial text-2xl md:text-3xl text-primary">Simple for everyone</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20">
            {/* Selling */}
            <div className="space-y-6">
              <h3 className="font-editorial text-base text-primary mb-6">Selling</h3>
              {[
                { step: 'Upload', desc: 'Add photos, set your price, describe your work.' },
                { step: 'Review', desc: 'Our team reviews quality within 24-48 hours.' },
                { step: 'Sell', desc: 'Your art goes live. When it sells, you keep 100%.' },
                { step: 'Get paid', desc: 'Funds released after buyer confirms delivery.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <span className="flex-shrink-0 text-xs text-[#8A8880]/50 font-medium mt-0.5 w-4">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-primary">{item.step}</p>
                    <p className="text-[13px] text-[#8A8880] mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Buying */}
            <div className="space-y-6">
              <h3 className="font-editorial text-base text-primary mb-6">Buying</h3>
              {[
                { step: 'Discover', desc: 'Browse by style, medium, price, or artist.' },
                { step: 'Purchase', desc: 'Secure checkout. Payment held in escrow.' },
                { step: 'Receive', desc: 'Tracked shipping within 5 business days.' },
                { step: 'Enjoy', desc: '48-hour inspection window. Full buyer protection.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <span className="flex-shrink-0 text-xs text-[#8A8880]/50 font-medium mt-0.5 w-4">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-primary">{item.step}</p>
                    <p className="text-[13px] text-[#8A8880] mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CTA BANNER ==================== */}
      <section ref={ctaRef} className="scroll-reveal py-24 md:py-32 border-t border-[#E0DDD6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#1A1A18] rounded-2xl px-8 py-20 md:px-16 md:py-24 text-center relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="font-editorial text-2xl md:text-4xl text-white leading-tight max-w-lg mx-auto">
                Ready to discover your next{' '}
                <span className="italic text-[#B8965A]">favourite piece?</span>
              </h2>
              <p className="text-[#8A8880] mt-5 text-[15px] max-w-md mx-auto">
                Join a community that values artists and celebrates creativity.
              </p>
              <div className="flex items-center justify-center gap-6 mt-10">
                <Link
                  href="/browse"
                  className="group inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-primary text-sm font-medium rounded-full hover:bg-accent-light transition-all duration-300"
                >
                  Browse Artwork
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-1.5 text-sm text-[#8A8880] hover:text-white transition-colors"
                >
                  Join Signo
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
