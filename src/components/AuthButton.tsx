'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  User,
  LogOut,
  Palette,
  LayoutDashboard,
  Shield,
  ShoppingBag,
  Settings,
  ImagePlus,
  Images,
  DollarSign,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
}

function getInitials(name: string): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Clear any stale Supabase cookies from the browser. */
function clearSupabaseCookies() {
  try {
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name.startsWith('sb-')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
  } catch {
    // Ignore cookie clearing errors
  }
}

export default function AuthButton() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isArtist = profile?.role === 'artist' || profile?.role === 'admin';
  const isAdmin = profile?.role === 'admin';

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, avatar_url')
        .eq('id', userId)
        .single();
      if (error || !data) return null;
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    // Hard 3-second timeout: if auth check hasn't resolved, assume not logged in
    const timeout = setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      setProfile(null);
      setLoading(false);
    }, 3000);

    async function init() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (cancelled) return;

        if (error || !session?.user) {
          // No session or error — not logged in
          cancelled = true;
          clearTimeout(timeout);
          setProfile(null);
          setLoading(false);
          return;
        }

        // Session exists — try to fetch profile to validate it's not stale
        const prof = await fetchProfile(session.user.id);

        if (cancelled) return;
        clearTimeout(timeout);
        cancelled = true;

        if (prof) {
          // Valid session + valid profile
          setProfile(prof);
          setLoading(false);
        } else {
          // Session exists but profile fetch failed — stale/invalid session
          // Clear the bad session silently
          try {
            await supabase.auth.signOut();
          } catch {
            // Ignore signOut errors
          }
          clearSupabaseCookies();
          setProfile(null);
          setLoading(false);
        }
      } catch {
        // Any error at all — default to not logged in
        if (cancelled) return;
        clearTimeout(timeout);
        cancelled = true;
        setProfile(null);
        setLoading(false);
      }
    }

    init();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          const prof = await fetchProfile(session.user.id);
          if (prof) {
            setProfile(prof);
          } else {
            // Stale session on auth change — clear it
            try { await supabase.auth.signOut(); } catch { /* ignore */ }
            clearSupabaseCookies();
            setProfile(null);
          }
          setLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSignOut() {
    setMenuOpen(false);
    setProfile(null);

    // Force redirect after 2 seconds no matter what — in case signOut() hangs
    const forceRedirect = setTimeout(() => {
      clearSupabaseCookies();
      window.location.href = '/';
    }, 2000);

    try {
      const supabase = createClient();
      // Race signOut against a 1.5s timeout
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch {
      // Ignore signOut errors
    }

    clearTimeout(forceRedirect);
    clearSupabaseCookies();
    window.location.href = '/';
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div style={{ marginLeft: 16, flexShrink: 0 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#E8E2D9',
          }}
        />
      </div>
    );
  }

  // --- Not logged in ---
  if (!profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16, flexShrink: 0 }}>
        <Link
          href="/login"
          style={{
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 500,
            color: '#1a1a1a',
            textDecoration: 'none',
          }}
        >
          Sign In
        </Link>
        <Link
          href="/register"
          style={{
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 600,
            color: '#1a1a1a',
            backgroundColor: '#C8E600',
            borderRadius: 999,
            textDecoration: 'none',
          }}
        >
          Join Signo
        </Link>
      </div>
    );
  }

  // --- Logged in ---
  const initials = getInitials(profile.full_name ?? '');

  return (
    <div ref={menuRef} style={{ position: 'relative', marginLeft: 16, flexShrink: 0, zIndex: 50 }}>
      {/* Avatar button — ALL inline styles */}
      {profile.avatar_url ? (
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            width: 40,
            height: 40,
            minWidth: 40,
            minHeight: 40,
            borderRadius: '50%',
            overflow: 'hidden',
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            padding: 0,
            background: '#E8E2D9',
            position: 'relative',
            zIndex: 50,
            flexShrink: 0,
          }}
        >
          <Image
            src={profile.avatar_url}
            alt={profile.full_name ?? 'Avatar'}
            width={40}
            height={40}
            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            width: 40,
            height: 40,
            minWidth: 40,
            minHeight: 40,
            borderRadius: '50%',
            backgroundColor: '#2C2C2A',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 50,
            flexShrink: 0,
            padding: 0,
            lineHeight: 1,
          }}
        >
          {initials}
        </button>
      )}

      {/* Dropdown menu */}
      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            minWidth: 240,
            width: 260,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E2DB',
            borderRadius: 12,
            boxShadow: '0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          {/* User info */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E2DB' }}>
            <p style={{ fontWeight: 600, fontSize: 14, margin: 0, color: '#1a1a1a' }}>
              {profile.full_name || 'User'}
            </p>
            <p style={{ fontSize: 12, color: '#8A8880', margin: '2px 0 0 0' }}>
              {profile.email}
            </p>
          </div>

          {/* Common links */}
          <div style={{ padding: '4px 0' }}>
            <DropdownLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={() => setMenuOpen(false)} />
            <DropdownLink href="/dashboard" icon={ShoppingBag} label="My Orders" onClick={() => setMenuOpen(false)} />
            <DropdownLink href="/settings" icon={Settings} label="Settings" onClick={() => setMenuOpen(false)} />
          </div>

          {/* Artist links */}
          {isArtist && (
            <div style={{ padding: '4px 0', borderTop: '1px solid #E5E2DB' }}>
              <DropdownLink href="/artist/dashboard" icon={Palette} label="Artist Dashboard" onClick={() => setMenuOpen(false)} />
              <DropdownLink href="/artist/artworks" icon={Images} label="My Artworks" onClick={() => setMenuOpen(false)} />
              <DropdownLink href="/artist/artworks/new" icon={ImagePlus} label="Upload Artwork" onClick={() => setMenuOpen(false)} />
              <DropdownLink href="/artist/earnings" icon={DollarSign} label="Earnings" onClick={() => setMenuOpen(false)} />
            </div>
          )}

          {/* Admin link */}
          {isAdmin && (
            <div style={{ padding: '4px 0', borderTop: '1px solid #E5E2DB' }}>
              <DropdownLink href="/admin/reviews" icon={Shield} label="Admin Panel" onClick={() => setMenuOpen(false)} />
            </div>
          )}

          {/* Sign out */}
          <div style={{ borderTop: '1px solid #E5E2DB', padding: '4px 0' }}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSignOut();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                fontSize: 14,
                color: '#dc2626',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <LogOut style={{ width: 16, height: 16 }} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Dropdown link — inline styles ── */
function DropdownLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        fontSize: 14,
        color: '#1a1a1a',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FAF8F4'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <Icon style={{ width: 16, height: 16, color: '#8A8880' }} />
      {label}
    </Link>
  );
}
