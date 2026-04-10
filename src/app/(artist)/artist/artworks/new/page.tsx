'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Camera,
  FileText,
  Ruler,
  DollarSign,
  Eye,
  X,
  Save,
  Upload,
  Lightbulb,
  MapPin,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { uploadArtworkImage } from '@/lib/supabase/storage';
import { formatPrice, calculateCommission } from '@/lib/utils';
import ImageUpload from '@/components/ImageUpload';

// ── Constants ──

const TOTAL_STEPS = 5;

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
  'Other',
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
  'Other',
];

const STEP_META = [
  { label: 'Photos', icon: Camera },
  { label: 'Details', icon: FileText },
  { label: 'Specs', icon: Ruler },
  { label: 'Price', icon: DollarSign },
  { label: 'Review', icon: Eye },
];

const STORAGE_KEY = 'signo_artwork_draft';

// ── Types ──

interface FormState {
  artworkId: string;
  images: string[];
  title: string;
  description: string;
  category: 'original' | 'print' | 'digital';
  medium: string;
  customMedium: string;
  style: string;
  tags: string[];
  tagInput: string;
  width_cm: string;
  height_cm: string;
  depth_cm: string;
  is_framed: boolean;
  shipping_weight_kg: string;
  price_aud: string;
  shipping_cost: string;
  includeShipping: boolean;
}

function getDefaultForm(): FormState {
  return {
    artworkId: crypto.randomUUID(),
    images: [],
    title: '',
    description: '',
    category: 'original',
    medium: '',
    customMedium: '',
    style: '',
    tags: [],
    tagInput: '',
    width_cm: '',
    height_cm: '',
    depth_cm: '',
    is_framed: false,
    shipping_weight_kg: '',
    price_aud: '',
    shipping_cost: '',
    includeShipping: true,
  };
}

// ── Component ──

