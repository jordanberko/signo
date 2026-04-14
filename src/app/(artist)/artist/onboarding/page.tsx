'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  MapPin,
  Globe,
  Link2,
  Sparkles,
  Package,
  Clock,
  Camera,
  ShieldCheck,
  Palette,
  Loader2,
  CreditCard,
  Store,
  MessageCircle,
  BarChart3,
  Search,
  Shield,
  Upload,
  Zap,
  X,
} from 'lucide-react';

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import AvatarUpload from '@/components/AvatarUpload';
import Avatar from '@/components/ui/Avatar';
import ImageUpload from '@/components/ImageUpload';
import { uploadAvatar, uploadArtworkImage } from '@/lib/supabase/storage';
import { formatPrice, calculateCommission } from '@/lib/utils';

// ── Constants ──

const TOTAL_STEPS = 6; // Welcome (0) + 4 steps + Done (5)
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
  { icon: Package, text: 'I will ship all physical items with tracked shipping' },
  { icon: Clock, text: 'I will ship within 7 days of a sale' },
  { icon: Camera, text: 'I will photograph packaging before shipping' },
  { icon: ShieldCheck, text: 'For orders over $500, I will use insured shipping with signature on delivery' },
  { icon: Palette, text: 'All work I upload is my own original creation' },
];

// ── Draft persistence helpers ──

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
  // Artwork fields
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

// ── Component ──

