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

        {/* Payment methods — trust signal, quiet.
            Single hairline above; copyright row follows without its own divider
            so the lower chrome reads as one block. */}
        <div
          className="mt-14 pt-8"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
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
            Accepted payment
          </h4>
          <div
            className="flex items-center flex-wrap gap-5 sm:gap-6"
            style={{ color: 'var(--color-stone-dark)', opacity: 0.65 }}
            aria-label="Accepted payment methods"
          >
            <VisaMark />
            <MastercardMark />
            <AmexMark />
            <ApplePayMark />
            <GooglePayMark />
          </div>
        </div>

        {/* Bottom bar — copyright. No border-top: shares the chrome block with the payment row above. */}
        <div
          className="mt-10 flex flex-col sm:flex-row justify-between gap-3"
          style={{
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

/* ────────────────────────────────────────────────────────────────
   Payment method marks — inline monochrome SVGs.
   All use `currentColor` so they inherit the muted parent tone.
   Consistent 18–20px height; width varies by natural aspect ratio.
   ──────────────────────────────────────────────────────────────── */

const LOGO_FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

function VisaMark() {
  return (
    <svg
      height="15"
      viewBox="0 0 42 14"
      role="img"
      aria-label="Visa"
      style={{ display: 'block' }}
    >
      <text
        x="0"
        y="12"
        fontFamily={LOGO_FONT}
        fontWeight={900}
        fontStyle="italic"
        fontSize="14"
        letterSpacing="-0.5"
        fill="currentColor"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardMark() {
  return (
    <svg
      height="20"
      viewBox="0 0 32 20"
      role="img"
      aria-label="Mastercard"
      style={{ display: 'block' }}
    >
      <circle cx="11" cy="10" r="9" fill="currentColor" fillOpacity="0.7" />
      <circle cx="21" cy="10" r="9" fill="currentColor" fillOpacity="0.7" />
    </svg>
  );
}

function AmexMark() {
  return (
    <svg
      height="18"
      viewBox="0 0 44 18"
      role="img"
      aria-label="American Express"
      style={{ display: 'block' }}
    >
      <rect x="0" y="0" width="44" height="18" rx="2" fill="currentColor" />
      <text
        x="22"
        y="12"
        textAnchor="middle"
        fontFamily={LOGO_FONT}
        fontWeight={700}
        fontSize="7"
        letterSpacing="0.8"
        fill="var(--color-warm-white)"
      >
        AMEX
      </text>
    </svg>
  );
}

function ApplePayMark() {
  return (
    <svg
      height="18"
      viewBox="0 0 46 22"
      role="img"
      aria-label="Apple Pay"
      style={{ display: 'block' }}
    >
      {/* Apple silhouette */}
      <path
        d="M17.7 11.3c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.7-2.7-.7-1.4 0-2.7.8-3.4 2.1-1.5 2.5-.4 6.3 1 8.3.7 1 1.6 2.1 2.7 2.1 1.1 0 1.5-.7 2.8-.7 1.3 0 1.7.7 2.8.7 1.2 0 1.9-1 2.6-2 .8-1.1 1.2-2.2 1.2-2.3 0 0-2.3-.9-2.3-3.4h-.4zm-2.1-6.2c.6-.7 1-1.7.9-2.7-.8.04-1.8.5-2.4 1.2-.6.6-1.1 1.6-.9 2.6.9.06 1.8-.5 2.4-1.1z"
        fill="currentColor"
      />
      <text
        x="25"
        y="16"
        fontFamily={LOGO_FONT}
        fontWeight={500}
        fontSize="13"
        letterSpacing="-0.2"
        fill="currentColor"
      >
        Pay
      </text>
    </svg>
  );
}

function GooglePayMark() {
  return (
    <svg
      height="18"
      viewBox="0 0 50 22"
      role="img"
      aria-label="Google Pay"
      style={{ display: 'block' }}
    >
      {/* G glyph — simplified, monochrome */}
      <path
        d="M10.3 16.8c-3.2 0-5.8-2.6-5.8-5.8s2.6-5.8 5.8-5.8c1.6 0 2.8.6 3.8 1.5l-1.3 1.3c-.6-.6-1.5-1-2.5-1-2.1 0-3.9 1.8-3.9 4s1.7 4 3.9 4c1.2 0 2-.4 2.6-1 .5-.5.8-1.2.9-2h-3.5V9.4h5.4c.1.3.1.7.1 1.1 0 1.4-.4 3.1-1.6 4.3-1.1 1.2-2.6 1.8-4.5 1.8z"
        fill="currentColor"
      />
      <text
        x="20"
        y="16"
        fontFamily={LOGO_FONT}
        fontWeight={500}
        fontSize="13"
        letterSpacing="-0.2"
        fill="currentColor"
      >
        Pay
      </text>
    </svg>
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
