'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { createClient } from '@/lib/supabase/client';
import { uploadAvatar } from '@/lib/supabase/storage';
import AvatarUpload from '@/components/AvatarUpload';

// ── Types ──

type TabId =
  | 'profile'
  | 'address'
  | 'password'
  | 'notifications'
  | 'artist'
  | 'subscription'
  | 'danger';

interface Address {
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

// ── Shared editorial helpers ──

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: '0.62rem',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'var(--color-stone)',
        marginBottom: '1rem',
      }}
    >
      {children}
    </p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-serif"
      style={{
        fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
        lineHeight: 1.1,
        letterSpacing: '-0.01em',
        color: 'var(--color-ink)',
        fontWeight: 400,
        marginBottom: '0.7rem',
      }}
    >
      {children}
    </h2>
  );
}

function SectionIntro({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: '0.92rem',
        fontWeight: 300,
        color: 'var(--color-stone-dark)',
        lineHeight: 1.6,
        maxWidth: '56ch',
        marginBottom: '2.4rem',
      }}
    >
      {children}
    </p>
  );
}

function StatusLine({
  status,
}: {
  status: { type: 'success' | 'error'; message: string } | null;
}) {
  if (!status) return null;
  return (
    <p
      className="font-serif"
      style={{
        marginTop: '1.4rem',
        marginBottom: '0.4rem',
        fontSize: '0.88rem',
        fontStyle: 'italic',
        fontWeight: 400,
        color:
          status.type === 'success'
            ? 'var(--color-ink)'
            : 'var(--color-terracotta, #c45d3e)',
      }}
    >
      {status.type === 'success' ? '✓ ' : '— '}
      {status.message}
    </p>
  );
}

// ── Main ──

