'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import {
  LogOut,
  Heart,
  Shield,
  ShoppingBag,
  Settings,
  ImagePlus,
  Images,
  DollarSign,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/AuthProvider';
import Avatar from '@/components/ui/Avatar';

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
  // Use the shared AuthProvider context instead of making independent API calls.
  // This eliminates redundant getUser() + fetchProfile() calls on every page load.
  const { user, loading } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isArtist = user?.role === 'artist' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

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
            backgroundColor: '#e8e5df',
          }}
        />
      </div>
    );
  }

  // --- Not logged in ---
  if (!user) {
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
            color: '#ffffff',
            backgroundColor: '#6b7c4e',
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
  return (
    <div ref={menuRef} style={{ position: 'relative', marginLeft: 16, flexShrink: 0, zIndex: 50 }}>
      {/* Avatar button */}
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          border: 'none',
          outline: 'none',
          cursor: 'pointer',
          padding: 0,
          background: 'none',
          position: 'relative',
          zIndex: 50,
          flexShrink: 0,
        }}
      >
        <Avatar
          avatarUrl={user.avatar_url}
          name={user.full_name ?? ''}
          size={40}
        />
      </button>

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
            border: '1px solid #e8e5df',
            borderRadius: 12,
            boxShadow: '0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          {/* User info */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e8e5df' }}>
            <p style={{ fontWeight: 600, fontSize: 14, margin: 0, color: '#1a1a1a' }}>
              {user.full_name || 'User'}
            </p>
            <p style={{ fontSize: 12, color: '#7a7a72', margin: '2px 0 0 0' }}>
              {user.email}
            </p>
          </div>

          {/* Common links */}
          <div style={{ padding: '4px 0' }}>
            <DropdownLink href="/orders" icon={ShoppingBag} label="My Orders" onClick={() => setMenuOpen(false)} />
            <DropdownLink href="/favourites" icon={Heart} label="Favourites" onClick={() => setMenuOpen(false)} />
            <DropdownLink href="/settings" icon={Settings} label="Settings" onClick={() => setMenuOpen(false)} />
          </div>

          {/* Artist links */}
          {isArtist && (
            <div style={{ padding: '4px 0', borderTop: '1px solid #e8e5df' }}>
              <DropdownLink href="/artist/artworks" icon={Images} label="My Artworks" onClick={() => setMenuOpen(false)} />
              <DropdownLink href="/artist/artworks/new" icon={ImagePlus} label="Upload Artwork" onClick={() => setMenuOpen(false)} />
              <DropdownLink href="/artist/earnings" icon={DollarSign} label="Earnings" onClick={() => setMenuOpen(false)} />
            </div>
          )}

          {/* Admin link */}
          {isAdmin && (
            <div style={{ padding: '4px 0', borderTop: '1px solid #e8e5df' }}>
              <DropdownLink href="/admin/reviews" icon={Shield} label="Admin Panel" onClick={() => setMenuOpen(false)} />
            </div>
          )}

          {/* Sign out */}
          <div style={{ borderTop: '1px solid #e8e5df', padding: '4px 0' }}>
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
      <Icon style={{ width: 16, height: 16, color: '#7a7a72' }} />
      {label}
    </Link>
  );
}
