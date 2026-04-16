'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { uploadArtworkImage } from '@/lib/supabase/storage';
import { formatPrice, calculateCommission } from '@/lib/utils';
import ImageUpload from '@/components/ImageUpload';
import type { Artwork, ArtworkStatus } from '@/types/database';

// ── Constants ──

const TOTAL_STEPS = 5;

const MEDIUMS = [
  'Oil', 'Acrylic', 'Watercolour', 'Ink', 'Pencil/Graphite', 'Charcoal',
  'Pastel', 'Mixed Media', 'Photography', 'Digital Art', 'Sculpture',
  'Ceramics', 'Textile', 'Printmaking', 'Other',
];

const STYLES = [
  'Abstract', 'Contemporary', 'Realism', 'Impressionism', 'Minimalist',
  'Pop Art', 'Surrealism', 'Landscape', 'Portrait', 'Still Life',
  'Figurative', 'Botanical', 'Geometric', 'Other',
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

const KICKER: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
};

// ── Types ──

interface FormState {
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

// ── Helpers ──

function EditorialSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-warm-white)',
      }}
    >
      <p
        className="font-serif"
        style={{ fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--color-stone)' }}
      >
        {label}
      </p>
    </div>
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

export default function EditArtworkPage() {
  const { loading: authLoading } = useRequireAuth('artist');
  const { id: artworkId } = useParams() as { id: string };
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingArtwork, setLoadingArtwork] = useState(true);
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState<FormState>({
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
  });

  // Load artwork
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch(`/api/artworks/${artworkId}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          setNotFound(true);
          setLoadingArtwork(false);
          return;
        }

        const { artwork: data } = await res.json();
        if (!data) {
          setNotFound(true);
          setLoadingArtwork(false);
          return;
        }

        const a = data as Artwork;
        setArtwork(a);

        const isKnownMedium = MEDIUMS.includes(a.medium ?? '');

        setForm({
          images: (a.images as string[]) || [],
          title: a.title,
          description: a.description ?? '',
          category: (a.category as 'original' | 'print' | 'digital') ?? 'original',
          medium: isKnownMedium ? (a.medium ?? '') : (a.medium ? 'Other' : ''),
          customMedium: isKnownMedium ? '' : (a.medium ?? ''),
          style: a.style ?? '',
          colors: (a.colors as string[]) || [],
          tags: (a.tags as string[]) || [],
          tagInput: '',
          width_cm: a.width_cm?.toString() ?? '',
          height_cm: a.height_cm?.toString() ?? '',
          depth_cm: a.depth_cm?.toString() ?? '',
          surface: a.surface ?? '',
          is_framed: a.is_framed,
          ready_to_hang: a.ready_to_hang ?? false,
          shipping_weight_kg: a.shipping_weight_kg?.toString() ?? '',
          price_aud: a.price_aud.toString(),
          shipping_cost: '',
          includeShipping: true,
          availability:
            (a.availability as 'available' | 'coming_soon' | 'enquire_only') ?? 'available',
          available_from: a.available_from ?? '',
        });

        setLoadingArtwork(false);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[EditArtwork] Fetch error:', err);
          setNotFound(true);
          setLoadingArtwork(false);
        }
      }
    }
    load();
    return () => controller.abort();
  }, [user, artworkId]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Image upload
  const handleImageUpload = useCallback(
    async (file: File, onProgress: (p: number) => void) => {
      if (!user) throw new Error('Not authenticated');
      return uploadArtworkImage(file, user.id, artworkId, onProgress);
    },
    [user, artworkId]
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

  // Commission
  const price = parseFloat(form.price_aud) || 0;
  const commission = useMemo(() => calculateCommission(price), [price]);

  // Validation
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

  // Save
  async function handleSave(status?: ArtworkStatus) {
    if (!user || !artwork) return;
    setSaving(true);
    setError('');

    try {
      const medium = form.medium === 'Other' ? form.customMedium : form.medium;

      const res = await fetch(`/api/artworks/${artworkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          images: form.images,
          tags: form.tags,
          status: status ?? undefined,
        }),
      });

      if (!res.ok) {
        const { error: apiError } = await res.json();
        throw new Error(apiError || 'Failed to update artwork');
      }

      window.location.href = '/artist/artworks';
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

  // ── Loading / not-found states ──

  if (authLoading || loadingArtwork) return <EditorialSpinner />;

  if (notFound) {
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
          <p style={{ ...KICKER, marginBottom: '1rem' }}>— Not found —</p>
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              lineHeight: 1.05,
              color: 'var(--color-ink)',
              fontWeight: 400,
              marginBottom: '0.9rem',
            }}
          >
            This work <em style={{ fontStyle: 'italic' }}>isn&apos;t here.</em>
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
            The artwork doesn&apos;t exist, or doesn&apos;t belong to you.
          </p>
          <Link href="/artist/artworks" className="editorial-link">
            ← Back to all works
          </Link>
        </div>
      </div>
    );
  }

  const isRejected = artwork?.status === 'rejected';

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
          <p style={{ ...KICKER, marginBottom: '1rem' }}>The Studio · Editing</p>
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
            Refine the <em style={{ fontStyle: 'italic' }}>listing.</em>
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
            {isRejected
              ? 'Saving changes will automatically resubmit this work for review.'
              : 'Update photographs, dimensions, price, or language. Save when ready.'}
          </p>
        </header>

        {/* Rejection notice */}
        {isRejected && artwork?.review_notes && (
          <section
            style={{
              marginBottom: '2rem',
              padding: '1.4rem 0',
              borderTop: '1px solid var(--color-terracotta, #c45d3e)',
              borderBottom: '1px solid var(--color-terracotta, #c45d3e)',
            }}
          >
            <p
              style={{
                ...KICKER,
                color: 'var(--color-terracotta, #c45d3e)',
                marginBottom: '0.6rem',
              }}
            >
              — Editor&apos;s note —
            </p>
            <p
              className="font-serif"
              style={{
                fontSize: '0.95rem',
                fontStyle: 'italic',
                color: 'var(--color-ink)',
                lineHeight: 1.6,
                marginBottom: '0.4rem',
              }}
            >
              {artwork.review_notes}
            </p>
            <p
              style={{
                fontSize: '0.82rem',
                fontWeight: 300,
                color: 'var(--color-stone-dark)',
                lineHeight: 1.5,
              }}
            >
              Make the requested changes and save — we&apos;ll resubmit for review automatically.
            </p>
          </section>
        )}

        {/* Step indicator */}
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

        {/* STEP 1: Photos */}
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
              Update the <em style={{ fontStyle: 'italic' }}>photographs.</em>
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
              Add, remove, or reorder images. At least two are required.
            </p>

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

        {/* STEP 2: Details */}
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
              Refine the title, description, and classification.
            </p>

            <div style={{ marginBottom: '1.8rem' }}>
              <FieldLabel required aside={`${form.title.length}/100`}>Title</FieldLabel>
              <input
                id="title"
                type="text"
                value={form.title}
                onChange={(e) => updateForm('title', e.target.value.slice(0, 100))}
                className="commission-field"
                placeholder="e.g. Golden Hour Over Sydney Harbour"
              />
            </div>

            <div style={{ marginBottom: '1.8rem' }}>
              <FieldLabel required aside={`${form.description.length}/2000`}>Description</FieldLabel>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value.slice(0, 2000))}
                rows={6}
                className="commission-field"
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="What inspired it, how you made it, what you want the viewer to feel…"
              />
            </div>

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
                    <li key={cat.value} style={{ borderBottom: '1px solid var(--color-border)' }}>
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
            </div>

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
                    className="commission-field"
                    style={{ marginTop: '0.6rem' }}
                    placeholder="Describe your medium"
                  />
                )}
              </div>
              <div>
                <FieldLabel required>Style</FieldLabel>
                <select
                  id="style"
                  value={form.style}
                  onChange={(e) => updateForm('style', e.target.value)}
                  className="commission-field"
                >
                  <option value="">Select style</option>
                  {STYLES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1.8rem' }}>
              <FieldLabel aside={`${form.colors.length}/2`}>Dominant colours</FieldLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.7rem' }}>
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
                  {form.colors.map((c) => COLOUR_PALETTE.find((p) => p.name === c)?.label).join(', ')}
                </p>
              )}
            </div>

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
                  onBlur={() => { if (form.tagInput.trim()) addTag(form.tagInput); }}
                  className="commission-field"
                  placeholder="Type a tag and press Enter"
                />
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Dimensions */}
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

                <div style={{ marginBottom: '1.8rem' }}>
                  <FieldLabel>Surface / Material</FieldLabel>
                  <select
                    value={form.surface}
                    onChange={(e) => updateForm('surface', e.target.value)}
                    className="commission-field"
                  >
                    <option value="">Select surface</option>
                    {SURFACES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

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
                          style={{ fontSize: '1rem', color: 'var(--color-ink)', margin: 0 }}
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
                          borderColor: t.checked ? 'var(--color-ink)' : 'transparent',
                          paddingBottom: '0.1rem',
                        }}
                      >
                        {t.checked ? '✓ Yes' : 'No'}
                      </button>
                    </li>
                  ))}
                </ul>

                <div>
                  <FieldLabel>Shipping weight (kg)</FieldLabel>
                  <input
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
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Price */}
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
              Set your <em style={{ fontStyle: 'italic' }}>number.</em>
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
              Signo takes zero commission. You keep every cent, less Stripe&apos;s small fee.
            </p>

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
                    <li key={opt.value} style={{ borderBottom: '1px solid var(--color-border)' }}>
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
                    type="date"
                    value={form.available_from}
                    onChange={(e) => updateForm('available_from', e.target.value)}
                    className="commission-field"
                  />
                </div>
              )}
            </div>

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
                />
              </div>
            </div>

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
                        style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-ink)' }}
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
                      style={{ fontSize: '1rem', color: 'var(--color-ink)', margin: 0 }}
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
                      color: form.includeShipping ? 'var(--color-ink)' : 'var(--color-stone)',
                      cursor: 'pointer',
                      padding: 0,
                      borderBottom: '1px solid',
                      borderColor: form.includeShipping ? 'var(--color-ink)' : 'transparent',
                      paddingBottom: '0.1rem',
                    }}
                  >
                    {form.includeShipping ? '✓ Yes' : 'No'}
                  </button>
                </li>
              </ul>
            )}
          </div>
        )}

        {/* STEP 5: Review */}
        {step === 5 && (
          <div>
            <p style={{ ...KICKER, marginBottom: '1rem' }}>— Before saving —</p>
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
              {isRejected
                ? 'Saving will resubmit this artwork for review.'
                : 'Confirm everything looks good before saving.'}
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
                    sizes="640px"
                  />
                </div>
              )}

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

              <p style={{ ...KICKER, marginBottom: '0.7rem' }}>{form.category || 'Artwork'}</p>
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

              <dl style={{ margin: 0, borderTop: '1px solid var(--color-border)' }}>
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

            {/* Save buttons */}
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
                onClick={() => handleSave()}
                disabled={saving}
                className="artwork-primary-cta"
              >
                {saving
                  ? 'Saving…'
                  : isRejected
                  ? 'Save & resubmit'
                  : 'Save changes'}
              </button>
              {artwork?.status === 'draft' && (
                <button
                  type="button"
                  onClick={() => handleSave('draft')}
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
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
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
