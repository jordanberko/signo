'use client';

import { useState } from 'react';
import { MapPin, Star, ShoppingBag, Calendar, ExternalLink } from 'lucide-react';
import ArtworkCard from '@/components/ui/ArtworkCard';

const ARTIST = {
  id: 'a1',
  full_name: 'Sarah Mitchell',
  avatar_url: '',
  bio: 'Sydney-based painter specialising in impressionist landscapes and cityscapes. My work explores the ever-changing light of the Australian coastline and harbour city.\n\nI\'ve been painting professionally for over 12 years, exhibiting in galleries across Sydney and Melbourne. My work is held in private collections throughout Australia and internationally.',
  location: 'Sydney, NSW',
  social_links: { instagram: '#', website: '#' },
  created_at: '2025-06-15',
  rating: 4.8,
  reviewCount: 24,
  salesCount: 47,
};

const ARTIST_ARTWORKS = [
  { id: '1', title: 'Golden Hour Over Sydney', artistName: 'Sarah Mitchell', artistId: 'a1', price: 450, imageUrl: '', medium: 'Oil on Canvas', category: 'original' as const },
  { id: '9', title: 'Harbour Bridge at Dawn', artistName: 'Sarah Mitchell', artistId: 'a1', price: 620, imageUrl: '', medium: 'Oil on Canvas', category: 'original' as const },
  { id: '13', title: 'Bondi to Bronte Walk', artistName: 'Sarah Mitchell', artistId: 'a1', price: 380, imageUrl: '', medium: 'Oil on Board', category: 'original' as const },
  { id: '14', title: 'Sydney Light Study #3', artistName: 'Sarah Mitchell', artistId: 'a1', price: 55, imageUrl: '', medium: 'Giclée Print', category: 'print' as const },
  { id: '15', title: 'Opera House Sunset', artistName: 'Sarah Mitchell', artistId: 'a1', price: 520, imageUrl: '', medium: 'Oil on Canvas', category: 'original' as const },
  { id: '16', title: 'Coastal Morning', artistName: 'Sarah Mitchell', artistId: 'a1', price: 45, imageUrl: '', medium: 'Digital Download', category: 'digital' as const },
];

const REVIEWS = [
  { id: 'r1', buyerName: 'Alex Thompson', rating: 5, comment: 'Absolutely stunning piece. The colours are even more vibrant in person. Packaging was excellent and it arrived quickly.', date: '2026-02-15' },
  { id: 'r2', buyerName: 'Michelle Lee', rating: 5, comment: 'Sarah\'s work is incredible. This is my second purchase and I couldn\'t be happier. The attention to detail is remarkable.', date: '2026-01-20' },
  { id: 'r3', buyerName: 'David Chen', rating: 4, comment: 'Beautiful painting, exactly as described. Took a few extra days to ship but worth the wait.', date: '2025-12-10' },
];

export default function ArtistProfilePage() {
  const [activeTab, setActiveTab] = useState<'artworks' | 'reviews'>('artworks');
  const artist = ARTIST;

  const memberSince = new Date(artist.created_at).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Artist Header */}
      <div className="flex flex-col md:flex-row gap-6 items-start mb-10">
        <div className="w-24 h-24 rounded-full bg-gray-300 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <h1 className="text-3xl font-bold">{artist.full_name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {artist.location}
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              {artist.rating} ({artist.reviewCount} reviews)
            </span>
            <span className="flex items-center gap-1">
              <ShoppingBag className="h-4 w-4" />
              {artist.salesCount} sales
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Member since {memberSince}
            </span>
          </div>
          <p className="text-sm text-muted leading-relaxed whitespace-pre-line max-w-2xl">
            {artist.bio}
          </p>
          <div className="flex gap-3 pt-1">
            <button className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light transition-colors">
              Follow
            </button>
            <button className="px-5 py-2 border border-border text-sm font-medium rounded-lg hover:bg-muted-bg transition-colors">
              Message
            </button>
            {artist.social_links.website && (
              <a href={artist.social_links.website} className="px-3 py-2 border border-border rounded-lg hover:bg-muted-bg transition-colors">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-8">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('artworks')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'artworks'
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            Artworks ({ARTIST_ARTWORKS.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'reviews'
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            Reviews ({REVIEWS.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'artworks' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {ARTIST_ARTWORKS.map((artwork) => (
            <ArtworkCard key={artwork.id} {...artwork} />
          ))}
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">
          {REVIEWS.map((review) => (
            <div key={review.id} className="border-b border-border pb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-300" />
                  <span className="font-medium text-sm">{review.buyerName}</span>
                </div>
                <span className="text-xs text-muted">
                  {new Date(review.date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
