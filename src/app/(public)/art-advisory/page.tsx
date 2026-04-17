'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
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

const ROOMS = ['Living Room', 'Bedroom', 'Office', 'Dining Room', 'Hallway', 'Other'];

const SIZES = [
  { label: 'Small', desc: 'Under 40cm', value: 'small' },
  { label: 'Medium', desc: '40 – 100cm', value: 'medium' },
  { label: 'Large', desc: '100 – 150cm', value: 'large' },
  { label: 'Extra Large', desc: '150cm +', value: 'extra-large' },
  { label: 'Not Sure', desc: 'Show all sizes', value: '' },
];

const BUDGETS = [
  { label: 'Under $200', min: 0, max: 200 },
  { label: '$200 – $500', min: 200, max: 500 },
  { label: '$500 – $1,000', min: 500, max: 1000 },
  { label: '$1,000 – $3,000', min: 1000, max: 3000 },
  { label: '$3,000 +', min: 3000, max: 0 },
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

// ── Shared styles ──

const kickerStyle: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
  marginBottom: '1rem',
};

const headlineStyle: React.CSSProperties = {
  fontSize: 'clamp(2rem, 4.5vw, 3.4rem)',
  lineHeight: 1.04,
  letterSpacing: '-0.015em',
  color: 'var(--color-ink)',
  fontWeight: 400,
  maxWidth: '22ch',
};

