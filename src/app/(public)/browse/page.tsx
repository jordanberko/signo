'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import ArtworkCard from '@/components/ui/ArtworkCard';
import type { ArtworkCategory } from '@/lib/types/database';

// ── Constants ──

const PAGE_SIZE = 24;

const CATEGORIES: { label: string; value: ArtworkCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Originals', value: 'original' },
  { label: 'Prints', value: 'print' },
  { label: 'Digital', value: 'digital' },
];

const MEDIUMS = [
  'Oil',
  'Acrylic',
  'Watercolour',
  'Ink',
  'Pencil/Graphite',
  'Charcoal',
  'Pastel',
  'Mixed Media',
  'Photography',
  'Digital Art',
  'Sculpture',
  'Ceramics',
  'Textile',
  'Printmaking',
];

const STYLES = [
  'Abstract',
  'Contemporary',
  'Realism',
  'Impressionism',
  'Minimalist',
  'Pop Art',
  'Surrealism',
  'Landscape',
  'Portrait',
  'Still Life',
  'Figurative',
  'Botanical',
  'Geometric',
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

const SIZE_PRESETS = [
  { label: 'Small', desc: 'Under 40cm', maxCm: 40 },
  { label: 'Medium', desc: '40–100cm', minCm: 40, maxCm: 100 },
  { label: 'Large', desc: 'Over 100cm', minCm: 100 },
];

// ── Types ──

interface ArtworkRow {
  id: string;
  title: string;
  price_aud: number;
  images: string[];
  medium: string | null;
  style: string | null;
  category: ArtworkCategory;
  artist_id: string;
  width_cm: number | null;
  height_cm: number | null;
  profiles: { id: string; full_name: string } | null;
}

interface Filters {
  category: ArtworkCategory | 'all';
  mediums: string[];
  styles: string[];
  priceMin: string;
  priceMax: string;
  size: string; // '' | 'small' | 'medium' | 'large'
  sort: string;
}

// ── Helpers ──

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Filter Sidebar Section ──

function FilterSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-2 text-sm font-medium text-foreground"
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="mt-2 space-y-1.5">{children}</div>}
    </div>
  );
}

function CheckboxItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex items-center gap-2.5 py-1 cursor-pointer group w-full text-left"
    >
      <div
        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
          checked
            ? 'bg-accent border-accent'
            : 'border-border group-hover:border-warm-gray'
        }`}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-sm text-muted group-hover:text-foreground transition-colors">
        {label}
      </span>
    </button>
  );
}

// ── Main Component ──

function BrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [searchInput, setSearchInput] = useState(initialQuery);
  const debouncedSearch = useDebounce(searchInput, 400);

  // Read URL params from guided search and pre-apply as initial filters
  const initialStyle = searchParams.get('style') || '';
  const initialMedium = searchParams.get('medium') || '';
  const initialSize = searchParams.get('size') || '';
  const initialBudget = searchParams.get('budget') || '';
  const initialSort = searchParams.get('sort') || 'newest';

  // Parse budget param (e.g. "200-500") into priceMin/priceMax
  let initPriceMin = '';
  let initPriceMax = '';
  if (initialBudget) {
    const [lo, hi] = initialBudget.split('-');
    if (lo) initPriceMin = lo;
    if (hi) initPriceMax = hi;
  }

  const [filters, setFilters] = useState<Filters>({
    category: 'all',
    mediums: initialMedium ? [initialMedium] : [],
    styles: initialStyle ? [initialStyle] : [],
    priceMin: initPriceMin,
    priceMax: initPriceMax,
    size: initialSize,
    sort: initialSort,
  });

  const [artworks, setArtworks] = useState<ArtworkRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  const fetchIdRef = useRef(0);

  // Fetch user's favourited artwork IDs once on mount
  useEffect(() => {
    async function fetchFavs() {
      try {
        const res = await fetch('/api/favourites/ids');
        if (res.ok) {
          const json = await res.json();
          setFavouriteIds(new Set(json.ids || []));
        }
      } catch {
        // Silently ignore — hearts will just show as unfavourited
      }
    }
    fetchFavs();
  }, []);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArrayFilter(key: 'mediums' | 'styles', value: string) {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));
  }

  function clearAllFilters() {
    setSearchInput('');
    setFilters({
      category: 'all',
      mediums: [],
      styles: [],
      priceMin: '',
      priceMax: '',
      size: '',
      sort: 'newest',
    });
  }

  const hasActiveFilters =
    filters.category !== 'all' ||
    filters.mediums.length > 0 ||
    filters.styles.length > 0 ||
    filters.priceMin !== '' ||
    filters.priceMax !== '' ||
    filters.size !== '' ||
    debouncedSearch.trim() !== '';

  const activeFilterCount =
    (filters.category !== 'all' ? 1 : 0) +
    filters.mediums.length +
    filters.styles.length +
    (filters.priceMin || filters.priceMax ? 1 : 0) +
    (filters.size ? 1 : 0);

  // Build and execute query via server API route
  const fetchArtworks = useCallback(
    async (append = false) => {
      const id = ++fetchIdRef.current;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      setFetchError(null);

      try {
        // Build query params for the server API
        const params = new URLSearchParams();
        if (filters.category !== 'all') params.set('category', filters.category);
        if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
        if (filters.mediums.length > 0) params.set('mediums', filters.mediums.join(','));
        if (filters.styles.length > 0) params.set('styles', filters.styles.join(','));
        if (filters.priceMin) params.set('priceMin', filters.priceMin);
        if (filters.priceMax) params.set('priceMax', filters.priceMax);
        if (filters.size) params.set('size', filters.size);
        if (filters.sort !== 'newest') params.set('sort', filters.sort);

        const offset = append ? artworks.length : 0;
        if (offset > 0) params.set('offset', String(offset));
        params.set('limit', String(PAGE_SIZE));

        // 15-second timeout (allows for Vercel cold starts)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(`/api/artworks/browse?${params.toString()}`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);

        // Guard against stale responses
        if (id !== fetchIdRef.current) return;

        if (res.ok) {
          const json = await res.json();
          const rows = (json.data || []) as ArtworkRow[];
          if (append) {
            setArtworks((prev) => [...prev, ...rows]);
          } else {
            setArtworks(rows);
          }
          if (json.count != null) setTotalCount(json.count);
        } else {
          const errBody = await res.json().catch(() => ({}));
          console.error('[Browse] API error:', res.status, errBody);
          setFetchError(errBody.error || `Server error (${res.status})`);
          if (!append) setArtworks([]);
        }
      } catch (err) {
        if (id !== fetchIdRef.current) return;
        console.error('[Browse] Fetch error:', err);
        const msg = err instanceof Error && err.name === 'AbortError'
          ? 'Request timed out — please try again'
          : 'Failed to load artworks';
        setFetchError(msg);
        if (!append) setArtworks([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters, debouncedSearch, artworks.length]
  );

  // Re-fetch when filters or search change (reset to page 1)
  useEffect(() => {
    fetchArtworks(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, debouncedSearch]);

  function loadMore() {
    fetchArtworks(true);
  }

  const hasMore = artworks.length < totalCount;

  // Handle search submit on Enter
  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Immediate search — bypass debounce
      fetchArtworks(false);
    }
  }

  // ── Filter sidebar content (shared between desktop & mobile) ──
  const filterContent = (
    <div className="space-y-4">
      {/* Category */}
      <FilterSection title="Category" defaultOpen>
        {CATEGORIES.map((cat) => (
          <CheckboxItem
            key={cat.value}
            label={cat.label}
            checked={
              cat.value === 'all'
                ? filters.category === 'all'
                : filters.category === cat.value
            }
            onChange={() =>
              updateFilter('category', cat.value)
            }
          />
        ))}
      </FilterSection>

      {/* Medium */}
      <FilterSection title="Medium" defaultOpen>
        {MEDIUMS.map((m) => (
          <CheckboxItem
            key={m}
            label={m}
            checked={filters.mediums.includes(m)}
            onChange={() => toggleArrayFilter('mediums', m)}
          />
        ))}
      </FilterSection>

      {/* Style */}
      <FilterSection title="Style">
        {STYLES.map((s) => (
          <CheckboxItem
            key={s}
            label={s}
            checked={filters.styles.includes(s)}
            onChange={() => toggleArrayFilter('styles', s)}
          />
        ))}
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Price Range" defaultOpen>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">
              $
            </span>
            <input
              type="number"
              min="0"
              placeholder="Min"
              value={filters.priceMin}
              onChange={(e) => updateFilter('priceMin', e.target.value)}
              className="w-full pl-7 pr-2 py-2 bg-white border border-border rounded-lg text-sm placeholder:text-warm-gray"
            />
          </div>
          <span className="text-muted text-xs">–</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">
              $
            </span>
            <input
              type="number"
              min="0"
              placeholder="Max"
              value={filters.priceMax}
              onChange={(e) => updateFilter('priceMax', e.target.value)}
              className="w-full pl-7 pr-2 py-2 bg-white border border-border rounded-lg text-sm placeholder:text-warm-gray"
            />
          </div>
        </div>
      </FilterSection>

      {/* Size */}
      <FilterSection title="Size">
        <div className="space-y-1.5">
          {SIZE_PRESETS.map((preset) => (
            <CheckboxItem
              key={preset.label}
              label={`${preset.label} (${preset.desc})`}
              checked={filters.size === preset.label.toLowerCase()}
              onChange={() =>
                updateFilter(
                  'size',
                  filters.size === preset.label.toLowerCase()
                    ? ''
                    : preset.label.toLowerCase()
                )
              }
            />
          ))}
        </div>
      </FilterSection>

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          className="w-full py-2.5 text-sm font-medium text-accent-dark hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div>
      {/* Page Header */}
      <div className="bg-cream border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <p className="text-accent-dark text-sm font-medium tracking-[0.15em] uppercase mb-3">
            Collection
          </p>
          <h1 className="font-editorial text-4xl md:text-5xl font-medium">
            Browse Artwork
          </h1>
          <p className="mt-3 text-muted max-w-lg">
            Discover original art, prints, and digital works from Australian
            artists.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
            <input
              type="text"
              placeholder="Search by title, artist, medium, or style..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-11 pr-10 py-2.5 bg-white border border-border rounded-full text-sm placeholder:text-warm-gray focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-gray hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {/* Mobile filter toggle */}
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-border rounded-full text-sm font-medium hover:border-accent transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <select
              value={filters.sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="px-4 py-2.5 bg-white border border-border rounded-full text-sm appearance-none cursor-pointer hover:border-accent transition-colors min-w-[180px]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main layout: sidebar + grid */}
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-24">{filterContent}</div>
          </aside>

          {/* Mobile slide-out filters */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/30"
                onClick={() => setMobileFiltersOpen(false)}
              />
              <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-xl overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h2 className="font-semibold">Filters</h2>
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="p-1.5 hover:bg-muted-bg rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-4">{filterContent}</div>
                <div className="sticky bottom-0 p-4 bg-white border-t border-border">
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="w-full py-3 bg-primary text-white font-semibold rounded-full text-sm hover:bg-accent transition-colors"
                  >
                    Show results
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results area */}
          <div className="flex-1 min-w-0">
            {fetchError && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-800">
                <span>{fetchError}</span>
                <button
                  onClick={() => { setFetchError(null); fetchArtworks(false); }}
                  className="ml-auto text-red-600 font-medium hover:underline"
                >
                  Retry
                </button>
              </div>
            )}
            {loading ? (
              <div className="text-center py-24">
                <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-muted mt-4 text-sm">Loading artwork...</p>
              </div>
            ) : artworks.length === 0 ? (
              <div className="text-center py-24">
                {hasActiveFilters ? (
                  <>
                    <p className="font-editorial text-2xl text-foreground mb-2">
                      No artworks match your filters
                    </p>
                    <p className="text-muted mb-6 text-sm">
                      Try adjusting your search or removing some filters.
                    </p>
                    <button
                      onClick={clearAllFilters}
                      className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-full hover:bg-accent transition-colors"
                    >
                      Clear all filters
                    </button>
                  </>
                ) : (
                  <>
                    <p className="font-editorial text-2xl text-foreground mb-2">
                      Our collection is being curated
                    </p>
                    <p className="text-muted text-sm">
                      Check back soon! Artists are uploading new works every day.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Results count */}
                <p className="text-xs text-warm-gray mb-6 tracking-wide">
                  Showing {artworks.length} of {totalCount}{' '}
                  {totalCount === 1 ? 'artwork' : 'artworks'}
                </p>

                {/* Artwork Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-10">
                  {artworks.map((artwork) => (
                    <ArtworkCard
                      key={artwork.id}
                      id={artwork.id}
                      title={artwork.title}
                      artistName={
                        artwork.profiles?.full_name || 'Unknown Artist'
                      }
                      artistId={artwork.artist_id}
                      price={artwork.price_aud}
                      imageUrl={artwork.images?.[0] || ''}
                      medium={artwork.medium}
                      category={artwork.category}
                      widthCm={artwork.width_cm}
                      heightCm={artwork.height_cm}
                      initialFavourited={favouriteIds.has(artwork.id)}
                    />
                  ))}
                </div>

                {/* Load More */}
                {hasMore && (
                  <div className="text-center mt-12">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-8 py-3 border-2 border-border text-sm font-semibold rounded-full hover:border-accent hover:text-accent-dark transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>Load more</>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
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
