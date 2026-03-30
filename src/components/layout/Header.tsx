'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Menu, X, Heart, MessageCircle, User, LogOut, Palette, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { signOut } from '@/lib/supabase/auth';
import { getInitials } from '@/lib/utils';

export default function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSignOut() {
    await signOut();
    setUserMenuOpen(false);
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

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-primary">
              SIGNO
            </span>
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="Search artwork, artists, styles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          </form>

          {/* Nav Links - Desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/browse" className="text-sm font-medium text-foreground hover:text-accent transition-colors">
              Browse Art
            </Link>
            <Link href="/how-it-works" className="text-sm font-medium text-foreground hover:text-accent transition-colors">
              How It Works
            </Link>

            {!loading && user ? (
              <>
                <Link href="/dashboard" className="text-muted hover:text-accent transition-colors" aria-label="Favourites">
                  <Heart className="h-5 w-5" />
                </Link>
                <Link href="/messages" className="text-muted hover:text-accent transition-colors" aria-label="Messages">
                  <MessageCircle className="h-5 w-5" />
                </Link>

                {/* User Menu */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="w-9 h-9 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center hover:bg-primary-light transition-colors"
                  >
                    {getInitials(user.full_name)}
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-border rounded-lg shadow-lg py-1 z-50">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="font-medium text-sm">{user.full_name}</p>
                        <p className="text-xs text-muted truncate">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-muted-bg text-xs rounded capitalize">{user.role}</span>
                      </div>

                      <Link href="/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted-bg transition-colors">
                        <LayoutDashboard className="h-4 w-4 text-muted" /> Dashboard
                      </Link>

                      {user.role === 'artist' && (
                        <Link href="/artist/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted-bg transition-colors">
                          <Palette className="h-4 w-4 text-muted" /> Artist Studio
                        </Link>
                      )}

                      <Link href="/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted-bg transition-colors">
                        <User className="h-4 w-4 text-muted" /> Settings
                      </Link>

                      <div className="border-t border-border mt-1">
                        <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-muted-bg transition-colors w-full">
                          <LogOut className="h-4 w-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : !loading ? (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light transition-colors"
              >
                <User className="h-4 w-4" />
                Sign In
              </Link>
            ) : null}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-foreground"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-white">
          <form onSubmit={handleSearch} className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="Search artwork..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </form>
          <nav className="px-4 pb-4 space-y-2">
            <Link href="/browse" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-foreground hover:text-accent">
              Browse Art
            </Link>
            <Link href="/how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-foreground hover:text-accent">
              How It Works
            </Link>
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-foreground hover:text-accent">
                  Dashboard
                </Link>
                {user.role === 'artist' && (
                  <Link href="/artist/dashboard" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-foreground hover:text-accent">
                    Artist Studio
                  </Link>
                )}
                <Link href="/messages" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-foreground hover:text-accent">
                  Messages
                </Link>
                <button onClick={handleSignOut} className="block w-full text-left py-2 text-sm font-medium text-error">
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
