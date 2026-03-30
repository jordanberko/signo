'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import ArtworkCard from '@/components/ui/ArtworkCard';
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';

const CATEGORIES = ['All', 'Originals', 'Prints', 'Digital'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

interface ArtworkRow {
  id: string;
  title: string;
  price_aud: number;
  images: string[];
  medium: string;
  category: 'original' | 'print' | 'digital';
  artist_id: string;
  users: { id: string; full_name: string } | null;
}

function BrowseContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [artworks, setArtworks] = useState<ArtworkRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArtworks();
  }, [selectedCategory, sortBy, searchQuery]);

  async function fetchArtworks() {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from('artworks')
      .select('id, title, price_aud, images, medium, category, artist_id, users!artworks_artist_id_fkey(id, full_name)')
      .eq('status', 'approved');

    // Category filter
    if (selectedCategory !== 'All') {
      const categoryMap: Record<string, string> = {
        Originals: 'original',
        Prints: 'print',
        Digital: 'digital',
      };
      query = query.eq('category', categoryMap[selectedCategory]);
    }

    // Search
    if (searchQuery.trim()) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,medium.ilike.%${searchQuery}%,style.ilike.%${searchQuery}%`);
    }

    // Sort
    if (sortBy === 'price-low') {
      query = query.order('price_aud', { ascending: true });
    } else if (sortBy === 'price-high') {
      query = query.order('price_aud', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.limit(48);

    const { data, error } = await query;

    if (!error && data) {
      setArtworks(data as unknown as ArtworkRow[]);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Browse Artwork</h1>
        <p className="mt-2 text-muted">
          Discover original art, prints, and digital works from Australian artists
        </p>
      </div>

      {/* Search & Sort */}
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
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
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
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted mt-4">Loading artwork...</p>
        </div>
      ) : artworks.length === 0 ? (
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
          <p className="text-sm text-muted mb-4">{artworks.length} artworks</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {artworks.map((artwork) => (
              <ArtworkCard
                key={artwork.id}
                id={artwork.id}
                title={artwork.title}
                artistName={artwork.users?.full_name || 'Unknown Artist'}
                artistId={artwork.artist_id}
                price={artwork.price_aud}
                imageUrl={artwork.images?.[0] || ''}
                medium={artwork.medium}
                category={artwork.category}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseContent />
    </Suspense>
  );
}
