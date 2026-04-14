'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Sofa,
  Bed,
  Monitor,
  UtensilsCrossed,
  DoorOpen,
  LayoutGrid,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import ArtworkCard from '@/components/ui/ArtworkCard';

// ── Constants ──

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

const ROOMS = [
  { label: 'Living Room', icon: Sofa },
  { label: 'Bedroom', icon: Bed },
  { label: 'Office', icon: Monitor },
  { label: 'Dining Room', icon: UtensilsCrossed },
  { label: 'Hallway', icon: DoorOpen },
  { label: 'Other', icon: LayoutGrid },
];

const SIZES = [
  { label: 'Small', desc: 'Under 40cm', value: 'small' },
  { label: 'Medium', desc: '40 - 100cm', value: 'medium' },
  { label: 'Large', desc: '100 - 150cm', value: 'large' },
  { label: 'Extra Large', desc: '150cm+', value: 'extra-large' },
  { label: 'Not Sure', desc: 'Show all sizes', value: '' },
];

const BUDGETS = [
  { label: 'Under $200', min: 0, max: 200 },
  { label: '$200 - $500', min: 200, max: 500 },
  { label: '$500 - $1,000', min: 500, max: 1000 },
  { label: '$1,000 - $3,000', min: 1000, max: 3000 },
  { label: '$3,000+', min: 3000, max: 0 },
];

const TOTAL_STEPS = 5;

// ── Types ──

interface Artwork {
  id: string;
  title: string;
  price_aud: number;
  images: string[];
  medium: string | null;
  style: string | null;
  category: 'original' | 'print' | 'digital';
  artist_id: string;
  width_cm: number | null;
  height_cm: number | null;
  availability?: 'available' | 'coming_soon' | 'enquire_only';
  profiles: { id: string; full_name: string } | null;
}

// ── Component ──

