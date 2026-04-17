'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AvatarUpload from '@/components/AvatarUpload';
import ImageUpload from '@/components/ImageUpload';
import { useAuth } from '@/components/providers/AuthProvider';
import Avatar from '@/components/ui/Avatar';
import EditorialSpinner from '@/components/ui/EditorialSpinner';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { uploadAvatar, uploadArtworkImage } from '@/lib/supabase/storage';
import { formatPrice, calculateCommission } from '@/lib/utils';

// ── Constants ──

const TOTAL_STEPS = 6; // 0 welcome, 1–4 steps, 5 done
const DRAFT_KEY = 'signo_onboarding_draft';

const MEDIUMS = [
  'Oil', 'Acrylic', 'Watercolour', 'Mixed Media', 'Photography',
  'Printmaking', 'Digital Art', 'Sculpture', 'Ink', 'Pencil/Graphite',
  'Charcoal', 'Pastel', 'Ceramics', 'Textile', 'Other',
];

const STYLES = [
  'Abstract', 'Realism', 'Landscape', 'Portrait', 'Contemporary',
  'Modern', 'Impressionism', 'Minimalist', 'Figurative', 'Still Life',
  'Botanical', 'Geometric', 'Pop Art', 'Surrealism', 'Other',
];

const COMMITMENTS = [
  'Every physical work is dispatched with tracked shipping.',
  'All sales are dispatched within seven days.',
  'Packaging is photographed before it leaves the studio.',
  'Orders over $500 ship insured, signature on delivery.',
  'Every work uploaded is my own original creation.',
];

const STEP_META = [
  { num: '01', label: 'Profile' },
  { num: '02', label: 'Standards' },
  { num: '03', label: 'First work' },
  { num: '04', label: 'Payments' },
];

const KICKER: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
};

// ── Draft persistence ──

interface OnboardingDraft {
  fullName: string;
  bio: string;
  location: string;
  avatarUrl: string | null;
  primaryMedium: string;
  selectedStyles: string[];
  instagram: string;
  tiktok: string;
  facebook: string;
  youtube: string;
  website: string;
  agreedToTerms: boolean;
  artworkId: string;
  artworkImages: string[];
  artworkTitle: string;
  artworkDescription: string;
  artworkMedium: string;
  artworkStyle: string;
  artworkCategory: 'original' | 'print' | 'digital';
  artworkWidth: string;
  artworkHeight: string;
  artworkPrice: string;
}

function loadDraft(): Partial<OnboardingDraft> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveDraft(draft: Partial<OnboardingDraft>) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

// ── Helpers ──

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
          <span style={{ marginLeft: '0.4rem', color: 'var(--color-terracotta, #c45d3e)' }}>
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

