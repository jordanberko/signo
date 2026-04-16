'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NewsletterSignup from '@/components/ui/NewsletterSignup';

/**
 * Huxley-style informational footer.
 *
 * Intentionally quiet: serif wordmark, hairline divider, four link columns
 * in small uppercase labels, stone-dark link colour, terracotta hover.
 * No cards, no badges, no gradients, no illustrations.
 */
export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer
      className="w-full"
      style={{
        background: 'var(--color-warm-white)',
        borderTop: '1px solid var(--color-border)',
        color: 'var(--color-stone-dark)',
      }}
    >
      <div className="px-6 sm:px-10 pt-16 sm:pt-20 pb-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[1.5fr_repeat(4,1fr)] gap-x-8 gap-y-12">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1" style={{ maxWidth: 320 }}>
            <div
              className="font-serif"
              style={{
                fontSize: '1.6rem',
                color: 'var(--color-ink)',
                letterSpacing: '-0.01em',
                marginBottom: '0.9rem',
              }}
            >
              Signo
            </div>
            <p
              style={{
                fontSize: '0.82rem',
                fontWeight: 300,
                lineHeight: 1.6,
                color: 'var(--color-stone-dark)',
                marginBottom: '1.4rem',
              }}
            >
              A curated Australian art marketplace. Artists keep 100% of every
              sale.
            </p>
            <NewsletterSignup />
          </div>

          <FooterColumn
            heading="Explore"
            links={[
              { href: '/browse', label: 'Browse art' },
              { href: '/artists', label: 'Artists' },
              { href: '/collections', label: 'Collections' },
              { href: '/just-sold', label: 'Recently acquired' },
              { href: '/how-it-works', label: 'How it works' },
              { href: '/about', label: 'About' },
            ]}
          />

          <FooterColumn
            heading="Sell"
            links={[
              { href: '/register', label: 'Start selling' },
              { href: '/seller-guide', label: 'Seller guide' },
              { href: '/pricing', label: 'Pricing' },
              { href: '/trade', label: 'Trade enquiries' },
            ]}
          />

          <FooterColumn
            heading="Support"
            links={[
              { href: '/contact', label: 'Contact' },
              { href: '/returns', label: 'Returns' },
              { href: '/privacy', label: 'Privacy' },
              { href: '/terms', label: 'Terms' },
            ]}
          />

          <FooterColumn
            heading="Studio"
            links={[
              { href: '/art-advisory', label: 'Art advisory' },
              { href: 'mailto:hello@signoart.com.au', label: 'hello@signoart.com.au' },
            ]}
          />
        </div>

        {/* Bottom bar */}
        <div
          className="mt-14 pt-8 flex flex-col sm:flex-row justify-between gap-3"
          style={{
            borderTop: '1px solid var(--color-border)',
            fontSize: '0.7rem',
            fontWeight: 300,
            letterSpacing: '0.04em',
            color: 'var(--color-stone)',
          }}
        >
          <span>© {new Date().getFullYear()} Signo. All rights reserved.</span>
          <span>Melbourne, Australia</span>
          <a
            href="#top"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="font-serif"
            style={{
              fontSize: '0.78rem',
              fontStyle: 'italic',
              color: 'var(--color-stone-dark)',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            Back to top
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4
        style={{
          fontSize: '0.66rem',
          fontWeight: 500,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-stone)',
          marginBottom: '1.1rem',
        }}
      >
        {heading}
      </h4>
      <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link
              href={l.href}
              className="no-underline footer-link"
              style={{
                fontSize: '0.82rem',
                fontWeight: 300,
                display: 'inline-block',
              }}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
