import Link from 'next/link';
import { ArrowRight, Palette, ShieldCheck, DollarSign, Truck } from 'lucide-react';
import ArtworkCard from '@/components/ui/ArtworkCard';

// Placeholder data until Supabase is connected
const FEATURED_ARTWORKS = [
  { id: '1', title: 'Golden Hour Over Sydney', artistName: 'Sarah Mitchell', artistId: 'a1', price: 450, imageUrl: '', medium: 'Oil on Canvas', category: 'original' as const },
  { id: '2', title: 'Coastal Abstractions', artistName: 'James Wong', artistId: 'a2', price: 280, imageUrl: '', medium: 'Acrylic on Board', category: 'original' as const },
  { id: '3', title: 'Eucalyptus Dreams', artistName: 'Maya Patel', artistId: 'a3', price: 65, imageUrl: '', medium: 'Giclée Print', category: 'print' as const },
  { id: '4', title: 'Digital Reef Series #4', artistName: 'Tom Nguyen', artistId: 'a4', price: 35, imageUrl: '', medium: 'Digital Illustration', category: 'digital' as const },
  { id: '5', title: 'Melbourne Laneways', artistName: 'Lisa Chen', artistId: 'a5', price: 520, imageUrl: '', medium: 'Watercolour', category: 'original' as const },
  { id: '6', title: 'Outback Sunset', artistName: 'Dan Roberts', artistId: 'a6', price: 75, imageUrl: '', medium: 'Photography Print', category: 'print' as const },
  { id: '7', title: 'Blue Mountains Mist', artistName: 'Emily Hart', artistId: 'a7', price: 380, imageUrl: '', medium: 'Mixed Media', category: 'original' as const },
  { id: '8', title: 'Abstract Flora', artistName: 'Kai Tanaka', artistId: 'a8', price: 25, imageUrl: '', medium: 'Digital Art', category: 'digital' as const },
];

export default function HomePage() {
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
            {FEATURED_ARTWORKS.map((artwork) => (
              <ArtworkCard key={artwork.id} {...artwork} />
            ))}
          </div>
        </div>
      </section>

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
