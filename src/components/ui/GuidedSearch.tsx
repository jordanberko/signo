'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * GuidedSearch — editorial, Huxley-aligned.
 *
 * Four native <select>s on a hairline baseline, a small uppercase submit.
 * No rounded chips, no pill container, no drop shadow. Intent is to feel
 * like a form in a catalogue, not a search widget.
 */

const STYLE_OPTIONS = [
  { value: '', label: 'Any style' },
  { value: 'Abstract', label: 'Abstract' },
  { value: 'Contemporary', label: 'Contemporary' },
  { value: 'Landscape', label: 'Landscape' },
  { value: 'Portrait', label: 'Portrait' },
  { value: 'Still Life', label: 'Still life' },
  { value: 'Minimalist', label: 'Minimalist' },
  { value: 'Figurative', label: 'Figurative' },
  { value: 'Urban', label: 'Urban' },
];

const SIZE_OPTIONS = [
  { value: '', label: 'Any size' },
  { value: 'small', label: 'Small · under 40cm' },
  { value: 'medium', label: 'Medium · 40–80cm' },
  { value: 'large', label: 'Large · 80–120cm' },
  { value: 'xlarge', label: 'Extra large · 120cm+' },
];

const BUDGET_OPTIONS = [
  { value: '', label: 'Any budget' },
  { value: '0-200', label: 'Under $200' },
  { value: '200-500', label: '$200 – $500' },
  { value: '500-1000', label: '$500 – $1,000' },
  { value: '1000-2500', label: '$1,000 – $2,500' },
  { value: '2500-', label: '$2,500+' },
];

const MEDIUM_OPTIONS = [
  { value: '', label: 'Any medium' },
  { value: 'Oil', label: 'Oil' },
  { value: 'Acrylic', label: 'Acrylic' },
  { value: 'Watercolour', label: 'Watercolour' },
  { value: 'Mixed Media', label: 'Mixed media' },
  { value: 'Photography', label: 'Photography' },
  { value: 'Digital Art', label: 'Digital' },
  { value: 'Printmaking', label: 'Print' },
  { value: 'Ink', label: 'Ink' },
  { value: 'Pencil/Graphite', label: 'Pencil' },
  { value: 'Charcoal', label: 'Charcoal' },
];

export default function GuidedSearch() {
  const [style, setStyle] = useState('');
  const [size, setSize] = useState('');
  const [budget, setBudget] = useState('');
  const [medium, setMedium] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Reset on mount for SSR rehydration parity
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (style) params.set('style', style);
    if (size) params.set('size', size);
    if (budget) params.set('budget', budget);
    if (medium) params.set('medium', medium);
    const qs = params.toString();
    window.location.href = `/browse${qs ? `?${qs}` : ''}`;
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="mt-10 w-full max-w-4xl mx-auto"
    >
      <div
        className="grid gap-x-8 gap-y-6"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}
      >
        <EditorialSelect
          label="Style"
          value={style}
          onChange={setStyle}
          options={STYLE_OPTIONS}
        />
        <EditorialSelect
          label="Size"
          value={size}
          onChange={setSize}
          options={SIZE_OPTIONS}
        />
        <EditorialSelect
          label="Budget"
          value={budget}
          onChange={setBudget}
          options={BUDGET_OPTIONS}
        />
        <EditorialSelect
          label="Medium"
          value={medium}
          onChange={setMedium}
          options={MEDIUM_OPTIONS}
        />
      </div>

      <div className="mt-8">
        <button
          type="submit"
          className="editorial-link bg-transparent border-0 cursor-pointer p-0"
          style={{ paddingBottom: '0.25rem' }}
        >
          Search artwork
        </button>
      </div>
    </form>
  );
}

function EditorialSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span
        style={{
          display: 'block',
          fontSize: '0.62rem',
          fontWeight: 400,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-stone)',
          marginBottom: '0.4rem',
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-sans"
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid var(--color-border-strong)',
          padding: '0.35rem 0',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.9rem',
          fontWeight: 300,
          color: 'var(--color-ink)',
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          backgroundImage:
            'linear-gradient(45deg, transparent 50%, var(--color-stone) 50%), linear-gradient(135deg, var(--color-stone) 50%, transparent 50%)',
          backgroundPosition: 'calc(100% - 12px) 50%, calc(100% - 7px) 50%',
          backgroundSize: '5px 5px, 5px 5px',
          backgroundRepeat: 'no-repeat',
          paddingRight: '24px',
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
