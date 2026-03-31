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
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { uploadAvatar } from '@/lib/supabase/storage';
import AvatarUpload from '@/components/AvatarUpload';

// ── Types ──

type TabId = 'profile' | 'address' | 'password' | 'notifications';

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
  const [address, setAddress] = useState<Address>({
    street: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Australia',
  });
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressStatus, setAddressStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Password state
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

  const isArtist = user?.role === 'artist';

  // Avatar upload handler
  const handleAvatarUpload = useCallback(
    async (file: File, onProgress: (p: number) => void) => {
      if (!user) throw new Error('Not authenticated');
      return uploadAvatar(file, user.id, onProgress);
    },
    [user]
  );

  // Save profile
  async function saveProfile() {
    if (!user) return;
    setProfileSaving(true);
    setProfileStatus(null);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshUser();
      setProfileStatus({ type: 'success', message: 'Profile updated.' });
    } catch (err) {
      console.error('[Settings] Profile save error:', err);
      setProfileStatus({
        type: 'error',
        message: 'Failed to update profile. Please try again.',
      });
    } finally {
      setProfileSaving(false);
    }
  }

  // Save address (stored in profile as JSON — placeholder for now)
  async function saveAddress() {
    if (!user) return;
    setAddressSaving(true);
    setAddressStatus(null);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          // Store address as part of social_links for now — separate column in Phase 5
          social_links: {
            ...(user.social_links || {}),
            _shipping_address: JSON.stringify(address),
          },
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshUser();
      setAddressStatus({
        type: 'success',
        message: 'Shipping address saved.',
      });
    } catch (err) {
      console.error('[Settings] Address save error:', err);
      setAddressStatus({
        type: 'error',
        message: 'Failed to save address. Please try again.',
      });
    } finally {
      setAddressSaving(false);
    }
  }

  // Change password
  async function changePassword() {
    setPasswordStatus(null);

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
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

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

  const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'address', label: 'Shipping Address', icon: MapPin },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

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

          {/* Artist link */}
          {isArtist && (
            <div className="mt-6 pt-6 border-t border-border">
              <Link
                href="/artist/settings"
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium text-muted hover:bg-muted-bg hover:text-foreground transition-colors"
              >
                <Palette className="h-4 w-4 flex-shrink-0" />
                Artist Settings
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
                  passwordSaving || !newPassword || !confirmPassword
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
                  Choose what emails you&apos;d like to receive.
                </p>
              </div>

              <div className="space-y-4">
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
                    className="flex items-start justify-between gap-4 p-4 border border-border rounded-xl cursor-pointer hover:border-warm-gray transition-colors"
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
                        onChange={(e) =>
                          setEmailPrefs((prev) => ({
                            ...prev,
                            [pref.key]: e.target.checked,
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-border rounded-full peer-checked:bg-accent transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5" />
                    </div>
                  </label>
                ))}
              </div>

              <p className="text-xs text-warm-gray">
                Email notification preferences are saved automatically. Actual
                email delivery will be enabled in a future update.
              </p>
            </div>
          )}

          {/* Artist settings link (mobile — visible below content) */}
          {isArtist && (
            <div className="md:hidden mt-6">
              <Link
                href="/artist/settings"
                className="flex items-center justify-between p-5 bg-accent-subtle border border-accent/10 rounded-2xl hover:border-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Palette className="h-5 w-5 text-accent-dark" />
                  <div>
                    <p className="font-medium text-sm">Artist Settings</p>
                    <p className="text-xs text-muted">
                      Manage your storefront and selling preferences
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-accent-dark" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
