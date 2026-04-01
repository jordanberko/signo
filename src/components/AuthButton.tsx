'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function AuthButton() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
      if (error) {
        console.error('[AuthButton] Profile fetch error:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[AuthButton] Profile fetch exception:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function init() {
      try {
        // Get session from Supabase (reads from localStorage first)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[AuthButton] getSession error:', error.message);
          if (!cancelled) setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('[AuthButton] Auth state: logged in as', session.user.email);
          const prof = await fetchProfile(session.user.id);
          if (!cancelled) {
            setProfile(prof);
            setLoading(false);
          }
        } else {
          console.log('[AuthButton] Auth state: not logged in');
          if (!cancelled) {
            setProfile(null);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('[AuthButton] init error:', err);
        if (!cancelled) setLoading(false);
      }
    }

    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthButton] onAuthStateChange:', event, session?.user?.email ?? 'no user');

        if (event === 'SIGNED_OUT') {
          if (!cancelled) {
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        if (session?.user) {
          const prof = await fetchProfile(session.user.id);
          if (!cancelled) {
            setProfile(prof);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      cancelled = true;
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
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  // --- Loading state ---
  if (loading) {
    return (
      <>
        <div className="ml-3">
          <div className="w-9 h-9 rounded-full bg-muted-bg animate-pulse" />
        </div>
      </>
    );
  }

  // --- Not logged in ---
  if (!profile) {
    return (
      <>
        <div className="flex items-center gap-2 ml-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-foreground hover:text-accent-dark transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 bg-accent text-primary text-sm font-semibold rounded-full hover:bg-accent-light transition-colors duration-300"
          >
            Join Signo
          </Link>
        </div>
      </>
    );
  }

  // --- Logged in ---
  const initials = getInitials(profile.full_name ?? '');

  return (
    <>
      <div className="relative ml-3" ref={menuRef}>
        {/* Avatar button */}
        {profile.avatar_url ? (
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-full overflow-hidden ring-2 ring-transparent hover:ring-accent/30 transition-all duration-200"
            style={{ width: 36, height: 36 }}
          >
            <Image
              src={profile.avatar_url}
              alt={profile.full_name ?? 'Avatar'}
              width={36}
              height={36}
              className="object-cover w-full h-full"
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center hover:bg-accent hover:text-primary transition-colors duration-200 ring-2 ring-transparent hover:ring-accent/30"
          >
            {initials || <User className="h-4 w-4" />}
          </button>
        )}

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white border border-border rounded-xl shadow-xl py-1 z-50 animate-scale-in origin-top-right">
            {/* User info */}
            <div className="px-4 py-3 border-b border-border">
              <p className="font-medium text-sm truncate">{profile.full_name || 'User'}</p>
              <p className="text-xs text-muted truncate mt-0.5">{profile.email}</p>
            </div>

            {/* Common links */}
            <div className="py-1">
              <DropdownLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={() => setMenuOpen(false)} />
              <DropdownLink href="/dashboard" icon={ShoppingBag} label="My Orders" onClick={() => setMenuOpen(false)} />
              <DropdownLink href="/settings" icon={Settings} label="Settings" onClick={() => setMenuOpen(false)} />
            </div>

            {/* Artist links */}
            {isArtist && (
              <div className="py-1 border-t border-border">
                <DropdownLink href="/artist/dashboard" icon={Palette} label="Artist Dashboard" onClick={() => setMenuOpen(false)} />
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
            <div className="border-t border-border pt-1">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error/5 transition-colors w-full text-left"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Dropdown link ── */
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
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-cream transition-colors"
    >
      <Icon className="h-4 w-4 text-muted" />
      {label}
    </Link>
  );
}