export default function SettingsPage() {
  const { loading: authLoading } = useRequireAuth();
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  // Profile state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Address state
  const userAny = user as Record<string, unknown> | null;
  const [address, setAddress] = useState<Address>({
    street: (userAny?.street_address as string) || '',
    city: (userAny?.city as string) || '',
    state: (userAny?.state as string) || '',
    postcode: (userAny?.postcode as string) || '',
    country: (userAny?.country as string) || 'Australia',
  });
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressStatus, setAddressStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Notification prefs
  const [emailPrefs] = useState({
    orderUpdates: true,
    newArtwork: true,
    marketing: false,
  });

  // Artist profile state
  const [artistBio, setArtistBio] = useState(user?.bio || '');
  const [artistLocation, setArtistLocation] = useState(user?.location || '');
  const [artistState, setArtistState] = useState(
    (userAny?.state as string) || ''
  );
  const [instagramUrl, setInstagramUrl] = useState(
    user?.social_links?.instagram || ''
  );
  const [tiktokUrl, setTiktokUrl] = useState(user?.social_links?.tiktok || '');
  const [facebookUrl, setFacebookUrl] = useState(
    user?.social_links?.facebook || ''
  );
  const [youtubeUrl, setYoutubeUrl] = useState(
    user?.social_links?.youtube || ''
  );
  const [websiteUrl, setWebsiteUrl] = useState(
    user?.social_links?.website || ''
  );
  const [acceptsCommissions, setAcceptsCommissions] = useState(
    user?.accepts_commissions ?? false
  );

  // Featured works state
  const [featuredArtworkIds, setFeaturedArtworkIds] = useState<string[]>(
    (user?.featured_artworks as string[]) || []
  );
  const [myArtworks, setMyArtworks] = useState<
    {
      id: string;
      title: string;
      price_aud: number;
      images: string[];
      status: string;
    }[]
  >([]);
  const [myArtworksLoaded, setMyArtworksLoaded] = useState(false);
  const [showArtworkPicker, setShowArtworkPicker] = useState(false);
  const [artworkSearch, setArtworkSearch] = useState('');

  const [artistSaving, setArtistSaving] = useState(false);
  const [artistStatus, setArtistStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Danger zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [artistStats, setArtistStats] = useState<{
    activeListings: number;
    pendingOrders: number;
  } | null>(null);
  const router = useRouter();

  const isArtist = user?.role === 'artist' || user?.role === 'admin';

  useEffect(() => {
    if (!isArtist || myArtworksLoaded) return;
    fetch('/api/artworks/mine')
      .then((res) => res.json())
      .then((data) => {
        if (data.artworks) setMyArtworks(data.artworks);
        setMyArtworksLoaded(true);
      })
      .catch(() => setMyArtworksLoaded(true));
  }, [isArtist, myArtworksLoaded]);

  const featuredArtworkObjects = featuredArtworkIds
    .map((id) => myArtworks.find((a) => a.id === id))
    .filter(Boolean) as typeof myArtworks;

  const availableArtworks = myArtworks
    .filter(
      (a) => a.status === 'approved' && !featuredArtworkIds.includes(a.id)
    )
    .filter(
      (a) =>
        !artworkSearch.trim() ||
        a.title.toLowerCase().includes(artworkSearch.toLowerCase())
    );

  useEffect(() => {
    if (!showDeleteConfirm || !isArtist) return;
    const supabase = createClient();
    Promise.all([
      supabase
        .from('artworks')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', user!.id)
        .in('status', ['approved', 'pending_review', 'draft']),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', user!.id)
        .in('status', ['pending_payment', 'paid', 'shipped']),
    ]).then(([artworksRes, ordersRes]) => {
      setArtistStats({
        activeListings: artworksRes.count ?? 0,
        pendingOrders: ordersRes.count ?? 0,
      });
    });
  }, [showDeleteConfirm, isArtist, user]);

  const handleAvatarUpload = useCallback(
    async (file: File, onProgress: (p: number) => void) => {
      if (!user) throw new Error('Not authenticated');
      return uploadAvatar(file, user.id, onProgress);
    },
    [user]
  );

  async function saveProfile() {
    if (!user) return;
    setProfileSaving(true);
    setProfileStatus(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          full_name: fullName.trim(),
          avatar_url: avatarUrl,
        }),
      });
      clearTimeout(timeout);

      const result = await res.json();
      if (!res.ok) {
        setProfileStatus({
          type: 'error',
          message: result.error || 'Failed to update profile.',
        });
      } else {
        await refreshUser();
        setProfileStatus({ type: 'success', message: 'Profile updated.' });
      }
    } catch (err) {
      setProfileStatus({
        type: 'error',
        message:
          (err as Error).name === 'AbortError'
            ? 'Request timed out. Please try again.'
            : 'Failed to update profile. Please try again.',
      });
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveAddress() {
    if (!user) return;
    setAddressSaving(true);
    setAddressStatus(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          street_address: address.street,
          city: address.city,
          state: address.state,
          postcode: address.postcode,
          country: address.country,
        }),
      });
      clearTimeout(timeout);

      const result = await res.json();
      if (!res.ok) {
        setAddressStatus({
          type: 'error',
          message: result.error || 'Failed to save address.',
        });
      } else {
        await refreshUser();
        setAddressStatus({
          type: 'success',
          message: 'Shipping address saved.',
        });
      }
    } catch (err) {
      setAddressStatus({
        type: 'error',
        message:
          (err as Error).name === 'AbortError'
            ? 'Request timed out. Please try again.'
            : 'Something went wrong. Please try again.',
      });
    } finally {
      setAddressSaving(false);
    }
  }

  async function changePassword() {
    setPasswordStatus(null);

    if (!currentPassword) {
      setPasswordStatus({
        type: 'error',
        message: 'Please enter your current password.',
      });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordStatus({
        type: 'error',
        message: 'Password must be at least 8 characters.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({
        type: 'error',
        message: 'Passwords do not match.',
      });
      return;
    }

    setPasswordSaving(true);

    try {
      const supabase = createClient();

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email ?? '',
        password: currentPassword,
      });

      if (verifyError) {
        setPasswordStatus({
          type: 'error',
          message: 'Current password is incorrect.',
        });
        setPasswordSaving(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStatus({
        type: 'success',
        message: 'Password updated successfully.',
      });
    } catch (err) {
      setPasswordStatus({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Failed to update password.',
      });
    } finally {
      setPasswordSaving(false);
    }
  }

  async function saveArtistProfile() {
    if (!user) return;
    setArtistSaving(true);
    setArtistStatus(null);

    try {
      const socialLinks = { ...(user.social_links || {}) };
      if (instagramUrl.trim()) socialLinks.instagram = instagramUrl.trim();
      else delete socialLinks.instagram;
      if (tiktokUrl.trim()) socialLinks.tiktok = tiktokUrl.trim();
      else delete socialLinks.tiktok;
      if (facebookUrl.trim()) socialLinks.facebook = facebookUrl.trim();
      else delete socialLinks.facebook;
      if (youtubeUrl.trim()) socialLinks.youtube = youtubeUrl.trim();
      else delete socialLinks.youtube;
      if (websiteUrl.trim()) socialLinks.website = websiteUrl.trim();
      else delete socialLinks.website;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          bio: artistBio.trim() || null,
          location: artistLocation.trim() || null,
          state: artistState || null,
          social_links: socialLinks,
          accepts_commissions: acceptsCommissions,
          featured_artworks: featuredArtworkIds,
        }),
      });
      clearTimeout(timeout);

      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || 'Failed to update artist profile.');

      await refreshUser();
      setArtistStatus({ type: 'success', message: 'Artist profile updated.' });
    } catch {
      setArtistStatus({
        type: 'error',
        message: 'Failed to update artist profile. Please try again.',
      });
    } finally {
      setArtistSaving(false);
    }
  }

  const TABS: { id: TabId; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'address', label: 'Shipping' },
    { id: 'password', label: 'Password' },
    { id: 'notifications', label: 'Notifications' },
    ...(isArtist ? [{ id: 'artist' as TabId, label: 'Artist profile' }] : []),
    ...(isArtist
      ? [{ id: 'subscription' as TabId, label: 'Subscription' }]
      : []),
    { id: 'danger', label: 'Close account' },
  ];

  if (authLoading) {
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
          style={{
            fontStyle: 'italic',
            fontSize: '0.95rem',
            color: 'var(--color-stone)',
          }}
        >
          Loading…
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      <div
        className="px-6 sm:px-10"
        style={{
          maxWidth: '78rem',
          margin: '0 auto',
          paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
        }}
      >
        {/* ── Editorial header ── */}
        <header style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
          <Kicker>The Studio · Settings</Kicker>
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
            Your <em style={{ fontStyle: 'italic' }}>account.</em>
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
            Profile, address, password, and the finer details of how Signo
            reaches you.
          </p>
        </header>

        <div
          className="flex flex-col md:flex-row"
          style={{ gap: 'clamp(2.4rem, 4vw, 4rem)' }}
        >
          {/* ── Sidebar nav — typographic index ── */}
          <aside
            className="md:flex-shrink-0"
            style={{ width: '100%', maxWidth: 220 }}
          >
            <p
              style={{
                fontSize: '0.6rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                marginBottom: '1rem',
                paddingBottom: '0.8rem',
                borderBottom: '1px solid var(--color-border-strong)',
              }}
            >
              Index
            </p>
            <nav>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {TABS.map((tab, i) => {
                  const active = activeTab === tab.id;
                  return (
                    <li key={tab.id}>
                      <button
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className="font-serif"
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '0.7rem',
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.85rem 0',
                          background: 'none',
                          border: 'none',
                          borderBottom: '1px solid var(--color-border)',
                          cursor: 'pointer',
                          color: active
                            ? 'var(--color-ink)'
                            : 'var(--color-stone-dark)',
                          fontSize: '0.95rem',
                          fontStyle: active ? 'italic' : 'normal',
                          fontWeight: 400,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.62rem',
                            letterSpacing: '0.18em',
                            color: 'var(--color-stone)',
                            fontStyle: 'normal',
                            fontFamily: 'inherit',
                          }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {tab.label}
                        {active && (
                          <span
                            aria-hidden
                            style={{
                              marginLeft: 'auto',
                              fontSize: '0.7rem',
                              fontStyle: 'normal',
                              color: 'var(--color-stone)',
                            }}
                          >
                            ·
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {isArtist && (
              <div style={{ marginTop: '2rem' }}>
                <Link
                  href="/artist/settings/payouts"
                  className="font-serif"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'baseline',
                    gap: '0.5rem',
                    fontSize: '0.72rem',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    fontStyle: 'italic',
                    color: 'var(--color-stone)',
                    textDecoration: 'none',
                    borderBottom: '1px solid var(--color-border)',
                    paddingBottom: '0.2rem',
                  }}
                >
                  Payout settings →
                </Link>
              </div>
            )}
          </aside>

          {/* ── Content column ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* ═══════ Profile ═══════ */}
            {activeTab === 'profile' && (
              <section>
                <Kicker>01 · Profile</Kicker>
                <SectionTitle>
                  Your <em style={{ fontStyle: 'italic' }}>public face.</em>
                </SectionTitle>
                <SectionIntro>
                  The name and portrait collectors and artists see when you
                  write to them.
                </SectionIntro>

                <div style={{ marginBottom: '2.2rem' }}>
                  <AvatarUpload
                    currentUrl={avatarUrl}
                    userName={fullName}
                    size={100}
                    onAvatarChange={setAvatarUrl}
                    uploadFile={handleAvatarUpload}
                  />
                </div>

                <div style={{ marginBottom: '2.2rem' }}>
                  <label htmlFor="fullName" className="commission-label">
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="commission-field"
                    placeholder="Your full name"
                  />
                </div>

                <div style={{ marginBottom: '2.2rem' }}>
                  <p className="commission-label">Email</p>
                  <p
                    className="font-serif"
                    style={{
                      fontSize: '1rem',
                      color: 'var(--color-ink)',
                      padding: '0.9rem 0',
                      borderBottom: '1px solid var(--color-border)',
                      margin: 0,
                    }}
                  >
                    {user?.email || '—'}
                  </p>
                  <p
                    className="font-serif"
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.75rem',
                      fontStyle: 'italic',
                      color: 'var(--color-stone)',
                    }}
                  >
                    Fixed. Contact support if this needs to change.
                  </p>
                </div>

                <StatusLine status={profileStatus} />

                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={profileSaving || !fullName.trim()}
                  className="artwork-primary-cta artwork-primary-cta--compact"
                  style={{
                    minWidth: '14rem',
                    opacity: profileSaving || !fullName.trim() ? 0.5 : 1,
                    marginTop: '1.4rem',
                  }}
                >
                  {profileSaving ? 'Saving…' : 'Save changes'}
                </button>
              </section>
            )}

            {/* ═══════ Shipping Address ═══════ */}
            {activeTab === 'address' && (
              <section>
                <Kicker>02 · Shipping</Kicker>
                <SectionTitle>
                  Where works should <em style={{ fontStyle: 'italic' }}>arrive.</em>
                </SectionTitle>
                <SectionIntro>
                  Your default delivery address, used at checkout.
                </SectionIntro>

                <div style={{ marginBottom: '2.2rem' }}>
                  <label htmlFor="street" className="commission-label">
                    Street
                  </label>
                  <input
                    id="street"
                    type="text"
                    value={address.street}
                    onChange={(e) =>
                      setAddress((a) => ({ ...a, street: e.target.value }))
                    }
                    className="commission-field"
                    placeholder="123 Example Street, Apt 4B"
                  />
                </div>

                <div
                  className="grid grid-cols-1 sm:grid-cols-2"
                  style={{ gap: '1.4rem', marginBottom: '2.2rem' }}
                >
                  <div>
                    <label htmlFor="city" className="commission-label">
                      City
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={address.city}
                      onChange={(e) =>
                        setAddress((a) => ({ ...a, city: e.target.value }))
                      }
                      className="commission-field"
                      placeholder="Sydney"
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className="commission-label">
                      State
                    </label>
                    <select
                      id="state"
                      value={address.state}
                      onChange={(e) =>
                        setAddress((a) => ({ ...a, state: e.target.value }))
                      }
                      className="commission-field"
                    >
                      <option value="">Select</option>
                      <option value="NSW">NSW</option>
                      <option value="VIC">VIC</option>
                      <option value="QLD">QLD</option>
                      <option value="WA">WA</option>
                      <option value="SA">SA</option>
                      <option value="TAS">TAS</option>
                      <option value="ACT">ACT</option>
                      <option value="NT">NT</option>
                    </select>
                  </div>
                </div>

                <div
                  className="grid grid-cols-1 sm:grid-cols-2"
                  style={{ gap: '1.4rem', marginBottom: '2.2rem' }}
                >
                  <div>
                    <label htmlFor="postcode" className="commission-label">
                      Postcode
                    </label>
                    <input
                      id="postcode"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={address.postcode}
                      onChange={(e) =>
                        setAddress((a) => ({
                          ...a,
                          postcode: e.target.value.replace(/\D/g, ''),
                        }))
                      }
                      className="commission-field"
                      placeholder="2000"
                    />
                  </div>
                  <div>
                    <p className="commission-label">Country</p>
                    <p
                      className="font-serif"
                      style={{
                        fontSize: '1rem',
                        fontStyle: 'italic',
                        color: 'var(--color-stone-dark)',
                        padding: '0.9rem 0',
                        borderBottom: '1px solid var(--color-border)',
                        margin: 0,
                      }}
                    >
                      Australia
                    </p>
                  </div>
                </div>

                <StatusLine status={addressStatus} />

                <button
                  type="button"
                  onClick={saveAddress}
                  disabled={addressSaving}
                  className="artwork-primary-cta artwork-primary-cta--compact"
                  style={{
                    minWidth: '14rem',
                    opacity: addressSaving ? 0.5 : 1,
                    marginTop: '1.4rem',
                  }}
                >
                  {addressSaving ? 'Saving…' : 'Save address'}
                </button>
              </section>
            )}

            {/* ═══════ Password ═══════ */}
            {activeTab === 'password' && (
              <section>
                <Kicker>03 · Password</Kicker>
                <SectionTitle>
                  Change your{' '}
                  <em style={{ fontStyle: 'italic' }}>credentials.</em>
                </SectionTitle>
                <SectionIntro>
                  At least eight characters. Choose something you can recall
                  without a note.
                </SectionIntro>

                <div style={{ maxWidth: '32rem' }}>
                  <div style={{ marginBottom: '2rem' }}>
                    <label
                      htmlFor="currentPassword"
                      className="commission-label"
                    >
                      Current password
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="commission-field"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </div>

                  <div style={{ marginBottom: '2rem' }}>
                    <label htmlFor="newPassword" className="commission-label">
                      New password
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="commission-field"
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                  </div>

                  <div style={{ marginBottom: '2rem' }}>
                    <label
                      htmlFor="confirmPassword"
                      className="commission-label"
                    >
                      Confirm
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="commission-field"
                      placeholder="Repeat your new password"
                      autoComplete="new-password"
                    />
                    {newPassword &&
                      confirmPassword &&
                      newPassword !== confirmPassword && (
                        <p
                          className="font-serif"
                          style={{
                            marginTop: '0.5rem',
                            fontSize: '0.75rem',
                            fontStyle: 'italic',
                            color: 'var(--color-terracotta, #c45d3e)',
                          }}
                        >
                          Passwords don&apos;t match.
                        </p>
                      )}
                  </div>
                </div>

                <StatusLine status={passwordStatus} />

                <button
                  type="button"
                  onClick={changePassword}
                  disabled={
                    passwordSaving ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                  className="artwork-primary-cta artwork-primary-cta--compact"
                  style={{
                    minWidth: '14rem',
                    opacity:
                      passwordSaving ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword
                        ? 0.5
                        : 1,
                    marginTop: '1.4rem',
                  }}
                >
                  {passwordSaving ? 'Updating…' : 'Update password'}
                </button>
              </section>
            )}

            {/* ═══════ Notifications ═══════ */}
            {activeTab === 'notifications' && (
              <section>
                <Kicker>04 · Notifications</Kicker>
                <SectionTitle>
                  Email, set <em style={{ fontStyle: 'italic' }}>just so.</em>
                </SectionTitle>
                <SectionIntro>
                  Fine-grained controls are coming. For now, Signo writes to
                  you about orders and follows only.
                </SectionIntro>

                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    borderTop: '1px solid var(--color-border-strong)',
                    opacity: 0.55,
                    pointerEvents: 'none',
                  }}
                >
                  {[
                    {
                      key: 'orderUpdates' as const,
                      label: 'Order updates',
                      desc: 'Shipping confirmations, delivery updates, and payout notices.',
                    },
                    {
                      key: 'newArtwork' as const,
                      label: 'New works from followed artists',
                      desc: 'A note when artists you follow add a piece.',
                    },
                    {
                      key: 'marketing' as const,
                      label: 'Newsletter',
                      desc: 'Curated collections and occasional dispatches.',
                    },
                  ].map((pref) => (
                    <li
                      key={pref.key}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        padding: '1.4rem 0',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '1.6rem',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p
                          className="font-serif"
                          style={{
                            fontSize: '1.05rem',
                            color: 'var(--color-ink)',
                            fontWeight: 400,
                            margin: 0,
                          }}
                        >
                          {pref.label}
                        </p>
                        <p
                          style={{
                            marginTop: '0.3rem',
                            fontSize: '0.82rem',
                            color: 'var(--color-stone)',
                            fontWeight: 300,
                            lineHeight: 1.5,
                          }}
                        >
                          {pref.desc}
                        </p>
                      </div>
                      <p
                        className="font-serif"
                        style={{
                          fontSize: '0.7rem',
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          fontStyle: 'italic',
                          color: 'var(--color-stone)',
                          marginTop: '0.2rem',
                          flexShrink: 0,
                        }}
                      >
                        {emailPrefs[pref.key] ? 'On' : 'Off'}
                      </p>
                    </li>
                  ))}
                </ul>

                <p
                  className="font-serif"
                  style={{
                    marginTop: '1.4rem',
                    fontSize: '0.78rem',
                    fontStyle: 'italic',
                    color: 'var(--color-stone)',
                  }}
                >
                  — Coming soon.
                </p>
              </section>
            )}

            {/* ═══════ Artist Profile ═══════ */}
            {activeTab === 'artist' && isArtist && (
              <section>
                <Kicker>05 · Artist profile</Kicker>
                <SectionTitle>
                  Your <em style={{ fontStyle: 'italic' }}>public page.</em>
                </SectionTitle>
                <SectionIntro>
                  What appears on signo.art/artists/you — bio, location, links,
                  and the works you&apos;d lead with.
                </SectionIntro>

                <div style={{ marginBottom: '2.4rem' }}>
                  <label htmlFor="artistBio" className="commission-label">
                    Bio
                  </label>
                  <textarea
                    id="artistBio"
                    value={artistBio}
                    onChange={(e) => setArtistBio(e.target.value)}
                    rows={6}
                    maxLength={1000}
                    className="commission-field"
                    style={{ resize: 'vertical' }}
                    placeholder="A few lines on your practice, your studio, what drives the work."
                  />
                  <p
                    className="font-serif"
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.72rem',
                      fontStyle: 'italic',
                      color: 'var(--color-stone)',
                      textAlign: 'right',
                    }}
                  >
                    {artistBio.length} / 1000
                  </p>
                </div>

                <div
                  className="grid grid-cols-1 sm:grid-cols-2"
                  style={{ gap: '1.4rem', marginBottom: '2.4rem' }}
                >
                  <div>
                    <label
                      htmlFor="artistLocation"
                      className="commission-label"
                    >
                      Location
                    </label>
                    <input
                      id="artistLocation"
                      type="text"
                      value={artistLocation}
                      onChange={(e) => setArtistLocation(e.target.value)}
                      className="commission-field"
                      placeholder="Melbourne, VIC"
                    />
                  </div>
                  <div>
                    <label htmlFor="artistState" className="commission-label">
                      State
                    </label>
                    <select
                      id="artistState"
                      value={artistState}
                      onChange={(e) => setArtistState(e.target.value)}
                      className="commission-field"
                    >
                      <option value="">Select</option>
                      <option value="VIC">VIC</option>
                      <option value="NSW">NSW</option>
                      <option value="QLD">QLD</option>
                      <option value="SA">SA</option>
                      <option value="WA">WA</option>
                      <option value="TAS">TAS</option>
                      <option value="NT">NT</option>
                      <option value="ACT">ACT</option>
                    </select>
                  </div>
                </div>

                {/* Social Links */}
                <div style={{ marginBottom: '2.4rem' }}>
                  <p className="commission-label">Elsewhere</p>
                  <div
                    style={{
                      borderTop: '1px solid var(--color-border-strong)',
                    }}
                  >
                    {[
                      {
                        id: 'instagram',
                        label: 'Instagram',
                        value: instagramUrl,
                        set: setInstagramUrl,
                        placeholder: '@handle or instagram.com/handle',
                      },
                      {
                        id: 'tiktok',
                        label: 'TikTok',
                        value: tiktokUrl,
                        set: setTiktokUrl,
                        placeholder: '@handle',
                      },
                      {
                        id: 'facebook',
                        label: 'Facebook',
                        value: facebookUrl,
                        set: setFacebookUrl,
                        placeholder: 'facebook.com/yourpage',
                      },
                      {
                        id: 'youtube',
                        label: 'YouTube',
                        value: youtubeUrl,
                        set: setYoutubeUrl,
                        placeholder: 'youtube.com/@channel',
                      },
                      {
                        id: 'website',
                        label: 'Website',
                        value: websiteUrl,
                        set: setWebsiteUrl,
                        placeholder: 'https://yourwebsite.com',
                      },
                    ].map((field) => (
                      <div
                        key={field.id}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          padding: '1rem 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1.4rem',
                        }}
                      >
                        <label
                          htmlFor={field.id}
                          className="font-serif"
                          style={{
                            fontSize: '0.75rem',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: 'var(--color-stone)',
                            fontStyle: 'italic',
                            width: '6rem',
                            flexShrink: 0,
                          }}
                        >
                          {field.label}
                        </label>
                        <input
                          id={field.id}
                          type="text"
                          value={field.value}
                          onChange={(e) => field.set(e.target.value)}
                          placeholder={field.placeholder}
                          className="font-serif"
                          style={{
                            flex: 1,
                            background: 'none',
                            border: 'none',
                            padding: '0.3rem 0',
                            fontSize: '0.95rem',
                            color: 'var(--color-ink)',
                            outline: 'none',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Featured Works */}
                <div style={{ marginBottom: '2.4rem' }}>
                  <p className="commission-label">Featured works</p>
                  <p
                    style={{
                      marginTop: '-0.6rem',
                      marginBottom: '1.4rem',
                      fontSize: '0.82rem',
                      color: 'var(--color-stone)',
                      fontWeight: 300,
                      fontStyle: 'italic',
                    }}
                    className="font-serif"
                  >
                    Up to five works — these lead your profile.
                  </p>

                  {featuredArtworkObjects.length > 0 && (
                    <ol
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: '0 0 1.4rem 0',
                        borderTop: '1px solid var(--color-border-strong)',
                      }}
                    >
                      {featuredArtworkObjects.map((artwork, index) => (
                        <li
                          key={artwork.id}
                          style={{
                            borderBottom: '1px solid var(--color-border)',
                            padding: '1rem 0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1.2rem',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.62rem',
                              letterSpacing: '0.18em',
                              color: 'var(--color-stone)',
                              width: '1.5rem',
                            }}
                          >
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div
                            style={{
                              position: 'relative',
                              width: 64,
                              height: 64,
                              background: 'var(--color-cream)',
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}
                          >
                            <Image
                              src={
                                (artwork.images as string[])?.[0] ||
                                '/placeholder.jpg'
                              }
                              alt={artwork.title}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              className="font-serif"
                              style={{
                                fontSize: '1rem',
                                color: 'var(--color-ink)',
                                margin: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {artwork.title}
                            </p>
                            <p
                              style={{
                                marginTop: '0.2rem',
                                fontSize: '0.78rem',
                                color: 'var(--color-stone)',
                                fontWeight: 300,
                              }}
                            >
                              {formatPrice(artwork.price_aud)}
                            </p>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '1.2rem',
                              flexShrink: 0,
                            }}
                          >
                            <div
                              style={{ display: 'flex', gap: '0.3rem' }}
                              aria-label="Reorder"
                            >
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => {
                                  setFeaturedArtworkIds((ids) => {
                                    const next = [...ids];
                                    [next[index - 1], next[index]] = [
                                      next[index],
                                      next[index - 1],
                                    ];
                                    return next;
                                  });
                                }}
                                aria-label="Move up"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor:
                                    index === 0 ? 'default' : 'pointer',
                                  opacity: index === 0 ? 0.2 : 0.7,
                                  fontSize: '0.9rem',
                                  color: 'var(--color-stone-dark)',
                                  padding: '0 0.2rem',
                                }}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                disabled={
                                  index === featuredArtworkObjects.length - 1
                                }
                                onClick={() => {
                                  setFeaturedArtworkIds((ids) => {
                                    const next = [...ids];
                                    [next[index], next[index + 1]] = [
                                      next[index + 1],
                                      next[index],
                                    ];
                                    return next;
                                  });
                                }}
                                aria-label="Move down"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor:
                                    index ===
                                    featuredArtworkObjects.length - 1
                                      ? 'default'
                                      : 'pointer',
                                  opacity:
                                    index ===
                                    featuredArtworkObjects.length - 1
                                      ? 0.2
                                      : 0.7,
                                  fontSize: '0.9rem',
                                  color: 'var(--color-stone-dark)',
                                  padding: '0 0.2rem',
                                }}
                              >
                                ↓
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setFeaturedArtworkIds((ids) =>
                                  ids.filter((id) => id !== artwork.id)
                                )
                              }
                              className="font-serif"
                              style={{
                                fontSize: '0.68rem',
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                fontStyle: 'italic',
                                color: 'var(--color-stone)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                borderBottom:
                                  '1px solid var(--color-border)',
                                padding: '0.2rem 0',
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}

                  {featuredArtworkIds.length < 5 && (
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() =>
                          setShowArtworkPicker(!showArtworkPicker)
                        }
                        className="font-serif editorial-link"
                        style={{ fontStyle: 'italic' }}
                      >
                        + Add a work ({featuredArtworkIds.length}/5)
                      </button>

                      {showArtworkPicker && (
                        <>
                          <div
                            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                            onClick={() => {
                              setShowArtworkPicker(false);
                              setArtworkSearch('');
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: '100%',
                              marginTop: '0.8rem',
                              zIndex: 20,
                              width: 340,
                              background: 'var(--color-warm-white)',
                              border: '1px solid var(--color-border-strong)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                padding: '1rem 1.2rem',
                                borderBottom:
                                  '1px solid var(--color-border)',
                              }}
                            >
                              <input
                                type="text"
                                value={artworkSearch}
                                onChange={(e) =>
                                  setArtworkSearch(e.target.value)
                                }
                                placeholder="Search your works…"
                                autoFocus
                                className="font-serif"
                                style={{
                                  width: '100%',
                                  background: 'none',
                                  border: 'none',
                                  fontSize: '0.88rem',
                                  fontStyle: 'italic',
                                  color: 'var(--color-ink)',
                                  outline: 'none',
                                }}
                              />
                            </div>
                            <div
                              style={{ maxHeight: 280, overflowY: 'auto' }}
                            >
                              {availableArtworks.length === 0 ? (
                                <p
                                  className="font-serif"
                                  style={{
                                    padding: '1.6rem 1.2rem',
                                    fontSize: '0.82rem',
                                    fontStyle: 'italic',
                                    color: 'var(--color-stone)',
                                    textAlign: 'center',
                                  }}
                                >
                                  {artworkSearch.trim()
                                    ? 'No matches.'
                                    : 'No approved works yet.'}
                                </p>
                              ) : (
                                availableArtworks.map((artwork) => (
                                  <button
                                    key={artwork.id}
                                    type="button"
                                    onClick={() => {
                                      setFeaturedArtworkIds((ids) => [
                                        ...ids,
                                        artwork.id,
                                      ]);
                                      if (
                                        featuredArtworkIds.length + 1 >=
                                        5
                                      ) {
                                        setShowArtworkPicker(false);
                                        setArtworkSearch('');
                                      }
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '1rem',
                                      width: '100%',
                                      padding: '0.8rem 1.2rem',
                                      textAlign: 'left',
                                      background: 'none',
                                      border: 'none',
                                      borderBottom:
                                        '1px solid var(--color-border)',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <div
                                      style={{
                                        position: 'relative',
                                        width: 40,
                                        height: 40,
                                        background: 'var(--color-cream)',
                                        flexShrink: 0,
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <Image
                                        src={
                                          (artwork.images as string[])?.[0] ||
                                          '/placeholder.jpg'
                                        }
                                        alt={artwork.title}
                                        fill
                                        className="object-cover"
                                        sizes="40px"
                                      />
                                    </div>
                                    <div
                                      style={{ flex: 1, minWidth: 0 }}
                                    >
                                      <p
                                        className="font-serif"
                                        style={{
                                          fontSize: '0.92rem',
                                          color: 'var(--color-ink)',
                                          margin: 0,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {artwork.title}
                                      </p>
                                      <p
                                        style={{
                                          fontSize: '0.72rem',
                                          color: 'var(--color-stone)',
                                          marginTop: '0.15rem',
                                        }}
                                      >
                                        {formatPrice(artwork.price_aud)}
                                      </p>
                                    </div>
                                    <span
                                      className="font-serif"
                                      style={{
                                        fontSize: '0.68rem',
                                        letterSpacing: '0.18em',
                                        textTransform: 'uppercase',
                                        fontStyle: 'italic',
                                        color: 'var(--color-stone)',
                                      }}
                                    >
                                      Add
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Commissions toggle */}
                <div
                  style={{
                    padding: '1.6rem 0',
                    borderTop: '1px solid var(--color-border-strong)',
                    borderBottom: '1px solid var(--color-border-strong)',
                    marginBottom: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1.6rem',
                  }}
                >
                  <div>
                    <p
                      className="font-serif"
                      style={{
                        fontSize: '1.05rem',
                        color: 'var(--color-ink)',
                        margin: 0,
                        fontStyle: acceptsCommissions ? 'italic' : 'normal',
                      }}
                    >
                      Open to commissions
                    </p>
                    <p
                      style={{
                        marginTop: '0.3rem',
                        fontSize: '0.82rem',
                        color: 'var(--color-stone)',
                        fontWeight: 300,
                        maxWidth: '52ch',
                      }}
                    >
                      Show a &ldquo;commission a piece&rdquo; link on your
                      profile so collectors can write to you about custom work.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={acceptsCommissions}
                    onClick={() => setAcceptsCommissions(!acceptsCommissions)}
                    className="font-serif"
                    style={{
                      flexShrink: 0,
                      fontSize: '0.72rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      fontStyle: 'italic',
                      color: acceptsCommissions
                        ? 'var(--color-ink)'
                        : 'var(--color-stone)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.3rem 0',
                      borderBottom: acceptsCommissions
                        ? '1px solid var(--color-ink)'
                        : '1px solid var(--color-border)',
                    }}
                  >
                    {acceptsCommissions ? 'On' : 'Off'}
                  </button>
                </div>

                <StatusLine status={artistStatus} />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.6rem',
                    marginTop: '1.4rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={saveArtistProfile}
                    disabled={artistSaving}
                    className="artwork-primary-cta artwork-primary-cta--compact"
                    style={{
                      minWidth: '14rem',
                      opacity: artistSaving ? 0.5 : 1,
                    }}
                  >
                    {artistSaving ? 'Saving…' : 'Save changes'}
                  </button>

                  <Link
                    href="/artist/dashboard"
                    className="font-serif"
                    style={{
                      fontSize: '0.72rem',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      fontStyle: 'italic',
                      color: 'var(--color-stone)',
                      textDecoration: 'none',
                      borderBottom: '1px solid var(--color-border)',
                      padding: '0.3rem 0',
                    }}
                  >
                    Manage storefront →
                  </Link>
                </div>
              </section>
            )}

            {/* ═══════ Subscription ═══════ */}
            {activeTab === 'subscription' &&
              isArtist &&
              (() => {
                const subStatus = user?.subscription_status || 'trial';
                const statusLabel: Record<string, string> = {
                  trial: 'Free plan',
                  pending_activation: 'Pending activation',
                  active: 'Active · $30 / month',
                  past_due: 'Past due',
                  paused: 'Paused',
                  cancelled: 'Cancelled',
                };
                const statusDescription: Record<string, string> = {
                  trial:
                    'Your $30 / month subscription begins after your first sale. No payment needed yet.',
                  pending_activation:
                    'Your first sale has completed. Add a payment method to keep your listings live.',
                  active:
                    'Your subscription is active. Listings are live and zero commission.',
                  past_due:
                    'A payment failed. Please update your payment method to restore listings.',
                  paused:
                    'Your listings are paused. Add a payment method to reactivate.',
                  cancelled:
                    'Your subscription was cancelled. Resubscribe to bring your listings back.',
                };

                return (
                  <section>
                    <Kicker>06 · Subscription</Kicker>
                    <SectionTitle>
                      Your plan and{' '}
                      <em style={{ fontStyle: 'italic' }}>billing.</em>
                    </SectionTitle>
                    <SectionIntro>
                      {statusDescription[subStatus]}
                    </SectionIntro>

                    <dl
                      style={{
                        borderTop: '1px solid var(--color-border-strong)',
                        margin: 0,
                        padding: 0,
                      }}
                    >
                      {[
                        { label: 'Status', value: statusLabel[subStatus] || subStatus },
                        {
                          label: 'Price',
                          value:
                            subStatus === 'trial'
                              ? 'Free — until first sale'
                              : '$30 / month',
                        },
                        { label: 'Commission', value: '0%' },
                        {
                          label: 'Payouts',
                          value: user?.stripe_account_id ? (
                            <em style={{ fontStyle: 'italic' }}>Connected</em>
                          ) : (
                            <Link
                              href="/artist/settings/payouts"
                              className="editorial-link"
                              style={{ fontStyle: 'italic' }}
                            >
                              Set up payouts
                            </Link>
                          ),
                        },
                      ].map((row, i) => (
                        <div
                          key={i}
                          style={{
                            borderBottom: '1px solid var(--color-border)',
                            padding: '1.1rem 0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            gap: '2rem',
                          }}
                        >
                          <dt
                            style={{
                              fontSize: '0.62rem',
                              letterSpacing: '0.22em',
                              textTransform: 'uppercase',
                              color: 'var(--color-stone)',
                            }}
                          >
                            {row.label}
                          </dt>
                          <dd
                            className="font-serif"
                            style={{
                              fontSize: '1rem',
                              color: 'var(--color-ink)',
                              margin: 0,
                            }}
                          >
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    {subStatus !== 'trial' && (
                      <Link
                        href="/artist/subscribe"
                        className="artwork-primary-cta artwork-primary-cta--compact"
                        style={{
                          minWidth: '16rem',
                          marginTop: '2rem',
                          display: 'inline-block',
                        }}
                      >
                        {subStatus === 'active'
                          ? 'Manage subscription'
                          : 'Go to subscription'}
                      </Link>
                    )}
                  </section>
                );
              })()}

            {/* ═══════ Danger / Close account ═══════ */}
            {activeTab === 'danger' && (
              <section>
                <Kicker>— The final page —</Kicker>
                <SectionTitle>
                  Close your <em style={{ fontStyle: 'italic' }}>account.</em>
                </SectionTitle>
                <SectionIntro>
                  Permanently remove your profile and everything attached to
                  it. Active orders must be completed or cancelled before the
                  account can be closed.
                </SectionIntro>

                <div
                  style={{
                    borderTop: '1px solid var(--color-border-strong)',
                    paddingTop: '1.6rem',
                    marginBottom: '2rem',
                  }}
                >
                  <p
                    className="font-serif"
                    style={{
                      fontSize: '0.9rem',
                      fontStyle: 'italic',
                      color: 'var(--color-stone-dark)',
                      maxWidth: '56ch',
                      lineHeight: 1.6,
                    }}
                  >
                    Your profile, your listings, your saved works and
                    correspondence — all of it goes. There&apos;s no recovering
                    it afterwards.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setDeleteConfirmText('');
                    setDeleteError(null);
                  }}
                  className="font-serif"
                  style={{
                    fontSize: '0.72rem',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    fontStyle: 'italic',
                    color: 'var(--color-terracotta, #c45d3e)',
                    background: 'none',
                    border: '1px solid var(--color-terracotta, #c45d3e)',
                    padding: '0.9rem 1.8rem',
                    cursor: 'pointer',
                  }}
                >
                  Close my account
                </button>

                {showDeleteConfirm && (
                  <div
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 50,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1.5rem',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(20, 18, 15, 0.45)',
                      }}
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                      }}
                    />
                    <div
                      role="dialog"
                      aria-modal="true"
                      style={{
                        position: 'relative',
                        zIndex: 10,
                        maxWidth: '32rem',
                        width: '100%',
                        background: 'var(--color-warm-white)',
                        padding: '2.4rem',
                        border: '1px solid var(--color-border-strong)',
                      }}
                    >
                      <p
                        style={{
                          fontSize: '0.62rem',
                          letterSpacing: '0.22em',
                          textTransform: 'uppercase',
                          color: 'var(--color-terracotta, #c45d3e)',
                          marginBottom: '1rem',
                        }}
                      >
                        — Final confirmation —
                      </p>
                      <h2
                        className="font-serif"
                        style={{
                          fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                          lineHeight: 1.1,
                          color: 'var(--color-ink)',
                          fontWeight: 400,
                          marginBottom: '1rem',
                        }}
                      >
                        Close your{' '}
                        <em style={{ fontStyle: 'italic' }}>account?</em>
                      </h2>
                      <p
                        style={{
                          fontSize: '0.9rem',
                          color: 'var(--color-stone-dark)',
                          fontWeight: 300,
                          lineHeight: 1.6,
                          marginBottom: '1.6rem',
                        }}
                      >
                        This removes your profile, listings, saved works, and
                        correspondence. It cannot be undone.
                      </p>

                      {isArtist &&
                        artistStats &&
                        (artistStats.activeListings > 0 ||
                          artistStats.pendingOrders > 0) && (
                          <p
                            className="font-serif"
                            style={{
                              padding: '1rem 1.2rem',
                              borderTop:
                                '1px solid var(--color-terracotta, #c45d3e)',
                              borderBottom:
                                '1px solid var(--color-terracotta, #c45d3e)',
                              fontSize: '0.85rem',
                              fontStyle: 'italic',
                              color: 'var(--color-ink)',
                              marginBottom: '1.6rem',
                              lineHeight: 1.5,
                            }}
                          >
                            You currently have {artistStats.activeListings}{' '}
                            active listing
                            {artistStats.activeListings !== 1 ? 's' : ''}
                            {artistStats.pendingOrders > 0 && (
                              <>
                                {' '}
                                and {artistStats.pendingOrders} pending order
                                {artistStats.pendingOrders !== 1 ? 's' : ''}
                              </>
                            )}
                            . These will be cancelled.
                          </p>
                        )}

                      <div style={{ marginBottom: '1.6rem' }}>
                        <p
                          className="commission-label"
                          style={{
                            color: 'var(--color-terracotta, #c45d3e)',
                          }}
                        >
                          Type DELETE to confirm
                        </p>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={(e) =>
                            setDeleteConfirmText(e.target.value)
                          }
                          className="commission-field"
                          placeholder="DELETE"
                          autoFocus
                        />
                      </div>

                      {deleteError && (
                        <p
                          className="font-serif"
                          style={{
                            fontSize: '0.85rem',
                            fontStyle: 'italic',
                            color: 'var(--color-terracotta, #c45d3e)',
                            marginBottom: '1.2rem',
                          }}
                        >
                          — {deleteError}
                        </p>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1.6rem',
                        }}
                      >
                        <button
                          type="button"
                          disabled={
                            deleteConfirmText !== 'DELETE' || deleteLoading
                          }
                          onClick={async () => {
                            setDeleteLoading(true);
                            setDeleteError(null);
                            try {
                              const res = await fetch('/api/account/delete', {
                                method: 'POST',
                              });
                              if (!res.ok) {
                                const body = await res
                                  .json()
                                  .catch(() => ({}));
                                throw new Error(
                                  body.error || 'Failed to delete account'
                                );
                              }
                              router.push('/');
                            } catch (err) {
                              setDeleteError(
                                err instanceof Error
                                  ? err.message
                                  : 'Something went wrong'
                              );
                              setDeleteLoading(false);
                            }
                          }}
                          className="font-serif"
                          style={{
                            fontSize: '0.72rem',
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            fontStyle: 'italic',
                            color: 'var(--color-warm-white)',
                            background:
                              'var(--color-terracotta, #c45d3e)',
                            border: 'none',
                            padding: '0.9rem 1.8rem',
                            cursor: 'pointer',
                            opacity:
                              deleteConfirmText !== 'DELETE' || deleteLoading
                                ? 0.4
                                : 1,
                          }}
                        >
                          {deleteLoading ? 'Closing…' : 'Yes, close it'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText('');
                          }}
                          disabled={deleteLoading}
                          className="editorial-link"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