export default function NewArtworkPage() {
  const { loading: authLoading } = useRequireAuth('artist');
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Initialize form from localStorage or defaults
  const [form, setForm] = useState<FormState>(() => {
    if (typeof window === 'undefined') return getDefaultForm();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...getDefaultForm(), ...parsed };
      }
    } catch {
      // ignore
    }
    return getDefaultForm();
  });

  // Persist to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      // ignore
    }
  }, [form]);

  function clearDraft() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Image upload handler — uses the artwork's pre-generated ID
  const handleImageUpload = useCallback(
    async (file: File, onProgress: (p: number) => void) => {
      if (!user) throw new Error('Not authenticated');
      return uploadArtworkImage(file, user.id, form.artworkId, onProgress);
    },
    [user, form.artworkId]
  );

  // Tags
  function addTag(tag: string) {
    const cleaned = tag.trim().toLowerCase();
    if (cleaned && form.tags.length < 10 && !form.tags.includes(cleaned)) {
      updateForm('tags', [...form.tags, cleaned]);
    }
    updateForm('tagInput', '');
  }

  function removeTag(tag: string) {
    updateForm('tags', form.tags.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(form.tagInput);
    } else if (e.key === 'Backspace' && !form.tagInput && form.tags.length > 0) {
      updateForm('tags', form.tags.slice(0, -1));
    }
  }

  // Commission calculator
  const price = parseFloat(form.price_aud) || 0;
  const commission = useMemo(() => calculateCommission(price), [price]);

  // Validation per step
  const canProceed: Record<number, boolean> = {
    1: form.images.length >= 1,
    2: form.title.trim().length > 0 &&
       form.description.trim().length > 0 &&
       (form.medium !== '' || form.customMedium !== '') &&
       form.style !== '',
    3: true, // dimensions are optional for originals/prints, digital just needs to pass
    4: price >= 1,
    5: true,
  };

  // Submit
  async function handleSubmit(status: 'draft' | 'pending_review') {
    if (!user) return;
    setSaving(true);
    setError('');

    try {
      const medium = form.medium === 'Other' ? form.customMedium : form.medium;

      const res = await fetch('/api/artworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.artworkId,
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          medium: medium || null,
          style: form.style || null,
          width_cm: form.width_cm ? parseFloat(form.width_cm) : null,
          height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
          depth_cm: form.depth_cm ? parseFloat(form.depth_cm) : null,
          price_aud: price,
          is_framed: form.is_framed,
          shipping_weight_kg: form.shipping_weight_kg ? parseFloat(form.shipping_weight_kg) : null,
          shipping_cost: form.includeShipping ? 0 : (form.shipping_cost ? parseFloat(form.shipping_cost) : 0),
          images: form.images,
          tags: form.tags,
          status,
        }),
      });

      if (!res.ok) {
        const { error: apiError } = await res.json();
        throw new Error(apiError || 'Failed to create artwork');
      }

      clearDraft();

      if (status === 'draft') {
        window.location.href = '/artist/artworks';
      } else {
        window.location.href = '/artist/artworks?submitted=true';
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setSaving(false);
    }
  }

  function nextStep() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (authLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div style={{ width: 32, height: 32, border: '3px solid #E5E2DB', borderTopColor: '#2C2C2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style></div>;

  // Onboarding gate — artists must complete Stripe Connect setup before uploading
  if (user && (!user.onboarding_completed || !user.stripe_account_id)) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="rounded-xl border border-border bg-surface p-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Lightbulb className="h-6 w-6 text-amber-600" />
          </div>
          <h1 className="font-editorial text-xl md:text-2xl font-medium mb-2">
            Complete your seller setup first
          </h1>
          <p className="text-sm text-muted mb-6">
            Before you can upload and sell artworks on Signo, you need to set up your payment account through Stripe.
            This only takes a few minutes and ensures you can receive payments for your sales.
          </p>
          <Link
            href="/artist/onboarding"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Complete onboarding
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-20">
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="font-editorial text-2xl md:text-3xl font-medium">Upload Artwork</h1>
        <p className="text-sm text-muted mt-1">
          Add your work to Signo. It&apos;ll be reviewed within 24–48 hours.
        </p>
      </div>

      {/* ── Progress bar ── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-3">
          {STEP_META.map((s, i) => {
            const num = i + 1;
            return (
              <div key={num} className="flex items-center">
                <button
                  type="button"
                  onClick={() => num < step && setStep(num)}
                  disabled={num >= step}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    num < step
                      ? 'bg-accent text-white cursor-pointer hover:bg-accent-light'
                      : num === step
                      ? 'bg-primary text-white'
                      : 'bg-muted-bg text-muted cursor-default'
                  }`}
                >
                  {num < step ? <Check className="h-4 w-4" /> : num}
                </button>
                {i < STEP_META.length - 1 && (
                  <div
                    className={`hidden sm:block w-10 md:w-16 lg:w-20 h-0.5 mx-1.5 transition-colors duration-300 ${
                      num < step ? 'bg-accent' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-muted tracking-wide uppercase">
          {STEP_META.map((s) => (
            <span key={s.label}>{s.label}</span>
          ))}
        </div>
      </div>

      {/* ── Step content ── */}
      <div className="animate-fade-in">
        {/* ═══════════ STEP 1: Photos ═══════════ */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-editorial text-xl font-medium">Add photos</h2>
              <p className="text-sm text-muted mt-1">
                Great photos are the #1 driver of sales. Show your work at its best.
              </p>
            </div>

            <ImageUpload
              maxFiles={6}
              maxSizeMB={25}
              initialImages={form.images}
              onImagesChange={(urls) => updateForm('images', urls)}
              uploadFile={handleImageUpload}
            />

            {/* Tips */}
            <div className="flex gap-3 p-4 bg-accent-subtle/50 border border-accent/10 rounded-xl">
              <Lightbulb className="h-5 w-5 text-accent-dark flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted space-y-1">
                <p className="font-medium text-foreground">Photo tips</p>
                <p>Use natural lighting. Show the full piece, a detail shot, and a scale reference (e.g. next to a book or on a wall).</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 2: Details ═══════════ */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-editorial text-xl font-medium">Describe your work</h2>
              <p className="text-sm text-muted mt-1">
                Help buyers connect with the story behind the piece.
              </p>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                Title <span className="text-error">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={form.title}
                onChange={(e) => updateForm('title', e.target.value.slice(0, 100))}
                className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors"
                placeholder="e.g. Golden Hour Over Sydney Harbour"
              />
              <p className="text-xs text-warm-gray text-right mt-1">{form.title.length}/100</p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                Description <span className="text-error">*</span>
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value.slice(0, 2000))}
                rows={5}
                className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors resize-none"
                placeholder="Tell the story behind this piece — what inspired it, your process, the emotions you want to evoke..."
              />
              <p className={`text-xs text-right mt-1 ${form.description.length >= 1900 ? 'text-error' : 'text-warm-gray'}`}>
                {form.description.length}/2000
              </p>
            </div>

            {/* Category */}
            <div>
              <p className="text-xs font-medium tracking-wide uppercase text-muted mb-3">
                Category <span className="text-error">*</span>
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'original' as const, label: 'Original', desc: 'One-of-a-kind piece' },
                  { value: 'print' as const, label: 'Print', desc: 'Reproduction or limited ed.' },
                  { value: 'digital' as const, label: 'Digital', desc: 'Digital download' },
                ].map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => updateForm('category', cat.value)}
                    className={`relative p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                      form.category === cat.value
                        ? 'border-accent bg-accent-subtle'
                        : 'border-border hover:border-warm-gray bg-white'
                    }`}
                  >
                    {form.category === cat.value && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <p className="font-medium text-sm">{cat.label}</p>
                    <p className="text-xs text-muted mt-0.5">{cat.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Medium & Style */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="medium" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                  Medium <span className="text-error">*</span>
                </label>
                <select
                  id="medium"
                  value={form.medium}
                  onChange={(e) => updateForm('medium', e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm transition-colors appearance-none"
                >
                  <option value="">Select medium</option>
                  {MEDIUMS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {form.medium === 'Other' && (
                  <input
                    type="text"
                    value={form.customMedium}
                    onChange={(e) => updateForm('customMedium', e.target.value)}
                    className="w-full mt-2 px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors"
                    placeholder="Describe your medium"
                  />
                )}
              </div>
              <div>
                <label htmlFor="style" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                  Style <span className="text-error">*</span>
                </label>
                <select
                  id="style"
                  value={form.style}
                  onChange={(e) => updateForm('style', e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm transition-colors appearance-none"
                >
                  <option value="">Select style</option>
                  {STYLES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                Tags <span className="text-warm-gray font-normal">(up to 10)</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-muted-bg text-sm rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-muted hover:text-error transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {form.tags.length < 10 && (
                <input
                  id="tags"
                  type="text"
                  value={form.tagInput}
                  onChange={(e) => updateForm('tagInput', e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => { if (form.tagInput.trim()) addTag(form.tagInput); }}
                  className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors"
                  placeholder="Type a tag and press Enter"
                />
              )}
            </div>
          </div>
        )}

        {/* ═══════════ STEP 3: Dimensions ═══════════ */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-editorial text-xl font-medium">
                {form.category === 'digital' ? 'Digital file details' : 'Dimensions & details'}
              </h2>
              <p className="text-sm text-muted mt-1">
                {form.category === 'digital'
                  ? 'Tell buyers about the file they\'ll receive.'
                  : 'Help buyers understand the size and shipping requirements.'}
              </p>
            </div>

            {form.category !== 'digital' ? (
              <>
                {/* Physical dimensions */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="width" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                      Width (cm)
                    </label>
                    <input
                      id="width"
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.width_cm}
                      onChange={(e) => updateForm('width_cm', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="height" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                      Height (cm)
                    </label>
                    <input
                      id="height"
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.height_cm}
                      onChange={(e) => updateForm('height_cm', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="depth" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                      Depth (cm)
                    </label>
                    <input
                      id="depth"
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.depth_cm}
                      onChange={(e) => updateForm('depth_cm', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {/* Framed toggle */}
                <label className="flex items-center justify-between p-4 bg-white border border-border rounded-xl cursor-pointer group">
                  <div>
                    <p className="font-medium text-sm">Is this piece framed?</p>
                    <p className="text-xs text-muted mt-0.5">Let buyers know if it&apos;s ready to hang</p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={form.is_framed}
                      onChange={(e) => updateForm('is_framed', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-border rounded-full peer-checked:bg-accent transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5" />
                  </div>
                </label>

                {/* Shipping weight */}
                <div>
                  <label htmlFor="weight" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                    Shipping weight (kg)
                  </label>
                  <input
                    id="weight"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.shipping_weight_kg}
                    onChange={(e) => updateForm('shipping_weight_kg', e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors"
                    placeholder="Approximate packaged weight"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Digital format info */}
                <div className="p-5 bg-cream border border-border rounded-xl">
                  <p className="text-sm text-muted leading-relaxed">
                    After a buyer purchases your digital artwork, they&apos;ll receive the high-resolution
                    files you uploaded as preview images. Make sure your preview images are the
                    full-resolution versions you want to deliver.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════ STEP 4: Price ═══════════ */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-editorial text-xl font-medium">Set your price</h2>
              <p className="text-sm text-muted mt-1">
                Price your work fairly — buyers appreciate transparency.
              </p>
            </div>

            {/* Price input */}
            <div>
              <label htmlFor="price" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                Price (AUD) <span className="text-error">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-muted">$</span>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  min="1"
                  value={form.price_aud}
                  onChange={(e) => updateForm('price_aud', e.target.value)}
                  className="w-full pl-10 pr-4 py-4 bg-white border border-border rounded-xl text-2xl font-medium placeholder:text-warm-gray transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Pricing breakdown */}
            {price >= 1 && (
              <div className="bg-white border border-border rounded-2xl overflow-hidden animate-fade-in">
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Sale price</span>
                    <span className="font-medium">{formatPrice(price)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Stripe processing fee (~1.75% + 30c)</span>
                    <span className="text-sm text-muted">−{formatPrice(commission.stripeFee)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600 flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" />
                      Signo commission
                    </span>
                    <span className="text-sm font-semibold text-green-600">$0.00</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">You&apos;ll receive</span>
                    <span className="text-xl font-bold text-accent-dark">{formatPrice(commission.artistPayout)}</span>
                  </div>
                </div>
                <div className="px-5 py-3 bg-green-50/80 border-t border-green-100">
                  <p className="text-xs text-green-700 text-center font-medium">
                    Zero commission — $30/mo subscription. You keep everything you earn.
                  </p>
                </div>
              </div>
            )}

            {/* Shipping cost (physical only) */}
            {form.category !== 'digital' && (
              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 bg-white border border-border rounded-xl cursor-pointer group">
                  <div>
                    <p className="font-medium text-sm">Include shipping in the price</p>
                    <p className="text-xs text-muted mt-0.5">Buyers love free shipping — it&apos;s already in your listing price</p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={form.includeShipping}
                      onChange={(e) => updateForm('includeShipping', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-border rounded-full peer-checked:bg-accent transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5" />
                  </div>
                </label>

                {!form.includeShipping && (
                  <div className="animate-fade-in">
                    <label htmlFor="shipping" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                      Shipping cost (AUD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
                      <input
                        id="shipping"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.shipping_cost}
                        onChange={(e) => updateForm('shipping_cost', e.target.value)}
                        className="w-full pl-9 pr-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ STEP 5: Review ═══════════ */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-editorial text-xl font-medium">Review your listing</h2>
              <p className="text-sm text-muted mt-1">
                Here&apos;s how buyers will see your artwork. Double-check everything before submitting.
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-error/5 border border-error/20 text-error text-sm rounded-xl animate-fade-in">
                {error}
              </div>
            )}

            {/* Preview card */}
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              {/* Main image */}
              {form.images.length > 0 && (
                <div className="relative aspect-[4/3] bg-muted-bg">
                  <Image
                    src={form.images[0]}
                    alt={form.title || 'Artwork'}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 100vw, 640px"
                  />
                </div>
              )}

              {/* Thumbnail strip */}
              {form.images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto border-b border-border">
                  {form.images.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-border">
                      <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="64px" />
                    </div>
                  ))}
                </div>
              )}

              {/* Info */}
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="font-editorial text-xl font-medium">{form.title || 'Untitled'}</h3>
                  {user?.full_name && (
                    <p className="text-sm text-muted mt-0.5">by {user.full_name}</p>
                  )}
                </div>

                <p className="text-2xl font-bold">{price >= 1 ? formatPrice(price) : '$—'}</p>

                {form.description && (
                  <p className="text-sm text-muted leading-relaxed line-clamp-4">{form.description}</p>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap gap-2 text-xs text-muted">
                  {form.category && (
                    <span className="px-2.5 py-1 bg-muted-bg rounded-full capitalize">{form.category}</span>
                  )}
                  {(form.medium === 'Other' ? form.customMedium : form.medium) && (
                    <span className="px-2.5 py-1 bg-muted-bg rounded-full">
                      {form.medium === 'Other' ? form.customMedium : form.medium}
                    </span>
                  )}
                  {form.style && (
                    <span className="px-2.5 py-1 bg-muted-bg rounded-full">{form.style}</span>
                  )}
                  {form.is_framed && (
                    <span className="px-2.5 py-1 bg-muted-bg rounded-full">Framed</span>
                  )}
                </div>

                {/* Dimensions */}
                {(form.width_cm || form.height_cm) && (
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <Ruler className="h-3 w-3" />
                    <span>
                      {form.width_cm && `${form.width_cm}W`}
                      {form.width_cm && form.height_cm && ' × '}
                      {form.height_cm && `${form.height_cm}H`}
                      {form.depth_cm && ` × ${form.depth_cm}D`}
                      {' cm'}
                    </span>
                  </div>
                )}

                {/* Tags */}
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-cream border border-border text-xs rounded-full text-muted">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={saving}
                className="flex-1 py-3.5 border-2 border-border rounded-full font-semibold text-sm hover:border-warm-gray transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleSubmit('pending_review')}
                disabled={saving}
                className="flex-[2] py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-accent transition-colors duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Submit for Review
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        {step < 5 && (
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <Link
                href="/artist/artworks"
                className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Cancel
              </Link>
            )}

            <button
              type="button"
              onClick={nextStep}
              disabled={!canProceed[step]}
              className="px-8 py-3 bg-primary text-white font-semibold rounded-full hover:bg-accent transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