export default function ArtAdvisoryPage() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [transitioning, setTransitioning] = useState(false);

  // Quiz answers
  const [room, setRoom] = useState('');
  const [size, setSize] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedColours, setSelectedColours] = useState<string[]>([]);
  const [budget, setBudget] = useState<{ min: number; max: number } | null>(null);

  // Results
  const [results, setResults] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [relaxed, setRelaxed] = useState(false);
  const [searched, setSearched] = useState(false);

  const goTo = useCallback((target: number, dir: 'forward' | 'back') => {
    setDirection(dir);
    setTransitioning(true);
    setTimeout(() => {
      setStep(target);
      setTransitioning(false);
    }, 200);
  }, []);

  const goBack = useCallback(() => {
    if (step > 1) goTo(step - 1, 'back');
  }, [step, goTo]);

  const selectRoom = useCallback(
    (label: string) => {
      setRoom(label);
      goTo(2, 'forward');
    },
    [goTo],
  );

  const selectSize = useCallback(
    (value: string) => {
      setSize(value);
      goTo(3, 'forward');
    },
    [goTo],
  );

  const toggleStyle = useCallback((s: string) => {
    setSelectedStyles((prev) => {
      if (prev.includes(s)) return prev.filter((x) => x !== s);
      if (prev.length >= 3) return prev;
      return [...prev, s];
    });
  }, []);

  const toggleColour = useCallback((c: string) => {
    setSelectedColours((prev) => {
      if (prev.includes(c)) return prev.filter((x) => x !== c);
      if (prev.length >= 3) return prev;
      return [...prev, c];
    });
  }, []);

  const buildUrl = useCallback(
    (opts?: { skipColours?: boolean; skipStyles?: boolean; skipSize?: boolean }) => {
      const params = new URLSearchParams();
      if (!opts?.skipStyles && selectedStyles.length > 0) {
        params.set('styles', selectedStyles.join(','));
      }
      if (!opts?.skipColours && selectedColours.length > 0) {
        params.set('colors', selectedColours.join(','));
      }
      if (!opts?.skipSize && size) {
        // Map extra-large to large for the API (both use > 100cm)
        const sizeParam = size === 'extra-large' ? 'large' : size;
        params.set('size', sizeParam);
      }
      if (budget) {
        if (budget.min > 0) params.set('priceMin', String(budget.min));
        if (budget.max > 0) params.set('priceMax', String(budget.max));
      }
      params.set('limit', '24');
      return `/api/artworks/browse?${params.toString()}`;
    },
    [selectedStyles, selectedColours, size, budget],
  );

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setRelaxed(false);
    setSearched(true);

    try {
      // Try with all criteria
      const res1 = await fetch(buildUrl());
      const json1 = await res1.json();
      if ((json1.data || []).length >= 4) {
        setResults(json1.data);
        setLoading(false);
        return;
      }

      // Relax: remove colour filter
      const res2 = await fetch(buildUrl({ skipColours: true }));
      const json2 = await res2.json();
      if ((json2.data || []).length >= 4) {
        setResults(json2.data);
        setRelaxed(true);
        setLoading(false);
        return;
      }

      // Relax: remove style filter too
      const res3 = await fetch(buildUrl({ skipColours: true, skipStyles: true }));
      const json3 = await res3.json();
      if ((json3.data || []).length >= 4) {
        setResults(json3.data);
        setRelaxed(true);
        setLoading(false);
        return;
      }

      // Relax: remove size filter too
      const res4 = await fetch(buildUrl({ skipColours: true, skipStyles: true, skipSize: true }));
      const json4 = await res4.json();
      setResults(json4.data || []);
      if ((json4.data || []).length > 0) setRelaxed(true);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [buildUrl]);

  const selectBudget = useCallback(
    (b: { min: number; max: number }) => {
      setBudget(b);
      // Need to set budget before fetching — use a microtask so state is committed
      setTimeout(() => {
        // Budget will be stale in the closure, so build URL manually
        const params = new URLSearchParams();
        if (selectedStyles.length > 0) params.set('styles', selectedStyles.join(','));
        if (selectedColours.length > 0) params.set('colors', selectedColours.join(','));
        if (size) {
          params.set('size', size === 'extra-large' ? 'large' : size);
        }
        if (b.min > 0) params.set('priceMin', String(b.min));
        if (b.max > 0) params.set('priceMax', String(b.max));
        params.set('limit', '24');

        setStep(6); // Results step
        setLoading(true);
        setRelaxed(false);
        setSearched(true);

        const doFetch = async () => {
          try {
            const baseUrl = `/api/artworks/browse?${params.toString()}`;
            const res1 = await fetch(baseUrl);
            const json1 = await res1.json();
            if ((json1.data || []).length >= 4) {
              setResults(json1.data);
              setLoading(false);
              return;
            }

            // Relax: remove colour
            params.delete('colors');
            const res2 = await fetch(`/api/artworks/browse?${params.toString()}`);
            const json2 = await res2.json();
            if ((json2.data || []).length >= 4) {
              setResults(json2.data);
              setRelaxed(true);
              setLoading(false);
              return;
            }

            // Relax: remove styles
            params.delete('styles');
            const res3 = await fetch(`/api/artworks/browse?${params.toString()}`);
            const json3 = await res3.json();
            if ((json3.data || []).length >= 4) {
              setResults(json3.data);
              setRelaxed(true);
              setLoading(false);
              return;
            }

            // Relax: remove size
            params.delete('size');
            const res4 = await fetch(`/api/artworks/browse?${params.toString()}`);
            const json4 = await res4.json();
            setResults(json4.data || []);
            if ((json4.data || []).length > 0) setRelaxed(true);
            setLoading(false);
          } catch {
            setLoading(false);
          }
        };
        doFetch();
      }, 0);
    },
    [selectedStyles, selectedColours, size],
  );

  const startOver = useCallback(() => {
    setStep(1);
    setRoom('');
    setSize('');
    setSelectedStyles([]);
    setSelectedColours([]);
    setBudget(null);
    setResults([]);
    setRelaxed(false);
    setSearched(false);
    setTransitioning(false);
  }, []);

  // ── Render ──

  // Results view
  if (step === 6) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <Loader2 className="h-8 w-8 text-accent animate-spin mb-4" />
              <p className="text-muted text-sm">Finding your perfect artworks...</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-12">
                {results.length > 0 ? (
                  <>
                    <h1 className="font-editorial text-3xl md:text-4xl font-medium text-primary mb-3">
                      {relaxed ? 'Close matches' : `We found ${results.length} artwork${results.length === 1 ? '' : 's'} for you`}
                    </h1>
                    {relaxed && (
                      <p className="text-muted text-sm">
                        We broadened the search a little to show you more options.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <h1 className="font-editorial text-3xl md:text-4xl font-medium text-primary mb-3">
                      No exact matches found
                    </h1>
                    <p className="text-muted text-sm">
                      Try different criteria or browse all available artwork.
                    </p>
                  </>
                )}
              </div>

              {results.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10 mb-12">
                  {results.map((artwork) => (
                    <ArtworkCard
                      key={artwork.id}
                      id={artwork.id}
                      title={artwork.title}
                      artistName={artwork.profiles?.full_name || 'Unknown'}
                      artistId={artwork.artist_id}
                      price={artwork.price_aud}
                      imageUrl={(artwork.images || [])[0] || ''}
                      medium={artwork.medium}
                      category={artwork.category}
                      widthCm={artwork.width_cm}
                      heightCm={artwork.height_cm}
                      availability={artwork.availability}
                    />
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={startOver}
                  className="inline-flex items-center gap-2 px-6 py-3 border border-border text-primary font-medium rounded-full hover:bg-cream hover:scale-[0.98] active:scale-[0.96] transition-all duration-200"
                >
                  <RotateCcw className="h-4 w-4" />
                  Start Over
                </button>
                <Link
                  href="/browse"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-dark hover:scale-[0.98] active:scale-[0.96] transition-all duration-200"
                >
                  Browse All Artwork
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Quiz steps
  return (
    <div className="min-h-screen bg-[#faf8f4] flex flex-col">
      {/* Progress bar */}
      <div className="w-full h-1 bg-border/40">
        <div
          className="h-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* Step indicator + back */}
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pt-6 flex items-center justify-between">
        {step > 1 ? (
          <button
            onClick={goBack}
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        ) : (
          <span />
        )}
        <span className="text-xs text-muted tracking-wide">
          Step {step} of {TOTAL_STEPS}
        </span>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-start justify-center pt-8 md:pt-16 pb-16 px-4 sm:px-6">
        <div
          className={`max-w-2xl w-full transition-all duration-200 ease-out ${
            transitioning
              ? 'opacity-0 translate-x-4'
              : 'opacity-100 translate-x-0'
          }`}
          style={{
            transform: transitioning
              ? direction === 'forward'
                ? 'translateX(16px)'
                : 'translateX(-16px)'
              : 'translateX(0)',
          }}
        >
          {/* Step 1: Room */}
          {step === 1 && (
            <div>
              <h1 className="font-editorial text-3xl md:text-4xl font-medium text-primary text-center mb-2">
                What room is this for?
              </h1>
              <p className="text-muted text-center mb-10 text-sm">
                This helps us suggest the right feel and scale.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {ROOMS.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={() => selectRoom(label)}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 hover:scale-[0.98] active:scale-[0.96] ${
                      room === label
                        ? 'border-accent bg-white shadow-sm'
                        : 'border-border/60 bg-white/60 hover:border-accent/40 hover:bg-white'
                    }`}
                  >
                    <Icon className="h-7 w-7 text-accent-dark" />
                    <span className="text-sm font-medium text-primary">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Size */}
          {step === 2 && (
            <div>
              <h1 className="font-editorial text-3xl md:text-4xl font-medium text-primary text-center mb-2">
                What size are you looking for?
              </h1>
              <p className="text-muted text-center mb-10 text-sm">
                Select the size that fits your space best.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                {SIZES.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => selectSize(s.value)}
                    className={`flex flex-col items-center gap-1 p-5 rounded-2xl border-2 transition-all duration-200 hover:scale-[0.98] active:scale-[0.96] ${
                      size === s.value
                        ? 'border-accent bg-white shadow-sm'
                        : 'border-border/60 bg-white/60 hover:border-accent/40 hover:bg-white'
                    }`}
                  >
                    <span className="text-sm font-medium text-primary">{s.label}</span>
                    <span className="text-xs text-muted">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Styles */}
          {step === 3 && (
            <div>
              <h1 className="font-editorial text-3xl md:text-4xl font-medium text-primary text-center mb-2">
                What styles do you love?
              </h1>
              <p className="text-muted text-center mb-10 text-sm">
                Pick up to 3 styles that resonate with you.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mb-10">
                {STYLES.map((s) => {
                  const selected = selectedStyles.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleStyle(s)}
                      className={`px-5 py-2.5 rounded-full border-2 text-sm font-medium transition-all duration-200 hover:scale-[0.98] ${
                        selected
                          ? 'border-accent bg-accent/10 text-accent-dark'
                          : selectedStyles.length >= 3
                            ? 'border-border/40 bg-white/40 text-muted/50 cursor-not-allowed'
                            : 'border-border/60 bg-white/60 text-primary hover:border-accent/40 hover:bg-white'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => goTo(4, 'forward')}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-dark hover:scale-[0.98] active:scale-[0.96] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              {selectedStyles.length === 0 && (
                <p className="text-center text-xs text-muted mt-3">
                  You can also skip this step
                </p>
              )}
            </div>
          )}

          {/* Step 4: Colours */}
          {step === 4 && (
            <div>
              <h1 className="font-editorial text-3xl md:text-4xl font-medium text-primary text-center mb-2">
                What colours speak to you?
              </h1>
              <p className="text-muted text-center mb-10 text-sm">
                Pick up to 3 colours you'd love to see.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-10">
                {COLOUR_PALETTE.map((c) => {
                  const selected = selectedColours.includes(c.value);
                  return (
                    <button
                      key={c.value}
                      onClick={() => toggleColour(c.value)}
                      className={`flex flex-col items-center gap-1.5 transition-all duration-200 hover:scale-105 ${
                        selectedColours.length >= 3 && !selected
                          ? 'opacity-30 cursor-not-allowed'
                          : ''
                      }`}
                      title={c.name}
                    >
                      <div
                        className={`w-12 h-12 rounded-full border-[3px] transition-all duration-200 ${
                          selected
                            ? 'border-accent scale-110 shadow-md'
                            : 'border-transparent hover:border-accent/30'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="text-[11px] text-muted">{c.name}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => goTo(5, 'forward')}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-dark hover:scale-[0.98] active:scale-[0.96] transition-all duration-200"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              {selectedColours.length === 0 && (
                <p className="text-center text-xs text-muted mt-3">
                  You can also skip this step
                </p>
              )}
            </div>
          )}

          {/* Step 5: Budget */}
          {step === 5 && (
            <div>
              <h1 className="font-editorial text-3xl md:text-4xl font-medium text-primary text-center mb-2">
                What's your budget?
              </h1>
              <p className="text-muted text-center mb-10 text-sm">
                Select a range and we'll find the best matches.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                {BUDGETS.map((b) => (
                  <button
                    key={b.label}
                    onClick={() => selectBudget({ min: b.min, max: b.max })}
                    className="flex items-center justify-center p-5 rounded-2xl border-2 border-border/60 bg-white/60 text-sm font-medium text-primary hover:border-accent/40 hover:bg-white hover:scale-[0.98] active:scale-[0.96] transition-all duration-200"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
