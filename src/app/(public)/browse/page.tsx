'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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

const COLOUR_PALETTE = [
  { name: 'Red', value: 'red', hex: '#DC2626' },
  { name: 'Orange', value: 'orange', hex: '#EA580C' },
  { name: 'Yellow', value: 'yellow', hex: '#EAB308' },
  { name: 'Green', value: 'green', hex: '#16A34A' },
  { name: 'Blue', value: 'blue', hex: '#2563EB' },
  { name: 'Purple', value: 'purple', hex: '#9333EA' },
  { name: 'Pink', value: 'pink', hex: '#EC4899' },
  { name: 'Brown', value: 'brown', hex: '#92400E' },
  { name: 'Black', value: 'black', hex: '#1a1a1a' },
  { name: 'White', value: 'white', hex: '#FAFAFA' },
  { name: 'Grey', value: 'grey', hex: '#6B7280' },
  { name: 'Gold', value: 'gold', hex: '#CA8A04' },
  { name: 'Silver', value: 'silver', hex: '#94A3B8' },
  { name: 'Teal', value: 'teal', hex: '#0D9488' },
  { name: 'Navy', value: 'navy', hex: '#1E3A5A' },
  { name: 'Cream/Beige', value: 'cream', hex: '#D4C5A9' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price ↑' },
  { value: 'price-high', label: 'Price ↓' },
];

const SIZE_PRESETS = [
  { label: 'Small', desc: 'under 40cm' },
  { label: 'Medium', desc: '40–100cm' },
  { label: 'Large', desc: 'over 100cm' },
];

const POPULAR_SEARCHES = [
  'Abstract',
  'Landscape',
  'Oil painting',
  'Under $500',
  'Large artwork',
  'Portrait',
];

const RECENT_SEARCHES_KEY = 'signo_recent_searches';
const MAX_RECENT_SEARCHES = 5;

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  try {
    const existing = getRecentSearches();
    const filtered = existing.filter((s) => s.toLowerCase() !== term.toLowerCase());
    const updated = [term, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // noop
  }
}

function removeRecentSearch(term: string): string[] {
  try {
    const existing = getRecentSearches();
    const updated = existing.filter((s) => s !== term);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // noop
  }
}

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

const ORIENTATIONS = [
  { value: 'landscape', label: 'Landscape' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'square', label: 'Square' },
] as const;

const AU_STATES = [
  { value: 'VIC', label: 'Victoria' },
  { value: 'NSW', label: 'New South Wales' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'SA', label: 'South Australia' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'NT', label: 'Northern Territory' },
  { value: 'ACT', label: 'ACT' },
];

interface Filters {
  category: ArtworkCategory | 'all';
  mediums: string[];
  styles: string[];
  colors: string[];
  priceMin: string;
  priceMax: string;
  size: string;
  orientation: string;
  state: string;
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

// ── Editorial filter primitives ──

/**
 * Typographic filter group. No box, no border, no collapse chevron —
 * just an uppercase hairline-tracked heading above a stack of text rows.
 */
function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '2.2rem' }}>
      <h3
        style={{
          fontSize: '0.66rem',
          fontWeight: 500,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-stone)',
          marginBottom: '0.9rem',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

/**
 * Typographic toggle row — the label itself is the control.
 * Active state is conveyed by ink colour + a thin leading rule.
 */
function FilterRow({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="filter-row"
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '0.28rem 0',
        fontSize: '0.82rem',
        fontWeight: active ? 400 : 300,
        color: active ? 'var(--color-ink)' : 'var(--color-stone-dark)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        letterSpacing: active ? '0.01em' : 0,
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: active ? 18 : 0,
          height: 1,
          background: 'var(--color-ink)',
          verticalAlign: 'middle',
          marginRight: active ? 10 : 0,
          transition: 'width 200ms cubic-bezier(0.22, 1, 0.36, 1), margin 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
      {label}
    </button>
  );
}

// ── Scroll-restoration helpers ──

function buildScrollKey(params: URLSearchParams): string {
  const copy = new URLSearchParams(params);
  copy.delete('page');
  copy.delete('welcome');
  return 'browse-scroll-' + copy.toString();
}

// ── Main component ──

function BrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';
  const showWelcome = searchParams.get('welcome') === '1';
  const [welcomeVisible, setWelcomeVisible] = useState(showWelcome);

  useEffect(() => {
    if (!showWelcome) return;
    function handleScroll() {
      if (window.scrollY > 200) {
        setWelcomeVisible(false);
        // Remove the param from URL without reloading
        const url = new URL(window.location.href);
        url.searchParams.delete('welcome');
        router.replace(url.pathname + (url.search || ''));
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showWelcome, router]);

  const [searchInput, setSearchInput] = useState(initialQuery);
  const debouncedSearch = useDebounce(searchInput, 400);

  const initialStyle = searchParams.get('style') || '';
  const initialMedium = searchParams.get('medium') || '';
  const initialSize = searchParams.get('size') || '';
  const initialBudget = searchParams.get('budget') || '';
  const initialSort = searchParams.get('sort') || 'newest';
  const initialOrientation = searchParams.get('orientation') || '';
  const initialState = searchParams.get('state') || '';
  const initialColorsParam = searchParams.get('colors');
  const initColors = initialColorsParam ? initialColorsParam.split(',').filter(Boolean) : [];
  // How many pages are currently loaded (persisted in URL for Back nav restoration)
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

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
    colors: initColors,
    priceMin: initPriceMin,
    priceMax: initPriceMax,
    size: initialSize,
    orientation: initialOrientation,
    state: initialState,
    sort: initialSort,
  });

  const [artworks, setArtworks] = useState<ArtworkRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  // Track how many pages are currently loaded (1 = first page)
  const [loadedPages, setLoadedPages] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const fetchIdRef = useRef(0);
  // Scroll restoration — only run once after the hydration fetch completes
  const hasRestoredScroll = useRef(false);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSuggestionClick(term: string) {
    setSearchInput(term);
    setShowSuggestions(false);
  }

  function handleRemoveRecent(term: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = removeRecentSearch(term);
    setRecentSearches(updated);
  }

  function handleClearAllRecent() {
    clearRecentSearches();
    setRecentSearches([]);
  }

  useEffect(() => {
    async function fetchFavs() {
      try {
        const res = await fetch('/api/favourites/ids');
        if (res.ok) {
          const json = await res.json();
          setFavouriteIds(new Set(json.ids || []));
        }
      } catch {
        // noop
      }
    }
    fetchFavs();
  }, []);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArrayFilter(key: 'mediums' | 'styles' | 'colors', value: string) {
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
      colors: [],
      priceMin: '',
      priceMax: '',
      size: '',
      orientation: '',
      state: '',
      sort: 'newest',
    });
  }

  const hasActiveFilters =
    filters.category !== 'all' ||
    filters.mediums.length > 0 ||
    filters.styles.length > 0 ||
    filters.colors.length > 0 ||
    filters.priceMin !== '' ||
    filters.priceMax !== '' ||
    filters.size !== '' ||
    filters.orientation !== '' ||
    filters.state !== '' ||
    debouncedSearch.trim() !== '';

  const activeFilterCount =
    (filters.category !== 'all' ? 1 : 0) +
    filters.mediums.length +
    filters.styles.length +
    filters.colors.length +
    (filters.priceMin || filters.priceMax ? 1 : 0) +
    (filters.size ? 1 : 0) +
    (filters.orientation ? 1 : 0) +
    (filters.state ? 1 : 0);

  const fetchArtworks = useCallback(
    async (append = false, pages = 1) => {
      const id = ++fetchIdRef.current;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      setFetchError(null);

      try {
        const params = new URLSearchParams();
        if (filters.category !== 'all') params.set('category', filters.category);
        if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
        if (filters.mediums.length > 0) params.set('mediums', filters.mediums.join(','));
        if (filters.styles.length > 0) params.set('styles', filters.styles.join(','));
        if (filters.colors.length > 0) params.set('colors', filters.colors.join(','));
        if (filters.priceMin) params.set('priceMin', filters.priceMin);
        if (filters.priceMax) params.set('priceMax', filters.priceMax);
        if (filters.size) params.set('size', filters.size);
        if (filters.orientation) params.set('orientation', filters.orientation);
        if (filters.state) params.set('state', filters.state);
        if (filters.sort !== 'newest') params.set('sort', filters.sort);

        // On first load after back-navigation, fetch all previously loaded pages at once
        const offset = append ? artworks.length : 0;
        if (offset > 0) params.set('offset', String(offset));
        params.set('limit', String(PAGE_SIZE * pages));

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(`/api/artworks/browse?${params.toString()}`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);

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

          if (!append && debouncedSearch.trim() && rows.length > 0) {
            saveRecentSearch(debouncedSearch.trim());
            setRecentSearches(getRecentSearches());
          }
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

  useEffect(() => {
    // On first render, fetch enough artworks to cover all previously loaded pages
    fetchArtworks(false, initialPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, debouncedSearch]);

  function loadMore() {
    const nextPage = loadedPages + 1;
    setLoadedPages(nextPage);
    // Persist page count in URL for Back nav
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('page', String(nextPage));
      router.replace(url.pathname + url.search, { scroll: false });
    }
    fetchArtworks(true);
  }

  // Save scroll position on scroll (throttled) and on unmount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let ticking = false;
    const key = buildScrollKey(searchParams);
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          sessionStorage.setItem(key, String(window.scrollY));
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      sessionStorage.setItem(key, String(window.scrollY));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  // Restore scroll after artworks have rendered
  useEffect(() => {
    if (loading) return;
    if (hasRestoredScroll.current) return;
    if (initialPage <= 1) return;
    if (typeof window === 'undefined') return;
    const key = buildScrollKey(searchParams);
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const y = parseInt(saved, 10);
      if (!isNaN(y) && y > 0) {
        window.scrollTo({ top: y, behavior: 'instant' });
      }
    }
    hasRestoredScroll.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artworks, loading]);

  const hasMore = artworks.length < totalCount;

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      setShowSuggestions(false);
      fetchArtworks(false);
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      (e.target as HTMLInputElement).blur();
    }
  }

  // ── Filter panel content (shared desktop + mobile) ──
  const filterPanel = (
    <div>
      <FilterGroup title="Category">
        {CATEGORIES.map((cat) => (
          <FilterRow
            key={cat.value}
            label={cat.label}
            active={filters.category === cat.value}
            onClick={() => updateFilter('category', cat.value)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Medium">
        {MEDIUMS.map((m) => (
          <FilterRow
            key={m}
            label={m}
            active={filters.mediums.includes(m)}
            onClick={() => toggleArrayFilter('mediums', m)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Style">
        {STYLES.map((s) => (
          <FilterRow
            key={s}
            label={s}
            active={filters.styles.includes(s)}
            onClick={() => toggleArrayFilter('styles', s)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Colour">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
          {COLOUR_PALETTE.map((colour) => {
            const selected = filters.colors.includes(colour.value);
            return (
              <button
                key={colour.value}
                type="button"
                title={colour.name}
                onClick={() => toggleArrayFilter('colors', colour.value)}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: colour.hex,
                  border: colour.value === 'white'
                    ? '1px solid var(--color-border-strong)'
                    : '1px solid transparent',
                  boxShadow: selected
                    ? '0 0 0 1px var(--color-warm-white), 0 0 0 2px var(--color-ink)'
                    : 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup title="Price">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <input
            type="number"
            min="0"
            placeholder="min"
            value={filters.priceMin}
            onChange={(e) => updateFilter('priceMin', e.target.value)}
            className="browse-price-input"
          />
          <span style={{ color: 'var(--color-stone)', fontSize: '0.82rem' }}>—</span>
          <input
            type="number"
            min="0"
            placeholder="max"
            value={filters.priceMax}
            onChange={(e) => updateFilter('priceMax', e.target.value)}
            className="browse-price-input"
          />
        </div>
      </FilterGroup>

      <FilterGroup title="Size">
        {SIZE_PRESETS.map((preset) => {
          const key = preset.label.toLowerCase();
          return (
            <FilterRow
              key={preset.label}
              label={`${preset.label} — ${preset.desc}`}
              active={filters.size === key}
              onClick={() =>
                updateFilter('size', filters.size === key ? '' : key)
              }
            />
          );
        })}
      </FilterGroup>

      <FilterGroup title="Orientation">
        {ORIENTATIONS.map((o) => (
          <FilterRow
            key={o.value}
            label={o.label}
            active={filters.orientation === o.value}
            onClick={() =>
              updateFilter('orientation', filters.orientation === o.value ? '' : o.value)
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Location">
        <FilterRow
          label="All Australia"
          active={filters.state === ''}
          onClick={() => updateFilter('state', '')}
        />
        {AU_STATES.map((s) => (
          <FilterRow
            key={s.value}
            label={s.label}
            active={filters.state === s.value}
            onClick={() => updateFilter('state', filters.state === s.value ? '' : s.value)}
          />
        ))}
      </FilterGroup>

      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          className="editorial-link"
          style={{ marginTop: 8 }}
        >
          Clear all
        </button>
      )}
    </div>
  );

  return (
    <div style={{ background: 'var(--color-warm-white)' }}>
      {/* ── Welcome banner ── */}
      {welcomeVisible && (
        <div
          className="px-6 sm:px-10"
          style={{
            paddingTop: 'clamp(4rem, 9vw, 7rem)',
            paddingBottom: 'clamp(2rem, 4vw, 3rem)',
            marginBottom: 'clamp(2rem, 4vw, 3rem)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <p
            style={{
              fontSize: '0.62rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--color-stone)',
              marginBottom: '0.8rem',
            }}
          >
            Welcome
          </p>
          <p
            className="font-serif"
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              fontStyle: 'italic',
              color: 'var(--color-stone-dark)',
              fontWeight: 400,
              lineHeight: 1.55,
              maxWidth: '52ch',
            }}
          >
            <em>A curated room for Australian artists. Begin with the collection.</em>
          </p>
        </div>
      )}
      {/* ── Editorial page header ── */}
      <header
        className="px-6 sm:px-10"
        style={{ paddingTop: 'clamp(4rem, 9vw, 7rem)', paddingBottom: 'clamp(2rem, 5vw, 3.5rem)' }}
      >
        <p
          style={{
            fontSize: '0.68rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            marginBottom: '1.2rem',
            fontWeight: 400,
          }}
        >
          The Collection
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(2.6rem, 6vw, 4.8rem)',
            lineHeight: 1.02,
            letterSpacing: '-0.015em',
            color: 'var(--color-ink)',
            fontWeight: 400,
            maxWidth: '18ch',
            opacity: 0,
            animation: 'fade-up 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
          }}
        >
          Original work from Australian artists.
        </h1>
        <p
          style={{
            marginTop: '1.6rem',
            fontSize: '0.92rem',
            fontWeight: 300,
            lineHeight: 1.6,
            color: 'var(--color-stone-dark)',
            maxWidth: '42ch',
          }}
        >
          {totalCount > 0
            ? `${totalCount.toLocaleString('en-AU')} works currently listed — paintings, prints and sculpture direct from the studio.`
            : 'Paintings, prints and sculpture direct from the studio.'}
        </p>
      </header>

      {/* ── Hairline divider ── */}
      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── Search + sort row ── */}
      <div className="px-6 sm:px-10" style={{ paddingTop: '1.6rem', paddingBottom: '1.6rem' }}>
        <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-10">
          {/* Editorial underlined search */}
          <div ref={searchWrapperRef} className="relative flex-1">
            <label
              style={{
                display: 'block',
                fontSize: '0.62rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                marginBottom: '0.45rem',
              }}
            >
              Search
            </label>
            <input
              type="text"
              placeholder="Title, artist, medium, style"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (!e.target.value) setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleSearchKeyDown}
              className="browse-search-input"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setShowSuggestions(true);
                }}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 10,
                  color: 'var(--color-stone)',
                  fontSize: '0.7rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            )}

            {/* Suggestions dropdown — minimal editorial */}
            {showSuggestions && !searchInput.trim() && (
              <div
                className="absolute left-0 right-0 z-30"
                style={{
                  top: '100%',
                  marginTop: 6,
                  background: 'var(--color-warm-white)',
                  borderTop: '1px solid var(--color-border)',
                  borderBottom: '1px solid var(--color-border)',
                  padding: '1.2rem 0',
                }}
              >
                {recentSearches.length > 0 && (
                  <div style={{ marginBottom: '1.2rem' }}>
                    <div
                      className="flex items-center justify-between"
                      style={{ marginBottom: '0.5rem' }}
                    >
                      <p
                        style={{
                          fontSize: '0.62rem',
                          letterSpacing: '0.2em',
                          textTransform: 'uppercase',
                          color: 'var(--color-stone)',
                        }}
                      >
                        Recent
                      </p>
                      <button
                        onClick={handleClearAllRecent}
                        style={{
                          fontSize: '0.62rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'var(--color-stone-dark)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Clear all
                      </button>
                    </div>
                    <ul className="list-none p-0 m-0">
                      {recentSearches.map((term) => (
                        <li
                          key={term}
                          className="group flex items-center justify-between"
                          style={{ padding: '0.2rem 0' }}
                        >
                          <button
                            onClick={() => handleSuggestionClick(term)}
                            style={{
                              fontSize: '0.88rem',
                              color: 'var(--color-ink)',
                              fontWeight: 300,
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            {term}
                          </button>
                          <button
                            onClick={(e) => handleRemoveRecent(term, e)}
                            aria-label={`Remove ${term}`}
                            className="opacity-0 group-hover:opacity-100"
                            style={{
                              fontSize: '0.7rem',
                              color: 'var(--color-stone)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'opacity 200ms cubic-bezier(0.22, 1, 0.36, 1)',
                            }}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <p
                    style={{
                      fontSize: '0.62rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: 'var(--color-stone)',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Popular
                  </p>
                  <ul className="list-none p-0 m-0">
                    {POPULAR_SEARCHES.map((term) => (
                      <li key={term} style={{ padding: '0.2rem 0' }}>
                        <button
                          onClick={() => handleSuggestionClick(term)}
                          style={{
                            fontSize: '0.88rem',
                            fontWeight: 300,
                            color: 'var(--color-stone-dark)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          {term}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Sort — typographic inline */}
          <div className="flex items-end gap-6">
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.62rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--color-stone)',
                  marginBottom: '0.45rem',
                }}
              >
                Sort
              </label>
              <div className="flex gap-4">
                {SORT_OPTIONS.map((opt) => {
                  const active = filters.sort === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => updateFilter('sort', opt.value)}
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: active ? 400 : 300,
                        color: active ? 'var(--color-ink)' : 'var(--color-stone-dark)',
                        background: 'none',
                        border: 'none',
                        borderBottom: active
                          ? '1px solid var(--color-ink)'
                          : '1px solid transparent',
                        paddingBottom: 2,
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden editorial-link"
              style={{ paddingBottom: 2 }}
            >
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── Cross-discovery nudge ── */}
      <div
        className="px-6 sm:px-10"
        style={{
          paddingTop: '0.9rem',
          paddingBottom: '0.9rem',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <p
          style={{
            fontSize: '0.78rem',
            color: 'var(--color-stone-dark)',
            fontWeight: 300,
          }}
        >
          <Link href="/collections" className="editorial-link" style={{ fontSize: '0.78rem' }}>
            Discover by collection
          </Link>
          <em
            className="font-serif"
            style={{
              fontStyle: 'italic',
              color: 'var(--color-stone)',
              margin: '0 0.5em',
            }}
          >
            ·
          </em>
          <Link href="/artists" className="editorial-link" style={{ fontSize: '0.78rem' }}>
            Discover by artist
          </Link>
        </p>
      </div>

      {/* ── Main layout ── */}
      <div className="px-6 sm:px-10" style={{ paddingTop: 'clamp(3rem, 5vw, 4.5rem)', paddingBottom: 'clamp(4rem, 7vw, 6rem)' }}>
        <div className="flex gap-10 lg:gap-16">
          {/* Desktop sidebar */}
          <aside
            className="hidden lg:block flex-shrink-0"
            style={{ width: 200 }}
          >
            <div className="sticky" style={{ top: '6rem' }}>
              {filterPanel}
            </div>
          </aside>

          {/* Mobile slide-out */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0"
                style={{ background: 'rgba(26,26,24,0.35)' }}
                onClick={() => setMobileFiltersOpen(false)}
              />
              <div
                className="absolute right-0 top-0 bottom-0 overflow-y-auto"
                style={{
                  width: 320,
                  maxWidth: '86vw',
                  background: 'var(--color-warm-white)',
                  borderLeft: '1px solid var(--color-border)',
                }}
              >
                <div
                  className="flex items-center justify-between px-6"
                  style={{
                    paddingTop: '1.4rem',
                    paddingBottom: '1.4rem',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.66rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: 'var(--color-stone)',
                    }}
                  >
                    Filter
                  </span>
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    aria-label="Close filters"
                    style={{
                      fontSize: '0.7rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--color-stone-dark)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </div>
                <div className="px-6" style={{ padding: '1.6rem' }}>
                  {filterPanel}
                </div>
                <div
                  className="sticky bottom-0 px-6"
                  style={{
                    background: 'var(--color-warm-white)',
                    borderTop: '1px solid var(--color-border)',
                    padding: '1.1rem 1.5rem',
                  }}
                >
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="editorial-link"
                  >
                    Show {totalCount} {totalCount === 1 ? 'work' : 'works'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="flex-1 min-w-0">
            {fetchError && (
              <div
                style={{
                  marginBottom: '1.4rem',
                  padding: '0.9rem 1rem',
                  borderTop: '1px solid var(--color-error)',
                  borderBottom: '1px solid var(--color-error)',
                  fontSize: '0.82rem',
                  color: 'var(--color-error)',
                  fontWeight: 300,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{fetchError}</span>
                <button
                  onClick={() => { setFetchError(null); fetchArtworks(false); }}
                  className="editorial-link"
                  style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                >
                  Retry
                </button>
              </div>
            )}

            {loading ? (
              <div style={{ padding: '6rem 0' }}>
                <p
                  style={{
                    fontSize: '0.62rem',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'var(--color-stone)',
                    marginBottom: '1rem',
                  }}
                >
                  — One moment —
                </p>
                <p
                  className="font-serif"
                  style={{
                    fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)',
                    lineHeight: 1.2,
                    letterSpacing: '-0.01em',
                    color: 'var(--color-ink)',
                    fontStyle: 'italic',
                    fontWeight: 400,
                    maxWidth: '24ch',
                  }}
                >
                  Curating the collection…
                </p>
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  style={{ columnGap: '2.2rem', rowGap: '4rem', marginTop: '3rem' }}
                  aria-hidden
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i}>
                      <div
                        className="aspect-[4/5]"
                        style={{ background: 'var(--color-cream)' }}
                      />
                      <div
                        style={{
                          marginTop: '1rem',
                          height: 1,
                          background: 'var(--color-border)',
                          width: '60%',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : artworks.length === 0 ? (
              <div style={{ padding: '5rem 0', maxWidth: '46ch' }}>
                {debouncedSearch.trim() ? (
                  <>
                    <p
                      className="font-serif"
                      style={{
                        fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                        lineHeight: 1.15,
                        letterSpacing: '-0.01em',
                        color: 'var(--color-ink)',
                      }}
                    >
                      Nothing found for &ldquo;{debouncedSearch.trim()}&rdquo;.
                    </p>
                    <p
                      style={{
                        marginTop: '1.1rem',
                        fontSize: '0.88rem',
                        color: 'var(--color-stone-dark)',
                        fontWeight: 300,
                        lineHeight: 1.6,
                      }}
                    >
                      Try a different term, or browse one of these instead.
                    </p>
                    <ul className="list-none p-0 m-0" style={{ marginTop: '1.2rem' }}>
                      {['Abstract', 'Oil', 'Landscape', 'Contemporary'].map((term) => (
                        <li key={term} style={{ padding: '0.25rem 0' }}>
                          <button
                            onClick={() => setSearchInput(term)}
                            style={{
                              fontSize: '0.92rem',
                              color: 'var(--color-ink)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: 300,
                              padding: 0,
                            }}
                          >
                            → {term}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={clearAllFilters}
                      className="editorial-link"
                      style={{ marginTop: '1.8rem' }}
                    >
                      Browse everything
                    </button>
                  </>
                ) : hasActiveFilters ? (
                  <>
                    <p
                      className="font-serif"
                      style={{
                        fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                        lineHeight: 1.15,
                        color: 'var(--color-ink)',
                      }}
                    >
                      No works match those filters.
                    </p>
                    <button
                      onClick={clearAllFilters}
                      className="editorial-link"
                      style={{ marginTop: '1.6rem' }}
                    >
                      Clear all filters
                    </button>
                  </>
                ) : (
                  <>
                    <p
                      className="font-serif"
                      style={{
                        fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                        lineHeight: 1.15,
                        color: 'var(--color-ink)',
                      }}
                    >
                      The collection is being curated.
                    </p>
                    <p
                      style={{
                        marginTop: '1.1rem',
                        fontSize: '0.88rem',
                        color: 'var(--color-stone-dark)',
                        fontWeight: 300,
                        lineHeight: 1.6,
                      }}
                    >
                      New works are catalogued weekly. Please check back soon.
                    </p>
                    <Link
                      href="/artists"
                      className="editorial-link"
                      style={{ marginTop: '1.6rem', display: 'inline-block' }}
                    >
                      Browse the artist directory →
                    </Link>
                  </>
                )}
              </div>
            ) : (
              <>
                <p
                  style={{
                    fontSize: '0.68rem',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--color-stone)',
                    marginBottom: '2rem',
                    fontWeight: 400,
                  }}
                >
                  {artworks.length} of {totalCount} shown
                </p>

                <div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  style={{ columnGap: '2.2rem', rowGap: '4rem' }}
                >
                  {artworks.map((artwork, i) => (
                    <div
                      key={artwork.id}
                      style={{
                        opacity: 0,
                        animation: `fade-up 700ms cubic-bezier(0.22, 1, 0.36, 1) ${Math.min(i * 60, 320)}ms forwards`,
                      }}
                    >
                    <ArtworkCard
                      id={artwork.id}
                      title={artwork.title}
                      artistName={artwork.profiles?.full_name || 'Unknown Artist'}
                      artistId={artwork.artist_id}
                      price={artwork.price_aud}
                      imageUrl={artwork.images?.[0] || ''}
                      medium={artwork.medium}
                      category={artwork.category}
                      widthCm={artwork.width_cm}
                      heightCm={artwork.height_cm}
                      initialFavourited={favouriteIds.has(artwork.id)}
                    />
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <div className="text-center" style={{ marginTop: '4.5rem' }}>
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="editorial-link"
                      style={{ opacity: loadingMore ? 0.5 : 1 }}
                    >
                      {loadingMore ? 'Loading…' : 'Load more'}
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
