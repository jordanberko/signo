'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ArrowRight } from 'lucide-react';

// ── Filter options ──

const STYLE_OPTIONS = [
  { value: '', label: 'All Styles' },
  { value: 'Abstract', label: 'Abstract' },
  { value: 'Contemporary', label: 'Contemporary' },
  { value: 'Landscape', label: 'Landscape' },
  { value: 'Portrait', label: 'Portrait' },
  { value: 'Still Life', label: 'Still Life' },
  { value: 'Minimalist', label: 'Minimalist' },
  { value: 'Figurative', label: 'Figurative' },
  { value: 'Urban', label: 'Urban' },
];

const SIZE_OPTIONS = [
  { value: '', label: 'Any Size' },
  { value: 'small', label: 'Small', desc: 'under 40cm' },
  { value: 'medium', label: 'Medium', desc: '40cm – 80cm' },
  { value: 'large', label: 'Large', desc: '80cm – 120cm' },
  { value: 'xlarge', label: 'Extra Large', desc: '120cm+' },
];

const BUDGET_OPTIONS = [
  { value: '', label: 'Any Price' },
  { value: '0-200', label: 'Under $200' },
  { value: '200-500', label: '$200 – $500' },
  { value: '500-1000', label: '$500 – $1,000' },
  { value: '1000-2500', label: '$1,000 – $2,500' },
  { value: '2500-', label: '$2,500+' },
];

const MEDIUM_OPTIONS = [
  { value: '', label: 'All Mediums' },
  { value: 'Oil', label: 'Oil' },
  { value: 'Acrylic', label: 'Acrylic' },
  { value: 'Watercolour', label: 'Watercolour' },
  { value: 'Mixed Media', label: 'Mixed Media' },
  { value: 'Photography', label: 'Photography' },
  { value: 'Digital Art', label: 'Digital' },
  { value: 'Printmaking', label: 'Print' },
  { value: 'Ink', label: 'Ink' },
  { value: 'Pencil/Graphite', label: 'Pencil/Graphite' },
  { value: 'Charcoal', label: 'Charcoal' },
];

// ── Dropdown component ──

function Dropdown({
  placeholder,
  value,
  options,
  onChange,
  isOpen,
  onToggle,
}: {
  placeholder: string;
  value: string;
  options: { value: string; label: string; desc?: string }[];
  onChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const displayLabel = selected && selected.value !== '' ? selected.label : placeholder;

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-1.5 px-4 py-3 text-sm text-left transition-colors hover:bg-cream/60 rounded-lg"
      >
        <span
          className={`truncate ${
            selected && selected.value !== '' ? 'text-foreground font-medium' : 'text-warm-gray'
          }`}
        >
          {displayLabel}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-warm-gray flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-border rounded-xl shadow-lg shadow-black/8 z-50 py-1.5 max-h-72 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                onToggle();
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                value === option.value
                  ? 'bg-olive-light text-accent font-medium'
                  : 'text-foreground hover:bg-cream'
              }`}
            >
              {option.label}
              {option.desc && (
                <span className="text-warm-gray text-xs ml-1.5">({option.desc})</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ──

export default function GuidedSearch() {
  const [style, setStyle] = useState('');
  const [size, setSize] = useState('');
  const [budget, setBudget] = useState('');
  const [medium, setMedium] = useState('');

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSearch() {
    const params = new URLSearchParams();
    if (style) params.set('style', style);
    if (size) params.set('size', size);
    if (budget) params.set('budget', budget);
    if (medium) params.set('medium', medium);

    const qs = params.toString();
    window.location.href = `/browse${qs ? `?${qs}` : ''}`;
  }

  function toggleDropdown(name: string) {
    setOpenDropdown((prev) => (prev === name ? null : name));
  }

  return (
    <div className="mt-10 max-w-4xl mx-auto w-full">
      {/* ── Filter bar — desktop: horizontal pill, mobile: 2x2 grid ── */}
      <div ref={barRef} className="relative z-20">
        {/* Desktop layout */}
        <div
          className="hidden md:flex items-center bg-white/90 backdrop-blur-sm border border-border rounded-full px-2 py-1.5"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
        >
          <Dropdown
            placeholder="What style?"
            value={style}
            options={STYLE_OPTIONS}
            onChange={setStyle}
            isOpen={openDropdown === 'style'}
            onToggle={() => toggleDropdown('style')}
          />
          <div className="w-px h-7 bg-border flex-shrink-0" />
          <Dropdown
            placeholder="What size?"
            value={size}
            options={SIZE_OPTIONS}
            onChange={setSize}
            isOpen={openDropdown === 'size'}
            onToggle={() => toggleDropdown('size')}
          />
          <div className="w-px h-7 bg-border flex-shrink-0" />
          <Dropdown
            placeholder="What's your budget?"
            value={budget}
            options={BUDGET_OPTIONS}
            onChange={setBudget}
            isOpen={openDropdown === 'budget'}
            onToggle={() => toggleDropdown('budget')}
          />
          <div className="w-px h-7 bg-border flex-shrink-0" />
          <Dropdown
            placeholder="What medium?"
            value={medium}
            options={MEDIUM_OPTIONS}
            onChange={setMedium}
            isOpen={openDropdown === 'medium'}
            onToggle={() => toggleDropdown('medium')}
          />
          <button
            type="button"
            onClick={handleSearch}
            className="flex-shrink-0 ml-1.5 inline-flex items-center gap-2 px-6 py-2.5 bg-foreground text-white text-sm font-semibold rounded-full hover:bg-warm-black hover:scale-[0.98] active:scale-[0.96] transition-all duration-200 ease-out"
          >
            Search
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile layout */}
        <div className="md:hidden space-y-3">
          <div
            className="grid grid-cols-2 gap-2 bg-white/90 backdrop-blur-sm border border-border rounded-2xl p-2.5"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
          >
            <Dropdown
              placeholder="Style"
              value={style}
              options={STYLE_OPTIONS}
              onChange={setStyle}
              isOpen={openDropdown === 'style'}
              onToggle={() => toggleDropdown('style')}
            />
            <Dropdown
              placeholder="Size"
              value={size}
              options={SIZE_OPTIONS}
              onChange={setSize}
              isOpen={openDropdown === 'size'}
              onToggle={() => toggleDropdown('size')}
            />
            <Dropdown
              placeholder="Budget"
              value={budget}
              options={BUDGET_OPTIONS}
              onChange={setBudget}
              isOpen={openDropdown === 'budget'}
              onToggle={() => toggleDropdown('budget')}
            />
            <Dropdown
              placeholder="Medium"
              value={medium}
              options={MEDIUM_OPTIONS}
              onChange={setMedium}
              isOpen={openDropdown === 'medium'}
              onToggle={() => toggleDropdown('medium')}
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="w-full inline-flex items-center justify-center gap-2 py-3 bg-foreground text-white text-sm font-semibold rounded-full hover:bg-warm-black hover:scale-[0.98] active:scale-[0.96] transition-all duration-200 ease-out"
          >
            Search Artwork
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
