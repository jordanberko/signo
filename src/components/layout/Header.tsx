'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import Avatar from '@/components/ui/Avatar';

/**
 * Huxley-style nav:
 * - Fixed top, mix-blend-mode: difference over media-led pages.
 * - Collapses to solid warm-white background after scroll threshold.
 * - Wordmark + "Menu" + ("Sell" | Avatar).
 * - Menu opens a full-screen ink overlay with editorial serif list.
 *
 * Pages that want the transparent/mix-blend treatment at the very top
 * should render a full-bleed hero as the first section. The header
 * starts transparent on every page and snaps to solid on scroll — any
 * page where that's wrong should add `data-signo-nav="solid"` to the
 * <body> via its layout.
 */

function clearSupabaseCookies() {
  try {
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name.startsWith('sb-')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
  } catch {
    /* ignore */
  }
}

// Pages that lead with a full-bleed media hero — nav starts in overlay mode.
const HERO_LED_ROUTES = ['/', '/artwork/', '/artists/', '/collections/'];

function isHeroLed(pathname: string | null): boolean {
  if (!pathname) return false;
  return HERO_LED_ROUTES.some((r) =>
    r === '/' ? pathname === '/' : pathname.startsWith(r)
  );
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const heroLed = isHeroLed(pathname);

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Scroll state: once we've scrolled past ~70% of viewport, nav goes solid.
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > window.innerHeight * 0.7 - 80);
    }
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  // Unread message count (signed-in)
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
        /* ignore */
      }
    }
    fetchUnread();

    const supabase = createClient();
    const channel = supabase
      .channel('header-unread')
      .on(
        'postgres_changes' as unknown as 'system',
        { event: 'INSERT', schema: 'public', table: 'messages' } as unknown as Record<string, unknown>,
        () => fetchUnread()
      )
      .on(
        'postgres_changes' as unknown as 'system',
        { event: 'UPDATE', schema: 'public', table: 'messages' } as unknown as Record<string, unknown>,
        () => fetchUnread()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Close on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Escape closes overlay
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Lock body scroll when overlay open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleSignOut = useCallback(async () => {
    setMenuOpen(false);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* ignore — cookie clear + reload below still lands the user signed-out */
    }
    clearSupabaseCookies();
    window.location.href = '/';
  }, []);

  const isArtist = user?.role === 'artist' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  // Nav mode
  // - heroLed + not scrolled → transparent with mix-blend
  // - otherwise → solid
  const transparent = heroLed && !scrolled && !menuOpen;

  return (
    <>
      <nav
        aria-label="Primary"
        className={[
          'fixed top-0 inset-x-0',
          'flex items-center justify-between',
          'px-6 sm:px-10 py-5 sm:py-6',
          'transition-[background-color,border-color] duration-500 ease-out',
          transparent
            ? 'mix-blend-difference'
            : 'bg-[color:var(--color-warm-white)] border-b border-[color:var(--color-border)]',
        ].join(' ')}
        style={{
          zIndex: 'var(--z-nav)',
          ...(transparent ? {} : { mixBlendMode: 'normal' }),
        }}
      >
        <Link
          href="/"
          className="no-underline"
          aria-label="Signo — home"
        >
          <span
            data-nav-wordmark
            className="font-serif"
            style={{
              fontSize: '1.6rem',
              lineHeight: 1,
              letterSpacing: '-0.01em',
              color: transparent ? '#fff' : 'var(--color-ink)',
              transition: 'color var(--dur-base) var(--ease-out)',
            }}
          >
            Signo
          </span>
        </Link>

        <div data-nav-actions className="flex items-center gap-8 sm:gap-10">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="nav-label bg-transparent border-none cursor-pointer p-0"
            style={{
              fontSize: '0.78rem',
              fontWeight: 300,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: transparent ? '#fff' : 'var(--color-ink)',
            }}
          >
            Menu
          </button>

          {authLoading ? (
            <span
              aria-hidden="true"
              className="inline-block w-8 h-8 rounded-full"
              style={{ background: transparent ? 'rgba(255,255,255,0.2)' : 'var(--color-border)' }}
            />
          ) : user ? (
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Account"
              className="bg-transparent border-none p-0 cursor-pointer relative"
              style={{ lineHeight: 0 }}
            >
              <Avatar
                avatarUrl={user.avatar_url}
                name={user.full_name ?? ''}
                size={32}
              />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 text-[10px] font-semibold rounded-full flex items-center justify-center"
                  style={{
                    minWidth: 16,
                    height: 16,
                    padding: '0 5px',
                    background: 'var(--color-terracotta)',
                    color: '#fff',
                    lineHeight: 1,
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          ) : (
            <Link
              href="/register"
              className="nav-label no-underline"
              style={{
                fontSize: '0.78rem',
                fontWeight: 300,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: transparent ? '#fff' : 'var(--color-ink)',
              }}
            >
              Sell
            </Link>
          )}
        </div>
      </nav>

      {/* ===== Full-screen menu overlay ===== */}
      <div
        aria-hidden={!menuOpen}
        className={[
          'fixed inset-0',
          'flex flex-col',
          'transition-opacity duration-500 ease-out',
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        style={{ background: 'var(--color-ink)', zIndex: 'var(--z-menu)' }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 sm:px-10 py-5 sm:py-6">
          <span
            className="font-serif"
            style={{
              fontSize: '1.6rem',
              lineHeight: 1,
              letterSpacing: '-0.01em',
              color: '#fff',
            }}
          >
            Signo
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="bg-transparent border-none cursor-pointer p-0"
            style={{
              fontSize: '0.78rem',
              fontWeight: 300,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--color-stone)',
              transition: 'color var(--dur-base) var(--ease-out)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-stone)')}
          >
            Close
          </button>
        </div>

        {/* Scrollable area — menu body + footer scroll together,
            top bar above stays fixed. `safe center` keeps content
            centered when it fits, top-aligned when it overflows. */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
        <div
          className="flex flex-col px-6 sm:px-16"
          style={{
            minHeight: '100%',
            justifyContent: 'safe center',
            paddingTop: '2rem',
            paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))',
            gap: '3rem',
          }}
        >
        <div>
          {/* Signed-in user section */}
          {user && (
            <div className="mb-10 sm:mb-14">
              <div
                className="mb-5"
                style={{
                  fontSize: '0.68rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--color-stone-dark)',
                  fontWeight: 400,
                }}
              >
                {user.full_name || 'Account'}
              </div>
              <ul className="list-none p-0 m-0 space-y-2">
                {!isArtist ? (
                  <>
                    <OverlayLink href="/dashboard" label="Dashboard" onNavigate={() => setMenuOpen(false)} index={0} animate={menuOpen} />
                    <OverlayLink href="/favourites" label="Favourites" onNavigate={() => setMenuOpen(false)} index={1} animate={menuOpen} />
                    <OverlayLink href="/orders" label="Orders" onNavigate={() => setMenuOpen(false)} index={2} animate={menuOpen} />
                    <OverlayLink href="/messages" label="Messages" onNavigate={() => setMenuOpen(false)} badge={unreadCount} index={3} animate={menuOpen} />
                    <OverlayLink href="/following" label="Following" onNavigate={() => setMenuOpen(false)} index={4} animate={menuOpen} />
                    <OverlayLink href="/settings" label="Settings" onNavigate={() => setMenuOpen(false)} index={5} animate={menuOpen} />
                  </>
                ) : (
                  <>
                    <OverlayLink href="/artist/dashboard" label="Studio dashboard" onNavigate={() => setMenuOpen(false)} index={0} animate={menuOpen} />
                    <OverlayLink href="/artist/artworks" label="My listings" onNavigate={() => setMenuOpen(false)} index={1} animate={menuOpen} />
                    <OverlayLink href="/artist/analytics" label="Analytics" onNavigate={() => setMenuOpen(false)} index={2} animate={menuOpen} />
                    <OverlayLink href="/artist/earnings" label="Earnings" onNavigate={() => setMenuOpen(false)} index={3} animate={menuOpen} />
                    <OverlayLink href="/messages" label="Messages" onNavigate={() => setMenuOpen(false)} badge={unreadCount} index={4} animate={menuOpen} />
                    <OverlayLink href="/settings" label="Settings" onNavigate={() => setMenuOpen(false)} index={5} animate={menuOpen} />
                  </>
                )}
                {isAdmin && (
                  <OverlayLink href="/admin/reviews" label="Admin review queue" onNavigate={() => setMenuOpen(false)} index={6} animate={menuOpen} />
                )}
              </ul>
            </div>
          )}

          {/* Public section */}
          <div>
            <div
              className="mb-5"
              style={{
                fontSize: '0.68rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--color-stone-dark)',
                fontWeight: 400,
              }}
            >
              {user ? 'Explore' : 'Marketplace'}
            </div>
            <ul className="list-none p-0 m-0 space-y-2">
              <OverlayLink href="/browse" label="Browse artwork" onNavigate={() => setMenuOpen(false)} index={0} animate={menuOpen} />
              <OverlayLink href="/artists" label="The artists" onNavigate={() => setMenuOpen(false)} index={1} animate={menuOpen} />
              <OverlayLink href="/collections" label="Collections" onNavigate={() => setMenuOpen(false)} index={2} animate={menuOpen} />
              <OverlayLink href="/just-sold" label="Recently acquired" onNavigate={() => setMenuOpen(false)} index={3} animate={menuOpen} />
              <OverlayLink href="/how-it-works" label="How it works" onNavigate={() => setMenuOpen(false)} index={4} animate={menuOpen} />
              <OverlayLink href="/about" label="About Signo" onNavigate={() => setMenuOpen(false)} index={5} animate={menuOpen} />
              {!user && (
                <OverlayLink href="/register" label="Start selling" onNavigate={() => setMenuOpen(false)} index={6} animate={menuOpen} />
              )}
              <OverlayLink href="/contact" label="Contact" onNavigate={() => setMenuOpen(false)} index={!user ? 7 : 6} animate={menuOpen} />
            </ul>
          </div>

          {/* Signed-out CTAs */}
          {!user && !authLoading && (
            <div
              className="mt-10 pt-8"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex flex-wrap gap-6">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push('/login');
                  }}
                  className="bg-transparent border-0 p-0 cursor-pointer"
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 300,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--color-stone)',
                    borderBottom: '1px solid rgba(255,255,255,0.3)',
                    paddingBottom: '0.2rem',
                    transition: 'color var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.borderColor = '#fff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.color = 'var(--color-stone)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                  }}
                >
                  Sign in
                </button>
              </div>
            </div>
          )}

          {/* Signed-in sign-out */}
          {user && (
            <div
              className="mt-10 pt-8"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              <button
                type="button"
                onClick={handleSignOut}
                className="bg-transparent border-0 p-0 cursor-pointer"
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 300,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--color-stone)',
                  borderBottom: '1px solid rgba(255,255,255,0.3)',
                  paddingBottom: '0.2rem',
                  transition: 'color var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = '#fff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = 'var(--color-stone)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Footer — now scrolls naturally with menu items */}
        <div
          className="flex flex-col sm:flex-row justify-between gap-3"
          style={{
            fontSize: '0.72rem',
            letterSpacing: '0.05em',
            color: 'var(--color-stone-dark)',
          }}
        >
          <a
            href="mailto:hello@signoart.com.au"
            className="no-underline"
            style={{ color: 'var(--color-stone-dark)' }}
          >
            hello@signoart.com.au
          </a>
          <div className="flex gap-5">
            <Link href="/privacy" className="no-underline" style={{ color: 'var(--color-stone-dark)' }} onClick={() => setMenuOpen(false)}>
              Privacy
            </Link>
            <Link href="/terms" className="no-underline" style={{ color: 'var(--color-stone-dark)' }} onClick={() => setMenuOpen(false)}>
              Terms
            </Link>
          </div>
        </div>
        </div>
        </div>
      </div>
    </>
  );
}

function OverlayLink({
  href,
  label,
  onNavigate,
  badge,
  index = 0,
  animate = false,
}: {
  href: string;
  label: string;
  onNavigate: () => void;
  badge?: number;
  index?: number;
  animate?: boolean;
}) {
  return (
    <li
      style={
        animate
          ? {
              animation: `overlay-link-in var(--dur-base) var(--ease-out) ${index * 50}ms backwards`,
            }
          : undefined
      }
    >
      <Link
        href={href}
        onClick={onNavigate}
        className="font-serif no-underline inline-flex items-baseline gap-3"
        style={{
          fontSize: 'clamp(2rem, 4.4vw, 3.4rem)',
          lineHeight: 1.2,
          color: 'var(--color-stone-dark)',
          transition: 'color var(--dur-base) var(--ease-out)',
          letterSpacing: '-0.01em',
        }}
        onMouseOver={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#fff')}
        onMouseOut={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-stone-dark)')}
      >
        {label}
        {typeof badge === 'number' && badge > 0 && (
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.7rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-terracotta)',
              fontWeight: 400,
            }}
          >
            {badge > 9 ? '9+' : badge} new
          </span>
        )}
      </Link>
    </li>
  );
}
