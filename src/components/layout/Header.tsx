'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Menu, X, MessageCircle } from 'lucide-react';
import AuthButton from '@/components/AuthButton';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';

export default function Header() {
  const router = useRouter();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

    // Real-time subscription for new messages
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
        () => {
          fetchUnread();
        }
      )
      .on(
        'postgres_changes' as unknown as 'system',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        } as unknown as Record<string, unknown>,
        () => {
          fetchUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
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

            {/* Messages icon — only when logged in */}
            {user && (
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
            )}

            {/* Auth — self-contained client component */}
            <AuthButton />
          </nav>

          {/* Mobile: Auth + Menu Button */}
          <div className="md:hidden flex items-center gap-1">
            <AuthButton />
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
            {user && (
              <div className="relative">
                <MobileLink href="/messages" label="Messages" onClick={() => setMobileMenuOpen(false)} />
                {unreadCount > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            )}

            {!user && (
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
