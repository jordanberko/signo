'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Share2, MessageCircle, ShieldCheck, Truck, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

// Placeholder data — will be replaced with Supabase query
const ARTWORK = {
  id: '1',
  title: 'Golden Hour Over Sydney',
  description: `A stunning oil painting capturing the warm golden light as it washes over Sydney Harbour at dusk. The interplay of light and shadow across the water creates a mesmerising effect that draws the viewer into the scene.\n\nThis piece was painted en plein air over several sessions at Mrs Macquarie's Chair, capturing the changing light conditions across multiple evenings. The thick impasto technique adds texture and depth, making this artwork come alive when viewed in person.\n\nPerfect for a living room, office, or anywhere you want to bring warmth and the beauty of Sydney into your space.`,
  category: 'original' as const,
  medium: 'Oil on Canvas',
  style: 'Impressionism',
  width_cm: 90,
  height_cm: 60,
  depth_cm: 3.5,
  price_aud: 450,
  is_framed: true,
  images: [
    '',
    '',
    '',
    '',
  ],
  tags: ['sydney', 'harbour', 'landscape', 'golden hour', 'impressionism'],
  shipping_weight_kg: 4.5,
  artist: {
    id: 'a1',
    full_name: 'Sarah Mitchell',
    avatar_url: '',
    bio: 'Sydney-based painter specialising in impressionist landscapes. Inspired by the Australian coastline and the ever-changing light of the harbour city.',
    location: 'Sydney, NSW',
    rating: 4.8,
    reviewCount: 24,
    salesCount: 47,
  },
};

export default function ArtworkDetailPage() {
  const [selectedImage, setSelectedImage] = useState(0);
  const artwork = ARTWORK;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted">
        <Link href="/browse" className="hover:text-accent">Browse</Link>
        <span className="mx-2">/</span>
        <span className="capitalize">{artwork.category}s</span>
        <span className="mx-2">/</span>
        <span className="text-foreground">{artwork.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Image Gallery */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative aspect-[4/3] bg-muted-bg rounded-lg overflow-hidden">
            <div
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundColor: '#e5e7eb' }}
            />
            {/* Nav Arrows */}
            {artwork.images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImage((prev) => (prev === 0 ? artwork.images.length - 1 : prev - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setSelectedImage((prev) => (prev === artwork.images.length - 1 ? 0 : prev + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          <div className="flex gap-3 overflow-x-auto">
            {artwork.images.map((_, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`flex-shrink-0 w-20 h-20 rounded-lg bg-muted-bg border-2 transition ${
                  selectedImage === index ? 'border-accent' : 'border-transparent hover:border-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6">
          {/* Title & Price */}
          <div>
            <span className="inline-block px-2 py-1 bg-muted-bg text-xs font-medium rounded mb-2 capitalize">
              {artwork.category}
            </span>
            <h1 className="text-3xl font-bold">{artwork.title}</h1>
            <p className="text-2xl font-bold text-accent mt-2">{formatPrice(artwork.price_aud)}</p>
          </div>

          {/* Artist Info */}
          <Link
            href={`/artists/${artwork.artist.id}`}
            className="flex items-center gap-4 p-4 bg-muted-bg rounded-lg hover:bg-gray-200 transition"
          >
            <div className="w-12 h-12 rounded-full bg-gray-300 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{artwork.artist.full_name}</p>
              <p className="text-sm text-muted">{artwork.artist.location}</p>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span className="font-medium">{artwork.artist.rating}</span>
              <span className="text-muted">({artwork.artist.reviewCount})</span>
            </div>
          </Link>

          {/* Buy Actions */}
          <div className="space-y-3">
            <button className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-light transition-colors text-lg">
              Buy Now
            </button>
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 border border-border rounded-lg flex items-center justify-center gap-2 hover:bg-muted-bg transition text-sm font-medium">
                <Heart className="h-4 w-4" />
                Save
              </button>
              <button className="flex-1 py-2.5 border border-border rounded-lg flex items-center justify-center gap-2 hover:bg-muted-bg transition text-sm font-medium">
                <MessageCircle className="h-4 w-4" />
                Ask Artist
              </button>
              <button className="flex-1 py-2.5 border border-border rounded-lg flex items-center justify-center gap-2 hover:bg-muted-bg transition text-sm font-medium">
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-muted-bg rounded-lg">
              <ShieldCheck className="h-5 w-5 text-success flex-shrink-0" />
              <div>
                <p className="text-xs font-medium">Buyer Protection</p>
                <p className="text-xs text-muted">48-hour inspection</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted-bg rounded-lg">
              <Truck className="h-5 w-5 text-accent flex-shrink-0" />
              <div>
                <p className="text-xs font-medium">Tracked Shipping</p>
                <p className="text-xs text-muted">Ships within 5 days</p>
              </div>
            </div>
          </div>

          {/* Artwork Details */}
          <div className="border-t border-border pt-6 space-y-4">
            <h2 className="font-semibold text-lg">Artwork Details</h2>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-muted">Medium</span>
              <span>{artwork.medium}</span>
              <span className="text-muted">Style</span>
              <span>{artwork.style}</span>
              <span className="text-muted">Dimensions</span>
              <span>{artwork.width_cm} x {artwork.height_cm} x {artwork.depth_cm} cm</span>
              <span className="text-muted">Framed</span>
              <span>{artwork.is_framed ? 'Yes' : 'No'}</span>
              <span className="text-muted">Weight</span>
              <span>{artwork.shipping_weight_kg} kg</span>
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-border pt-6 space-y-3">
            <h2 className="font-semibold text-lg">About This Piece</h2>
            <div className="text-sm text-muted leading-relaxed whitespace-pre-line">
              {artwork.description}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {artwork.tags.map((tag) => (
              <Link
                key={tag}
                href={`/browse?q=${tag}`}
                className="px-3 py-1 bg-muted-bg text-xs rounded-full hover:bg-gray-200 transition"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
