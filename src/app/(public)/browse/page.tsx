'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import ArtworkCard from '@/components/ui/ArtworkCard';

const PLACEHOLDER_ARTWORKS = [
  { id: '1', title: 'Golden Hour Over Sydney', artistName: 'Sarah Mitchell', artistId: 'a1', price: 450, imageUrl: '', medium: 'Oil on Canvas', category: 'original' as const },
  { id: '2', title: 'Coastal Abstractions', artistName: 'James Wong', artistId: 'a2', price: 280, imageUrl: '', medium: 'Acrylic on Board', category: 'original' as const },
  { id: '3', title: 'Eucalyptus Dreams', artistName: 'Maya Patel', artistId: 'a3', price: 65, imageUrl: '', medium: 'Giclée Print', category: 'print' as const },
  { id: '4', title: 'Digital Reef Series #4', artistName: 'Tom Nguyen', artistId: 'a4', price: 35, imageUrl: '', medium: 'Digital Illustration', category: 'digital' as const },
  { id: '5', title: 'Melbourne Laneways', artistName: 'Lisa Chen', artistId: 'a5', price: 520, imageUrl: '', medium: 'Watercolour', category: 'original' as const },
  { id: '6', title: 'Outback Sunset', artistName: 'Dan Roberts', artistId: 'a6', price: 75, imageUrl: '', medium: 'Photography Print', category: 'print' as const },
  { id: '7', title: 'Blue Mountains Mist', artistName: 'Emily Hart', artistId: 'a7', price: 380, imageUrl: '', medium: 'Mixed Media', category: 'original' as const },
  { id: '8', title: 'Abstract Flora', artistName: 'Kai Tanaka', artistId: 'a8', price: 25, imageUrl: '', medium: 'Digital Art', category: 'digital' as const },
  { id: '9', title: 'Harbour Bridge at Dawn', artistName: 'Sarah Mitchell', artistId: 'a1', price: 620, imageUrl: '', medium: 'Oil on Canvas', category: 'original' as const },
  { id: '10', title: 'Tropical Minimalism', artistName: 'James Wong', artistId: 'a2', price: 45, imageUrl: '', medium: 'Digital Illustration', category: 'digital' as const },
  { id: '11', title: 'Desert Rose', artistName: 'Maya Patel', artistId: 'a3', price: 340, imageUrl: '', medium: 'Acrylic on Canvas', category: 'original' as const },
  { id: '12', title: 'Bondi Blues', artistName: 'Dan Roberts', artistId: 'a6', price: 55, imageUrl: '', medium: 'Photography Print', category: 'print' as const },
];

const CATEGORIES = ['All', 'Originals', 'Prints', 'Digital'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
];

export default function BrowsePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const filteredArtworks = PLACEHOLDER_ARTWORKS.filter((artwork) => {
    if (selectedCategory !== 'All') {
      const categoryMap: Record<string, string> = {
        Originals: 'original',
        Prints: 'print',
        Digital: 'digital',
      };
      if (artwork.category !== categoryMap[selectedCategory]) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        artwork.title.toLowerCase().includes(q) ||
        artwork.artistName.toLowerCase().includes(q) ||
        artwork.medium.toLowerCase().includes(q)
      );
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Browse Artwork</h1>
        <p className="mt-2 text-muted">
          Discover original art, prints, and digital works from Australian artists
        </p>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search by title, artist, or medium..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted" />
            </button>
          )}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="sm:hidden inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-primary text-white'
                : 'bg-muted-bg text-foreground hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      {filteredArtworks.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg text-muted">No artwork found matching your criteria.</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
            className="mt-4 text-accent font-medium hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted mb-4">{filteredArtworks.length} artworks</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredArtworks.map((artwork) => (
              <ArtworkCard key={artwork.id} {...artwork} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