const subStyle: React.CSSProperties = {
  marginTop: '1.2rem',
  fontSize: '1rem',
  fontWeight: 300,
  lineHeight: 1.7,
  color: 'var(--color-stone-dark)',
  maxWidth: '48ch',
};

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
  const [, setSearched] = useState(false);

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

  const selectBudget = useCallback(
    (b: { min: number; max: number }) => {
      setBudget(b);
      setTimeout(() => {
        const params = new URLSearchParams();
        if (selectedStyles.length > 0) params.set('styles', selectedStyles.join(','));
        if (selectedColours.length > 0) params.set('colors', selectedColours.join(','));
        if (size) {
          params.set('size', size === 'extra-large' ? 'large' : size);
        }
        if (b.min > 0) params.set('priceMin', String(b.min));
        if (b.max > 0) params.set('priceMax', String(b.max));
        params.set('limit', '24');

        setStep(6);
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

            params.delete('colors');
            const res2 = await fetch(`/api/artworks/browse?${params.toString()}`);
            const json2 = await res2.json();
            if ((json2.data || []).length >= 4) {
              setResults(json2.data);
              setRelaxed(true);
              setLoading(false);
              return;
            }

            params.delete('styles');
            const res3 = await fetch(`/api/artworks/browse?${params.toString()}`);
            const json3 = await res3.json();
            if ((json3.data || []).length >= 4) {
              setResults(json3.data);
              setRelaxed(true);
              setLoading(false);
              return;
            }

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

  // ── Results view ──
  if (step === 6) {
    return (
      <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
        <header
          className="px-6 sm:px-10"
          style={{
            paddingTop: 'clamp(4rem, 9vw, 7rem)',
            paddingBottom: 'clamp(2.5rem, 5vw, 4rem)',
          }}
        >
          <p style={kickerStyle}>Advisory · Results</p>
          {loading ? (
            <h1 className="font-serif" style={headlineStyle}>
              Finding your <em style={{ fontStyle: 'italic' }}>matches…</em>
            </h1>
          ) : results.length > 0 ? (
            <>
              <h1 className="font-serif" style={headlineStyle}>
                {relaxed ? (
                  <>
                    Close <em style={{ fontStyle: 'italic' }}>matches.</em>
                  </>
                ) : (
                  <>
                    {results.length} {results.length === 1 ? 'artwork' : 'artworks'}{' '}
                    <em style={{ fontStyle: 'italic' }}>for you.</em>
                  </>
                )}
              </h1>
              {relaxed && (
                <p style={subStyle}>
                  We broadened the search a little to surface more options worth considering.
                </p>
              )}
            </>
          ) : (
            <>
              <h1 className="font-serif" style={headlineStyle}>
                No exact <em style={{ fontStyle: 'italic' }}>matches.</em>
              </h1>
              <p style={subStyle}>
                Try different criteria, or browse the full roster.
              </p>
            </>
          )}
        </header>

        <div style={{ borderTop: '1px solid var(--color-border)' }} />

        <section
          className="px-6 sm:px-10"
          style={{
            paddingTop: 'clamp(3rem, 6vw, 5rem)',
            paddingBottom: 'clamp(5rem, 9vw, 8rem)',
          }}
        >
          {results.length > 0 && !loading && (
            <div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              style={{ gap: 'clamp(1.8rem, 3vw, 2.6rem) clamp(1rem, 2vw, 1.6rem)', marginBottom: 'clamp(3rem, 6vw, 5rem)' }}
            >
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

          <div
            style={{
              display: 'flex',
              gap: '2.2rem',
              flexWrap: 'wrap',
              alignItems: 'center',
              borderTop: '1px solid var(--color-border)',
              paddingTop: '2.4rem',
            }}
          >
            <button
              type="button"
              onClick={startOver}
              className="editorial-link"
              style={{ background: 'transparent', cursor: 'pointer' }}
            >
              ← Start over
            </button>
            <Link
              href="/browse"
              style={{
                display: 'inline-block',
                paddingBottom: '0.2rem',
                borderBottom: '1px solid var(--color-stone)',
                fontSize: '0.78rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 300,
                color: 'var(--color-ink)',
                textDecoration: 'none',
              }}
            >
              Browse all artwork
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // ── Quiz steps ──
  return (
    <div
      style={{
        background: 'var(--color-warm-white)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Hairline progress */}
      <div style={{ width: '100%', height: '1px', background: 'var(--color-border)' }}>
        <div
          style={{
            height: '100%',
            background: 'var(--color-ink)',
            width: `${(step / TOTAL_STEPS) * 100}%`,
            transition: 'width var(--dur-base) var(--ease-out)',
          }}
        />
      </div>

      {/* Step indicator + back */}
      <div
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(1.8rem, 3vw, 2.4rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {step > 1 ? (
          <button
            type="button"
            onClick={goBack}
            className="editorial-link"
            style={{ background: 'transparent', cursor: 'pointer' }}
          >
            ← Back
          </button>
        ) : (
          <span />
        )}
        <span
          className="font-serif"
          style={{
            fontSize: '0.82rem',
            color: 'var(--color-stone)',
            fontStyle: 'italic',
          }}
        >
          Step {String(step).padStart(2, '0')} <span style={{ color: 'var(--color-stone)' }}>/</span>{' '}
          {String(TOTAL_STEPS).padStart(2, '0')}
        </span>
      </div>

      {/* Step content */}
      <div
        className="px-6 sm:px-10"
        style={{
          flex: 1,
          paddingTop: 'clamp(3rem, 7vw, 6rem)',
          paddingBottom: 'clamp(4rem, 8vw, 7rem)',
        }}
      >
        <div
          style={{
            maxWidth: '56rem',
            margin: '0 auto',
            transform: transitioning
              ? direction === 'forward'
                ? 'translateX(16px)'
                : 'translateX(-16px)'
              : 'translateX(0)',
            opacity: transitioning ? 0 : 1,
            transition: 'opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
          }}
        >
          {/* ─ Step 1: Room ─ */}
          {step === 1 && (
            <div>
              <p style={kickerStyle}>The Brief</p>
              <h1 className="font-serif" style={headlineStyle}>
                Which room is this <em style={{ fontStyle: 'italic' }}>for?</em>
              </h1>
              <p style={subStyle}>
                It tells us something about scale, atmosphere, and how the work will be lived with.
              </p>
              <ChoiceList
                items={ROOMS.map((label) => ({ label }))}
                selected={room}
                onSelect={(v) => selectRoom(v)}
              />
            </div>
          )}

          {/* ─ Step 2: Size ─ */}
          {step === 2 && (
            <div>
              <p style={kickerStyle}>Dimensions</p>
              <h1 className="font-serif" style={headlineStyle}>
                What <em style={{ fontStyle: 'italic' }}>size?</em>
              </h1>
              <p style={subStyle}>
                Roughly — measurements in the broadest axis. Pick Not Sure to keep the field open.
              </p>
              <ChoiceList
                items={SIZES.map((s) => ({ label: s.label, detail: s.desc, value: s.value }))}
                selected={size}
                onSelect={(v) => selectSize(v)}
              />
            </div>
          )}

          {/* ─ Step 3: Styles ─ */}
          {step === 3 && (
            <div>
              <p style={kickerStyle}>Style · Pick up to 3</p>
              <h1 className="font-serif" style={headlineStyle}>
                What styles <em style={{ fontStyle: 'italic' }}>resonate?</em>
              </h1>
              <p style={subStyle}>
                Choose up to three. You can skip this step entirely and we&apos;ll cast a wider net.
              </p>

              <div
                style={{
                  marginTop: '2.5rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.8rem 1.2rem',
                }}
              >
                {STYLES.map((s) => {
                  const selected = selectedStyles.includes(s);
                  const disabled = !selected && selectedStyles.length >= 3;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleStyle(s)}
                      disabled={disabled}
                      className="font-serif"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '0.4rem 0',
                        fontSize: '1.05rem',
                        fontStyle: selected ? 'italic' : 'normal',
                        color: selected
                          ? 'var(--color-ink)'
                          : disabled
                            ? 'var(--color-stone)'
                            : 'var(--color-ink)',
                        borderBottom: selected
                          ? '1px solid var(--color-ink)'
                          : '1px solid transparent',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.4 : 1,
                        letterSpacing: '-0.005em',
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: '3rem',
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2rem',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  onClick={() => goTo(4, 'forward')}
                  className="artwork-primary-cta artwork-primary-cta--compact"
                  style={{ minWidth: '12rem' }}
                >
                  Continue →
                </button>
                {selectedStyles.length === 0 && (
                  <span
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--color-stone)',
                      fontStyle: 'italic',
                    }}
                  >
                    or skip this step
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ─ Step 4: Colours ─ */}
          {step === 4 && (
            <div>
              <p style={kickerStyle}>Palette · Pick up to 3</p>
              <h1 className="font-serif" style={headlineStyle}>
                Which colours <em style={{ fontStyle: 'italic' }}>speak?</em>
              </h1>
              <p style={subStyle}>
                Pick up to three notes you&apos;d like to see surface in the selection.
              </p>

              <div
                style={{
                  marginTop: '2.5rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1.6rem 1.8rem',
                }}
              >
                {COLOUR_PALETTE.map((c) => {
                  const selected = selectedColours.includes(c.value);
                  const disabled = !selected && selectedColours.length >= 3;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => toggleColour(c.value)}
                      disabled={disabled}
                      title={c.name}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.55rem',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.3 : 1,
                        transition: 'opacity var(--dur-fast)',
                      }}
                    >
                      <span
                        style={{
                          width: '2.6rem',
                          height: '2.6rem',
                          borderRadius: '50%',
                          background: c.hex,
                          border: selected
                            ? '1px solid var(--color-ink)'
                            : '1px solid var(--color-border)',
                          boxShadow: selected
                            ? '0 0 0 3px var(--color-warm-white), 0 0 0 4px var(--color-ink)'
                            : 'none',
                          transition: 'box-shadow var(--dur-fast)',
                        }}
                      />
                      <span
                        style={{
                          fontSize: '0.68rem',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: selected ? 'var(--color-ink)' : 'var(--color-stone)',
                          fontWeight: selected ? 400 : 300,
                        }}
                      >
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: '3rem',
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2rem',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  onClick={() => goTo(5, 'forward')}
                  className="artwork-primary-cta artwork-primary-cta--compact"
                  style={{ minWidth: '12rem' }}
                >
                  Continue →
                </button>
                {selectedColours.length === 0 && (
                  <span
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--color-stone)',
                      fontStyle: 'italic',
                    }}
                  >
                    or skip this step
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ─ Step 5: Budget ─ */}
          {step === 5 && (
            <div>
              <p style={kickerStyle}>Budget</p>
              <h1 className="font-serif" style={headlineStyle}>
                What are you <em style={{ fontStyle: 'italic' }}>working with?</em>
              </h1>
              <p style={subStyle}>
                A range is fine — we&apos;ll shortlist pieces that sit comfortably inside it.
              </p>
              <ChoiceList
                items={BUDGETS.map((b) => ({ label: b.label, value: `${b.min}-${b.max}` }))}
                selected={budget ? `${budget.min}-${budget.max}` : ''}
                onSelect={(value) => {
                  const match = BUDGETS.find((b) => `${b.min}-${b.max}` === value);
                  if (match) selectBudget({ min: match.min, max: match.max });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reusable editorial choice list ──

function ChoiceList({
  items,
  selected,
  onSelect,
}: {
  items: Array<{ label: string; detail?: string; value?: string }>;
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <ol className="list-none p-0 m-0" style={{ marginTop: '2.5rem' }}>
      {items.map((item, i) => {
        const value = item.value ?? item.label;
        const isSelected = selected === value;
        return (
          <li
            key={item.label}
            style={{
              borderTop: '1px solid var(--color-border)',
              borderBottom: i === items.length - 1 ? '1px solid var(--color-border)' : 'none',
            }}
          >
            <button
              type="button"
              onClick={() => onSelect(value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                padding: '1.4rem 0',
                display: 'grid',
                gridTemplateColumns: '2.4rem minmax(0, 1fr) auto',
                gap: '1rem',
                alignItems: 'baseline',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span
                className="font-serif"
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--color-stone)',
                  fontStyle: 'italic',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>
                <span
                  className="font-serif"
                  style={{
                    display: 'block',
                    fontSize: 'clamp(1.15rem, 2vw, 1.5rem)',
                    color: 'var(--color-ink)',
                    fontStyle: isSelected ? 'italic' : 'normal',
                    fontWeight: 400,
                    letterSpacing: '-0.005em',
                  }}
                >
                  {item.label}
                </span>
                {item.detail && (
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--color-stone)',
                      marginTop: '0.3rem',
                      fontWeight: 300,
                    }}
                  >
                    {item.detail}
                  </span>
                )}
              </span>
              <span
                style={{
                  fontSize: '0.78rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: isSelected ? 'var(--color-ink)' : 'var(--color-stone)',
                  fontWeight: 300,
                }}
              >
                →
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
