'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import EditorialSpinner from '@/components/ui/EditorialSpinner';

/**
 * Admin console shell.
 *
 * Editorial treatment: warm-white canvas, hairline sub-nav, uppercase
 * kickers, serif headings at weight 400. No icons, no pill buttons,
 * no rounded corners — the admin surface now reads as part of the
 * same publication as the rest of Signo.
 */

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Overview' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/collections', label: 'Collections' },
  { href: '/admin/disputes', label: 'Disputes' },
];

const KICKER: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
  fontWeight: 400,
  margin: 0,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return <EditorialSpinner label="Admin console" headline="One moment\u2026" />;
  }

  if (!user || user.role !== 'admin') {
    return (
      <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
        <div
          className="px-6 sm:px-10"
          style={{
            maxWidth: '44rem',
            margin: '0 auto',
            paddingTop: 'clamp(6rem, 10vw, 9rem)',
            paddingBottom: '6rem',
          }}
        >
          <p style={KICKER}>— Access denied —</p>
          <h1
            className="font-serif"
            style={{
              marginTop: '1.4rem',
              fontSize: 'clamp(2.4rem, 5vw, 3.6rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.015em',
              color: 'var(--color-ink)',
              fontWeight: 400,
            }}
          >
            This console is for <em style={{ fontStyle: 'italic' }}>admins.</em>
          </h1>
          <p
            style={{
              marginTop: '1.6rem',
              fontSize: '1rem',
              lineHeight: 1.7,
              color: 'var(--color-stone-dark)',
              fontWeight: 300,
              maxWidth: '42ch',
            }}
          >
            You don&apos;t have the privileges to view the admin area.
          </p>
          <Link
            href="/"
            className="editorial-link"
            style={{ marginTop: '2.4rem' }}
          >
            Back to Signo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      {/* ── Admin sub-nav ── */}
      <div
        className="px-6 sm:px-10"
        style={{
          borderBottom: '1px solid var(--color-border)',
          paddingTop: 'clamp(5.5rem, 8vw, 7rem)',
        }}
      >
        <div style={{ maxWidth: '84rem', margin: '0 auto' }}>
          <p style={KICKER}>— Admin console —</p>
          <nav
            aria-label="Admin"
            style={{
              display: 'flex',
              gap: 'clamp(1.4rem, 3vw, 2.4rem)',
              marginTop: '1.2rem',
              overflowX: 'auto',
            }}
          >
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    fontSize: '0.72rem',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    fontWeight: 400,
                    color: active ? 'var(--color-ink)' : 'var(--color-stone)',
                    borderBottom: active
                      ? '1px solid var(--color-ink)'
                      : '1px solid transparent',
                    paddingBottom: '1rem',
                    whiteSpace: 'nowrap',
                    transition: 'color var(--dur-base) var(--ease-out)',
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {children}
    </div>
  );
}
