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
  Palette,
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
      <div className="ml-4 shrink-0">
        <div className="w-10 h-10 rounded-full bg-border" />
      </div>
    );
  }

  // --- Not logged in ---
  if (!user) {
    return (
      <div className="flex items-center gap-2 ml-4 shrink-0">
        <Link
          href="/login"
          className="px-4 py-2 text-sm font-medium text-foreground no-underline"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="px-4 py-2 text-sm font-semibold text-white bg-accent rounded-full no-underline"
        >
          Join Signo
        </Link>
      </div>
    );
  }

  // --- Logged in ---
  return (
    <div ref={menuRef} className="relative ml-4 shrink-0 z-50">
      {/* Avatar button */}
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="border-none outline-none cursor-pointer p-0 bg-transparent relative z-50 shrink-0"
      >
        <Avatar
          avatarUrl={user.avatar_url}
          name={user.full_name ?? ''}
          size={40}
        />
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className="absolute top-full right-0 mt-2 min-w-[240px] w-[260px] bg-white border border-border rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] z-[9999] overflow-hidden">
          {/* User info */}
          <div className="px-4 py-3 border-b border-border">
            <p className="font-semibold text-sm m-0 text-foreground">
              {user.full_name || 'User'}
            </p>
            <p className="text-xs text-muted mt-0.5 mb-0">
              {user.email}
            </p>
          </div>

          {/* Common links */}
          <div className="py-1">
            <DropdownLink href="/orders" icon={ShoppingBag} label="My Orders" onClick={() => setMenuOpen(false)} />
            <DropdownLink href="/favourites" icon={Heart} label="Favourites" onClick={() => setMenuOpen(false)} />
            <DropdownLink href="/settings" icon={Settings} label="Settings" onClick={() => setMenuOpen(false)} />
          </div>

          {/* Artist links */}
          {isArtist && (
            <div className="py-1 border-t border-border">
              <DropdownLink href="/artist/dashboard" icon={Palette} label="Seller Dashboard" onClick={() => setMenuOpen(false)} />
              <DropdownLink href="/artist/artworks" icon={Images} label="My Artworks" onClick={() => setMenuOpen(false)} />
              <DropdownLink href="/artist/artworks/new" icon={ImagePlus} label="Upload Artwork" onClick={() => setMenuOpen(false)} />
              <DropdownLink href="/artist/earnings" icon={DollarSign} label="Earnings" onClick={() => setMenuOpen(false)} />
            </div>
          )}

          {/* Admin link */}
          {isAdmin && (
            <div className="py-1 border-t border-border">
              <DropdownLink href="/admin/reviews" icon={Shield} label="Admin Panel" onClick={() => setMenuOpen(false)} />
            </div>
          )}

          {/* Sign out */}
          <div className="border-t border-border py-1">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSignOut();
              }}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-error bg-transparent border-none cursor-pointer w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Dropdown link — Tailwind classes ── */
function DropdownLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground no-underline hover:bg-cream transition-colors"
    >
      <Icon className="w-4 h-4 text-muted" />
      {label}
    </Link>
  );
}
