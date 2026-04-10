'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  User,
  MapPin,
  Lock,
  Bell,
  Palette,
  ArrowRight,
  Check,
  Loader2,
  AlertCircle,
  CreditCard,
  Trash2,
  AtSign,
  Globe,
  ExternalLink,
} from 'lucide-react';
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
  const [instagramUrl, setInstagramUrl] = useState(user?.social_links?.instagram || '');
  const [tiktokUrl, setTiktokUrl] = useState(user?.social_links?.tiktok || '');
  const [facebookUrl, setFacebookUrl] = useState(user?.social_links?.facebook || '');
  const [youtubeUrl, setYoutubeUrl] = useState(user?.social_links?.youtube || '')
  const [websiteUrl, setWebsiteUrl] = useState(user?.social_links?.website || '');
  const [artistSaving, setArtistSaving] = useState(false);
  const [artistStatus, setArtistStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Danger zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const isArtist = user?.role === 'artist' || user?.role === 'admin';

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
      console.log('[Settings] Profile save result:', result);

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
      console.error('[Settings] Profile save error:', err);
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
      console.log('[Settings] Address save result:', result);

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
      console.error('[Settings] Address save error:', err);
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
      console.error('[Settings] Password change error:', err);
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
          social_links: socialLinks,
        }),
      });
      clearTimeout(timeout);

      const result = await res.json();
      console.log('[Settings] Artist profile save result:', result);

      if (!res.ok) throw new Error(result.error || 'Failed to update artist profile.');

      await refreshUser();
      setArtistStatus({ type: 'success', message: 'Artist profile updated.' });
    } catch (err) {
      console.error('[Settings] Artist save error:', err);
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
          {activeTab === 'subscription' && isArtist && (
            <div className="bg-white border border-border rounded-2xl p-6 md:p-8 space-y-6">
              <div>
                <h2 className="font-semibold text-lg">Subscription</h2>
                <p className="text-sm text-muted mt-1">
                  Your current plan and billing details.
                </p>
              </div>

              <div className="p-5 bg-accent-subtle border border-accent/10 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2.5 h-2.5 bg-accent rounded-full" />
                  <p className="font-semibold text-sm">Free — Launch Period</p>
                </div>
                <p className="text-sm text-muted ml-5.5">
                  You&apos;re on the free launch plan. Zero commission on all sales.
                  We&apos;ll notify you before any changes to pricing.
                </p>
              </div>

              <div className="border border-border rounded-xl divide-y divide-border">
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm text-muted">Plan</span>
                  <span className="text-sm font-medium">Free (Launch)</span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm text-muted">Commission rate</span>
                  <span className="text-sm font-medium">0%</span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm text-muted">Next billing date</span>
                  <span className="text-sm font-medium text-muted">N/A</span>
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

              <p className="text-xs text-warm-gray">
                When paid plans are introduced, you&apos;ll be able to manage your
                subscription and billing here.
              </p>
            </div>
          )}

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

                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="mt-4 px-5 py-2 border border-error/30 text-error text-sm font-medium rounded-full hover:bg-error/5 transition-colors"
                  >
                    Delete my account
                  </button>
                ) : (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-error font-medium">
                      Type <span className="font-mono bg-error/5 px-1.5 py-0.5 rounded">DELETE</span> to confirm:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full max-w-xs px-4 py-2.5 bg-white border border-error/30 rounded-xl text-sm placeholder:text-warm-gray focus:border-error focus:ring-1 focus:ring-error/20"
                      placeholder="Type DELETE"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={deleteConfirmText !== 'DELETE'}
                        className="px-5 py-2 bg-error text-white text-sm font-semibold rounded-full hover:bg-error/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={() => {
                          // Placeholder — actual deletion logic to come
                          alert('Account deletion is not yet implemented. Contact support@signo.art for assistance.');
                        }}
                      >
                        Permanently delete
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                        className="px-5 py-2 text-sm text-muted hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