export default function ArtistOnboardingPage() {
  const { loading: authLoading } = useRequireAuth();
  const { user, refreshUser } = useAuth();
  const isBuyerUpgrade = user?.role === 'buyer';

  useEffect(() => {
    if (user && user.role === 'artist' && user.onboarding_completed) {
      window.location.href = '/artist/dashboard';
    }
  }, [user]);

  const draft = useMemo(() => loadDraft(), []);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [fullName, setFullName] = useState(draft.fullName ?? user?.full_name ?? '');
  const [bio, setBio] = useState(draft.bio ?? user?.bio ?? '');
  const [location, setLocation] = useState(draft.location ?? user?.location ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(draft.avatarUrl ?? user?.avatar_url ?? null);
  const [primaryMedium, setPrimaryMedium] = useState(draft.primaryMedium ?? '');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(draft.selectedStyles ?? []);
  const [instagram, setInstagram] = useState(draft.instagram ?? user?.social_links?.instagram ?? '');
  const [tiktok, setTiktok] = useState(draft.tiktok ?? user?.social_links?.tiktok ?? '');
  const [facebook, setFacebook] = useState(draft.facebook ?? user?.social_links?.facebook ?? '');
  const [youtube, setYoutube] = useState(draft.youtube ?? user?.social_links?.youtube ?? '');
  const [website, setWebsite] = useState(draft.website ?? user?.social_links?.website ?? '');

  // Step 2
  const [agreedToTerms, setAgreedToTerms] = useState(draft.agreedToTerms ?? false);

  // Step 3
  const [artworkId] = useState(draft.artworkId ?? crypto.randomUUID());
  const [artworkImages, setArtworkImages] = useState<string[]>(draft.artworkImages ?? []);
  const [artworkTitle, setArtworkTitle] = useState(draft.artworkTitle ?? '');
  const [artworkDescription, setArtworkDescription] = useState(draft.artworkDescription ?? '');
  const [artworkMedium, setArtworkMedium] = useState(draft.artworkMedium ?? '');
  const [artworkStyle, setArtworkStyle] = useState(draft.artworkStyle ?? '');
  const [artworkCategory, setArtworkCategory] = useState<'original' | 'print' | 'digital'>(
    draft.artworkCategory ?? 'original',
  );
  const [artworkWidth, setArtworkWidth] = useState(draft.artworkWidth ?? '');
  const [artworkHeight, setArtworkHeight] = useState(draft.artworkHeight ?? '');
  const [artworkPrice, setArtworkPrice] = useState(draft.artworkPrice ?? '');

  // Step 4
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);

  // Sync from user when no draft
  useEffect(() => {
    if (!user) return;
    if (!draft.fullName && user.full_name) setFullName(user.full_name);
    if (!draft.bio && user.bio) setBio(user.bio);
    if (!draft.location && user.location) setLocation(user.location);
    if (!draft.avatarUrl && user.avatar_url) setAvatarUrl(user.avatar_url);
    if (!draft.instagram && user.social_links?.instagram) setInstagram(user.social_links.instagram);
    if (!draft.tiktok && user.social_links?.tiktok) setTiktok(user.social_links.tiktok);
    if (!draft.facebook && user.social_links?.facebook) setFacebook(user.social_links.facebook);
    if (!draft.youtube && user.social_links?.youtube) setYoutube(user.social_links.youtube);
    if (!draft.website && user.social_links?.website) setWebsite(user.social_links.website);
  }, [user, draft]);

  useEffect(() => {
    if (primaryMedium && !artworkMedium) {
      setArtworkMedium(primaryMedium);
    }
  }, [primaryMedium, artworkMedium]);

  useEffect(() => {
    saveDraft({
      fullName, bio, location, avatarUrl, primaryMedium, selectedStyles,
      instagram, tiktok, facebook, youtube, website, agreedToTerms, artworkId,
      artworkImages, artworkTitle, artworkDescription, artworkMedium, artworkStyle,
      artworkCategory, artworkWidth, artworkHeight, artworkPrice,
    });
  }, [
    fullName, bio, location, avatarUrl, primaryMedium, selectedStyles,
    instagram, tiktok, facebook, youtube, website, agreedToTerms, artworkId,
    artworkImages, artworkTitle, artworkDescription, artworkMedium, artworkStyle,
    artworkCategory, artworkWidth, artworkHeight, artworkPrice,
  ]);

  useEffect(() => {
    async function checkStripe() {
      try {
        const res = await fetch('/api/stripe/connect/status');
        if (res.ok) {
          const data = await res.json();
          if (data.connected && data.detailsSubmitted) {
            setStripeConnected(true);
          }
        }
      } catch {
        // ignore
      }
    }
    if (user) checkStripe();
  }, [user]);

  const canProceedStep1 = fullName.trim().length > 0 && bio.trim().length >= 10;
  const canProceedStep2 = agreedToTerms;
  const canProceedStep3 =
    artworkImages.length > 0 &&
    artworkTitle.trim().length > 0 &&
    artworkMedium.length > 0 &&
    parseFloat(artworkPrice) >= 1;

  const handleAvatarUpload = useCallback(
    async (file: File, onProgress: (p: number) => void) => {
      if (!user) throw new Error('Not authenticated');
      return uploadAvatar(file, user.id, onProgress);
    },
    [user],
  );

  const handleImageUpload = useCallback(
    async (file: File, onProgress: (p: number) => void) => {
      if (!user) throw new Error('Not authenticated');
      return uploadArtworkImage(file, user.id, artworkId, onProgress);
    },
    [user, artworkId],
  );

  function toggleStyle(style: string) {
    setSelectedStyles((prev) =>
      prev.includes(style)
        ? prev.filter((s) => s !== style)
        : prev.length < 5
        ? [...prev, style]
        : prev,
    );
  }

  async function saveAndComplete(skipArtwork: boolean) {
    if (!user) {
      setError('You appear to be signed out. Please refresh and sign in again.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const socialLinks: Record<string, string> = {};
      if (instagram.trim()) socialLinks.instagram = instagram.trim();
      if (tiktok.trim()) socialLinks.tiktok = tiktok.trim();
      if (facebook.trim()) socialLinks.facebook = facebook.trim();
      if (youtube.trim()) socialLinks.youtube = youtube.trim();
      if (website.trim()) socialLinks.website = website.trim();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const profileRes = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          bio: bio.trim(),
          location: location.trim() || null,
          avatar_url: avatarUrl,
          social_links: socialLinks,
          onboarding_completed: true,
          ...(isBuyerUpgrade ? { role: 'artist' } : {}),
        }),
        signal: controller.signal,
      });

      if (!profileRes.ok) {
        const body = await profileRes.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save profile');
      }

      if (!skipArtwork && artworkImages.length > 0 && artworkTitle.trim()) {
        const artworkRes = await fetch('/api/artworks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: artworkTitle.trim(),
            description: artworkDescription.trim() || null,
            images: artworkImages,
            medium: artworkMedium,
            style: artworkStyle || null,
            category: artworkCategory,
            width_cm: artworkWidth ? parseFloat(artworkWidth) : null,
            height_cm: artworkHeight ? parseFloat(artworkHeight) : null,
            price_aud: parseFloat(artworkPrice),
            status: 'pending_review',
          }),
          signal: controller.signal,
        });

        if (!artworkRes.ok) {
          const body = await artworkRes.json().catch(() => ({}));
          console.warn('[Onboarding] Artwork submit warning:', body.error);
        }
      }

      clearTimeout(timeoutId);

      try {
        await Promise.race([
          refreshUser(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]);
      } catch {
        // profile saved even if refresh fails
      }

      clearDraft();
      setStep(5);
    } catch (err) {
      console.error('[Onboarding] Save error:', err);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Save timed out — please check your connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleConnectStripe() {
    setStripeLoading(true);
    try {
      const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to start Stripe onboarding');
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Stripe');
      setStripeLoading(false);
    }
  }

  function nextStep() {
    setError('');
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function prevStep() {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
  }

  const priceCalc = useMemo(() => {
    const p = parseFloat(artworkPrice);
    if (!p || p < 1) return null;
    return calculateCommission(p);
  }, [artworkPrice]);

  if (authLoading) return <EditorialSpinner />;

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
        {/* Skip for now (visible 1–4) */}
        {step > 0 && step < 5 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <Link
              href="/artist/dashboard"
              className="font-serif"
              style={{
                fontStyle: 'italic',
                fontSize: '0.85rem',
                color: 'var(--color-stone)',
                textDecoration: 'none',
              }}
            >
              Skip for now →
            </Link>
          </div>
        )}

        {/* ───── STEP 0: Welcome ───── */}
        {step === 0 && (
          <div>
            <p style={{ ...KICKER, marginBottom: '1rem' }}>— An introduction —</p>
            <h1
              className="font-serif"
              style={{
                fontSize: 'clamp(2.4rem, 5vw, 3.6rem)',
                lineHeight: 1.02,
                letterSpacing: '-0.02em',
                color: 'var(--color-ink)',
                fontWeight: 400,
                marginBottom: '1rem',
              }}
            >
              Welcome to <em style={{ fontStyle: 'italic' }}>Signo.</em>
            </h1>
            <p
              style={{
                fontSize: '1rem',
                fontWeight: 300,
                color: 'var(--color-stone-dark)',
                lineHeight: 1.65,
                maxWidth: '52ch',
                marginBottom: '2.6rem',
              }}
            >
              A short setup, perhaps five minutes, and your studio is live. We&apos;ll
              take you through four things: your profile, the selling standards we
              ask everyone to hold, your first work, and payments.
            </p>

            <ol
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 2.6rem',
                borderTop: '1px solid var(--color-border-strong)',
              }}
            >
              {STEP_META.map((s) => (
                <li
                  key={s.num}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    display: 'grid',
                    gridTemplateColumns: '3.2rem 1fr',
                    alignItems: 'baseline',
                    gap: '1.4rem',
                    padding: '1.2rem 0',
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
                    {s.num}
                  </span>
                  <p
                    className="font-serif"
                    style={{
                      fontSize: '1.05rem',
                      color: 'var(--color-ink)',
                      margin: 0,
                    }}
                  >
                    {s.label}
                  </p>
                </li>
              ))}
            </ol>

            <button type="button" onClick={nextStep} className="artwork-primary-cta">
              Begin →
            </button>
          </div>
        )}

        {/* ───── Step indicator (1–4) ───── */}
        {step >= 1 && step <= 4 && (
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
                      borderLeft: i === 0 ? 'none' : '1px solid var(--color-border)',
                      padding: '1.1rem 0.8rem',
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
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {/* ───── STEP 1: Profile ───── */}
        {step === 1 && (
          <div>
            <p style={{ ...KICKER, marginBottom: '1rem' }}>— Your profile —</p>
            <h1
              className="font-serif"
              style={{
                fontSize: 'clamp(1.8rem, 3.4vw, 2.4rem)',
                lineHeight: 1.1,
                color: 'var(--color-ink)',
                fontWeight: 400,
                marginBottom: '0.7rem',
              }}
            >
              Introduce <em style={{ fontStyle: 'italic' }}>yourself.</em>
            </h1>
            <p
              style={{
                fontSize: '0.92rem',
                fontWeight: 300,
                color: 'var(--color-stone-dark)',
                lineHeight: 1.6,
                marginBottom: '2.4rem',
                maxWidth: '52ch',
              }}
            >
              A photograph, a name, a few sentences. Buyers connect with the person
              as much as the work.
            </p>

            {/* Avatar */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '2rem' }}>
              <AvatarUpload
                currentUrl={avatarUrl}
                userName={fullName}
                size={110}
                onAvatarChange={setAvatarUrl}
                uploadFile={handleAvatarUpload}
              />
            </div>

            <div style={{ marginBottom: '1.8rem' }}>
              <FieldLabel required>Display name</FieldLabel>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="commission-field"
                placeholder="Your name, as it appears to buyers"
                autoComplete="name"
              />
            </div>

            <div style={{ marginBottom: '1.8rem' }}>
              <FieldLabel>Location</FieldLabel>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="commission-field"
                placeholder="Melbourne, VIC"
              />
            </div>

            <div style={{ marginBottom: '1.8rem' }}>
              <FieldLabel required aside={`${bio.length}/200`}>Short bio</FieldLabel>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 200))}
                rows={4}
                className="commission-field"
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Your practice, what inspires you, how you work…"
              />
              <p
                className="font-serif"
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.82rem',
                  fontStyle: 'italic',
                  color:
                    bio.length > 0 && bio.trim().length < 10
                      ? 'var(--color-terracotta)'
                      : 'var(--color-stone-dark)',
                }}
              >
                <em>A few words on your practice. Ten characters or more.</em>
              </p>
            </div>

            <div style={{ marginBottom: '1.8rem' }}>
              <FieldLabel>Primary medium</FieldLabel>
              <select
                id="primaryMedium"
                value={primaryMedium}
                onChange={(e) => setPrimaryMedium(e.target.value)}
                className="commission-field"
              >
                <option value="">Select your primary medium…</option>
                {MEDIUMS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.8rem' }}>
              <FieldLabel aside={`${selectedStyles.length}/5`}>Styles you work in</FieldLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {STYLES.map((s) => {
                  const selected = selectedStyles.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleStyle(s)}
                      className="font-serif"
                      style={{
                        fontSize: '0.88rem',
                        color: selected ? 'var(--color-ink)' : 'var(--color-stone)',
                        fontStyle: selected ? 'italic' : 'normal',
                        padding: '0.3rem 0.8rem',
                        background: 'none',
                        border: selected
                          ? '1px solid var(--color-ink)'
                          : '1px solid var(--color-border)',
                        cursor: 'pointer',
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <FieldLabel aside="Optional">Social links</FieldLabel>
              <div
                style={{
                  display: 'grid',
                  gap: '0.8rem',
                }}
              >
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="commission-field"
                  placeholder="Instagram @handle or URL"
                />
                <input
                  type="text"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  className="commission-field"
                  placeholder="TikTok @handle or URL"
                />
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  className="commission-field"
                  placeholder="Facebook page URL"
                />
                <input
                  type="text"
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  className="commission-field"
                  placeholder="YouTube channel URL"
                />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="commission-field"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </div>
        )}

        {/* ───── STEP 2: Standards ───── */}
        {step === 2 && (
          <div>
            <p style={{ ...KICKER, marginBottom: '1rem' }}>— Selling standards —</p>
            <h1
              className="font-serif"
              style={{
                fontSize: 'clamp(1.8rem, 3.4vw, 2.4rem)',
                lineHeight: 1.1,
                color: 'var(--color-ink)',
                fontWeight: 400,
                marginBottom: '0.7rem',
              }}
            >
              The shared <em style={{ fontStyle: 'italic' }}>promise.</em>
            </h1>
            <p
              style={{
                fontSize: '0.92rem',
                fontWeight: 300,
                color: 'var(--color-stone-dark)',
                lineHeight: 1.6,
                marginBottom: '2.4rem',
                maxWidth: '52ch',
              }}
            >
              A few commitments that protect buyers and keep the Signo wall one
              worth trusting. Read them, agree, and we&apos;ll move on.
            </p>

            <ol
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 2rem',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              {COMMITMENTS.map((text, i) => (
                <li
                  key={i}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    display: 'grid',
                    gridTemplateColumns: '3rem 1fr',
                    gap: '1rem',
                    alignItems: 'baseline',
                    padding: '1.1rem 0',
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
                  <p
                    className="font-serif"
                    style={{
                      fontSize: '1rem',
                      color: 'var(--color-ink)',
                      lineHeight: 1.55,
                      margin: 0,
                    }}
                  >
                    {text}
                  </p>
                </li>
              ))}
            </ol>

            {/* Agreement */}
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.9rem',
                padding: '1.2rem 0',
                borderTop: '1px solid var(--color-ink)',
                borderBottom: '1px solid var(--color-ink)',
                cursor: 'pointer',
                marginBottom: '2rem',
              }}
            >
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                style={{ marginTop: '0.3rem', accentColor: 'var(--color-ink)' }}
              />
              <span
                className="font-serif"
                style={{
                  fontSize: '0.95rem',
                  color: 'var(--color-ink)',
                  lineHeight: 1.55,
                }}
              >
                I agree to Signo&apos;s{' '}
                <Link
                  href="/terms"
                  style={{
                    color: 'var(--color-ink)',
                    textDecoration: 'underline',
                  }}
                >
                  artist terms
                </Link>{' '}
                and to the shipping standards above.
              </span>
            </label>

            {/* Pricing note */}
            <section
              style={{
                padding: '1.4rem 0',
                borderTop: '1px solid var(--color-border)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <p style={{ ...KICKER, marginBottom: '0.6rem' }}>— The cost —</p>
              <p
                className="font-serif"
                style={{
                  fontSize: '1rem',
                  fontStyle: 'italic',
                  color: 'var(--color-ink)',
                  lineHeight: 1.55,
                  marginBottom: '0.5rem',
                }}
              >
                Free until your first sale, then $30 a month.
              </p>
              <p
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 300,
                  color: 'var(--color-stone-dark)',
                  lineHeight: 1.65,
                }}
              >
                Zero commission, always. You keep one hundred percent of every
                sale. No payment is required to start, and we&apos;ll let you
                know before billing begins.
              </p>
            </section>
          </div>
        )}

        {/* ───── STEP 3: First Artwork ───── */}
        {step === 3 && (
          <div>
            <p style={{ ...KICKER, marginBottom: '1rem' }}>— First work —</p>
            <h1
              className="font-serif"
              style={{
                fontSize: 'clamp(1.8rem, 3.4vw, 2.4rem)',
                lineHeight: 1.1,
                color: 'var(--color-ink)',
                fontWeight: 400,
                marginBottom: '0.7rem',
              }}
            >
              Place a work <em style={{ fontStyle: 'italic' }}>on the wall.</em>
            </h1>
            <p
              style={{
                fontSize: '0.92rem',
                fontWeight: 300,
                color: 'var(--color-stone-dark)',
                lineHeight: 1.6,
                marginBottom: '2.4rem',
                maxWidth: '52ch',
              }}
            >
              A photograph, a title, a price. You can always add more detail
              later — or skip this step entirely.
            </p>

            <div style={{ marginBottom: '1.8rem' }}>
              <FieldLabel required>Photographs</FieldLabel>
              <ImageUpload
                maxFiles={4}
                maxSizeMB={15}
                initialImages={artworkImages}
                onImagesChange={setArtworkImages}
                uploadFile={handleImageUpload}
              />
            </div>

            <div style={{ marginBottom: '1.8rem' }}>
              <FieldLabel required>Title</FieldLabel>
              <input
                id="artTitle"
                type="text"
                value={artworkTitle}
                onChange={(e) => setArtworkTitle(e.target.value)}
                className="commission-field"
                placeholder="Give your work a title"
              />
            </div>

            <div style={{ marginBottom: '1.8rem' }}>
              <FieldLabel aside={`${artworkDescription.length}/1000`}>Description</FieldLabel>
              <textarea
                id="artDesc"
                value={artworkDescription}
                onChange={(e) => setArtworkDescription(e.target.value.slice(0, 1000))}
                rows={4}
                className="commission-field"
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Tell the story behind this piece…"
              />
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
                  id="artMedium"
                  value={artworkMedium}
                  onChange={(e) => setArtworkMedium(e.target.value)}
                  className="commission-field"
                >
                  <option value="">Select…</option>
                  {MEDIUMS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Style</FieldLabel>
                <select
                  id="artStyle"
                  value={artworkStyle}
                  onChange={(e) => setArtworkStyle(e.target.value)}
                  className="commission-field"
                >
                  <option value="">Select…</option>
                  {STYLES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1.8rem' }}>
              <FieldLabel>Type</FieldLabel>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                {(['original', 'print', 'digital'] as const).map((cat) => {
                  const selected = artworkCategory === cat;
                  const label =
                    cat === 'original' ? 'Original' : cat === 'print' ? 'Print' : 'Digital';
                  return (
                    <li
                      key={cat}
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                    >
                      <button
                        type="button"
                        onClick={() => setArtworkCategory(cat)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          padding: '0.9rem 0',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          className="font-serif"
                          style={{
                            fontSize: '1rem',
                            color: 'var(--color-ink)',
                            fontStyle: selected ? 'italic' : 'normal',
                          }}
                        >
                          {label}
                        </span>
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))',
                gap: '1.4rem',
                marginBottom: '1.8rem',
              }}
            >
              <div>
                <FieldLabel>Width (cm)</FieldLabel>
                <input
                  id="artWidth"
                  type="number"
                  value={artworkWidth}
                  onChange={(e) => setArtworkWidth(e.target.value)}
                  className="commission-field"
                  placeholder="e.g. 60"
                  min="1"
                />
              </div>
              <div>
                <FieldLabel>Height (cm)</FieldLabel>
                <input
                  id="artHeight"
                  type="number"
                  value={artworkHeight}
                  onChange={(e) => setArtworkHeight(e.target.value)}
                  className="commission-field"
                  placeholder="e.g. 80"
                  min="1"
                />
              </div>
            </div>

            <div>
              <FieldLabel required>Price (AUD)</FieldLabel>
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
                  id="artPrice"
                  type="number"
                  value={artworkPrice}
                  onChange={(e) => setArtworkPrice(e.target.value)}
                  className="commission-field"
                  style={{ paddingLeft: '1.4rem' }}
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                />
              </div>
              {priceCalc && (
                <dl
                  style={{
                    margin: '1rem 0 0',
                    padding: '1rem 0 0',
                    borderTop: '1px solid var(--color-border)',
                  }}
                >
                  {[
                    { term: 'Sale price', val: formatPrice(parseFloat(artworkPrice)) },
                    { term: 'Stripe fee', val: `− ${formatPrice(priceCalc.stripeFee)}` },
                    { term: 'You receive', val: formatPrice(priceCalc.artistPayout) },
                  ].map((row, i, arr) => (
                    <div
                      key={row.term}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        padding: '0.5rem 0',
                        borderBottom:
                          i === arr.length - 1
                            ? 'none'
                            : '1px solid var(--color-border)',
                      }}
                    >
                      <dt style={KICKER}>{row.term}</dt>
                      <dd
                        className="font-serif"
                        style={{
                          margin: 0,
                          fontSize: i === arr.length - 1 ? '1.1rem' : '0.9rem',
                          color: 'var(--color-ink)',
                        }}
                      >
                        {row.val}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        )}

        {/* ───── STEP 4: Payments ───── */}
        {step === 4 && (
          <div>
            <p style={{ ...KICKER, marginBottom: '1rem' }}>— Payments —</p>
            <h1
              className="font-serif"
              style={{
                fontSize: 'clamp(1.8rem, 3.4vw, 2.4rem)',
                lineHeight: 1.1,
                color: 'var(--color-ink)',
                fontWeight: 400,
                marginBottom: '0.7rem',
              }}
            >
              Connect your <em style={{ fontStyle: 'italic' }}>bank.</em>
            </h1>
            <p
              style={{
                fontSize: '0.92rem',
                fontWeight: 300,
                color: 'var(--color-stone-dark)',
                lineHeight: 1.6,
                marginBottom: '2.4rem',
                maxWidth: '52ch',
              }}
            >
              Stripe handles the plumbing. When a work sells and the inspection
              window closes, the funds land in your account directly.
            </p>

            <section
              style={{
                marginBottom: '2rem',
                padding: '1.6rem 0',
                borderTop: '1px solid var(--color-border-strong)',
                borderBottom: '1px solid var(--color-border-strong)',
              }}
            >
              <p style={{ ...KICKER, marginBottom: '1rem' }}>— What you get —</p>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                }}
              >
                {[
                  'You keep every cent of every sale.',
                  'Only Stripe&apos;s processing fee applies (~1.75% + 30¢).',
                  'Direct deposits straight to your bank account.',
                  'Daily payouts, once you&apos;re connected.',
                ].map((text, i) => (
                  <li
                    key={i}
                    className="font-serif"
                    style={{
                      fontSize: '0.95rem',
                      color: 'var(--color-ink)',
                      lineHeight: 1.55,
                      padding: '0.5rem 0',
                      display: 'flex',
                      gap: '0.7rem',
                    }}
                  >
                    <span
                      style={{
                        fontStyle: 'italic',
                        color: 'var(--color-stone)',
                      }}
                    >
                      —
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: text }} />
                  </li>
                ))}
              </ul>
            </section>

            {stripeConnected ? (
              <div
                style={{
                  padding: '1.2rem 0',
                  borderTop: '1px solid var(--color-ink)',
                  borderBottom: '1px solid var(--color-ink)',
                  marginBottom: '2rem',
                }}
              >
                <p style={{ ...KICKER, marginBottom: '0.4rem' }}>— Connected —</p>
                <p
                  className="font-serif"
                  style={{
                    fontSize: '0.95rem',
                    fontStyle: 'italic',
                    color: 'var(--color-ink)',
                  }}
                >
                  ✓ Stripe is connected and ready to receive payments.
                </p>
              </div>
            ) : (
              <div style={{ marginBottom: '1.6rem' }}>
                <button
                  type="button"
                  onClick={handleConnectStripe}
                  disabled={stripeLoading}
                  className="artwork-primary-cta"
                >
                  {stripeLoading ? 'Connecting…' : 'Connect with Stripe →'}
                </button>
              </div>
            )}

            <p
              className="font-serif"
              style={{
                fontSize: '0.85rem',
                fontStyle: 'italic',
                color: 'var(--color-stone)',
                marginBottom: '1.6rem',
              }}
            >
              You can always connect Stripe later from your{' '}
              <Link
                href="/artist/settings/payouts"
                style={{ color: 'var(--color-ink)', textDecoration: 'underline' }}
              >
                payout settings
              </Link>
              .
            </p>

            {error && (
              <div
                style={{
                  padding: '1.2rem 0',
                  borderTop: '1px solid var(--color-terracotta, #c45d3e)',
                  borderBottom: '1px solid var(--color-terracotta, #c45d3e)',
                  marginBottom: '1.6rem',
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
          </div>
        )}

        {/* ───── STEP 5: Done ───── */}
        {step === 5 && (
          <div>
            <p style={{ ...KICKER, marginBottom: '1rem' }}>— All set —</p>
            <h1
              className="font-serif"
              style={{
                fontSize: 'clamp(2.2rem, 4.4vw, 3.2rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                color: 'var(--color-ink)',
                fontWeight: 400,
                marginBottom: '1rem',
              }}
            >
              Your studio is <em style={{ fontStyle: 'italic' }}>live.</em>
            </h1>
            {artworkImages.length > 0 ? (
              <p
                style={{
                  fontSize: '1rem',
                  fontWeight: 300,
                  color: 'var(--color-stone-dark)',
                  lineHeight: 1.65,
                  maxWidth: '52ch',
                  marginBottom: '2.6rem',
                }}
              >
                Your first work is with the editors now. We read every submission
                within a day or two, and you&apos;ll hear from us the moment it
                goes live on the wall.
              </p>
            ) : (
              <p
                style={{
                  fontSize: '1rem',
                  fontWeight: 300,
                  color: 'var(--color-stone-dark)',
                  lineHeight: 1.65,
                  maxWidth: '52ch',
                  marginBottom: '2.6rem',
                }}
              >
                Your profile is ready. Upload a work whenever you&apos;re ready.
              </p>
            )}

            {/* Profile preview */}
            <section
              style={{
                marginBottom: '2.6rem',
                padding: '1.8rem 0',
                borderTop: '1px solid var(--color-border-strong)',
                borderBottom: '1px solid var(--color-border-strong)',
              }}
            >
              <p style={{ ...KICKER, marginBottom: '1rem' }}>— The wall —</p>
              <div
                style={{
                  display: 'flex',
                  gap: '1.2rem',
                  alignItems: 'center',
                  marginBottom: bio ? '1rem' : 0,
                }}
              >
                <Avatar avatarUrl={avatarUrl} name={fullName} size={64} />
                <div>
                  <p
                    className="font-serif"
                    style={{
                      fontSize: '1.2rem',
                      color: 'var(--color-ink)',
                      margin: 0,
                    }}
                  >
                    {fullName}
                  </p>
                  {location && (
                    <p
                      className="font-serif"
                      style={{
                        fontStyle: 'italic',
                        fontSize: '0.88rem',
                        color: 'var(--color-stone)',
                        margin: '0.2rem 0 0',
                      }}
                    >
                      {location}
                    </p>
                  )}
                </div>
              </div>
              {bio && (
                <p
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: 300,
                    color: 'var(--color-stone-dark)',
                    lineHeight: 1.65,
                    maxWidth: '58ch',
                  }}
                >
                  {bio}
                </p>
              )}
              {(instagram || tiktok || facebook || youtube || website) && (
                <p
                  className="font-serif"
                  style={{
                    marginTop: '1rem',
                    fontSize: '0.85rem',
                    fontStyle: 'italic',
                    color: 'var(--color-stone)',
                  }}
                >
                  {[
                    instagram && 'Instagram',
                    tiktok && 'TikTok',
                    facebook && 'Facebook',
                    youtube && 'YouTube',
                    website && 'Website',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </section>

            <div
              style={{
                display: 'flex',
                gap: '1.4rem',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Link href="/artist/dashboard" className="artwork-primary-cta">
                Go to the studio →
              </Link>
              {artworkImages.length === 0 && (
                <Link
                  href="/artist/artworks/new"
                  className="font-serif"
                  style={{
                    fontStyle: 'italic',
                    fontSize: '0.95rem',
                    color: 'var(--color-stone)',
                    textDecoration: 'none',
                  }}
                >
                  — Upload your first work
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ───── Navigation (1–4) ───── */}
        {step >= 1 && step <= 4 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              marginTop: 'clamp(2.4rem, 4vw, 3.4rem)',
              paddingTop: '1.6rem',
              borderTop: '1px solid var(--color-border-strong)',
            }}
          >
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.4rem' }}>
              {step === 3 && (
                <button
                  type="button"
                  onClick={() => setStep(4)}
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
                  Skip for now
                </button>
              )}

              {step === 4 ? (
                <button
                  type="button"
                  onClick={() => saveAndComplete(artworkImages.length === 0)}
                  disabled={saving}
                  className="artwork-primary-cta"
                >
                  {saving ? 'Saving…' : 'Complete setup ✓'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={
                    (step === 1 && !canProceedStep1) ||
                    (step === 2 && !canProceedStep2) ||
                    (step === 3 && !canProceedStep3)
                  }
                  className="artwork-primary-cta"
                >
                  Continue →
                </button>
              )}
            </div>
          </div>
        )}

        {error && step !== 4 && (
          <div
            style={{
              marginTop: '1.4rem',
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
      </div>
    </div>
  );
}
