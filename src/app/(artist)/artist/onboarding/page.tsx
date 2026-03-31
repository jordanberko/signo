'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
import { useAuth } from '@/components/providers/AuthProvider';
import AvatarUpload from '@/components/AvatarUpload';
import { uploadAvatar } from '@/lib/supabase/storage';

const TOTAL_STEPS = 5;

const COMMITMENTS = [
  {
    icon: Package,
    text: 'I will ship all physical items with tracked shipping',
  },
  {
    icon: Clock,
    text: 'I will ship within 5 business days of a sale',
  },
  {
    icon: Camera,
    text: 'I will photograph packaging before shipping',
  },
  {
    icon: ShieldCheck,
    text: 'For orders over $500, I will use insured shipping with signature on delivery',
  },
  {
    icon: Palette,
    text: 'All work I upload is my own original creation',
  },
];

export default function ArtistOnboardingPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — Profile
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url ?? null);

  // Step 2 — Socials
  const [instagram, setInstagram] = useState(user?.social_links?.instagram ?? '');
  const [website, setWebsite] = useState(user?.social_links?.website ?? '');
  const [otherLink, setOtherLink] = useState(user?.social_links?.other ?? '');

  // Step 3 — Terms
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const canProceedStep1 = fullName.trim().length > 0 && bio.trim().length >= 10;
  const canProceedStep3 = agreedToTerms;

  const handleAvatarUpload = useCallback(
    async (file: File, onProgress: (p: number) => void) => {
      if (!user) throw new Error('Not authenticated');
      return uploadAvatar(file, user.id, onProgress);
    },
    [user]
  );

  async function saveProfile() {
    if (!user) {
      setError('You appear to be signed out. Please refresh the page and sign in again.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const socialLinks: Record<string, string> = {};
      if (instagram.trim()) socialLinks.instagram = instagram.trim();
      if (website.trim()) socialLinks.website = website.trim();
      if (otherLink.trim()) socialLinks.other = otherLink.trim();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      let res: Response;
      try {
        res = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName.trim(),
            bio: bio.trim(),
            location: location.trim() || null,
            avatar_url: avatarUrl,
            social_links: socialLinks,
            onboarding_completed: true,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!res.ok) {
        let message = 'Failed to save profile';
        try {
          const body = await res.json();
          if (body.error) message = body.error;
        } catch {
          // response wasn't JSON — use default message
        }
        setError(message);
        return;
      }

      // The API may return a warning if onboarding_completed column is missing
      // but the rest of the profile was saved successfully — still proceed.
      const responseBody = await res.json().catch(() => ({}));
      if (responseBody.warning) {
        console.warn('[Onboarding]', responseBody.warning);
      }

      await refreshUser();
      setStep(5);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Save timed out — please check your connection and try again.');
      } else {
        const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  function nextStep() {
    if (step === 4) {
      saveProfile();
    } else {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    }
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 1));
  }

  return (
    <div className="min-h-[85vh] flex flex-col items-center px-4 py-10">
      {/* Progress bar */}
      <div className="w-full max-w-lg mb-10">
        <div className="flex items-center justify-between mb-3">
          {[1, 2, 3, 4, 5].map((s) => (
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
              {s < 5 && (
                <div
                  className={`hidden sm:block w-16 md:w-24 h-0.5 mx-2 transition-colors duration-300 ${
                    s < step ? 'bg-accent' : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-muted tracking-wide uppercase">
          <span>Profile</span>
          <span>Socials</span>
          <span>Standards</span>
          <span>Subscription</span>
          <span>Done</span>
        </div>
      </div>

      {/* Step content */}
      <div className="w-full max-w-lg animate-fade-in">
        {/* ────────────── STEP 1: Profile ────────────── */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="font-editorial text-2xl md:text-3xl font-medium">
                Set up your artist profile
              </h1>
              <p className="text-sm text-muted mt-2">
                Tell buyers a little about yourself and your work.
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
                Full Name <span className="text-error">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors"
                placeholder="Your name as it appears to buyers"
                autoComplete="name"
              />
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                Artist Bio <span className="text-error">*</span>
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 500))}
                rows={4}
                className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors resize-none"
                placeholder="Share your artistic journey, inspirations, and what makes your work unique..."
              />
              <div className="flex justify-between mt-1.5">
                <p className="text-xs text-muted">
                  {bio.length < 10 ? 'Minimum 10 characters' : ''}
                </p>
                <p className={`text-xs ${bio.length >= 480 ? 'text-error' : 'text-warm-gray'}`}>
                  {bio.length}/500
                </p>
              </div>
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
                  className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors"
                  placeholder="Melbourne, VIC"
                />
              </div>
            </div>
          </div>
        )}

        {/* ────────────── STEP 2: Socials ────────────── */}
        {step === 2 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="font-editorial text-2xl md:text-3xl font-medium">
                Connect your socials
              </h1>
              <p className="text-sm text-muted mt-2">
                Help buyers find you across the web. All fields are optional.
              </p>
            </div>

            {/* Instagram */}
            <div>
              <label htmlFor="instagram" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                Instagram
              </label>
              <div className="relative">
                <InstagramIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
                <input
                  id="instagram"
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors"
                  placeholder="@yourusername"
                />
              </div>
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                Website
              </label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
                <input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>

            {/* Other Link */}
            <div>
              <label htmlFor="otherLink" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                Other Link
              </label>
              <div className="relative">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
                <input
                  id="otherLink"
                  type="url"
                  value={otherLink}
                  onChange={(e) => setOtherLink(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors"
                  placeholder="Behance, DeviantArt, etc."
                />
              </div>
            </div>
          </div>
        )}

        {/* ────────────── STEP 3: Standards ────────────── */}
        {step === 3 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="font-editorial text-2xl md:text-3xl font-medium">
                Our selling standards
              </h1>
              <p className="text-sm text-muted mt-2">
                These commitments protect buyers and build trust in the Signo community.
              </p>
            </div>

            {/* Commitment cards */}
            <div className="space-y-3">
              {COMMITMENTS.map((c, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 bg-white border border-border rounded-xl"
                >
                  <div className="w-9 h-9 bg-accent-subtle rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <c.icon className="h-4 w-4 text-accent" />
                  </div>
                  <p className="text-sm leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>

            {/* Agreement checkbox */}
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
                <Link href="/about" className="text-accent link-underline">
                  artist terms
                </Link>{' '}
                and shipping standards outlined above.
              </span>
            </label>

            {error && (
              <div className="p-3.5 bg-error/5 border border-error/20 text-error text-sm rounded-xl animate-fade-in">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ────────────── STEP 4: Subscription ────────────── */}
        {step === 4 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="font-editorial text-2xl md:text-3xl font-medium">
                Your subscription
              </h1>
              <p className="text-sm text-muted mt-2">
                Signo uses a simple flat-rate subscription — no commission on sales.
              </p>
            </div>

            <div className="bg-white border-2 border-accent rounded-2xl p-6 space-y-5">
              <div className="text-center">
                <p className="font-editorial text-3xl font-semibold text-accent">$30<span className="text-lg text-muted font-normal">/month</span></p>
                <p className="text-sm text-muted mt-1">Zero commission on every sale</p>
              </div>
              <div className="h-px bg-border" />
              <div className="space-y-3">
                {[
                  { icon: Store, text: 'Your own artist storefront' },
                  { icon: CreditCard, text: 'Unlimited listings — no per-item fees' },
                  { icon: Check, text: '0% commission — keep 100% of your sales' },
                  { icon: ShieldCheck, text: 'Escrow protection & buyer guarantee' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent-subtle rounded-full flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-4 w-4 text-accent" />
                    </div>
                    <p className="text-sm">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="h-px bg-border" />
              <p className="text-xs text-muted text-center">
                Stripe processing fees (~1.75% + 30c per transaction) are the only deduction from your sales.
              </p>
            </div>

            <div className="p-4 bg-accent-subtle/50 border border-accent/10 rounded-xl">
              <p className="text-sm text-muted text-center">
                <span className="font-medium text-foreground">Early access:</span>{' '}
                Subscription billing will be activated soon. Early artists get free access during our launch period.
              </p>
            </div>

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
                <Sparkles className="h-9 w-9 text-accent" />
              </div>
            </div>

            <div>
              <h1 className="font-editorial text-2xl md:text-3xl font-medium">
                You&apos;re all set!
              </h1>
              <p className="text-sm text-muted mt-2 max-w-sm mx-auto">
                Your artist profile is ready. Here&apos;s a preview of how it looks to buyers.
              </p>
            </div>

            {/* Profile preview card */}
            <div className="bg-white border border-border rounded-2xl p-6 text-left max-w-sm mx-auto">
              <div className="flex items-center gap-4 mb-4">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={fullName}
                    width={56}
                    height={56}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-accent-subtle flex items-center justify-center">
                    <span className="font-editorial text-lg font-medium text-accent">
                      {fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </span>
                  </div>
                )}
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
              {(instagram || website) && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                  {instagram && (
                    <span className="text-xs text-muted flex items-center gap-1">
                      <InstagramIcon className="h-3 w-3" /> {instagram}
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
                href="/artist/artworks/new"
                className="w-full py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-accent transition-colors duration-300 flex items-center justify-center gap-2"
              >
                Upload your first artwork
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/artist/dashboard"
                className="w-full py-3 text-muted font-medium text-sm hover:text-foreground transition-colors text-center"
              >
                Go to dashboard
              </Link>
            </div>
          </div>
        )}

        {/* ────────────── Navigation buttons ────────────── */}
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
              <div />
            )}

            <div className="flex items-center gap-3">
              {step === 2 && (
                <button
                  type="button"
                  onClick={nextStep}
                  className="text-sm text-muted hover:text-foreground transition-colors"
                >
                  Skip for now
                </button>
              )}
              <button
                type="button"
                onClick={nextStep}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 3 && !canProceedStep3) ||
                  saving
                }

                className="px-8 py-3 bg-primary text-white font-semibold rounded-full hover:bg-accent transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : step === 4 ? (
                  <>
                    Complete Setup
                    <Check className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
