'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Palette, DollarSign } from 'lucide-react';
import ArtworkCard from '@/components/ui/ArtworkCard';
import HeroRibbons from '@/components/ui/HeroRibbons';
import GuidedSearch from '@/components/ui/GuidedSearch';
import TrustBar from '@/components/ui/TrustBar';
import MeetOurArtists, { type SpotlightArtist } from '@/components/ui/MeetOurArtists';
import Avatar from '@/components/ui/Avatar';
import EntryAnimation from '@/components/EntryAnimation';

interface FeaturedArtwork {
  id: string;
  title: string;
  artistName: string;
  artistId: string;
  price: number;
  imageUrl: string;
  medium: string;
  category: 'original' | 'print' | 'digital';
  widthCm?: number | null;
  heightCm?: number | null;
}

// Placeholder cards shown while artwork loads or when DB is empty
const PLACEHOLDER_CARDS = [
  { id: 'p1', ratio: 'aspect-[3/4]', color: 'from-stone-200 to-stone-300' },
  { id: 'p2', ratio: 'aspect-[4/5]', color: 'from-amber-100 to-stone-200' },
  { id: 'p3', ratio: 'aspect-[3/4]', color: 'from-stone-100 to-amber-100' },
  { id: 'p4', ratio: 'aspect-[2/3]', color: 'from-stone-300 to-stone-200' },
  { id: 'p5', ratio: 'aspect-[4/5]', color: 'from-amber-50 to-stone-200' },
  { id: 'p6', ratio: 'aspect-[3/4]', color: 'from-stone-200 to-amber-100' },
  { id: 'p7', ratio: 'aspect-[2/3]', color: 'from-stone-100 to-stone-300' },
  { id: 'p8', ratio: 'aspect-[4/5]', color: 'from-amber-100 to-stone-100' },
];

