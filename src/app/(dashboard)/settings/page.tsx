'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  User,
  MapPin,
  Lock,
  Bell,
  Palette,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Check,
  Loader2,
  AlertCircle,
  CreditCard,
  Trash2,
  AtSign,
  Globe,
  ExternalLink,
  Plus,
  X,
  Search,
  ImageIcon,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { createClient } from '@/lib/supabase/client';
import { uploadAvatar } from '@/lib/supabase/storage';
import AvatarUpload from '@/components/AvatarUpload';

// ── Types ──

type TabId = 'profile' | 'address' | 'password' | 'notifications' | 'artist' | 'subscription' | 'danger';

interface Address {
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

// ── Tab button ──

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${
        active
          ? 'bg-accent-subtle text-accent'
          : 'text-muted hover:bg-muted-bg hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {label}
    </button>
  );
}

// ── Status toast ──

function StatusMessage({
  type,
  message,
}: {
  type: 'success' | 'error';
  message: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-xl text-sm animate-fade-in ${
        type === 'success'
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-error/5 text-error border border-error/20'
      }`}
    >
      {type === 'success' ? (
        <Check className="h-4 w-4 flex-shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
      )}
      {message}
    </div>
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

  // Address state — load from profile if available
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
  const [emailPrefs, setEmailPrefs] = useState({
    orderUpdates: true,
    newArtwork: true,
    marketing: false,
  });

  // Artist profile state
  const [artistBio, setArtistBio] = useState(user?.bio || '');
  const [artistLocation, setArtistLocation] = useState(user?.location || '');
  const [artistState, setArtistState] = useState((userAny?.state as string) || '');
  const [instagramUrl, setInstagramUrl] = useState(user?.social_links?.instagram || '');
  const [tiktokUrl, setTiktokUrl] = useState(user?.social_links?.tiktok || '');
  const [facebookUrl, setFacebookUrl] = useState(user?.social_links?.facebook || '');
  const [youtubeUrl, setYoutubeUrl] = useState(user?.social_links?.youtube || '')
  const [websiteUrl, setWebsiteUrl] = useState(user?.social_links?.website || '');
  const [acceptsCommissions, setAcceptsCommissions] = useState(user?.accepts_commissions ?? false);

  // Featured works state
  const [featuredArtworkIds, setFeaturedArtworkIds] = useState<string[]>(
    (user?.featured_artworks as string[]) || []
  );
  const [myArtworks, setMyArtworks] = useState<
    { id: string; title: string; price_aud: number; images: string[]; status: string }[]
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
  const [artistStats, setArtistStats] = useState<{ activeListings: number; pendingOrders: number } | null>(null);
  const router = useRouter();

  const isArtist = user?.role === 'artist' || user?.role === 'admin';

  // Fetch artist's artworks for featured works picker
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

  // Derived: featured artwork objects in order
  const featuredArtworkObjects = featuredArtworkIds
    .map((id) => myArtworks.find((a) => a.id === id))
    .filter(Boolean) as typeof myArtworks;

  // Artworks available to add (approved, not already selected)
  const availableArtworks = myArtworks
    .filter((a) => a.status === 'approved' && !featuredArtworkIds.includes(a.id))
    .filter((a) =>
      !artworkSearch.trim() ||
      a.title.toLowerCase().includes(artworkSearch.toLowerCase())
    );

  // Fetch artist stats when delete modal opens
  useEffect(() => {
    if (!showDeleteConfirm || !isArtist) return;
    const supabase = createClient();
    Promise.all([
      supabase.from('artworks').select('id', { count: 'exact', head: true }).eq('artist_id', user!.id).in('status', ['approved', 'pending_review', 'draft']),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('artist_id', user!.id).in('status', ['pending_payment', 'paid', 'shipped']),
    ]).then(([artworksRes, ordersRes]) => {
      setArtistStats({
        activeListings: artworksRes.count ?? 0,
        pendingOrders: ordersRes.count ?? 0,
      });
    });
  }, [showDeleteConfirm, isArtist, user]);

  // Avatar upload handler
  const handleAvatarUpload = useCallback(
    async (file: File, onProgress: (p: number) => void) => {
      if (!user) throw new Error('Not authenticated');
      return uploadAvatar(file, user.id, onProgress);
    },
    [user]
  );

  // Save profile via server API route
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
        message: (err as Error).name === 'AbortError'
          ? 'Request timed out. Please try again.'
          : 'Failed to update profile. Please try again.',
      });
    } finally {
      setProfileSaving(false);
    }
  }

  // Save address via server API route
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
        message: (err as Error).name === 'AbortError'
          ? 'Request timed out. Please try again.'
          : 'Something went wrong. Please try again.',
      });
    } finally {
      setAddressSaving(false);
    }
  }

  // Change password
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

      // Verify current password first
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
          err instanceof Error
            ? err.message
            : 'Failed to update password.',
      });
    } finally {
      setPasswordSaving(false);
    }
  }

  // Save artist profile
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
      if (!res.ok) throw new Error(result.error || 'Failed to update artist profile.');

      await refreshUser();
      setArtistStatus({ type: 'success', message: 'Artist profile updated.' });
    } catch (err) {
      setArtistStatus({
        type: 'error',
        message: 'Failed to update artist profile. Please try again.',
      });
    } finally {
      setArtistSaving(false);
    }
  }

  const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'address', label: 'Shipping Address', icon: MapPin },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    ...(isArtist
      ? [{ id: 'artist' as TabId, label: 'Artist Profile', icon: Palette }]
      : []),
    ...(isArtist
      ? [{ id: 'subscription' as TabId, label: 'Subscription', icon: CreditCard }]
      : []),
    { id: 'danger', label: 'Danger Zone', icon: Trash2 },
  ];

  if (authLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div style={{ width: 32, height: 32, border: '3px solid #E5E2DB', borderTopColor: '#2C2C2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-editorial text-3xl md:text-4xl font-medium">
          Settings
        </h1>
        <p className="text-muted mt-2">
          Manage your account, address, and preferences.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="md:w-56 flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <TabButton
                key={tab.id}
                active={activeTab === tab.id}
                icon={tab.icon}
                label={tab.label}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </nav>

          {/* Payout settings link for artists */}
          {isArtist && (
            <div className="mt-6 pt-6 border-t border-border">
              <Link
                href="/artist/settings/payouts"
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium text-muted hover:bg-muted-bg hover:text-foreground transition-colors"
              >
                <CreditCard className="h-4 w-4 flex-shrink-0" />
                Payout Settings
                <ArrowRight className="h-3.5 w-3.5 ml-auto" />
              </Link>
            </div>
          )}
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* ═══════ Profile ═══════ */}
          {activeTab === 'profile' && (
            <div className="bg-white border border-border rounded-2xl p-6 md:p-8 space-y-6">
              <div>
                <h2 className="font-semibold text-lg">Profile</h2>
                <p className="text-sm text-muted mt-1">
                  Your public information visible to other users.
                </p>
              </div>

              {/* Avatar */}
              <div className="flex justify-center">
                <AvatarUpload
                  currentUrl={avatarUrl}
                  userName={fullName}
                  size={100}
                  onAvatarChange={setAvatarUrl}
                  uploadFile={handleAvatarUpload}
                />
              </div>

              {/* Full Name */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-xs font-medium tracking-wide uppercase text-muted mb-2"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                  placeholder="Your full name"
                />
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
                  Email
                </label>
                <div className="w-full px-4 py-3 bg-muted-bg border border-border rounded-xl text-sm text-muted">
                  {user?.email || '—'}
                </div>
                <p className="text-xs text-warm-gray mt-1.5">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              {profileStatus && (
                <StatusMessage
                  type={profileStatus.type}
                  message={profileStatus.message}
                />
              )}

              <button
                type="button"
                onClick={saveProfile}
                disabled={profileSaving || !fullName.trim()}
                className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-full hover:bg-accent transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {profileSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          )}

          {/* ═══════ Shipping Address ═══════ */}
          {activeTab === 'address' && (
            <div className="bg-white border border-border rounded-2xl p-6 md:p-8 space-y-6">
              <div>
                <h2 className="font-semibold text-lg">Shipping Address</h2>
                <p className="text-sm text-muted mt-1">
                  Your default address for purchases.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="street"
                    className="block text-xs font-medium tracking-wide uppercase text-muted mb-2"
                  >
                    Street Address
                  </label>
                  <input
                    id="street"
                    type="text"
                    value={address.street}
                    onChange={(e) =>
                      setAddress((a) => ({ ...a, street: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                    placeholder="123 Example Street, Apt 4B"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="city"
                      className="block text-xs font-medium tracking-wide uppercase text-muted mb-2"
                    >
                      City
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={address.city}
                      onChange={(e) =>
                        setAddress((a) => ({ ...a, city: e.target.value }))
                      }
                      className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                      placeholder="Sydney"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="state"
                      className="block text-xs font-medium tracking-wide uppercase text-muted mb-2"
                    >
                      State
                    </label>
                    <select
                      id="state"
                      value={address.state}
                      onChange={(e) =>
                        setAddress((a) => ({ ...a, state: e.target.value }))
                      }
                      className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm transition-colors appearance-none focus:border-accent focus:ring-1 focus:ring-accent/20"
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="postcode"
                      className="block text-xs font-medium tracking-wide uppercase text-muted mb-2"
                    >
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
                      className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                      placeholder="2000"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="country"
                      className="block text-xs font-medium tracking-wide uppercase text-muted mb-2"
                    >
                      Country
                    </label>
                    <div className="w-full px-4 py-3 bg-muted-bg border border-border rounded-xl text-sm text-muted">
                      Australia
                    </div>
                  </div>
                </div>
              </div>

              {addressStatus && (
                <StatusMessage
                  type={addressStatus.type}
                  message={addressStatus.message}
                />
              )}

              <button
                type="button"
                onClick={saveAddress}
                disabled={addressSaving}
                className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-full hover:bg-accent transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {addressSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Address'
                )}
              </button>
            </div>
          )}

          {/* ═══════ Password ═══════ */}
          {activeTab === 'password' && (
            <div className="bg-white border border-border rounded-2xl p-6 md:p-8 space-y-6">
              <div>
                <h2 className="font-semibold text-lg">Change Password</h2>
                <p className="text-sm text-muted mt-1">
                  Update your password. Must be at least 8 characters.
                </p>
              </div>

              <div className="space-y-4 max-w-md">
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="block text-xs font-medium tracking-wide uppercase text-muted mb-2"
                  >
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                </div>

                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-xs font-medium tracking-wide uppercase text-muted mb-2"
                  >
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                    placeholder="New password"
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-medium tracking-wide uppercase text-muted mb-2"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                  {newPassword &&
                    confirmPassword &&
                    newPassword !== confirmPassword && (
                      <p className="text-xs text-error mt-1.5">
                        Passwords do not match.
                      </p>
                    )}
                </div>
              </div>

              {passwordStatus && (
                <StatusMessage
                  type={passwordStatus.type}
                  message={passwordStatus.message}
                />
              )}

              <button
                type="button"
                onClick={changePassword}
                disabled={
                  passwordSaving || !currentPassword || !newPassword || !confirmPassword
                }
                className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-full hover:bg-accent transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {passwordSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </div>
          )}

          {/* ═══════ Notifications ═══════ */}
          {activeTab === 'notifications' && (
            <div className="bg-white border border-border rounded-2xl p-6 md:p-8 space-y-6">
              <div>
                <h2 className="font-semibold text-lg">
                  Email Notifications
                </h2>
                <p className="text-sm text-muted mt-1">
                  Email notification preferences coming soon.
                </p>
              </div>

              <div className="space-y-4 opacity-50 pointer-events-none">
                {[
                  {
                    key: 'orderUpdates' as const,
                    label: 'Order updates',
                    desc: 'Shipping confirmations, delivery updates, and payout notifications.',
                  },
                  {
                    key: 'newArtwork' as const,
                    label: 'New artwork from followed artists',
                    desc: 'Get notified when artists you follow upload new pieces.',
                  },
                  {
                    key: 'marketing' as const,
                    label: 'Newsletter & promotions',
                    desc: 'Curated collections, platform updates, and occasional promotions.',
                  },
                ].map((pref) => (
                  <label
                    key={pref.key}
                    className="flex items-start justify-between gap-4 p-4 border border-border rounded-xl"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{pref.label}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {pref.desc}
                      </p>
                    </div>
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={emailPrefs[pref.key]}
                        disabled
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-border rounded-full peer-checked:bg-accent transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5" />
                    </div>
                  </label>
                ))}
              </div>

              <p className="text-xs text-warm-gray">
                These preferences will become functional in a future update.
              </p>
            </div>
          )}

          {/* ═══════ Artist Profile ═══════ */}
          {activeTab === 'artist' && isArtist && (
            <div className="bg-white border border-border rounded-2xl p-6 md:p-8 space-y-6">
              <div>
                <h2 className="font-semibold text-lg">Artist Profile</h2>
                <p className="text-sm text-muted mt-1">
                  Information displayed on your public artist page.
                </p>
              </div>

              {/* Bio */}
              <div>
                <label
                  htmlFor="artistBio"
                  className="block text-xs font-medium tracking-wide uppercase text-muted mb-2"
                >
                  Bio
                </label>
                <textarea
                  id="artistBio"
                  value={artistBio}
                  onChange={(e) => setArtistBio(e.target.value)}
                  rows={5}
                  maxLength={1000}
                  className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20 resize-none"
                  placeholder="Tell collectors about yourself, your practice, and your inspirations..."
                />
                <p className="text-xs text-warm-gray mt-1.5 text-right">
                  {artistBio.length}/1000
                </p>
              </div>

              {/* Location */}
              <div>
                <label
                  htmlFor="artistLocation"
                  className="block text-xs font-medium tracking-wide uppercase text-muted mb-2"
                >
                  Location
                </label>
                <input
                  id="artistLocation"
                  type="text"
                  value={artistLocation}
                  onChange={(e) => setArtistLocation(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                  placeholder="Melbourne, VIC"
                />
              </div>

              {/* State */}
              <div>
                <label
                  htmlFor="artistState"
                  className="block text-xs font-medium tracking-wide uppercase text-muted mb-2"
                >
                  State
                </label>
                <select
                  id="artistState"
                  value={artistState}
                  onChange={(e) => setArtistState(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm transition-colors appearance-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                >
                  <option value="">Select state</option>
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

              {/* Social Links */}
              <div className="space-y-4">
                <p className="text-xs font-medium tracking-wide uppercase text-muted">
                  Social Links
                </p>
                <div>
                  <label htmlFor="instagram" className="flex items-center gap-2 text-sm text-muted mb-2">
                    <AtSign className="h-4 w-4" /> Instagram
                  </label>
                  <input
                    id="instagram"
                    type="text"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                    placeholder="@handle or https://instagram.com/handle"
                  />
                </div>
                <div>
                  <label htmlFor="tiktok" className="flex items-center gap-2 text-sm text-muted mb-2">
                    <AtSign className="h-4 w-4" /> TikTok
                  </label>
                  <input
                    id="tiktok"
                    type="text"
                    value={tiktokUrl}
                    onChange={(e) => setTiktokUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                    placeholder="@handle or https://tiktok.com/@handle"
                  />
                </div>
                <div>
                  <label htmlFor="facebook" className="flex items-center gap-2 text-sm text-muted mb-2">
                    <AtSign className="h-4 w-4" /> Facebook
                  </label>
                  <input
                    id="facebook"
                    type="text"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>
                <div>
                  <label htmlFor="youtube" className="flex items-center gap-2 text-sm text-muted mb-2">
                    <AtSign className="h-4 w-4" /> YouTube
                  </label>
                  <input
                    id="youtube"
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                    placeholder="https://youtube.com/@channel"
                  />
                </div>
                <div>
                  <label htmlFor="website" className="flex items-center gap-2 text-sm text-muted mb-2">
                    <Globe className="h-4 w-4" /> Website
                  </label>
                  <input
                    id="website"
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              {/* Featured Works */}
              <div className="space-y-4 pt-2 border-t border-border">
                <div>
                  <p className="text-sm font-medium">Featured Works</p>
                  <p className="text-xs text-warm-gray mt-0.5">
                    Select up to 5 artworks to showcase at the top of your profile
                  </p>
                </div>

                {/* Selected featured artworks */}
                {featuredArtworkObjects.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {featuredArtworkObjects.map((artwork, index) => (
                      <div
                        key={artwork.id}
                        className="relative group border border-border rounded-xl overflow-hidden"
                        style={{ width: 120 }}
                      >
                        <div className="relative w-full h-20">
                          <Image
                            src={(artwork.images as string[])?.[0] || '/placeholder.jpg'}
                            alt={artwork.title}
                            fill
                            className="object-cover"
                            sizes="120px"
                          />
                        </div>
                        <div className="p-1.5">
                          <p className="text-[11px] font-medium truncate">{artwork.title}</p>
                          <p className="text-[10px] text-muted">{formatPrice(artwork.price_aud)}</p>
                        </div>
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() =>
                            setFeaturedArtworkIds((ids) =>
                              ids.filter((id) => id !== artwork.id)
                            )
                          }
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                          aria-label={`Remove ${artwork.title}`}
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                        {/* Reorder buttons */}
                        <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setFeaturedArtworkIds((ids) => {
                                  const newIds = [...ids];
                                  [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
                                  return newIds;
                                });
                              }}
                              className="w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                              aria-label="Move up"
                            >
                              <ArrowUp className="h-3 w-3 text-white" />
                            </button>
                          )}
                          {index < featuredArtworkObjects.length - 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setFeaturedArtworkIds((ids) => {
                                  const newIds = [...ids];
                                  [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
                                  return newIds;
                                });
                              }}
                              className="w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                              aria-label="Move down"
                            >
                              <ArrowDown className="h-3 w-3 text-white" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add artwork button */}
                {featuredArtworkIds.length < 5 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowArtworkPicker(!showArtworkPicker)}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-xl text-sm text-muted hover:border-accent hover:text-accent transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add artwork ({featuredArtworkIds.length}/5)
                    </button>

                    {showArtworkPicker && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => { setShowArtworkPicker(false); setArtworkSearch(''); }} />
                        <div className="absolute left-0 top-full mt-2 z-20 w-80 bg-white border border-border rounded-xl shadow-lg overflow-hidden animate-scale-in origin-top-left">
                          {/* Search */}
                          <div className="p-3 border-b border-border">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                              <input
                                type="text"
                                value={artworkSearch}
                                onChange={(e) => setArtworkSearch(e.target.value)}
                                placeholder="Search your artworks..."
                                className="w-full pl-9 pr-3 py-2 bg-muted-bg border border-border rounded-lg text-sm placeholder:text-warm-gray focus:border-accent focus:ring-1 focus:ring-accent/20"
                                autoFocus
                              />
                            </div>
                          </div>

                          {/* Artwork list */}
                          <div className="max-h-64 overflow-y-auto">
                            {availableArtworks.length === 0 ? (
                              <div className="p-4 text-center text-sm text-muted">
                                <ImageIcon className="h-6 w-6 mx-auto mb-2 text-border" />
                                {artworkSearch.trim()
                                  ? 'No matching artworks found'
                                  : 'No approved artworks available'}
                              </div>
                            ) : (
                              availableArtworks.map((artwork) => (
                                <button
                                  key={artwork.id}
                                  type="button"
                                  onClick={() => {
                                    setFeaturedArtworkIds((ids) => [...ids, artwork.id]);
                                    if (featuredArtworkIds.length + 1 >= 5) {
                                      setShowArtworkPicker(false);
                                      setArtworkSearch('');
                                    }
                                  }}
                                  className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-muted-bg transition-colors"
                                >
                                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted-bg">
                                    <Image
                                      src={(artwork.images as string[])?.[0] || '/placeholder.jpg'}
                                      alt={artwork.title}
                                      fill
                                      className="object-cover"
                                      sizes="48px"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{artwork.title}</p>
                                    <p className="text-xs text-muted">{formatPrice(artwork.price_aud)}</p>
                                  </div>
                                  <Plus className="h-4 w-4 text-muted flex-shrink-0" />
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
              <div className="flex items-start gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  role="switch"
                  aria-checked={acceptsCommissions}
                  onClick={() => setAcceptsCommissions(!acceptsCommissions)}
                  className={`relative mt-0.5 inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent/30 ${
                    acceptsCommissions ? 'bg-accent' : 'bg-border'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      acceptsCommissions ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <div>
                  <p className="text-sm font-medium">Open to commissions</p>
                  <p className="text-xs text-warm-gray mt-0.5">
                    Show a &quot;Commission a Piece&quot; button on your profile so buyers can request custom work
                  </p>
                </div>
              </div>

              {artistStatus && (
                <StatusMessage
                  type={artistStatus.type}
                  message={artistStatus.message}
                />
              )}

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={saveArtistProfile}
                  disabled={artistSaving}
                  className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-full hover:bg-accent transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {artistSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>

                <Link
                  href="/artist/dashboard"
                  className="text-sm text-muted hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                >
                  Manage storefront <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* ═══════ Subscription ═══════ */}
          {activeTab === 'subscription' && isArtist && (() => {
            const subStatus = user?.subscription_status || 'trial';
            const statusLabel: Record<string, string> = {
              trial: 'Free Plan',
              pending_activation: 'Pending Activation',
              active: 'Active — $30/mo',
              past_due: 'Past Due',
              paused: 'Paused',
              cancelled: 'Cancelled',
            };
            const statusColor: Record<string, string> = {
              trial: 'bg-accent text-white',
              pending_activation: 'bg-amber-500 text-white',
              active: 'bg-green-500 text-white',
              past_due: 'bg-red-500 text-white',
              paused: 'bg-gray-400 text-white',
              cancelled: 'bg-gray-400 text-white',
            };
            const dotColor: Record<string, string> = {
              trial: 'bg-accent',
              pending_activation: 'bg-amber-500',
              active: 'bg-green-500',
              past_due: 'bg-red-500',
              paused: 'bg-gray-400',
              cancelled: 'bg-gray-400',
            };
            const statusDescription: Record<string, string> = {
              trial: 'Your $30/month subscription starts after your first sale. No payment needed right now.',
              pending_activation: 'Your first sale completed! Add a payment method to keep your listings live.',
              active: 'Your subscription is active. Your listings are live.',
              past_due: 'Your payment failed. Please update your payment method.',
              paused: 'Your listings are paused. Add a payment method to reactivate.',
              cancelled: 'Your subscription was cancelled. Resubscribe to get your listings back.',
            };

            return (
              <div className="bg-white border border-border rounded-2xl p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="font-semibold text-lg">Subscription</h2>
                  <p className="text-sm text-muted mt-1">
                    Your current plan and billing details.
                  </p>
                </div>

                <div className={`p-5 rounded-xl ${
                  subStatus === 'past_due' ? 'bg-red-50 border border-red-200' :
                  subStatus === 'pending_activation' ? 'bg-amber-50 border border-amber-200' :
                  subStatus === 'active' ? 'bg-green-50 border border-green-200' :
                  'bg-accent-subtle border border-accent/10'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${dotColor[subStatus] || 'bg-accent'}`} />
                    <p className="font-semibold text-sm">{statusLabel[subStatus] || subStatus}</p>
                  </div>
                  <p className="text-sm text-muted ml-5.5">
                    {statusDescription[subStatus]}
                  </p>
                </div>

                <div className="border border-border rounded-xl divide-y divide-border">
                  <div className="flex items-center justify-between p-4">
                    <span className="text-sm text-muted">Status</span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[subStatus] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabel[subStatus] || subStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <span className="text-sm text-muted">Price</span>
                    <span className="text-sm font-medium">
                      {subStatus === 'trial' ? 'Free (until first sale)' : '$30/month'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <span className="text-sm text-muted">Commission rate</span>
                    <span className="text-sm font-medium">0%</span>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <span className="text-sm text-muted">Payout setup</span>
                    <span className="text-sm font-medium">
                      {user?.stripe_account_id ? (
                        <span className="text-green-600">Connected</span>
                      ) : (
                        <Link href="/artist/settings/payouts" className="text-accent-dark hover:underline">
                          Set up payouts
                        </Link>
                      )}
                    </span>
                  </div>
                </div>

                {subStatus !== 'trial' && (
                  <Link
                    href="/artist/subscribe"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-full hover:bg-accent transition-colors"
                  >
                    <CreditCard className="h-4 w-4" />
                    {subStatus === 'active' ? 'Manage Subscription' : 'Go to Subscription'}
                  </Link>
                )}

                {subStatus === 'trial' && (
                  <p className="text-xs text-warm-gray">
                    Your subscription will start after your first sale. You&apos;ll have
                    time to set up your payment method.
                  </p>
                )}
              </div>
            );
          })()}

          {/* ═══════ Danger Zone ═══════ */}
          {activeTab === 'danger' && (
            <div className="bg-white border border-error/20 rounded-2xl p-6 md:p-8 space-y-6">
              <div>
                <h2 className="font-semibold text-lg text-error">Danger Zone</h2>
                <p className="text-sm text-muted mt-1">
                  Irreversible actions. Please be certain.
                </p>
              </div>

              <div className="border border-error/20 rounded-xl p-5">
                <h3 className="font-medium text-sm">Delete my account</h3>
                <p className="text-sm text-muted mt-1">
                  Permanently delete your account and all associated data. This
                  action cannot be undone. Any active orders must be completed
                  or cancelled first.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setDeleteConfirmText('');
                    setDeleteError(null);
                  }}
                  className="mt-4 px-5 py-2 border border-error/30 text-error text-sm font-medium rounded-full hover:bg-error/5 transition-colors"
                >
                  Delete my account
                </button>
              </div>

              {/* Delete account modal */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div
                    className="absolute inset-0 bg-black/40"
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  />
                  <dialog
                    open
                    className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 z-10"
                  >
                    <h2 className="text-lg font-semibold text-primary">Delete your account?</h2>
                    <p className="text-sm text-muted leading-relaxed">
                      This will permanently delete your account, profile, and all your artwork listings. This action cannot be undone.
                    </p>

                    {isArtist && artistStats && (artistStats.activeListings > 0 || artistStats.pendingOrders > 0) && (
                      <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-amber-800">
                          You have {artistStats.activeListings} active listing{artistStats.activeListings !== 1 ? 's' : ''}
                          {artistStats.pendingOrders > 0 && <> and {artistStats.pendingOrders} pending order{artistStats.pendingOrders !== 1 ? 's' : ''}</>}.
                          These will be cancelled.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="text-sm text-error font-medium block mb-2">
                        Type <span className="font-mono bg-error/5 px-1.5 py-0.5 rounded">DELETE</span> to confirm:
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-error/30 rounded-xl text-sm placeholder:text-warm-gray focus:border-error focus:ring-1 focus:ring-error/20"
                        placeholder="Type DELETE"
                        autoFocus
                      />
                    </div>

                    {deleteError && (
                      <p className="text-sm text-error">{deleteError}</p>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                        className="px-5 py-2 bg-error text-white text-sm font-semibold rounded-full hover:bg-error/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                        onClick={async () => {
                          setDeleteLoading(true);
                          setDeleteError(null);
                          try {
                            const res = await fetch('/api/account/delete', { method: 'POST' });
                            if (!res.ok) {
                              const body = await res.json().catch(() => ({}));
                              throw new Error(body.error || 'Failed to delete account');
                            }
                            router.push('/');
                          } catch (err) {
                            setDeleteError(err instanceof Error ? err.message : 'Something went wrong');
                            setDeleteLoading(false);
                          }
                        }}
                      >
                        {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Delete my account
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                        className="px-5 py-2 text-sm text-muted hover:text-foreground transition-colors"
                        disabled={deleteLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </dialog>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
