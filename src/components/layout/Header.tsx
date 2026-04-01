'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Menu,
  X,
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
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { getInitials } from '@/lib/utils';

export default function Header() {
  const { user, loading, clearUser } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isArtist = user?.role === 'artist' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll shadow
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function handleSignOut() {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    // Clear local state immediately so header updates instantly
    clearUser();
    // Sign out from Supabase
    const supabase = createClient();
    await supabase.auth.signOut();
    // Navigate home
    router.push('/');
    router.refresh();
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  }

  // Avatar component — shows uploaded image or initials fallback
  function AvatarButton({ size = 36, onClick }: { size?: number; onClick?: () => void }) {
    const initials = getInitials(user?.full_name ?? '');

    if (user?.avatar_url) {
      return (
        <button
          type="button"
          onClick={onClick}
          className="rounded-full overflow-hidden ring-2 ring-transparent hover:ring-accent/30 transition-all duration-200"
          style={{ width: size, height: size }}
        >
          <Image
            src={user.avatar_url}
            alt={user.full_name ?? 'Avatar'}
            width={size}
            height={size}
            className="object-cover w-full h-full"
          />
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center hover:bg-accent hover:text-primary transition-colors duration-200 ring-2 ring-transparent hover:ring-accent/30"
        style={{ width: size, height: size }}
      >
        {initials || <User className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background/95 backdrop-blur-md shadow-sm border-b border-border/50'
          : 'bg-background border-b border-border'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-semibold tracking-wide text-primary group-hover:text-accent-dark transition-colors duration-300">
              SIGNO
            </span>
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
              <input
                type="text"
                placeholder="Search artwork, artists, styles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-cream border border-border rounded-full text-sm placeholder:text-warm-gray focus:bg-white focus:border-accent transition-all"
              />
            </div>
          </form>

          {/* Nav Links - Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/browse"
              className="px-3 py-2 text-sm font-medium text-foreground hover:text-accent-dark transition-colors rounded-lg hover:bg-cream"
            >
              Browse
            </Link>
            <Link
              href="/how-it-works"
              className="px-3 py-2 text-sm font-medium text-foreground hover:text-accent-dark transition-colors rounded-lg hover:bg-cream"
            >
              How It Works
            </Link>

            {/* Auth section */}
            {loading ? (
              /* Loading skeleton — gray circle placeholder */
              <div className="ml-3">
                <div className="w-9 h-9 rounded-full bg-muted-bg animate-pulse" />
              </div>
            ) : user ? (
              /* Logged in — avatar with dropdown */
              <div className="relative ml-3" ref={menuRef}>
                <AvatarButton
                  size={36}
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                />

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-border rounded-xl shadow-xl py-1 z-50 animate-scale-in origin-top-right">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-border">
                      <p className="font-medium text-sm truncate">
                        {user.full_name || 'User'}
                      </p>
                      <p className="text-xs text-muted truncate mt-0.5">
                        {user.email}
                      </p>
                    </div>

                    {/* Common links */}
                    <div className="py-1">
                      <DropdownLink
                        href="/dashboard"
                        icon={LayoutDashboard}
                        label="Dashboard"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <DropdownLink
                        href="/dashboard"
                        icon={ShoppingBag}
                        label="My Orders"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <DropdownLink
                        href="/settings"
                        icon={Settings}
                        label="Settings"
                        onClick={() => setUserMenuOpen(false)}
                      />
                    </div>

                    {/* Artist links */}
                    {isArtist && (
                      <div className="py-1 border-t border-border">
                        <DropdownLink
                          href="/artist/dashboard"
                          icon={Palette}
                          label="Artist Dashboard"
                          onClick={() => setUserMenuOpen(false)}
                        />
                        <DropdownLink
                          href="/artist/artworks"
                          icon={Images}
                          label="My Artworks"
                          onClick={() => setUserMenuOpen(false)}
                        />
                        <DropdownLink
                          href="/artist/artworks/new"
                          icon={ImagePlus}
                          label="Upload Artwork"
                          onClick={() => setUserMenuOpen(false)}
                        />
                        <DropdownLink
                          href="/artist/earnings"
                          icon={DollarSign}
                          label="Earnings"
                          onClick={() => setUserMenuOpen(false)}
                        />
                      </div>
                    )}

                    {/* Admin link */}
                    {isAdmin && (
                      <div className="py-1 border-t border-border">
                        <DropdownLink
                          href="/admin/reviews"
                          icon={Shield}
                          label="Admin Panel"
                          onClick={() => setUserMenuOpen(false)}
                        />
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
            ) : (
              /* Not logged in — Sign In + Join buttons */
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
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {/* Show avatar on mobile too when logged in */}
            {!loading && user && (
              <div className="relative" ref={!mobileMenuOpen ? menuRef : undefined}>
                <AvatarButton
                  size={32}
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                />
              </div>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-foreground hover:text-accent-dark transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-fade-in">
          {/* Search */}
          <form onSubmit={handleSearch} className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
              <input
                type="text"
                placeholder="Search artwork..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-cream border border-border rounded-full text-sm"
              />
            </div>
          </form>

          <nav className="px-4 pb-5 space-y-1">
            <MobileLink href="/browse" label="Browse Art" onClick={() => setMobileMenuOpen(false)} />
            <MobileLink href="/how-it-works" label="How It Works" onClick={() => setMobileMenuOpen(false)} />

            {user ? (
              <>
                {/* User info */}
                <div className="py-3 px-3">
                  <p className="font-medium text-sm">{user.full_name || 'User'}</p>
                  <p className="text-xs text-muted truncate">{user.email}</p>
                </div>

                <div className="h-px bg-border my-1" />

                <MobileLink href="/dashboard" label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
                <MobileLink href="/dashboard" label="My Orders" onClick={() => setMobileMenuOpen(false)} />
                <MobileLink href="/settings" label="Settings" onClick={() => setMobileMenuOpen(false)} />

                {isArtist && (
                  <>
                    <div className="h-px bg-border my-1" />
                    <MobileLink href="/artist/dashboard" label="Artist Dashboard" onClick={() => setMobileMenuOpen(false)} />
                    <MobileLink href="/artist/artworks" label="My Artworks" onClick={() => setMobileMenuOpen(false)} />
                    <MobileLink href="/artist/artworks/new" label="Upload Artwork" onClick={() => setMobileMenuOpen(false)} />
                    <MobileLink href="/artist/earnings" label="Earnings" onClick={() => setMobileMenuOpen(false)} />
                  </>
                )}

                {isAdmin && (
                  <>
                    <div className="h-px bg-border my-1" />
                    <MobileLink href="/admin/reviews" label="Admin Panel" onClick={() => setMobileMenuOpen(false)} />
                  </>
                )}

                <div className="h-px bg-border my-1" />
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="block w-full text-left py-2.5 px-3 text-sm font-medium text-error hover:bg-error/5 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <div className="h-px bg-border my-2" />
                <div className="flex gap-2 pt-1">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2.5 border border-border text-sm font-medium rounded-full hover:bg-cream transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2.5 bg-accent text-primary text-sm font-semibold rounded-full hover:bg-accent-light transition-colors"
                  >
                    Join Signo
                  </Link>
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

/* ── Dropdown menu link (desktop) ── */
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

/* ── Mobile nav link ── */
function MobileLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block py-2.5 px-3 text-sm font-medium text-foreground hover:text-accent-dark hover:bg-cream rounded-lg transition-colors"
    >
      {label}
    </Link>
  );
}
