'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search,
  Menu,
  X,
  MessageCircle,
  Heart,
  ChevronDown,
  LogOut,
  ShoppingBag,
  Users,
  Settings,
  Palette,
  Images,
  ImagePlus,
  Camera,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import Avatar from '@/components/ui/Avatar';

const SESSION_KEY = 'signo-logo-animated';

// ── Discover dropdown items (conditionally shown) ──
interface DiscoverItem {
  href: string;
  label: string;
  description: string;
}

const DISCOVER_ITEMS: (DiscoverItem & { key: string })[] = [
  {
    key: 'collections',
    href: '/collections',
    label: 'Collections',
    description: 'Curated by the Signo team',
  },
  {
    key: 'just-sold',
    href: '/just-sold',
    label: 'Just Sold',
    description: 'Recently purchased artworks',
  },
  {
    key: 'art-advisory',
    href: '/art-advisory',
    label: 'Find Your Art',
    description: 'Take our art advisory quiz',
  },
];

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
    // Ignore
  }
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Discover dropdown
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const discoverRef = useRef<HTMLDivElement>(null);
  const discoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Avatar dropdown
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Conditional visibility for Discover items
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());

  // Logo animation — only on first load per session
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const logoRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        setShouldAnimate(true);
        const timer = setTimeout(() => {
          sessionStorage.setItem(SESSION_KEY, '1');
          setAnimationDone(true);
        }, 1600);
        return () => clearTimeout(timer);
      }
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  // Scroll shadow
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch unread message count
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    async function fetchUnread() {
      try {
        const res = await fetch('/api/messages/unread-count');
        const data = await res.json();
        setUnreadCount(data.count || 0);
      } catch {
        // Ignore
      }
    }

    fetchUnread();

    const supabase = createClient();
    const channel = supabase
      .channel('header-unread')
      .on(
        'postgres_changes' as unknown as 'system',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        } as unknown as Record<string, unknown>,
        () => fetchUnread()
      )
      .on(
        'postgres_changes' as unknown as 'system',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        } as unknown as Record<string, unknown>,
        () => fetchUnread()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch conditional visibility for Discover items
  useEffect(() => {
    async function checkVisibility() {
      const visible = new Set<string>();

      try {
        const [collectionsRes, artworksRes, salesRes] = await Promise.allSettled([
          fetch('/api/collections'),
          fetch('/api/artworks/browse?limit=1'),
          fetch('/api/artworks/just-sold?limit=1'),
        ]);

        // Collections: at least 1 published collection with 3+ artworks
        if (collectionsRes.status === 'fulfilled' && collectionsRes.value.ok) {
          const data = await collectionsRes.value.json();
          const collections = data.collections ?? data ?? [];
          if (Array.isArray(collections) && collections.some((c: { artwork_count?: number; artworks?: unknown[] }) => (c.artwork_count ?? c.artworks?.length ?? 0) >= 3)) {
            visible.add('collections');
          }
        }

        // Find Your Art: 30+ approved artworks
        if (artworksRes.status === 'fulfilled' && artworksRes.value.ok) {
          const data = await artworksRes.value.json();
          const total = data.total ?? data.count ?? data.artworks?.length ?? 0;
          if (total >= 30) {
            visible.add('art-advisory');
          }
        }

        // Just Sold: at least 1 completed sale
        if (salesRes.status === 'fulfilled' && salesRes.value.ok) {
          const data = await salesRes.value.json();
          const items = data.artworks ?? data ?? [];
          if (Array.isArray(items) && items.length > 0) {
            visible.add('just-sold');
          }
        }
      } catch {
        // Fail silently — items stay hidden
      }

      setVisibleItems(visible);
    }

    checkVisibility();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (discoverRef.current && !discoverRef.current.contains(e.target as Node)) {
        setDiscoverOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setDiscoverOpen(false);
        setAvatarOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDiscoverOpen(false);
    setAvatarOpen(false);
  }, [pathname]);

  // Discover hover handlers with delay
  const handleDiscoverEnter = useCallback(() => {
    if (discoverTimeout.current) clearTimeout(discoverTimeout.current);
    discoverTimeout.current = setTimeout(() => setDiscoverOpen(true), 100);
  }, []);

  const handleDiscoverLeave = useCallback(() => {
    if (discoverTimeout.current) clearTimeout(discoverTimeout.current);
    discoverTimeout.current = setTimeout(() => setDiscoverOpen(false), 150);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  }

  async function handleSignOut() {
    setAvatarOpen(false);
    setMobileMenuOpen(false);

    const forceRedirect = setTimeout(() => {
      clearSupabaseCookies();
      window.location.href = '/';
    }, 2000);

    try {
      const supabase = createClient();
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch {
      // Ignore
    }

    clearTimeout(forceRedirect);
    clearSupabaseCookies();
    window.location.href = '/';
  }

  const isArtist = user?.role === 'artist' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const filteredDiscoverItems = DISCOVER_ITEMS.filter((item) => visibleItems.has(item.key));
  const showDiscover = filteredDiscoverItems.length > 0;

  const isDiscoverActive = ['/collections', '/just-sold', '/art-advisory'].some(
    (p) => pathname === p || pathname?.startsWith(p + '/')
  );

  return (
    <>
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
            <Link
              href="/"
              className="flex items-center group"
              style={{ minWidth: 120 }}
            >
              <span
                ref={logoRef}
                className="text-2xl text-primary group-hover:text-accent-dark transition-colors duration-300"
                style={{
                  fontFamily: 'var(--font-satoshi), Helvetica Neue, Helvetica, Arial, sans-serif',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  ...(shouldAnimate && !animationDone
                    ? {
                        animation:
                          'logo-text-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                      }
                    : {}),
                }}
              >
                SIGNO
              </span>
              <span
                className="text-2xl italic"
                style={{
                  fontFamily: 'var(--font-satoshi), Helvetica Neue, Helvetica, Arial, sans-serif',
                  fontWeight: 500,
                  color: 'var(--color-accent, #6b7c4e)',
                  ...(shouldAnimate && !animationDone
                    ? {
                        animation: 'logo-dot-in 0.4s ease-out 1.1s forwards',
                        opacity: 0,
                      }
                    : { opacity: 1 }),
                }}
              >
                .
              </span>
            </Link>

            {/* Search Bar - Desktop */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 max-w-md mx-8"
            >
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

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {/* Browse */}
              <Link
                href="/browse"
                className={`px-3 py-2 text-sm font-medium transition-colors rounded-lg ${
                  pathname === '/browse' || pathname?.startsWith('/browse/')
                    ? 'text-accent-dark underline underline-offset-4'
                    : 'text-foreground hover:text-accent-dark hover:bg-cream'
                }`}
              >
                Browse
              </Link>

              {/* Discover Dropdown */}
              {showDiscover && (
                <div
                  ref={discoverRef}
                  className="relative"
                  onMouseEnter={handleDiscoverEnter}
                  onMouseLeave={handleDiscoverLeave}
                >
                  <button
                    type="button"
                    onClick={() => setDiscoverOpen(!discoverOpen)}
                    className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors rounded-lg bg-transparent border-none cursor-pointer ${
                      isDiscoverActive
                        ? 'text-accent-dark underline underline-offset-4'
                        : 'text-foreground hover:text-accent-dark hover:bg-cream'
                    }`}
                  >
                    Discover
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-150 ${
                        discoverOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown panel */}
                  <div
                    className={`absolute top-full left-0 mt-1 w-[260px] bg-white border border-border rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-150 origin-top ${
                      discoverOpen
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 -translate-y-1 pointer-events-none'
                    }`}
                  >
                    <div className="py-1.5">
                      {filteredDiscoverItems.map((item) => (
                        <Link
                          key={item.key}
                          href={item.href}
                          onClick={() => setDiscoverOpen(false)}
                          className={`block px-4 py-2.5 no-underline transition-colors ${
                            pathname === item.href
                              ? 'bg-cream'
                              : 'hover:bg-cream'
                          }`}
                        >
                          <span className="block text-sm font-medium text-foreground">
                            {item.label}
                          </span>
                          <span className="block text-xs text-muted mt-0.5">
                            {item.description}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* How It Works */}
              <Link
                href="/how-it-works"
                className={`px-3 py-2 text-sm font-medium transition-colors rounded-lg ${
                  pathname === '/how-it-works'
                    ? 'text-accent-dark underline underline-offset-4'
                    : 'text-foreground hover:text-accent-dark hover:bg-cream'
                }`}
              >
                How It Works
              </Link>

              {/* Logged-in icons */}
              {user && (
                <>
                  <Link
                    href="/favourites"
                    className="p-2 text-foreground hover:text-accent-dark transition-colors rounded-lg hover:bg-cream"
                    aria-label="Favourites"
                  >
                    <Heart className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/messages"
                    className="relative p-2 text-foreground hover:text-accent-dark transition-colors rounded-lg hover:bg-cream"
                    aria-label="Messages"
                  >
                    <MessageCircle className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {/* Auth section */}
              {authLoading ? (
                <div className="ml-2 shrink-0">
                  <div className="w-9 h-9 rounded-full bg-border" />
                </div>
              ) : user ? (
                /* Avatar dropdown */
                <div ref={avatarRef} className="relative ml-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAvatarOpen(!avatarOpen)}
                    className="border-none outline-none cursor-pointer p-0 bg-transparent shrink-0"
                  >
                    <Avatar
                      avatarUrl={user.avatar_url}
                      name={user.full_name ?? ''}
                      size={36}
                    />
                  </button>

                  <div
                    className={`absolute top-full right-0 mt-2 min-w-[240px] w-[260px] bg-white border border-border rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden transition-all duration-150 origin-top-right ${
                      avatarOpen
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 -translate-y-1 pointer-events-none'
                    }`}
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-border">
                      <p className="font-semibold text-sm m-0 text-foreground">
                        {user.full_name || 'User'}
                      </p>
                      <p className="text-xs text-muted mt-0.5 mb-0">
                        {user.email}
                      </p>
                    </div>

                    {/* Buyer links */}
                    {!isArtist && (
                      <div className="py-1">
                        <DropdownLink href="/orders" icon={ShoppingBag} label="My Orders" onClick={() => setAvatarOpen(false)} />
                        <DropdownLink href="/following" icon={Users} label="Following" onClick={() => setAvatarOpen(false)} />
                        <DropdownLink href="/settings" icon={Settings} label="Settings" onClick={() => setAvatarOpen(false)} />
                      </div>
                    )}

                    {/* Artist links */}
                    {isArtist && (
                      <div className="py-1">
                        <DropdownLink href="/artist/dashboard" icon={Palette} label="Dashboard" onClick={() => setAvatarOpen(false)} />
                        <DropdownLink href="/artist/artworks" icon={Images} label="My Artworks" onClick={() => setAvatarOpen(false)} />
                        <DropdownLink href="/artist/artworks/new" icon={ImagePlus} label="Upload Artwork" onClick={() => setAvatarOpen(false)} />
                        <DropdownLink href="/artist/dashboard" icon={Camera} label="In The Studio" onClick={() => setAvatarOpen(false)} />
                        <DropdownLink href="/settings" icon={Settings} label="Settings" onClick={() => setAvatarOpen(false)} />
                      </div>
                    )}

                    {/* Admin link */}
                    {isAdmin && (
                      <div className="py-1 border-t border-border">
                        <DropdownLink href="/admin/reviews" icon={Shield} label="Admin Panel" onClick={() => setAvatarOpen(false)} />
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
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-error bg-transparent border-none cursor-pointer w-full text-left hover:bg-cream transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Logged-out CTA */
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <Link
                    href="/login"
                    className="px-3 py-2 text-sm font-medium text-foreground no-underline hover:text-accent-dark transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 text-sm font-semibold text-white bg-accent rounded-full no-underline hover:bg-accent-dark transition-colors"
                  >
                    Join Signo
                  </Link>
                </div>
              )}
            </nav>

            {/* Mobile: hamburger only */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-foreground hover:text-accent-dark transition-colors bg-transparent border-none cursor-pointer"
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
      </header>

      {/* Mobile Menu — slide-in overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="absolute top-0 right-0 h-full w-[300px] max-w-[85vw] bg-background shadow-2xl animate-slide-in-right overflow-y-auto">
            {/* Close button */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span
                className="text-lg"
                style={{
                  fontFamily: 'var(--font-satoshi), Helvetica Neue, Helvetica, Arial, sans-serif',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                }}
              >
                SIGNO<span className="italic" style={{ color: 'var(--color-accent, #6b7c4e)' }}>.</span>
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-foreground hover:text-accent-dark transition-colors bg-transparent border-none cursor-pointer"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

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

            {/* Nav links */}
            <nav className="px-4 pb-6 space-y-0.5">
              <MobileLink href="/browse" label="Browse" pathname={pathname} onClick={() => setMobileMenuOpen(false)} />
              {visibleItems.has('collections') && (
                <MobileLink href="/collections" label="Collections" pathname={pathname} onClick={() => setMobileMenuOpen(false)} />
              )}
              {visibleItems.has('just-sold') && (
                <MobileLink href="/just-sold" label="Just Sold" pathname={pathname} onClick={() => setMobileMenuOpen(false)} />
              )}
              {visibleItems.has('art-advisory') && (
                <MobileLink href="/art-advisory" label="Find Your Art" pathname={pathname} onClick={() => setMobileMenuOpen(false)} />
              )}
              <MobileLink href="/how-it-works" label="How It Works" pathname={pathname} onClick={() => setMobileMenuOpen(false)} />

              {/* Logged-in user links */}
              {user && (
                <>
                  <div className="h-px bg-border my-3" />
                  {isArtist ? (
                    <>
                      <MobileLink href="/artist/dashboard" label="Dashboard" pathname={pathname} onClick={() => setMobileMenuOpen(false)} />
                      <MobileLink href="/artist/artworks" label="My Artworks" pathname={pathname} onClick={() => setMobileMenuOpen(false)} />
                      <MobileLink href="/artist/artworks/new" label="Upload Artwork" pathname={pathname} onClick={() => setMobileMenuOpen(false)} />
                    </>
                  ) : (
                    <MobileLink href="/orders" label="My Orders" pathname={pathname} onClick={() => setMobileMenuOpen(false)} />
                  )}
                  <MobileLink href="/favourites" label="Favourites" pathname={pathname} onClick={() => setMobileMenuOpen(false)} />
                  <MobileLink href="/following" label="Following" pathname={pathname} onClick={() => setMobileMenuOpen(false)} />
                  <div className="relative">
                    <MobileLink href="/messages" label="Messages" pathname={pathname} onClick={() => setMobileMenuOpen(false)} />
                    {unreadCount > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <MobileLink href="/settings" label="Settings" pathname={pathname} onClick={() => setMobileMenuOpen(false)} />

                  <div className="h-px bg-border my-3" />
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left py-2.5 px-3 text-sm font-medium text-error rounded-lg bg-transparent border-none cursor-pointer hover:bg-cream transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              )}

              {/* Logged-out CTA */}
              {!user && !authLoading && (
                <>
                  <div className="h-px bg-border my-3" />
                  <div className="space-y-2 pt-1">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-center py-2.5 border border-border text-sm font-medium rounded-full hover:bg-cream transition-colors no-underline text-foreground"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-center py-2.5 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-dark transition-colors no-underline"
                    >
                      Join Signo
                    </Link>
                  </div>
                </>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Slide-in animation */}
      <style jsx global>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s ease-out forwards;
        }
      `}</style>
    </>
  );
}

/* ── Desktop dropdown link ── */
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

/* ── Mobile nav link ── */
function MobileLink({
  href,
  label,
  pathname,
  onClick,
}: {
  href: string;
  label: string;
  pathname: string;
  onClick: () => void;
}) {
  const isActive = pathname === href || pathname?.startsWith(href + '/');
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block py-2.5 px-3 text-sm font-medium rounded-lg transition-colors no-underline ${
        isActive
          ? 'text-accent-dark bg-cream'
          : 'text-foreground hover:text-accent-dark hover:bg-cream'
      }`}
    >
      {label}
    </Link>
  );
}