export default function ArtistOnboardingPage() {
  const { loading: authLoading } = useRequireAuth();
  const { user, refreshUser } = useAuth();
  const isBuyerUpgrade = user?.role === 'buyer';

  // If user already completed onboarding, redirect to dashboard
  useEffect(() => {
    if (user && user.role === 'artist' && user.onboarding_completed) {
      window.location.href = '/artist/dashboard';
    }
  }, [user]);

  // Load draft from localStorage
  const draft = useMemo(() => loadDraft(), []);

  const [step, setStep] = useState(0); // 0 = welcome
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — Profile & Art
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

  // Step 2 — Standards
  const [agreedToTerms, setAgreedToTerms] = useState(draft.agreedToTerms ?? false);

  // Step 3 — First Artwork
  const [artworkId] = useState(draft.artworkId ?? crypto.randomUUID());
  const [artworkImages, setArtworkImages] = useState<string[]>(draft.artworkImages ?? []);
  const [artworkTitle, setArtworkTitle] = useState(draft.artworkTitle ?? '');
  const [artworkDescription, setArtworkDescription] = useState(draft.artworkDescription ?? '');
  const [artworkMedium, setArtworkMedium] = useState(draft.artworkMedium ?? '');
  const [artworkStyle, setArtworkStyle] = useState(draft.artworkStyle ?? '');
  const [artworkCategory, setArtworkCategory] = useState<'original' | 'print' | 'digital'>(draft.artworkCategory ?? 'original');
  const [artworkWidth, setArtworkWidth] = useState(draft.artworkWidth ?? '');
  const [artworkHeight, setArtworkHeight] = useState(draft.artworkHeight ?? '');
  const [artworkPrice, setArtworkPrice] = useState(draft.artworkPrice ?? '');

  // Step 4 — Stripe Connect
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);

  // Sync user data into form when user loads (only if no draft)
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

  // Pre-fill artwork medium from primary medium selection
  useEffect(() => {
    if (primaryMedium && !artworkMedium) {
      setArtworkMedium(primaryMedium);
    }
  }, [primaryMedium, artworkMedium]);

  // Auto-save draft on changes
  useEffect(() => {
    saveDraft({
      fullName, bio, location, avatarUrl, primaryMedium, selectedStyles,
      instagram, tiktok, facebook, youtube, website, agreedToTerms, artworkId, artworkImages,
      artworkTitle, artworkDescription, artworkMedium, artworkStyle,
      artworkCategory, artworkWidth, artworkHeight, artworkPrice,
    });
  }, [
    fullName, bio, location, avatarUrl, primaryMedium, selectedStyles,
    instagram, tiktok, facebook, youtube, website, agreedToTerms, artworkId, artworkImages,
    artworkTitle, artworkDescription, artworkMedium, artworkStyle,
    artworkCategory, artworkWidth, artworkHeight, artworkPrice,
  ]);

  // Check Stripe status on mount
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

  // Validation
  const canProceedStep1 = fullName.trim().length > 0 && bio.trim().length >= 10;
  const canProceedStep2 = agreedToTerms;
  const canProceedStep3 = artworkImages.length > 0 && artworkTitle.trim().length > 0 && artworkMedium.length > 0 && parseFloat(artworkPrice) >= 1;

  // Upload handlers
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

  // Toggle a style in the multi-select
  function toggleStyle(style: string) {
    setSelectedStyles((prev) =>
      prev.includes(style)
        ? prev.filter((s) => s !== style)
        : prev.length < 5 ? [...prev, style] : prev,
    );
  }

  // Save profile + artwork + complete onboarding
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

      // 1. Save profile
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

      // 2. Submit artwork (unless skipped)
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
          // Don't block onboarding completion if artwork fails
        }
      }

      clearTimeout(timeoutId);

      // 3. Refresh user context
      try {
        await Promise.race([
          refreshUser(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]);
      } catch {
        // Profile was saved — proceed even if refresh fails
      }

      clearDraft();
      setStep(5); // Done screen
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

  // Stripe Connect
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

  // Navigation
  function nextStep() {
    setError('');
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function prevStep() {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
  }

  // Price calculation for artwork
  const priceCalc = useMemo(() => {
    const price = parseFloat(artworkPrice);
    if (!price || price < 1) return null;
    return calculateCommission(price);
  }, [artworkPrice]);

  // ── Render ──

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #E5E2DB', borderTopColor: '#2C2C2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style>
      </div>
    );
  }

  const STEP_LABELS = ['Welcome', 'Profile', 'Standards', 'Artwork', 'Payments', 'Done'];

  return (
    <div className="min-h-[85vh] flex flex-col items-center px-4 py-10">
      {/* Skip link (header) */}
      {step > 0 && step < 5 && (
        <div className="w-full max-w-lg flex justify-end mb-4">
          <Link
            href="/artist/dashboard"
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            Skip for now →
          </Link>
        </div>
      )}

      {/* Progress bar — visible on steps 1-4 */}
      {step >= 1 && step <= 4 && (
        <div className="w-full max-w-lg mb-10">
          <div className="flex items-center justify-between mb-3">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    s < step
                      ? 'bg-accent text-white'
                      : s === step
                      ? 'bg-primary text-white'
                      : 'bg-muted-bg text-muted'
                  }`}
                >
                  {s < step ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={`hidden sm:block w-20 md:w-28 h-0.5 mx-2 transition-colors duration-300 ${
                      s < step ? 'bg-accent' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-muted tracking-wide uppercase px-1">
            <span>Profile</span>
            <span>Standards</span>
            <span>Artwork</span>
            <span>Payments</span>
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="w-full max-w-lg animate-fade-in">

        {/* ────────────── STEP 0: Welcome ────────────── */}
        {step === 0 && (
          <div className="space-y-8 text-center">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-accent-subtle rounded-full flex items-center justify-center">
                <Palette className="h-9 w-9 text-accent-dark" />
              </div>
            </div>

            <div>
              <h1 className="font-editorial text-3xl md:text-4xl font-semibold">
                Welcome to Signo
              </h1>
              <p className="text-muted mt-3 max-w-sm mx-auto leading-relaxed">
                Let&apos;s get your artist profile set up and your first artwork listed. This takes about 5 minutes.
              </p>
            </div>

            <div className="space-y-3 text-left max-w-xs mx-auto">
              {[
                { icon: Palette, label: 'Set up your artist profile' },
                { icon: ShieldCheck, label: 'Agree to our quality standards' },
                { icon: Upload, label: 'List your first artwork' },
                { icon: CreditCard, label: 'Connect payments (optional)' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-accent-subtle rounded-full flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-4 w-4 text-accent-dark" />
                  </div>
                  <p className="text-sm">{item.label}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={nextStep}
              className="px-10 py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-accent transition-colors duration-300 inline-flex items-center gap-2"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ────────────── STEP 1: Profile & Art ────────────── */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="font-editorial text-2xl md:text-3xl font-semibold">
                Set up your profile
              </h1>
              <p className="text-sm text-muted mt-2">
                Tell buyers about yourself and your art.
              </p>
            </div>

            {/* Avatar */}
            <div className="flex justify-center">
              <AvatarUpload
                currentUrl={avatarUrl}
                userName={fullName}
                size={110}
                onAvatarChange={setAvatarUrl}
                uploadFile={handleAvatarUpload}
              />
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                Display Name <span className="text-error">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                placeholder="Your name as it appears to buyers"
                autoComplete="name"
              />
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                  placeholder="Melbourne, VIC"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                Short Bio <span className="text-error">*</span>
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 200))}
                rows={3}
                className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors resize-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                placeholder="Share your artistic journey and what inspires your work..."
              />
              <div className="flex justify-between mt-1.5">
                <p className="text-xs text-muted">
                  {bio.length < 10 ? 'Minimum 10 characters' : ''}
                </p>
                <p className={`text-xs ${bio.length >= 180 ? 'text-error' : 'text-warm-gray'}`}>
                  {bio.length}/200
                </p>
              </div>
            </div>

            {/* Primary Medium */}
            <div>
              <label htmlFor="primaryMedium" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                Primary Medium
              </label>
              <select
                id="primaryMedium"
                value={primaryMedium}
                onChange={(e) => setPrimaryMedium(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20 appearance-none"
              >
                <option value="">Select your primary medium...</option>
                {MEDIUMS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Styles */}
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                Styles you work in <span className="text-warm-gray">(select up to 5)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStyle(s)}
                    className={`px-3.5 py-1.5 rounded-full text-sm transition-all ${
                      selectedStyles.includes(s)
                        ? 'bg-accent text-white font-medium'
                        : 'bg-white border border-border text-foreground hover:border-accent/40'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Social links */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-medium tracking-wide uppercase text-muted">
                Social Links <span className="text-warm-gray">(optional)</span>
              </p>
              <div className="relative">
                <InstagramIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                  placeholder="Instagram @handle or URL"
                />
              </div>
              <div className="relative">
                <TikTokIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
                <input
                  type="text"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                  placeholder="TikTok @handle or URL"
                />
              </div>
              <div className="relative">
                <FacebookIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                  placeholder="Facebook page URL"
                />
              </div>
              <div className="relative">
                <YouTubeIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
                <input
                  type="text"
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                  placeholder="YouTube channel URL"
                />
              </div>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </div>
        )}

        {/* ────────────── STEP 2: Standards ────────────── */}
        {step === 2 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="font-editorial text-2xl md:text-3xl font-semibold">
                Our selling standards
              </h1>
              <p className="text-sm text-muted mt-2">
                These commitments protect buyers and build trust in the Signo community.
              </p>
            </div>

            <div className="space-y-3">
              {COMMITMENTS.map((c, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 bg-white border border-border rounded-xl"
                >
                  <div className="w-9 h-9 bg-accent-subtle rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <c.icon className="h-4 w-4 text-accent-dark" />
                  </div>
                  <p className="text-sm leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>

            <label className="flex items-start gap-3 cursor-pointer group p-4 bg-cream border border-border rounded-xl">
              <div className="relative flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 border-2 border-border rounded transition-colors peer-checked:border-accent peer-checked:bg-accent group-hover:border-warm-gray flex items-center justify-center">
                  {agreedToTerms && <Check className="h-3 w-3 text-white" />}
                </div>
              </div>
              <span className="text-sm leading-tight">
                I agree to Signo&apos;s{' '}
                <Link href="/terms" className="text-accent-dark underline">
                  artist terms
                </Link>{' '}
                and shipping standards outlined above.
              </span>
            </label>

            {/* Subscription info — collapsed into a single card */}
            <div className="p-5 bg-white border border-border rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-accent-subtle rounded-full flex items-center justify-center flex-shrink-0">
                  <CreditCard className="h-4 w-4 text-accent-dark" />
                </div>
                <div>
                  <p className="text-sm font-medium">Free until your first sale — then $30/month</p>
                  <p className="text-xs text-muted mt-0.5">0% commission. You keep 100% of every sale. No payment needed to get started.</p>
                </div>
              </div>
              <p className="text-xs text-warm-gray">
                We&apos;ll notify you before billing begins. No credit card required.
              </p>
            </div>
          </div>
        )}

        {/* ────────────── STEP 3: First Artwork ────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="font-editorial text-2xl md:text-3xl font-semibold">
                List your first artwork
              </h1>
              <p className="text-sm text-muted mt-2">
                Upload at least one photo and set your price. You can add more details later.
              </p>
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                Photos <span className="text-error">*</span>
              </label>
              <ImageUpload
                maxFiles={4}
                maxSizeMB={15}
                initialImages={artworkImages}
                onImagesChange={setArtworkImages}
                uploadFile={handleImageUpload}
              />
            </div>

            {/* Title */}
            <div>
              <label htmlFor="artTitle" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                Title <span className="text-error">*</span>
              </label>
              <input
                id="artTitle"
                type="text"
                value={artworkTitle}
                onChange={(e) => setArtworkTitle(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                placeholder="Give your artwork a title"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="artDesc" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                Description
              </label>
              <textarea
                id="artDesc"
                value={artworkDescription}
                onChange={(e) => setArtworkDescription(e.target.value.slice(0, 1000))}
                rows={3}
                className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors resize-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                placeholder="Tell the story behind this piece..."
              />
            </div>

            {/* Medium & Style — row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="artMedium" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                  Medium <span className="text-error">*</span>
                </label>
                <select
                  id="artMedium"
                  value={artworkMedium}
                  onChange={(e) => setArtworkMedium(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20 appearance-none"
                >
                  <option value="">Select...</option>
                  {MEDIUMS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="artStyle" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                  Style
                </label>
                <select
                  id="artStyle"
                  value={artworkStyle}
                  onChange={(e) => setArtworkStyle(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20 appearance-none"
                >
                  <option value="">Select...</option>
                  {STYLES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                Artwork Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['original', 'print', 'digital'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setArtworkCategory(cat)}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                      artworkCategory === cat
                        ? 'bg-accent text-white'
                        : 'bg-white border border-border text-foreground hover:border-accent/40'
                    }`}
                  >
                    {cat === 'original' ? 'Original' : cat === 'print' ? 'Print' : 'Digital'}
                  </button>
                ))}
              </div>
            </div>

            {/* Dimensions — row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="artWidth" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                  Width (cm)
                </label>
                <input
                  id="artWidth"
                  type="number"
                  value={artworkWidth}
                  onChange={(e) => setArtworkWidth(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                  placeholder="e.g. 60"
                  min="1"
                />
              </div>
              <div>
                <label htmlFor="artHeight" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                  Height (cm)
                </label>
                <input
                  id="artHeight"
                  type="number"
                  value={artworkHeight}
                  onChange={(e) => setArtworkHeight(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                  placeholder="e.g. 80"
                  min="1"
                />
              </div>
            </div>

            {/* Price */}
            <div>
              <label htmlFor="artPrice" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                Price (AUD) <span className="text-error">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
                <input
                  id="artPrice"
                  type="number"
                  value={artworkPrice}
                  onChange={(e) => setArtworkPrice(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                />
              </div>
              {priceCalc && (
                <div className="mt-2 p-3 bg-accent-subtle/50 rounded-lg text-xs text-muted space-y-0.5">
                  <div className="flex justify-between">
                    <span>Sale price</span>
                    <span>{formatPrice(parseFloat(artworkPrice))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stripe fee (~1.75% + 30c)</span>
                    <span>−{formatPrice(priceCalc.stripeFee)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-foreground pt-1 border-t border-border">
                    <span>You receive</span>
                    <span>{formatPrice(priceCalc.artistPayout)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ────────────── STEP 4: Connect Payments ────────────── */}
        {step === 4 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="font-editorial text-2xl md:text-3xl font-semibold">
                Connect payments
              </h1>
              <p className="text-sm text-muted mt-2">
                Connect Stripe to receive payouts when your artwork sells.
              </p>
            </div>

            <div className="bg-white border border-border rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent-subtle rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap className="h-6 w-6 text-accent-dark" />
                </div>
                <div>
                  <p className="font-medium">Stripe Connect</p>
                  <p className="text-xs text-muted mt-0.5">Secure payments powered by Stripe</p>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-2.5">
                {[
                  'You keep 100% of every sale',
                  'Only Stripe\'s processing fee (~1.75% + 30c)',
                  'Direct deposits to your bank account',
                  'Daily payouts once connected',
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-accent flex-shrink-0" />
                    <p className="text-sm">{text}</p>
                  </div>
                ))}
              </div>

              <div className="h-px bg-border" />

              {stripeConnected ? (
                <div className="flex items-center gap-3 p-3.5 bg-green-50 border border-green-200 rounded-xl">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-700 font-medium">Stripe is connected and ready to receive payments.</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectStripe}
                  disabled={stripeLoading}
                  className="w-full py-3.5 bg-[#635BFF] text-white font-semibold rounded-xl hover:bg-[#5851DB] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {stripeLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Connect with Stripe
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>

            <p className="text-xs text-center text-warm-gray">
              You can always connect Stripe later from your{' '}
              <Link href="/artist/settings/payouts" className="text-accent-dark underline">
                payout settings
              </Link>.
            </p>

            {error && (
              <div className="p-3.5 bg-error/5 border border-error/20 text-error text-sm rounded-xl animate-fade-in">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ────────────── STEP 5: Done ────────────── */}
        {step === 5 && (
          <div className="space-y-8 text-center">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-accent-subtle rounded-full flex items-center justify-center animate-scale-in">
                <Sparkles className="h-9 w-9 text-accent-dark" />
              </div>
            </div>

            <div>
              <h1 className="font-editorial text-2xl md:text-3xl font-semibold">
                You&apos;re all set!
              </h1>
              {artworkImages.length > 0 ? (
                <p className="text-sm text-muted mt-2 max-w-sm mx-auto">
                  Your artwork is under review. We&apos;ll notify you when it goes live — usually within 24-48 hours.
                </p>
              ) : (
                <p className="text-sm text-muted mt-2 max-w-sm mx-auto">
                  Your artist profile is ready. Upload your first artwork when you&apos;re ready.
                </p>
              )}
            </div>

            {/* Profile preview */}
            <div className="bg-white border border-border rounded-2xl p-6 text-left max-w-sm mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <Avatar
                  avatarUrl={avatarUrl}
                  name={fullName}
                  size={56}
                />
                <div>
                  <p className="font-medium">{fullName}</p>
                  {location && (
                    <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {location}
                    </p>
                  )}
                </div>
              </div>
              {bio && (
                <p className="text-sm text-muted leading-relaxed line-clamp-3">{bio}</p>
              )}
              {(instagram || tiktok || facebook || youtube || website) && (
                <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border">
                  {instagram && (
                    <span className="text-xs text-muted flex items-center gap-1">
                      <InstagramIcon className="h-3 w-3" /> Instagram
                    </span>
                  )}
                  {tiktok && (
                    <span className="text-xs text-muted flex items-center gap-1">
                      <TikTokIcon className="h-3 w-3" /> TikTok
                    </span>
                  )}
                  {facebook && (
                    <span className="text-xs text-muted flex items-center gap-1">
                      <FacebookIcon className="h-3 w-3" /> Facebook
                    </span>
                  )}
                  {youtube && (
                    <span className="text-xs text-muted flex items-center gap-1">
                      <YouTubeIcon className="h-3 w-3" /> YouTube
                    </span>
                  )}
                  {website && (
                    <span className="text-xs text-muted flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Website
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <Link
                href="/artist/dashboard"
                className="w-full py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-accent transition-colors duration-300 flex items-center justify-center gap-2"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              {artworkImages.length === 0 && (
                <Link
                  href="/artist/artworks/new"
                  className="w-full py-3 text-accent-dark font-medium text-sm hover:text-foreground transition-colors text-center"
                >
                  Upload your first artwork
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ────────────── Navigation buttons ────────────── */}
        {step >= 1 && step <= 4 && (
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
            <button
              type="button"
              onClick={prevStep}
              className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div className="flex items-center gap-3">
              {/* Skip artwork step */}
              {step === 3 && (
                <button
                  type="button"
                  onClick={() => {
                    setStep(4);
                  }}
                  className="text-sm text-muted hover:text-foreground transition-colors"
                >
                  Skip for now
                </button>
              )}

              {/* Step 4: Complete (save everything) */}
              {step === 4 ? (
                <button
                  type="button"
                  onClick={() => saveAndComplete(artworkImages.length === 0)}
                  disabled={saving}
                  className="px-8 py-3 bg-primary text-white font-semibold rounded-full hover:bg-accent transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <Check className="h-4 w-4" />
                    </>
                  )}
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
                  className="px-8 py-3 bg-primary text-white font-semibold rounded-full hover:bg-accent transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error display */}
        {error && step !== 4 && (
          <div className="mt-4 p-3.5 bg-error/5 border border-error/20 text-error text-sm rounded-xl animate-fade-in">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
