'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Menu, X, Heart, MessageCircle, User, LogOut, Palette, LayoutDashboard, Shield, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { signOut } from '@/lib/supabase/auth';
import { getInitials } from '@/lib/utils';

export default function Header() {
  const { user, loading, clearUser } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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
    // Clear local state immediately so UI updates
    clearUser();
    // Sign out from Supabase
    await signOut();
    // Navigate home and refresh server components
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
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-background/95 backdrop-blur-md shadow-sm border-b border-border/50'
        : 'bg-background border-b border-border'
    }`}>
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
            <Link href="/browse" className="px-3 py-2 text-sm font-medium text-foreground hover:text-accent-dark transition-colors rounded-lg hover:bg-cream">
              Browse
            </Link>
            <Link href="/how-it-works" className="px-3 py-2 text-sm font-medium text-foreground hover:text-accent-dark transition-colors rounded-lg hover:bg-cream">
              How It Works
            </Link>

            {loading ? (
              /* Skeleton placeholder while auth loads — prevents flash of Sign In buttons */
              <div className="flex items-center gap-2 ml-2">
                <div className="w-9 h-9 rounded-full bg-muted-bg animate-pulse" />
              </div>
            ) : user ? (
              <>
                <div className="w-px h-5 bg-border mx-2" />
                <Link href="/dashboard" className="p-2 text-muted hover:text-accent-dark transition-colors rounded-lg hover:bg-cream" aria-label="Favourites">
                  <Heart className="h-[18px] w-[18px]" />
                </Link>
                <Link href="/messages" className="p-2 text-muted hover:text-accent-dark transition-colors rounded-lg hover:bg-cream" aria-label="Messages">
                  <MessageCircle className="h-[18px] w-[18px]" />
                </Link>

                {/* User Menu */}
                <div className="relative ml-1" ref={menuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="w-9 h-9 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center hover:bg-accent hover:text-primary transition-colors duration-300 ring-2 ring-transparent hover:ring-accent/30"
                  >
                    {getInitials(user.full_name ?? '')}
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-3 w-60 bg-white border border-border rounded-xl shadow-xl py-2 z-50 animate-scale-in">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="font-medium text-sm">{user.full_name}</p>
                        <p className="text-xs text-muted truncate mt-0.5">{user.email}</p>
                      </div>

                      <div className="py-1">
                        <Link href="/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-cream transition-colors">
                          <LayoutDashboard className="h-4 w-4 text-muted" /> Dashboard
                        </Link>

                        <Link href="/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-cream transition-colors">
                          <ShoppingBag className="h-4 w-4 text-muted" /> My Orders
                        </Link>

                        <Link href={user.role === 'artist' || user.role === 'admin' ? '/artist/dashboard' : '/artist/onboarding'} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-cream transition-colors">
                          <Palette className="h-4 w-4 text-muted" /> {user.role === 'artist' || user.role === 'admin' ? 'Artist Dashboard' : 'Start Selling'}
                        </Link>

                        {user.role === 'admin' && (
                          <Link href="/admin/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-cream transition-colors">
                            <Shield className="h-4 w-4 text-muted" /> Admin Panel
                          </Link>
                        )}

                        <Link href="/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-cream transition-colors">
                          <User className="h-4 w-4 text-muted" /> Settings
                        </Link>
                      </div>

                      <div className="border-t border-border pt-1">
                        <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error/5 transition-colors w-full">
                          <LogOut className="h-4 w-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 ml-2">
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
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-foreground hover:text-accent-dark transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-fade-in">
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
            <Link href="/browse" onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-3 text-sm font-medium text-foreground hover:text-accent-dark hover:bg-cream rounded-lg transition-colors">
              Browse Art
            </Link>
            <Link href="/how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-3 text-sm font-medium text-foreground hover:text-accent-dark hover:bg-cream rounded-lg transition-colors">
              How It Works
            </Link>
            {user ? (
              <>
                <div className="h-px bg-border my-2" />
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-3 text-sm font-medium text-foreground hover:text-accent-dark hover:bg-cream rounded-lg transition-colors">
                  Dashboard
                </Link>
                <Link href={user.role === 'artist' || user.role === 'admin' ? '/artist/dashboard' : '/artist/onboarding'} onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-3 text-sm font-medium text-foreground hover:text-accent-dark hover:bg-cream rounded-lg transition-colors">
                  {user.role === 'artist' || user.role === 'admin' ? 'Artist Dashboard' : 'Start Selling'}
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-3 text-sm font-medium text-foreground hover:text-accent-dark hover:bg-cream rounded-lg transition-colors">
                    Admin Panel
                  </Link>
                )}
                <Link href="/messages" onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-3 text-sm font-medium text-foreground hover:text-accent-dark hover:bg-cream rounded-lg transition-colors">
                  Messages
                </Link>
                <div className="h-px bg-border my-2" />
                <button onClick={handleSignOut} className="block w-full text-left py-2.5 px-3 text-sm font-medium text-error hover:bg-error/5 rounded-lg transition-colors">
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
