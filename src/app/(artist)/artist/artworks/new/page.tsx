'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ImageUpload from '@/components/ImageUpload';
import { useAuth } from '@/components/providers/AuthProvider';
import EditorialSpinner from '@/components/ui/EditorialSpinner';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { uploadArtworkImage } from '@/lib/supabase/storage';
import { formatPrice, calculateCommission } from '@/lib/utils';

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

const COLOUR_PALETTE = [
  { name: 'red', label: 'Red', hex: '#DC2626' },
  { name: 'orange', label: 'Orange', hex: '#EA580C' },
  { name: 'yellow', label: 'Yellow', hex: '#EAB308' },
  { name: 'green', label: 'Green', hex: '#16A34A' },
  { name: 'blue', label: 'Blue', hex: '#2563EB' },
  { name: 'purple', label: 'Purple', hex: '#9333EA' },
  { name: 'pink', label: 'Pink', hex: '#EC4899' },
  { name: 'brown', label: 'Brown', hex: '#92400E' },
  { name: 'black', label: 'Black', hex: '#1a1a1a' },
  { name: 'white', label: 'White', hex: '#FAFAFA' },
  { name: 'grey', label: 'Grey', hex: '#6B7280' },
  { name: 'gold', label: 'Gold', hex: '#CA8A04' },
  { name: 'silver', label: 'Silver', hex: '#94A3B8' },
  { name: 'teal', label: 'Teal', hex: '#0D9488' },
  { name: 'navy', label: 'Navy', hex: '#1E3A5A' },
  { name: 'cream', label: 'Cream/Beige', hex: '#D4C5A9' },
];

const SURFACES = ['Canvas', 'Linen', 'Paper', 'Board', 'Wood', 'Metal', 'Glass', 'Fabric', 'Other'];

const AVAILABILITY_OPTIONS = [
  { value: 'available' as const, label: 'Available', desc: 'Can be purchased immediately.' },
  { value: 'coming_soon' as const, label: 'Coming soon', desc: 'Listed with an available-from date.' },
  { value: 'enquire_only' as const, label: 'Enquire only', desc: 'Buyers may enquire but not purchase directly.' },
];

const IMAGE_SLOT_LABELS = [
  { label: 'Primary photo', helper: 'The main image buyers will see first.', required: true },
  { label: 'Detail or texture', helper: 'A close reading of the surface.', required: true },
  { label: 'Side or back view', helper: 'Depth, edges, hanging hardware.', required: false },
  { label: 'In context', helper: 'The work on a wall, in a room.', required: false },
];

const STEP_META = [
  { num: '01', label: 'Photos' },
  { num: '02', label: 'Details' },
  { num: '03', label: 'Specs' },
  { num: '04', label: 'Price' },
  { num: '05', label: 'Review' },
];

const STORAGE_KEY = 'signo_artwork_draft';

// Maps server-returned error field names → step where that field lives.
// Used to jump the user back to the earliest step that has a field error
// after an API rejection.
const FIELD_TO_STEP: Record<string, number> = {
  images: 1,
  title: 2,
  description: 2,
  category: 2,
  medium: 2,
  style: 2,
  price_aud: 4,
};

// Maps server-returned error field names → DOM id of the input to focus
// after the step jump. Only fields with an actual focusable input are
// listed; for category/images the step jump and inline error are enough.
const FOCUSABLE_FIELDS: Record<string, string> = {
  title: 'title',
  description: 'description',
  medium: 'medium',
  style: 'style',
  price_aud: 'price_aud',
};

function firstErrorStep(errors: Record<string, string>): number | null {
  let earliest: number | null = null;
  for (const field of Object.keys(errors)) {
    const target = FIELD_TO_STEP[field];
    if (target != null && (earliest == null || target < earliest)) {
      earliest = target;
    }
  }
  return earliest;
}

function firstFocusableField(errors: Record<string, string>): string | null {
  for (const field of Object.keys(errors)) {
    const id = FOCUSABLE_FIELDS[field];
    if (id) return id;
  }
  return null;
}

const KICKER: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
};

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
  colors: string[];
  tags: string[];
  tagInput: string;
  width_cm: string;
  height_cm: string;
  depth_cm: string;
  surface: string;
  is_framed: boolean;
  ready_to_hang: boolean;
  shipping_weight_kg: string;
  price_aud: string;
  shipping_cost: string;
  includeShipping: boolean;
  availability: 'available' | 'coming_soon' | 'enquire_only';
  available_from: string;
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
    colors: [],
    tags: [],
    tagInput: '',
    width_cm: '',
    height_cm: '',
    depth_cm: '',
    surface: '',
    is_framed: false,
    ready_to_hang: false,
    shipping_weight_kg: '',
    price_aud: '',
    shipping_cost: '',
    includeShipping: true,
    availability: 'available',
    available_from: '',
  };
}

// ── Helpers ──

function FieldErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="font-serif"
      role="alert"
      style={{
        marginTop: '0.4rem',
        fontStyle: 'italic',
        color: 'var(--color-terracotta)',
        fontSize: '0.85rem',
        lineHeight: 1.5,
      }}
    >
      {message}
    </p>
  );
}

