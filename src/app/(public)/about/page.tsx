import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About — Signo',
  description:
    'Signo is an Australian art marketplace where artists keep the full sale price. Zero commission, a flat monthly subscription, direct from the studio.',
};

export default function AboutPage() {
  return (
    <div style={{ background: 'var(--color-warm-white)' }}>
      {/* ── Editorial header ── */}
      <header
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(4rem, 9vw, 7rem)',
          paddingBottom: 'clamp(3rem, 6vw, 5rem)',
        }}
      >
        <p
          style={{
            fontSize: '0.68rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            marginBottom: '1.2rem',
          }}
        >
          Our Story
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(2.6rem, 6vw, 4.8rem)',
            lineHeight: 1.02,
            letterSpacing: '-0.015em',
            color: 'var(--color-ink)',
            fontWeight: 400,
            maxWidth: '20ch',
            opacity: 0,
            animation: 'fade-up 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
          }}
        >
          Art deserves a <em style={{ fontStyle: 'italic' }}>fairer deal.</em>
        </h1>
        <p
          style={{
            marginTop: '1.8rem',
            fontSize: '1rem',
            fontWeight: 300,
            lineHeight: 1.7,
            color: 'var(--color-stone-dark)',
            maxWidth: '52ch',
          }}
        >
          Signo is a small Australian marketplace built around a single idea: the artist should keep what the
          work earns. No commission, no gallery cut, no layered middlemen — just a flat monthly subscription.
        </p>
      </header>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── Mission — editorial prose ── */}
      <section
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(4rem, 7vw, 6rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 'clamp(1.5rem, 4vw, 4rem)' }}>
          <div className="lg:col-span-4">
            <p
              style={{
                fontSize: '0.68rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                marginBottom: '1.2rem',
              }}
            >
              The Mission
            </p>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
                lineHeight: 1.1,
                color: 'var(--color-ink)',
                fontWeight: 400,
                letterSpacing: '-0.01em',
                maxWidth: '16ch',
              }}
            >
              The Australian market is <em style={{ fontStyle: 'italic' }}>thriving</em> — artists simply aren&apos;t.
            </h2>
          </div>
          <div className="lg:col-span-8">
            <p
              style={{
                fontSize: '1rem',
                lineHeight: 1.75,
                color: 'var(--color-stone-dark)',
                fontWeight: 300,
                maxWidth: '58ch',
                marginBottom: '1.4rem',
              }}
            >
              Traditional galleries take 40–60% of every sale. Even contemporary online marketplaces routinely
              charge 30–35%. A work priced at $2,000 can quietly hand $800 of the artist&apos;s labour back to the
              middle. We started Signo to refuse that arithmetic.
            </p>
            <p
              style={{
                fontSize: '1rem',
                lineHeight: 1.75,
                color: 'var(--color-stone-dark)',
                fontWeight: 300,
                maxWidth: '58ch',
                marginBottom: '1.4rem',
              }}
            >
              The platform connects artists directly with collectors, while still providing the curation,
              protection, and clean commercial machinery that both sides need to trust the transaction. Every
              piece passes a considered quality review. Every sale lands in the studio&apos;s own bank account.
            </p>
            <p
              style={{
                fontSize: '1rem',
                lineHeight: 1.75,
                color: 'var(--color-stone-dark)',
                fontWeight: 300,
                maxWidth: '58ch',
              }}
            >
              We take care of the platform so artists can take care of the work.
            </p>
          </div>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── The Numbers — typographic comparison ── */}
      <section
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(4rem, 7vw, 6rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
          background: 'var(--color-cream)',
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 'clamp(1.5rem, 4vw, 4rem)' }}>
          <div className="lg:col-span-4">
            <p
              style={{
                fontSize: '0.68rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                marginBottom: '1.2rem',
              }}
            >
              The Numbers
            </p>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
                lineHeight: 1.1,
                color: 'var(--color-ink)',
                fontWeight: 400,
                letterSpacing: '-0.01em',
                maxWidth: '14ch',
              }}
            >
              What the artist keeps on every <em style={{ fontStyle: 'italic' }}>$100.</em>
            </h2>
          </div>
          <dl className="lg:col-span-8 m-0">
            <ComparisonRow label="Traditional gallery" value="$40–65" note="35–60% commission" />
            <ComparisonRow label="Other online marketplaces" value="$65" note="~35% commission" />
            <ComparisonRow label="Signo" value="$100" note="zero commission · $30/mo subscription" highlight />
          </dl>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── Protections — two-column list ── */}
      <section
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(4rem, 7vw, 6rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
        }}
      >
        <p
          style={{
            fontSize: '0.68rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            marginBottom: '1.2rem',
          }}
        >
          Trust &amp; Safety
        </p>
        <h2
          className="font-serif"
          style={{
            fontSize: 'clamp(2rem, 4vw, 3.2rem)',
            lineHeight: 1.05,
            color: 'var(--color-ink)',
            fontWeight: 400,
            letterSpacing: '-0.015em',
            marginBottom: 'clamp(2.5rem, 5vw, 4rem)',
            maxWidth: '16ch',
          }}
        >
          How we protect <em style={{ fontStyle: 'italic' }}>both sides.</em>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'clamp(2rem, 4vw, 4rem)' }}>
          <ProtectionList
            title="For collectors"
            items={[
              'Every payment held in escrow until delivery is confirmed',
              '48-hour inspection window on receipt',
              'Full refund on works damaged in transit — no return required',
              'Every piece quality-reviewed before listing',
              'Tracked shipping on all physical orders',
            ]}
          />
          <ProtectionList
            title="For artists"
            items={[
              'Keep the full sale price — zero commission',
              'A single flat $30 / month subscription, nothing hidden',
              'Price your own work — no minimums',
              '24–48 hour review turnaround',
              'Guaranteed payout after the inspection window',
              'A direct, simple listing flow',
            ]}
          />
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="px-6 sm:px-10"
        style={{
          background: 'var(--color-ink)',
          color: 'var(--color-warm-white)',
          paddingTop: 'clamp(5rem, 9vw, 8rem)',
          paddingBottom: 'clamp(5rem, 9vw, 8rem)',
        }}
      >
        <div style={{ maxWidth: '58ch' }}>
          <p
            style={{
              fontSize: '0.68rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--color-stone)',
              marginBottom: '1.4rem',
            }}
          >
            Begin
          </p>
          <h2
            className="font-serif"
            style={{
              fontSize: 'clamp(2.4rem, 5vw, 4rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.015em',
              color: 'var(--color-warm-white)',
              fontWeight: 400,
            }}
          >
            Whether you&apos;re making the work, or <em style={{ fontStyle: 'italic' }}>living with it.</em>
          </h2>
          <div
            style={{
              marginTop: '2.6rem',
              display: 'flex',
              gap: '2.2rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <Link
              href="/register"
              style={{
                display: 'inline-block',
                padding: '1.05rem 1.8rem',
                background: 'var(--color-warm-white)',
                color: 'var(--color-ink)',
                fontSize: '0.76rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 400,
                textDecoration: 'none',
                border: '1px solid var(--color-warm-white)',
              }}
            >
              Join Signo
            </Link>
            <Link
              href="/browse"
              style={{
                display: 'inline-block',
                paddingBottom: '0.2rem',
                borderBottom: '1px solid var(--color-stone-dark)',
                fontSize: '0.78rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 300,
                color: 'var(--color-warm-white)',
                textDecoration: 'none',
              }}
            >
              Browse the roster
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ComparisonRow({
  label,
  value,
  note,
  highlight = false,
}: {
  label: string;
  value: string;
  note: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: '1.5rem',
        alignItems: 'baseline',
        padding: '1.6rem 0',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div>
        <dt
          style={{
            fontSize: highlight ? '1rem' : '0.95rem',
            color: 'var(--color-ink)',
            fontWeight: highlight ? 400 : 300,
            marginBottom: '0.35rem',
            letterSpacing: highlight ? '0.01em' : 0,
          }}
        >
          {label}
        </dt>
        <p
          style={{
            fontSize: '0.72rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            fontWeight: 300,
          }}
        >
          {note}
        </p>
      </div>
      <dd
        className="font-serif"
        style={{
          fontSize: highlight ? 'clamp(2rem, 3.5vw, 2.8rem)' : 'clamp(1.4rem, 2vw, 1.8rem)',
          color: 'var(--color-ink)',
          fontWeight: 400,
          margin: 0,
          letterSpacing: '-0.015em',
          fontStyle: highlight ? 'normal' : 'normal',
        }}
      >
        {value}
      </dd>
    </div>
  );
}

function ProtectionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3
        className="font-serif"
        style={{
          fontSize: 'clamp(1.3rem, 2vw, 1.7rem)',
          color: 'var(--color-ink)',
          fontWeight: 400,
          fontStyle: 'italic',
          letterSpacing: '-0.005em',
          marginBottom: '1.5rem',
        }}
      >
        {title}
      </h3>
      <ul className="list-none p-0 m-0">
        {items.map((item, i) => (
          <li
            key={i}
            style={{
              padding: '1rem 0',
              borderTop: '1px solid var(--color-border)',
              borderBottom: i === items.length - 1 ? '1px solid var(--color-border)' : 'none',
              fontSize: '0.92rem',
              lineHeight: 1.55,
              color: 'var(--color-stone-dark)',
              fontWeight: 300,
            }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
