'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, X, SlidersHorizontal } from 'lucide-react';
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
  profiles: { id: string; full_name: string } | null;
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
      .select('id, title, price_aud, images, medium, category, artist_id, profiles!artworks_artist_id_fkey(id, full_name)')
      .eq('status', 'approved');

    if (selectedCategory !== 'All') {
      const categoryMap: Record<string, string> = {
        Originals: 'original',
        Prints: 'print',
        Digital: 'digital',
      };
      query = query.eq('category', categoryMap[selectedCategory]);
    }

    if (searchQuery.trim()) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,medium.ilike.%${searchQuery}%,style.ilike.%${searchQuery}%`);
    }

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
    <div>
      {/* Page Header */}
      <div className="bg-cream border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <p className="text-accent text-sm font-medium tracking-[0.15em] uppercase mb-3">Collection</p>
          <h1 className="font-editorial text-4xl md:text-5xl font-medium">Browse Artwork</h1>
          <p className="mt-3 text-muted max-w-lg">
            Discover original art, prints, and digital works from Australian artists.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Bar */}
        <div className="flex flex-col gap-4 mb-8">
          {/* Search & Sort Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
              <input
                type="text"
                placeholder="Search by title, artist, or medium..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-2.5 bg-white border border-border rounded-full text-sm placeholder:text-warm-gray"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-gray hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 bg-white border border-border rounded-full text-sm appearance-none cursor-pointer hover:border-accent transition-colors min-w-[180px]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                  selectedCategory === cat
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-muted border border-border hover:border-accent hover:text-accent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-24">
            <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-muted mt-4 text-sm">Loading artwork...</p>
          </div>
        ) : artworks.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-editorial text-2xl text-foreground mb-2">No artwork found</p>
            <p className="text-muted mb-6">Try adjusting your search or filters</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="text-accent font-medium hover:underline text-sm"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-warm-gray mb-6 tracking-wide">{artworks.length} {artworks.length === 1 ? 'artwork' : 'artworks'}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10 stagger-children">
              {artworks.map((artwork) => (
                <ArtworkCard
                  key={artwork.id}
                  id={artwork.id}
                  title={artwork.title}
                  artistName={artwork.profiles?.full_name || 'Unknown Artist'}
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