function FieldLabel({
  children,
  required,
  aside,
}: {
  children: React.ReactNode;
  required?: boolean;
  aside?: React.ReactNode;
}) {
  return (
    <p
      style={{
        ...KICKER,
        marginBottom: '0.7rem',
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '1rem',
      }}
    >
      <span>
        {children}
        {required && (
          <span
            style={{
              marginLeft: '0.4rem',
              color: 'var(--color-terracotta, #c45d3e)',
            }}
          >
            *
          </span>
        )}
      </span>
      {aside && (
        <span
          className="font-serif"
          style={{
            fontStyle: 'italic',
            fontSize: '0.78rem',
            color: 'var(--color-stone)',
            letterSpacing: 0,
            textTransform: 'none',
          }}
        >
          {aside}
        </span>
      )}
    </p>
  );
}

// ── Component ──

export default function NewArtworkPage() {
  const { loading: authLoading } = useRequireAuth('artist');
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // We track the focus target in a ref so clearing it after focus doesn't
  // trigger another render. The step-change effect below reads the ref
  // post-commit and consumes it. (state-in-effect is an eslint error.)
  const pendingFocusFieldRef = useRef<string | null>(null);

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
    // Clear the corresponding inline error as soon as the user touches
    // the field. The price_aud server field corresponds to the price_aud
    // form state key (same name); other fields match directly.
    const fieldName = key as string;
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  }

  // Focus the errored input after a step jump. The new step's DOM only
  // exists once React has committed the re-render, so we run this in
  // useEffect (post-commit). Same-step focus is handled synchronously in
  // applyValidationErrors and never sets the ref — so this only fires on
  // step jumps.
  useEffect(() => {
    const target = pendingFocusFieldRef.current;
    if (!target) return;
    const el = document.getElementById(target);
    if (el) el.focus();
    pendingFocusFieldRef.current = null;
  }, [step]);

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
    if (cleaned && form.tags.length < 25 && !form.tags.includes(cleaned)) {
      updateForm('tags', [...form.tags, cleaned]);
    }
    updateForm('tagInput', '');
  }

  function toggleColour(colourName: string) {
    if (form.colors.includes(colourName)) {
      updateForm('colors', form.colors.filter((c) => c !== colourName));
    } else if (form.colors.length < 2) {
      updateForm('colors', [...form.colors, colourName]);
    }
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
    1: form.images.length >= 2,
    2:
      form.title.trim().length > 0 &&
      form.description.trim().length > 0 &&
      (form.medium !== '' || form.customMedium !== '') &&
      form.style !== '',
    3: true,
    4: price >= 1,
    5: true,
  };

  // Pre-submit validation that mirrors the server's required-when-
  // pending_review schema. Stale localStorage drafts can otherwise
  // reach the submit step with empty required fields.
  function clientValidatePendingReview(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (form.images.length < 1) {
      errors.images = 'At least one image is required.';
    }
    if (!form.title.trim()) {
      errors.title = 'Title is required.';
    }
    if (!form.description.trim()) {
      errors.description = 'Description is required.';
    }
    const m = form.medium === 'Other' ? form.customMedium : form.medium;
    if (!m.trim()) {
      errors.medium = 'Medium is required.';
    }
    if (!form.style.trim()) {
      errors.style = 'Style is required.';
    }
    if (price < 1) {
      errors.price_aud = 'Price must be at least $1.';
    }
    return errors;
  }

  function applyValidationErrors(errors: Record<string, string>) {
    setFieldErrors(errors);
    setError('Please check the highlighted fields below.');
    const target = firstErrorStep(errors);
    const focusId = firstFocusableField(errors);
    const willJumpStep = target != null && target !== step;

    if (willJumpStep) {
      // The target step's DOM doesn't exist yet — stash the focus target
      // and let the post-commit effect pick it up after setStep renders.
      if (focusId) pendingFocusFieldRef.current = focusId;
      setStep(target);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Same step: the input is already in the DOM, focus synchronously.
    if (focusId) {
      const el = document.getElementById(focusId);
      if (el) el.focus();
    }
  }

  // Submit
  async function handleSubmit(status: 'draft' | 'pending_review') {
    if (!user) return;
    setSaving(true);
    setError('');
    setFieldErrors({});

    if (status === 'pending_review') {
      const clientErrors = clientValidatePendingReview();
      if (Object.keys(clientErrors).length > 0) {
        applyValidationErrors(clientErrors);
        setSaving(false);
        return;
      }
    }

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
          ready_to_hang: form.ready_to_hang,
          surface: form.surface || null,
          colors: form.colors,
          availability: form.availability,
          available_from:
            form.availability === 'coming_soon' && form.available_from
              ? form.available_from
              : null,
          shipping_weight_kg: form.shipping_weight_kg
            ? parseFloat(form.shipping_weight_kg)
            : null,
          shipping_cost: form.includeShipping
            ? 0
            : form.shipping_cost
            ? parseFloat(form.shipping_cost)
            : 0,
          images: form.images,
          tags: form.tags,
          status,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (
          res.status === 400 &&
          json.errors &&
          typeof json.errors === 'object'
        ) {
          // Field-level validation failure: route errors to inputs and
          // jump to the earliest errored step.
          applyValidationErrors(json.errors);
          setSaving(false);
          return;
        }
        // Top-level failure (auth, server, network-as-non-OK): banner
        // only, no field errors, no step jump.
        setError(
          (json && typeof json.error === 'string' && json.error) ||
            'Failed to create artwork'
        );
        setSaving(false);
        return;
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

  if (authLoading) return <EditorialSpinner />;

  // Onboarding gate — artists must complete Stripe Connect setup before uploading
  if (user && (!user.onboarding_completed || !user.stripe_account_id)) {
    return (
      <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
        <div
          className="px-6 sm:px-10"
          style={{
            maxWidth: '46rem',
            margin: '0 auto',
            paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
            paddingBottom: 'clamp(4rem, 7vw, 6rem)',
          }}
        >
          <Link
            href="/artist/artworks"
            className="font-serif"
            style={{
              fontStyle: 'italic',
              fontSize: '0.85rem',
              color: 'var(--color-stone)',
              textDecoration: 'none',
              display: 'inline-block',
              marginBottom: '2rem',
            }}
          >
            ← All works
          </Link>
          <p style={{ ...KICKER, marginBottom: '1rem' }}>— One thing first —</p>
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.015em',
              color: 'var(--color-ink)',
              fontWeight: 400,
              marginBottom: '0.9rem',
            }}
          >
            Complete your <em style={{ fontStyle: 'italic' }}>seller setup.</em>
          </h1>
          <p
            style={{
              fontSize: '0.92rem',
              fontWeight: 300,
              color: 'var(--color-stone-dark)',
              lineHeight: 1.6,
              maxWidth: '52ch',
              marginBottom: '2rem',
            }}
          >
            Before uploading a work you&apos;ll need to set up your Stripe payment
            account. It takes a few minutes and ensures you can receive payment
            for your sales.
          </p>
          <Link href="/artist/onboarding" className="artwork-primary-cta">
            Complete onboarding →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      <div
        className="px-6 sm:px-10"
        style={{
          maxWidth: '52rem',
          margin: '0 auto',
          paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
        }}
      >
        <Link
          href="/artist/artworks"
          className="font-serif"
          style={{
            fontStyle: 'italic',
            fontSize: '0.85rem',
            color: 'var(--color-stone)',
            textDecoration: 'none',
            display: 'inline-block',
            marginBottom: '2rem',
          }}
        >
          ← All works
        </Link>

        {/* Header */}
        <header
          style={{
            marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)',
            borderBottom: '1px solid var(--color-border-strong)',
            paddingBottom: 'clamp(1.8rem, 3vw, 2.6rem)',
          }}
        >
          <p style={{ ...KICKER, marginBottom: '1rem' }}>The Studio · New work</p>
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.015em',
              color: 'var(--color-ink)',
              fontWeight: 400,
              marginBottom: '0.7rem',
            }}
          >
            A new work, <em style={{ fontStyle: 'italic' }}>to the wall.</em>
          </h1>
          <p
            style={{
              fontSize: '0.92rem',
              fontWeight: 300,
              color: 'var(--color-stone-dark)',
              lineHeight: 1.6,
              maxWidth: '52ch',
            }}
          >
            Five short steps. The editors read every submission within a day or
            two.
          </p>
        </header>

        {/* Step indicator — typographic */}
        <nav
          aria-label="Progress"
          style={{
            marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)',
            borderTop: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <ol
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${STEP_META.length}, 1fr)`,
              margin: 0,
              padding: 0,
              listStyle: 'none',
            }}
          >
            {STEP_META.map((s, i) => {
              const num = i + 1;
              const done = num < step;
              const active = num === step;
              return (
                <li
                  key={s.num}
                  style={{
                    borderLeft:
                      i === 0 ? 'none' : '1px solid var(--color-border)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => done && setStep(num)}
                    disabled={!done}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: '1.1rem 0.8rem',
                      textAlign: 'left',
                      cursor: done ? 'pointer' : 'default',
                      opacity: active || done ? 1 : 0.4,
                    }}
                  >
                    <p
                      className="font-serif"
                      style={{
                        fontStyle: 'italic',
                        fontSize: '0.85rem',
                        color: 'var(--color-stone)',
                        margin: 0,
                      }}
                    >
                      {done ? '✓' : s.num}
                    </p>
                    <p
                      className="font-serif"
                      style={{
                        fontSize: '0.95rem',
                        color: active ? 'var(--color-ink)' : 'var(--color-stone-dark)',
                        fontStyle: active ? 'italic' : 'normal',
                        margin: '0.2rem 0 0',
                      }}
                    >
                      {s.label}
                    </p>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* ═══════════ STEP 1: Photos ═══════════ */}
        {step === 1 && (
          <div>
            <p style={{ ...KICKER, marginBottom: '1rem' }}>— Photographs —</p>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(1.5rem, 2.8vw, 2rem)',
                lineHeight: 1.15,
                color: 'var(--color-ink)',
                fontWeight: 400,
                marginBottom: '0.7rem',
              }}
            >
              Show the work <em style={{ fontStyle: 'italic' }}>plainly.</em>
            </h2>
            <p
              style={{
                fontSize: '0.9rem',
                fontWeight: 300,
                color: 'var(--color-stone-dark)',
                lineHeight: 1.6,
                marginBottom: '2rem',
                maxWidth: '52ch',
              }}
            >
              Natural light, a plain wall, and at least two photographs. Great
              photographs are, by far, the strongest driver of a sale.
            </p>

            {/* Slot guidance */}
            <ol
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 2rem',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              {IMAGE_SLOT_LABELS.map((slot, i) => {
                const uploaded = !!form.images[i];
                return (
                  <li
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '3rem 1fr auto',
                      gap: '1rem',
                      alignItems: 'baseline',
                      padding: '1.1rem 0',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <span
                      className="font-serif"
                      style={{
                        fontStyle: 'italic',
                        fontSize: '0.9rem',
                        color: 'var(--color-stone)',
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p
                        className="font-serif"
                        style={{
                          fontSize: '1rem',
                          color: 'var(--color-ink)',
                          margin: 0,
                        }}
                      >
                        {slot.label}
                      </p>
                      <p
                        style={{
                          marginTop: '0.25rem',
                          fontSize: '0.84rem',
                          fontWeight: 300,
                          color: 'var(--color-stone-dark)',
                          lineHeight: 1.5,
                        }}
                      >
                        {slot.helper}
                      </p>
                    </div>
                    <span
                      style={{
                        ...KICKER,
                        color: uploaded
                          ? 'var(--color-ink)'
                          : slot.required
                          ? 'var(--color-terracotta, #c45d3e)'
                          : 'var(--color-stone)',
                      }}
                    >
                      {uploaded ? '✓ Uploaded' : slot.required ? 'Required' : 'Optional'}
                    </span>
                  </li>
                );
              })}
            </ol>

            <ImageUpload
              maxFiles={6}
              maxSizeMB={25}
              initialImages={form.images}
              onImagesChange={(urls) => updateForm('images', urls)}
              uploadFile={handleImageUpload}
            />

            <FieldErrorMessage message={fieldErrors.images} />

            {form.images.length < 2 && (
              <p
                className="font-serif"
                style={{
                  marginTop: '1.4rem',
                  fontSize: '0.9rem',
                  fontStyle: 'italic',
                  color: 'var(--color-stone)',
                }}
              >
                — At least two photographs to continue.
              </p>
            )}
          </div>
        )}

        {/* ═══════════ STEP 2: Details ═══════════ */}
        {step === 2 && (
          <div>
            <p style={{ ...KICKER, marginBottom: '1rem' }}>— The work —</p>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(1.5rem, 2.8vw, 2rem)',
                lineHeight: 1.15,
                color: 'var(--color-ink)',
                fontWeight: 400,
                marginBottom: '0.7rem',
              }}
            >
              Name it, <em style={{ fontStyle: 'italic' }}>describe it.</em>
            </h2>
            <p
              style={{
                fontSize: '0.9rem',
                fontWeight: 300,
                color: 'var(--color-stone-dark)',
                lineHeight: 1.6,
                marginBottom: '2.2rem',
                maxWidth: '52ch',
              }}
            >
              A good title is short. A good description tells the story — what
              you saw, how you made it, what you hope a viewer feels.
            </p>

            {/* Title */}
            <div style={{ marginBottom: '1.8rem' }}>
              <FieldLabel required aside={`${form.title.length}/100`}>
                Title
              </FieldLabel>
              <input
                id="title"
                type="text"
                value={form.title}
                onChange={(e) => updateForm('title', e.target.value.slice(0, 100))}
                className="commission-field"
                placeholder="e.g. Golden Hour Over Sydney Harbour"
                aria-invalid={!!fieldErrors.title}
              />
              <FieldErrorMessage message={fieldErrors.title} />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '1.8rem' }}>
              <FieldLabel required aside={`${form.description.length}/2000`}>
                Description
              </FieldLabel>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value.slice(0, 2000))}
                rows={6}
                className="commission-field"
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="What inspired it, how you made it, what you want the viewer to feel…"
                aria-invalid={!!fieldErrors.description}
              />
              <FieldErrorMessage message={fieldErrors.description} />
            </div>

            {/* Category */}
            <div style={{ marginBottom: '1.8rem' }}>
              <FieldLabel required>Category</FieldLabel>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                {[
                  { value: 'original' as const, label: 'Original', desc: 'A one-of-a-kind work.' },
                  { value: 'print' as const, label: 'Print', desc: 'A reproduction or limited edition.' },
                  { value: 'digital' as const, label: 'Digital', desc: 'A digital download.' },
                ].map((cat) => {
                  const selected = form.category === cat.value;
                  return (
                    <li
                      key={cat.value}
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                    >
                      <button
                        type="button"
                        onClick={() => updateForm('category', cat.value)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          padding: '1rem 0',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          gap: '1rem',
                        }}
                      >
                        <div>
                          <p
                            className="font-serif"
                            style={{
                              fontSize: '1rem',
                              color: 'var(--color-ink)',
                              fontStyle: selected ? 'italic' : 'normal',
                              margin: 0,
                            }}
                          >
                            {cat.label}
                          </p>
                          <p
                            style={{
                              fontSize: '0.85rem',
                              fontWeight: 300,
                              color: 'var(--color-stone-dark)',
                              marginTop: '0.2rem',
                            }}
                          >
                            {cat.desc}
                          </p>
                        </div>
                        <span
                          className="font-serif"
                          style={{
                            fontStyle: 'italic',
                            fontSize: '0.88rem',
                            color: selected ? 'var(--color-ink)' : 'var(--color-stone)',
                          }}
                        >
                          {selected ? '✓ Selected' : 'Select'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <FieldErrorMessage message={fieldErrors.category} />
            </div>

            {/* Medium & Style */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
                gap: '1.4rem',
                marginBottom: '1.8rem',
              }}
            >
              <div>
                <FieldLabel required>Medium</FieldLabel>
                <select
                  id="medium"
                  value={form.medium}
                  onChange={(e) => updateForm('medium', e.target.value)}
                  className="commission-field"
                  aria-invalid={!!fieldErrors.medium}
                >
                  <option value="">Select medium</option>
                  {MEDIUMS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                {form.medium === 'Other' && (
                  <input
                    type="text"
                    value={form.customMedium}
                    onChange={(e) => updateForm('customMedium', e.target.value)}
                    className="commission-field"
                    style={{ marginTop: '0.6rem' }}
                    placeholder="Describe your medium"
                    aria-invalid={!!fieldErrors.medium}
                  />
                )}
                <FieldErrorMessage message={fieldErrors.medium} />
              </div>
              <div>
                <FieldLabel required>Style</FieldLabel>
                <select
                  id="style"
                  value={form.style}
                  onChange={(e) => updateForm('style', e.target.value)}
                  className="commission-field"
                  aria-invalid={!!fieldErrors.style}
                >
                  <option value="">Select style</option>
                  {STYLES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <FieldErrorMessage message={fieldErrors.style} />
              </div>
            </div>

            {/* Dominant Colours */}
            <div style={{ marginBottom: '1.8rem' }}>
              <FieldLabel aside={`${form.colors.length}/2`}>Dominant colours</FieldLabel>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.7rem',
                }}
              >
                {COLOUR_PALETTE.map((c) => {
                  const selected = form.colors.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      title={c.label}
                      onClick={() => toggleColour(c.name)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        border: selected
                          ? '1px solid var(--color-ink)'
                          : '1px solid var(--color-border-strong)',
                        outline: selected ? '1px solid var(--color-ink)' : 'none',
                        outlineOffset: 2,
                        backgroundColor: c.hex,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  );
                })}
              </div>
              {form.colors.length > 0 && (
                <p
                  className="font-serif"
                  style={{
                    marginTop: '0.8rem',
                    fontSize: '0.85rem',
                    fontStyle: 'italic',
                    color: 'var(--color-stone)',
                  }}
                >
                  {form.colors
                    .map((c) => COLOUR_PALETTE.find((p) => p.name === c)?.label)
                    .join(', ')}
                </p>
              )}
            </div>

            {/* Tags */}
            <div>
              <FieldLabel aside={`${form.tags.length}/25`}>Tags</FieldLabel>
              {form.tags.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginBottom: '0.8rem',
                  }}
                >
                  {form.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-serif"
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--color-ink)',
                        padding: '0.25rem 0.7rem',
                        border: '1px solid var(--color-border-strong)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        aria-label={`Remove ${tag}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-stone)',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '1rem',
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {form.tags.length < 25 && (
                <input
                  id="tags"
                  type="text"
                  value={form.tagInput}
                  onChange={(e) => updateForm('tagInput', e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => {
                    if (form.tagInput.trim()) addTag(form.tagInput);
                  }}
                  className="commission-field"
                  placeholder="Type a tag and press Enter"
                />
              )}
            </div>
          </div>
        )}

        {/* ═══════════ STEP 3: Dimensions ═══════════ */}
        {step === 3 && (
          <div>
            <p style={{ ...KICKER, marginBottom: '1rem' }}>— Specifications —</p>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(1.5rem, 2.8vw, 2rem)',
                lineHeight: 1.15,
                color: 'var(--color-ink)',
                fontWeight: 400,
                marginBottom: '0.7rem',
              }}
            >
              {form.category === 'digital' ? (
                <>The <em style={{ fontStyle: 'italic' }}>file.</em></>
              ) : (
                <>Size and <em style={{ fontStyle: 'italic' }}>substance.</em></>
              )}
            </h2>
            <p
              style={{
                fontSize: '0.9rem',
                fontWeight: 300,
                color: 'var(--color-stone-dark)',
                lineHeight: 1.6,
                marginBottom: '2.2rem',
                maxWidth: '52ch',
              }}
            >
              {form.category === 'digital'
                ? 'Describe the file a buyer will receive once they purchase.'
                : 'Physical dimensions and surface details help buyers understand scale and shipping.'}
            </p>

            {form.category !== 'digital' ? (
              <>
                {/* Dimensions */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1rem',
                    marginBottom: '1.8rem',
                  }}
                >
                  <div>
                    <FieldLabel>Width (cm)</FieldLabel>
                    <input
                      id="width"
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.width_cm}
                      onChange={(e) => updateForm('width_cm', e.target.value)}
                      className="commission-field"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <FieldLabel>Height (cm)</FieldLabel>
                    <input
                      id="height"
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.height_cm}
                      onChange={(e) => updateForm('height_cm', e.target.value)}
                      className="commission-field"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <FieldLabel>Depth (cm)</FieldLabel>
                    <input
                      id="depth"
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.depth_cm}
                      onChange={(e) => updateForm('depth_cm', e.target.value)}
                      className="commission-field"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {/* Surface */}
                <div style={{ marginBottom: '1.8rem' }}>
                  <FieldLabel>Surface / Material</FieldLabel>
                  <select
                    id="surface"
                    value={form.surface}
                    onChange={(e) => updateForm('surface', e.target.value)}
                    className="commission-field"
                  >
                    <option value="">Select surface</option>
                    {SURFACES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Toggles — as hairline list */}
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '0 0 1.8rem',
                    borderTop: '1px solid var(--color-border)',
                  }}
                >
                  {[
                    {
                      key: 'is_framed' as const,
                      label: 'Framed',
                      desc: 'This work is presented in a frame.',
                      checked: form.is_framed,
                    },
                    {
                      key: 'ready_to_hang' as const,
                      label: 'Ready to hang',
                      desc: 'Hanging hardware is included.',
                      checked: form.ready_to_hang,
                    },
                  ].map((t) => (
                    <li
                      key={t.key}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        padding: '1rem 0',
                        gap: '1rem',
                      }}
                    >
                      <div>
                        <p
                          className="font-serif"
                          style={{
                            fontSize: '1rem',
                            color: 'var(--color-ink)',
                            margin: 0,
                          }}
                        >
                          {t.label}
                        </p>
                        <p
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 300,
                            color: 'var(--color-stone-dark)',
                            marginTop: '0.2rem',
                          }}
                        >
                          {t.desc}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateForm(t.key, !t.checked)}
                        className="font-serif"
                        style={{
                          background: 'none',
                          border: 'none',
                          fontStyle: 'italic',
                          fontSize: '0.92rem',
                          color: t.checked ? 'var(--color-ink)' : 'var(--color-stone)',
                          cursor: 'pointer',
                          padding: 0,
                          borderBottom: '1px solid',
                          borderColor: t.checked
                            ? 'var(--color-ink)'
                            : 'transparent',
                          paddingBottom: '0.1rem',
                        }}
                      >
                        {t.checked ? '✓ Yes' : 'No'}
                      </button>
                    </li>
                  ))}
                </ul>

                {/* Shipping weight */}
                <div>
                  <FieldLabel>Shipping weight (kg)</FieldLabel>
                  <input
                    id="weight"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.shipping_weight_kg}
                    onChange={(e) => updateForm('shipping_weight_kg', e.target.value)}
                    className="commission-field"
                    placeholder="Approximate packaged weight"
                  />
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: '1.6rem 0',
                  borderTop: '1px solid var(--color-border-strong)',
                  borderBottom: '1px solid var(--color-border-strong)',
                }}
              >
                <p style={{ ...KICKER, marginBottom: '0.6rem' }}>— A note —</p>
                <p
                  className="font-serif"
                  style={{
                    fontSize: '0.95rem',
                    fontStyle: 'italic',
                    color: 'var(--color-ink)',
                    lineHeight: 1.6,
                  }}
                >
                  The preview images you upload are what the buyer receives.
                  Upload the full-resolution files you intend to deliver.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ STEP 4: Price ═══════════ */}
        {step === 4 && (
          <div>
            <p style={{ ...KICKER, marginBottom: '1rem' }}>— The price —</p>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(1.5rem, 2.8vw, 2rem)',
                lineHeight: 1.15,
                color: 'var(--color-ink)',
                fontWeight: 400,
                marginBottom: '0.7rem',
              }}
            >
              Name your <em style={{ fontStyle: 'italic' }}>number.</em>
            </h2>
            <p
              style={{
                fontSize: '0.9rem',
                fontWeight: 300,
                color: 'var(--color-stone-dark)',
                lineHeight: 1.6,
                marginBottom: '2.2rem',
                maxWidth: '52ch',
              }}
            >
              Price your work fairly. Signo takes zero commission — you keep
              every cent, less Stripe&apos;s small processing fee.
            </p>

            {/* Availability */}
            <div style={{ marginBottom: '2rem' }}>
              <FieldLabel>Availability</FieldLabel>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                {AVAILABILITY_OPTIONS.map((opt) => {
                  const selected = form.availability === opt.value;
                  return (
                    <li
                      key={opt.value}
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                    >
                      <button
                        type="button"
                        onClick={() => updateForm('availability', opt.value)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          padding: '1rem 0',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          gap: '1rem',
                        }}
                      >
                        <div>
                          <p
                            className="font-serif"
                            style={{
                              fontSize: '1rem',
                              color: 'var(--color-ink)',
                              fontStyle: selected ? 'italic' : 'normal',
                              margin: 0,
                            }}
                          >
                            {opt.label}
                          </p>
                          <p
                            style={{
                              fontSize: '0.85rem',
                              fontWeight: 300,
                              color: 'var(--color-stone-dark)',
                              marginTop: '0.2rem',
                            }}
                          >
                            {opt.desc}
                          </p>
                        </div>
                        <span
                          className="font-serif"
                          style={{
                            fontStyle: 'italic',
                            fontSize: '0.88rem',
                            color: selected ? 'var(--color-ink)' : 'var(--color-stone)',
                          }}
                        >
                          {selected ? '✓ Selected' : 'Select'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {form.availability === 'coming_soon' && (
                <div style={{ marginTop: '1rem' }}>
                  <FieldLabel>Available from</FieldLabel>
                  <input
                    id="available_from"
                    type="date"
                    value={form.available_from}
                    onChange={(e) => updateForm('available_from', e.target.value)}
                    className="commission-field"
                  />
                </div>
              )}
            </div>

            {/* Price input */}
            <div style={{ marginBottom: '2rem' }}>
              <FieldLabel required>Price (AUD)</FieldLabel>
              <div style={{ position: 'relative' }}>
                <span
                  className="font-serif"
                  style={{
                    position: 'absolute',
                    left: '0.4rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '1.4rem',
                    color: 'var(--color-stone)',
                  }}
                >
                  $
                </span>
                <input
                  id="price_aud"
                  type="number"
                  step="0.01"
                  min="1"
                  value={form.price_aud}
                  onChange={(e) => updateForm('price_aud', e.target.value)}
                  className="commission-field"
                  style={{
                    paddingLeft: '1.6rem',
                    fontSize: '1.4rem',
                    fontFamily: 'var(--font-serif, serif)',
                  }}
                  placeholder="0.00"
                  aria-invalid={!!fieldErrors.price_aud}
                />
              </div>
              <FieldErrorMessage message={fieldErrors.price_aud} />
            </div>

            {/* Breakdown */}
            {price >= 1 && (
              <section
                style={{
                  marginBottom: '2rem',
                  padding: '1.6rem 0',
                  borderTop: '1px solid var(--color-border-strong)',
                  borderBottom: '1px solid var(--color-border-strong)',
                }}
              >
                <p style={{ ...KICKER, marginBottom: '1rem' }}>— The ledger —</p>
                <dl style={{ margin: 0 }}>
                  {[
                    { term: 'Sale price', val: formatPrice(price) },
                    { term: 'Stripe fee (~1.75% + 30¢)', val: `− ${formatPrice(commission.stripeFee)}` },
                    { term: 'Signo commission', val: '$0.00' },
                  ].map((row) => (
                    <div
                      key={row.term}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        padding: '0.7rem 0',
                        borderBottom: '1px solid var(--color-border)',
                        gap: '1rem',
                      }}
                    >
                      <dt style={KICKER}>{row.term}</dt>
                      <dd
                        className="font-serif"
                        style={{
                          margin: 0,
                          fontSize: '0.95rem',
                          color: 'var(--color-ink)',
                        }}
                      >
                        {row.val}
                      </dd>
                    </div>
                  ))}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      padding: '1rem 0 0',
                      gap: '1rem',
                    }}
                  >
                    <dt style={KICKER}>You receive</dt>
                    <dd
                      className="font-serif"
                      style={{
                        margin: 0,
                        fontSize: 'clamp(1.5rem, 3vw, 1.9rem)',
                        color: 'var(--color-ink)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {formatPrice(commission.artistPayout)}
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            {/* Shipping cost (physical only) */}
            {form.category !== 'digital' && (
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                <li
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    padding: '1rem 0',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <p
                      className="font-serif"
                      style={{
                        fontSize: '1rem',
                        color: 'var(--color-ink)',
                        margin: 0,
                      }}
                    >
                      Shipping included in price
                    </p>
                    <p
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 300,
                        color: 'var(--color-stone-dark)',
                        marginTop: '0.2rem',
                      }}
                    >
                      Free shipping reads as generous, and buyers love it.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateForm('includeShipping', !form.includeShipping)}
                    className="font-serif"
                    style={{
                      background: 'none',
                      border: 'none',
                      fontStyle: 'italic',
                      fontSize: '0.92rem',
                      color: form.includeShipping
                        ? 'var(--color-ink)'
                        : 'var(--color-stone)',
                      cursor: 'pointer',
                      padding: 0,
                      borderBottom: '1px solid',
                      borderColor: form.includeShipping
                        ? 'var(--color-ink)'
                        : 'transparent',
                      paddingBottom: '0.1rem',
                    }}
                  >
                    {form.includeShipping ? '✓ Yes' : 'No'}
                  </button>
                </li>
                {!form.includeShipping && (
                  <li style={{ padding: '1rem 0', borderBottom: '1px solid var(--color-border)' }}>
                    <FieldLabel>Shipping cost (AUD)</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <span
                        className="font-serif"
                        style={{
                          position: 'absolute',
                          left: '0.4rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--color-stone)',
                        }}
                      >
                        $
                      </span>
                      <input
                        id="shipping"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.shipping_cost}
                        onChange={(e) => updateForm('shipping_cost', e.target.value)}
                        className="commission-field"
                        style={{ paddingLeft: '1.4rem' }}
                        placeholder="0.00"
                      />
                    </div>
                  </li>
                )}
              </ul>
            )}
          </div>
        )}

        {/* ═══════════ STEP 5: Review ═══════════ */}
        {step === 5 && (
          <div>
            <p style={{ ...KICKER, marginBottom: '1rem' }}>— Before submitting —</p>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(1.5rem, 2.8vw, 2rem)',
                lineHeight: 1.15,
                color: 'var(--color-ink)',
                fontWeight: 400,
                marginBottom: '0.7rem',
              }}
            >
              Read it <em style={{ fontStyle: 'italic' }}>once more.</em>
            </h2>
            <p
              style={{
                fontSize: '0.9rem',
                fontWeight: 300,
                color: 'var(--color-stone-dark)',
                lineHeight: 1.6,
                marginBottom: '2.2rem',
                maxWidth: '52ch',
              }}
            >
              What follows is roughly how buyers will see the work. Nothing
              submitted is final — you can always edit or withdraw a listing.
            </p>

            {error && (
              <div
                style={{
                  marginBottom: '2rem',
                  padding: '1.2rem 0',
                  borderTop: '1px solid var(--color-terracotta, #c45d3e)',
                  borderBottom: '1px solid var(--color-terracotta, #c45d3e)',
                }}
              >
                <p
                  className="font-serif"
                  style={{
                    fontSize: '0.92rem',
                    fontStyle: 'italic',
                    color: 'var(--color-terracotta, #c45d3e)',
                  }}
                >
                  — {error}
                </p>
              </div>
            )}

            {/* Preview */}
            <section
              style={{
                marginBottom: '2.4rem',
                borderTop: '1px solid var(--color-border-strong)',
                borderBottom: '1px solid var(--color-border-strong)',
                paddingBottom: '1.8rem',
              }}
            >
              {/* Main image */}
              {form.images.length > 0 && (
                <div
                  style={{
                    position: 'relative',
                    aspectRatio: '4 / 3',
                    background: 'var(--color-cream)',
                    marginBottom: '1.4rem',
                  }}
                >
                  <Image
                    src={form.images[0]}
                    alt={form.title || 'Artwork'}
                    fill
                    style={{ objectFit: 'contain' }}
                    sizes="(max-width: 640px) 100vw, 640px"
                  />
                </div>
              )}

              {/* Thumbs */}
              {form.images.length > 1 && (
                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    overflowX: 'auto',
                    marginBottom: '1.4rem',
                  }}
                >
                  {form.images.map((url, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'relative',
                        width: 64,
                        height: 64,
                        flexShrink: 0,
                        background: 'var(--color-cream)',
                      }}
                    >
                      <Image src={url} alt={`Photo ${i + 1}`} fill style={{ objectFit: 'cover' }} sizes="64px" />
                    </div>
                  ))}
                </div>
              )}

              <p style={{ ...KICKER, marginBottom: '0.7rem' }}>
                {form.category || 'Artwork'}
              </p>
              <h3
                className="font-serif"
                style={{
                  fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)',
                  color: 'var(--color-ink)',
                  fontWeight: 400,
                  margin: '0 0 0.4rem',
                }}
              >
                {form.title || 'Untitled'}
              </h3>
              {user?.full_name && (
                <p
                  className="font-serif"
                  style={{
                    fontStyle: 'italic',
                    fontSize: '0.9rem',
                    color: 'var(--color-stone)',
                    marginBottom: '0.9rem',
                  }}
                >
                  by {user.full_name}
                </p>
              )}

              <p
                className="font-serif"
                style={{
                  fontSize: '1.3rem',
                  color: 'var(--color-ink)',
                  marginBottom: '1.2rem',
                }}
              >
                {price >= 1 ? formatPrice(price) : '$—'}
              </p>

              {form.description && (
                <p
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: 300,
                    color: 'var(--color-stone-dark)',
                    lineHeight: 1.7,
                    marginBottom: '1.4rem',
                    maxWidth: '60ch',
                  }}
                >
                  {form.description}
                </p>
              )}

              {/* Meta dl */}
              <dl
                style={{
                  margin: 0,
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                {[
                  { term: 'Medium', val: form.medium === 'Other' ? form.customMedium : form.medium },
                  { term: 'Style', val: form.style },
                  { term: 'Surface', val: form.surface },
                  {
                    term: 'Dimensions',
                    val:
                      form.width_cm || form.height_cm
                        ? `${form.width_cm || '—'} × ${form.height_cm || '—'}${
                            form.depth_cm ? ` × ${form.depth_cm}` : ''
                          } cm`
                        : '',
                  },
                  { term: 'Framed', val: form.is_framed ? 'Yes' : '' },
                  { term: 'Ready to hang', val: form.ready_to_hang ? 'Yes' : '' },
                  {
                    term: 'Availability',
                    val:
                      form.availability !== 'available'
                        ? form.availability.replace('_', ' ')
                        : '',
                  },
                ]
                  .filter((r) => r.val)
                  .map((row) => (
                    <div
                      key={row.term}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        padding: '0.8rem 0',
                        borderBottom: '1px solid var(--color-border)',
                        gap: '1rem',
                      }}
                    >
                      <dt style={KICKER}>{row.term}</dt>
                      <dd
                        className="font-serif"
                        style={{
                          margin: 0,
                          fontSize: '0.92rem',
                          color: 'var(--color-ink)',
                          textAlign: 'right',
                          textTransform: 'capitalize',
                        }}
                      >
                        {row.val}
                      </dd>
                    </div>
                  ))}
              </dl>

              {/* Tags */}
              {form.tags.length > 0 && (
                <p
                  className="font-serif"
                  style={{
                    marginTop: '1.2rem',
                    fontSize: '0.85rem',
                    fontStyle: 'italic',
                    color: 'var(--color-stone)',
                  }}
                >
                  {form.tags.map((t) => `#${t}`).join(' · ')}
                </p>
              )}
            </section>

            {/* Submit buttons */}
            <div
              style={{
                display: 'flex',
                gap: '1.2rem',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => handleSubmit('pending_review')}
                disabled={saving}
                className="artwork-primary-cta"
              >
                {saving ? 'Submitting…' : 'Submit for review'}
              </button>
              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={saving}
                className="font-serif"
                style={{
                  background: 'none',
                  border: 'none',
                  fontStyle: 'italic',
                  fontSize: '0.95rem',
                  color: 'var(--color-stone)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                — Save as draft
              </button>
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        {step < 5 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 'clamp(2.4rem, 4vw, 3.4rem)',
              paddingTop: '1.6rem',
              borderTop: '1px solid var(--color-border-strong)',
              gap: '1rem',
            }}
          >
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="font-serif"
                style={{
                  background: 'none',
                  border: 'none',
                  fontStyle: 'italic',
                  fontSize: '0.9rem',
                  color: 'var(--color-stone)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ← Back
              </button>
            ) : (
              <Link
                href="/artist/artworks"
                className="font-serif"
                style={{
                  fontStyle: 'italic',
                  fontSize: '0.9rem',
                  color: 'var(--color-stone)',
                  textDecoration: 'none',
                }}
              >
                ← Cancel
              </Link>
            )}

            <button
              type="button"
              onClick={nextStep}
              disabled={!canProceed[step]}
              className="artwork-primary-cta"
            >
              Continue →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