export default function HomePage() {
  const [artworks, setArtworks] = useState<FeaturedArtwork[]>([]);
  const [newArrivals, setNewArrivals] = useState<FeaturedArtwork[]>([]);
  const [spotlightArtists, setSpotlightArtists] = useState<SpotlightArtist[]>([]);
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function fetchArt() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        // Fetch featured, new arrivals, artist spotlight, and user favourites in parallel
        const [featuredRes, arrivalsRes, artistsRes, favsRes] = await Promise.all([
          fetch('/api/artworks/featured?limit=8', { signal: controller.signal }),
          fetch('/api/artworks/browse?limit=6&sort=newest', { signal: controller.signal }),
          fetch('/api/artists/spotlight?limit=10', { signal: controller.signal }),
          fetch('/api/favourites/ids', { signal: controller.signal }),
        ]);
        clearTimeout(timeout);

        if (featuredRes.ok) {
          const json = await featuredRes.json();
          const mapped = (json.data || []) as FeaturedArtwork[];
          setArtworks(mapped);
        }

        if (arrivalsRes.ok) {
          const json = await arrivalsRes.json();
          const rows = (json.data || []) as Array<Record<string, unknown>>;
          // Map browse response shape to FeaturedArtwork shape
          const mapped: FeaturedArtwork[] = rows.map((a) => ({
            id: a.id as string,
            title: a.title as string,
            artistName: (a.profiles as Record<string, string> | null)?.full_name || 'Unknown',
            artistId: a.artist_id as string,
            price: a.price_aud as number,
            imageUrl: ((a.images as string[]) || [])[0] || '',
            medium: a.medium as string,
            category: a.category as 'original' | 'print' | 'digital',
            widthCm: (a.width_cm as number) || null,
            heightCm: (a.height_cm as number) || null,
          }));
          setNewArrivals(mapped);
        }

        if (artistsRes.ok) {
          const json = await artistsRes.json();
          setSpotlightArtists((json.data || []) as SpotlightArtist[]);
        }

        if (favsRes.ok) {
          const json = await favsRes.json();
          setFavouriteIds(new Set(json.ids || []));
        }
      } catch (err) {
        console.error('[Home] Artwork fetch error:', err);
      } finally {
        setLoaded(true);
      }
    }
    fetchArt();
  }, []);

  return (
    <div>
      <EntryAnimation />
      {/* ==================== HERO — MINIMAL ==================== */}
      <section className="bg-background pt-12 pb-8 md:pt-20 md:pb-12 relative overflow-x-clip">
        {/* Ribbon animation layer */}
        <HeroRibbons />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl mx-auto text-center animate-fade-up">
            <h1 className="font-editorial text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.1] tracking-tight text-primary">
              Where Art Finds{' '}
              <span className="italic text-accent">
                Its People
              </span>
            </h1>
            <p className="mt-4 text-lg text-muted max-w-md mx-auto leading-relaxed">
              A curated marketplace for Australian artists. Zero commission. You keep everything you earn.
            </p>
          </div>

          {/* Guided Search */}
          <GuidedSearch />
        </div>
      </section>

      {/* ==================== TRUST BAR ==================== */}
      <TrustBar />

      {/* ==================== FEATURED ARTWORK GRID ==================== */}
      <section className="pb-16 md:pb-24 pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-editorial text-2xl md:text-3xl font-medium text-primary">Featured</h2>
            </div>
            <Link
              href="/browse"
              className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-accent-dark transition-colors group"
            >
              View all
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Real artwork or placeholder grid */}
          {artworks.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10 stagger-children">
              {artworks.map((artwork) => (
                <ArtworkCard key={artwork.id} {...artwork} initialFavourited={favouriteIds.has(artwork.id)} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-6 stagger-children">
              {PLACEHOLDER_CARDS.map((card) => (
                <div key={card.id} className="group">
                  <div className={`${card.ratio} rounded-lg bg-gradient-to-br ${card.color} overflow-hidden relative`}>
                    {loaded && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-warm-gray/60 text-xs tracking-widest uppercase">Coming Soon</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-3 space-y-1.5">
                    <div className="h-4 bg-sand rounded w-3/4" />
                    <div className="h-3 bg-sand/60 rounded w-1/2" />
                    <div className="h-4 bg-sand rounded w-1/3 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="sm:hidden text-center mt-8">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-accent-dark transition-colors"
            >
              View all artwork <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== NEW ARRIVALS — HORIZONTAL SCROLL ==================== */}
      {newArrivals.length > 0 && (
        <section className="py-16 md:py-20 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-accent-dark text-xs font-semibold tracking-[0.2em] uppercase mb-2">Just Listed</p>
                <h2 className="font-editorial text-2xl md:text-3xl font-medium text-primary">New Arrivals</h2>
              </div>
              <Link
                href="/browse?sort=newest"
                className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-accent-dark transition-colors group"
              >
                See all new
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="flex gap-5 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scrollbar-hide">
              {newArrivals.map((artwork) => (
                <div key={artwork.id} className="flex-shrink-0 w-[260px] sm:w-[280px] snap-start">
                  <ArtworkCard {...artwork} initialFavourited={favouriteIds.has(artwork.id)} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================== ARTIST SPOTLIGHT — FULL WIDTH ==================== */}
      {spotlightArtists.length > 0 && artworks.length > 0 && (() => {
        const artist = spotlightArtists.find((a) => a.id === artworks[0].artistId);
        if (!artist) return null;

        // Grab up to 3 artworks by this artist for the visual row
        const artistWorks = artworks.filter((a) => a.artistId === artist.id).slice(0, 3);

        return (
          <section className="py-16 md:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="text-accent-dark text-xs font-semibold tracking-[0.2em] uppercase mb-8">Artist Spotlight</p>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
                {/* Artist info — left column */}
                <div className="md:col-span-4">
                  <Link href={`/artists/${artist.id}`} className="group/artist flex items-center gap-3.5">
                    <Avatar
                      avatarUrl={artist.avatarUrl}
                      name={artist.fullName}
                      size={56}
                    />
                    <div>
                      <h3 className="font-editorial text-2xl font-medium text-primary group-hover/artist:text-accent-dark transition-colors">
                        {artist.fullName}
                      </h3>
                      {artist.location && (
                        <p className="text-muted text-sm">{artist.location}</p>
                      )}
                    </div>
                  </Link>
                  {artist.bio && (
                    <p className="mt-4 text-muted text-sm leading-relaxed line-clamp-4">
                      {artist.bio}
                    </p>
                  )}
                  <Link
                    href={`/artists/${artist.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-dark mt-4 hover:gap-2.5 transition-all"
                  >
                    View profile
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Artist works — right columns */}
                <div className="md:col-span-8">
                  <div className={`grid gap-4 ${
                    artistWorks.length === 1
                      ? 'grid-cols-1'
                      : artistWorks.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-2 md:grid-cols-3'
                  }`}>
                    {artistWorks.map((work, i) => (
                      <Link
                        key={work.id}
                        href={`/artwork/${work.id}`}
                        className={`group relative rounded-xl overflow-hidden ${
                          artistWorks.length === 3 && i === 0 ? 'col-span-2 md:col-span-1' : ''
                        }`}
                      >
                        <div className="aspect-[4/5]">
                          <img
                            src={work.imageUrl}
                            alt={work.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <p className="text-white font-medium text-sm">{work.title}</p>
                            <p className="text-white/70 text-xs mt-0.5">{work.medium}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ==================== MEET OUR ARTISTS ==================== */}
      <MeetOurArtists artists={spotlightArtists} />

      {/* ==================== WHY SIGNO — 3 CARDS ==================== */}
      <section className="py-16 md:py-20 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-accent-dark text-xs font-semibold tracking-[0.2em] uppercase mb-3">Why Signo</p>
            <h2 className="font-editorial text-3xl md:text-4xl font-medium text-primary">
              Built for artists, loved by collectors
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-8 border border-border hover:border-accent/40 hover:shadow-md transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors">
                  <item.icon className="h-6 w-6 text-accent-dark" />
                </div>
                <h3 className="font-editorial text-xl font-medium text-primary mb-2">{item.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FOR ARTISTS — STANDALONE CTA ==================== */}
      <section className="py-16 md:py-20 bg-accent/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-accent-dark text-xs font-semibold tracking-[0.2em] uppercase mb-3">For Artists</p>
          <h2 className="font-editorial text-3xl md:text-4xl font-medium text-primary leading-snug">
            Your art, your earnings.{' '}
            <span className="italic">No commission.</span>
          </h2>
          <p className="mt-5 text-muted leading-relaxed max-w-xl mx-auto">
            Signo charges a flat $30/month subscription. You keep 100% of every sale —
            the only deduction is Stripe&apos;s payment processing fee (~1.75% + 30c).
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-dark transition-all duration-300"
            >
              Start Selling
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center px-6 py-3 border border-border text-primary font-medium rounded-full hover:bg-white transition-all duration-300"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS — CONDENSED ==================== */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-accent-dark text-xs font-semibold tracking-[0.2em] uppercase mb-3">How It Works</p>
            <h2 className="font-editorial text-3xl md:text-4xl font-medium text-primary">Simple for everyone</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
            {/* Selling */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-0.5 w-10 bg-accent" />
                <h3 className="font-editorial text-lg font-medium text-primary">Selling</h3>
              </div>
              {[
                { step: 'Upload', desc: 'Add photos, set your price, describe your work.' },
                { step: 'Review', desc: 'Our team reviews quality within 24-48 hours.' },
                { step: 'Sell', desc: 'Your art goes live. When it sells, you keep 100%.' },
                { step: 'Get paid', desc: 'Funds released when the buyer confirms delivery, or automatically after the 48-hour inspection window.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center text-xs font-medium text-muted group-hover:border-accent group-hover:text-accent-dark group-hover:bg-accent/5 transition-all">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-primary">{item.step}</p>
                    <p className="text-sm text-muted mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Buying */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-0.5 w-10 bg-accent" />
                <h3 className="font-editorial text-lg font-medium text-primary">Buying</h3>
              </div>
              {[
                { step: 'Discover', desc: 'Browse by style, medium, price, or artist.' },
                { step: 'Purchase', desc: 'Secure checkout. Payment held in escrow.' },
                { step: 'Receive', desc: 'Tracked shipping within 5 business days.' },
                { step: 'Enjoy', desc: '48-hour inspection window. Full buyer protection.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center text-xs font-medium text-muted group-hover:border-accent group-hover:text-accent-dark group-hover:bg-accent/5 transition-all">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-primary">{item.step}</p>
                    <p className="text-sm text-muted mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CTA BANNER ==================== */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-primary rounded-3xl px-8 py-16 md:px-16 md:py-20 text-center relative overflow-hidden">
            {/* Accent glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <h2 className="font-editorial text-3xl md:text-5xl font-medium text-white leading-tight max-w-2xl mx-auto">
                Ready to discover your next{' '}
                <span className="italic text-accent">favourite piece?</span>
              </h2>
              <p className="text-gray-400 mt-5 text-lg max-w-lg mx-auto">
                Join a community that values artists and celebrates creativity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
                <Link
                  href="/browse"
                  className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-accent text-primary font-semibold rounded-full hover:bg-accent-light transition-all duration-300 text-lg"
                >
                  Browse Artwork
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/30 text-white font-semibold rounded-full hover:bg-white hover:text-primary transition-all duration-300 text-lg"
                >
                  Join Signo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
