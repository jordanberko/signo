import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works — Signo',
  description:
    'A transparent process for both sides of the studio door. How Signo connects Australian artists with collectors — directly, without commission.',
};

interface Step {
  num: string;
  title: string;
  body: string;
}

const sellerSteps: Step[] = [
  {
    num: '01',
    title: 'Create your profile',
    body: 'Add your bio, a portrait, links to your socials. Your profile is the studio door — it is how collectors first meet your practice.',
  },
  {
    num: '02',
    title: 'Upload the work',
    body: 'High-resolution photographs, the price you set, medium and dimensions. There are no listing fees and no minimum prices.',
  },
  {
    num: '03',
    title: 'A considered review',
    body: 'A light, AI-assisted quality check runs within 24 to 48 hours. Far faster than a traditional gallery, and more consistent.',
  },
  {
    num: '04',
    title: 'Paid directly',
    body: 'When a work sells, you keep the full sale price. Funds are released when the buyer confirms delivery — or automatically after the 48-hour inspection window closes.',
  },
];

const buyerSteps: Step[] = [
  {
    num: '01',
    title: 'Browse the roster',
    body: 'Filter by medium, scale, price, palette. Every piece has been reviewed before it was listed — the roster is considered, not algorithmic.',
  },
  {
    num: '02',
    title: 'Checkout in escrow',
    body: 'Card, Apple Pay, or Google Pay. Your payment is held securely by Stripe until the work arrives and you confirm it matches the listing.',
  },
  {
    num: '03',
    title: 'Tracked delivery',
    body: 'Artists ship with tracked postage within seven days. You can follow the work in real time, from studio to wall.',
  },
  {
    num: '04',
    title: 'Inspect, then settle',
    body: 'You have 48 hours after delivery to inspect the piece. If something is not right, buyer protection covers you — full refund, no argument.',
  },
];

const protections = [
  {
    title: 'Damaged in transit',
    body: 'Full refund, no return required. Upload photographs of the damage and we handle the rest on your behalf.',
  },
  {
    title: 'Not as described',
    body: 'If the work differs materially from the listing — in size, condition, or execution — return it for a full refund.',
  },
  {
    title: 'Escrow protection',
    body: 'Your payment is held by Stripe until you have confirmed the artwork has arrived safely and is as it should be.',
  },
];

function StepList({ kicker, heading, steps }: { kicker: string; heading: string; steps: Step[] }) {
  return (
    <section
      className="px-6 sm:px-10"
      style={{
        paddingTop: 'clamp(4rem, 7vw, 6rem)',
        paddingBottom: 'clamp(4rem, 7vw, 6rem)',
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 'clamp(1.5rem, 4vw, 4rem)' }}>
        {/* Section kicker + heading */}
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
            {kicker}
          </p>
          <h2
            className="font-serif"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.015em',
              color: 'var(--color-ink)',
              fontWeight: 400,
              maxWidth: '14ch',
            }}
          >
            {heading}
          </h2>
        </div>

        {/* Steps */}
        <ol className="list-none p-0 m-0 lg:col-span-8">
          {steps.map((step, i) => (
            <li
              key={step.num}
              style={{
                borderTop: '1px solid var(--color-border)',
                borderBottom: i === steps.length - 1 ? '1px solid var(--color-border)' : 'none',
                padding: '2rem 0',
                display: 'grid',
                gridTemplateColumns: '4rem minmax(0, 1fr)',
                gap: 'clamp(1rem, 3vw, 2.4rem)',
                alignItems: 'baseline',
              }}
            >
              <span
                className="font-serif"
                style={{
                  fontSize: 'clamp(1.6rem, 2.6vw, 2.2rem)',
                  lineHeight: 1,
                  color: 'var(--color-stone)',
                  fontWeight: 400,
                  fontStyle: 'italic',
                  letterSpacing: '-0.02em',
                }}
              >
                {step.num}
              </span>
              <div>
                <h3
                  className="font-serif"
                  style={{
                    fontSize: 'clamp(1.35rem, 2vw, 1.8rem)',
                    lineHeight: 1.2,
                    color: 'var(--color-ink)',
                    fontWeight: 400,
                    letterSpacing: '-0.01em',
                    marginBottom: '0.7rem',
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.96rem',
                    lineHeight: 1.65,
                    color: 'var(--color-stone-dark)',
                    fontWeight: 300,
                    maxWidth: '48ch',
                  }}
                >
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default function HowItWorksPage() {
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
          The Process
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(2.6rem, 6vw, 4.8rem)',
            lineHeight: 1.02,
            letterSpacing: '-0.015em',
            color: 'var(--color-ink)',
            fontWeight: 400,
            maxWidth: '18ch',
            opacity: 0,
            animation: 'fade-up 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
          }}
        >
          A transparent process, on <em style={{ fontStyle: 'italic' }}>both sides</em> of the studio door.
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
          Signo connects Australian artists with collectors directly — no commission, no gallery cut, no sealed
          negotiations. Everything below is how it actually works, in plain language.
        </p>
      </header>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── For Sellers ── */}
      <StepList kicker="For Artists" heading="Selling from the studio." steps={sellerSteps} />

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── Commission example — typographic ledger ── */}
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
              What the artist takes home
            </p>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
                lineHeight: 1.1,
                color: 'var(--color-ink)',
                fontWeight: 400,
                letterSpacing: '-0.01em',
              }}
            >
              A $500 painting, <em style={{ fontStyle: 'italic' }}>broken down.</em>
            </h2>
          </div>

          <div className="lg:col-span-8 lg:col-start-5">
            <dl className="m-0">
              <LedgerRow label="Sale price" value="$500.00" muted={false} />
              <LedgerRow label="Stripe processing (~1.75% + 30¢)" value="−$9.05" muted />
              <LedgerRow label="Signo commission" value="$0.00" muted />
              <div
                style={{
                  borderTop: '1px solid var(--color-border-strong)',
                  marginTop: '0.8rem',
                  paddingTop: '1.4rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: '1rem',
                  }}
                >
                  <dt
                    style={{
                      fontSize: '0.68rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: 'var(--color-ink)',
                      fontWeight: 400,
                    }}
                  >
                    Artist receives
                  </dt>
                  <dd
                    className="font-serif"
                    style={{
                      fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
                      color: 'var(--color-ink)',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      margin: 0,
                    }}
                  >
                    $490.95
                  </dd>
                </div>
              </div>
            </dl>
            <p
              style={{
                marginTop: '1.8rem',
                fontSize: '0.82rem',
                color: 'var(--color-stone-dark)',
                fontStyle: 'italic',
                fontWeight: 300,
                lineHeight: 1.6,
                maxWidth: '52ch',
              }}
            >
              Signo is free until your first sale — then $30 per month, with zero commission on any work sold.
              Stripe&apos;s payment processing is the only deduction.
            </p>
          </div>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── For Buyers ── */}
      <StepList kicker="For Collectors" heading="Finding work to live with." steps={buyerSteps} />

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── Buyer Protection ── */}
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
              Peace of mind
            </p>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.2rem)',
                lineHeight: 1.05,
                color: 'var(--color-ink)',
                fontWeight: 400,
                letterSpacing: '-0.015em',
                maxWidth: '14ch',
              }}
            >
              Buyer protection, in writing.
            </h2>
          </div>

          <ul className="list-none p-0 m-0 lg:col-span-8">
            {protections.map((p, i) => (
              <li
                key={p.title}
                style={{
                  borderTop: '1px solid var(--color-border)',
                  borderBottom: i === protections.length - 1 ? '1px solid var(--color-border)' : 'none',
                  padding: '1.8rem 0',
                }}
              >
                <h3
                  className="font-serif"
                  style={{
                    fontSize: 'clamp(1.2rem, 1.8vw, 1.5rem)',
                    lineHeight: 1.2,
                    color: 'var(--color-ink)',
                    fontWeight: 400,
                    fontStyle: 'italic',
                    letterSpacing: '-0.005em',
                    marginBottom: '0.6rem',
                  }}
                >
                  {p.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.94rem',
                    lineHeight: 1.65,
                    color: 'var(--color-stone-dark)',
                    fontWeight: 300,
                    maxWidth: '52ch',
                  }}
                >
                  {p.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CTA — full-bleed ink ── */}
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
            Whether you are making the work, or <em style={{ fontStyle: 'italic' }}>living with it.</em>
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
                transition: 'background 350ms cubic-bezier(0.22, 1, 0.36, 1), color 350ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
              onMouseOver={undefined}
            >
              List your work
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

function LedgerRow({ label, value, muted }: { label: string; value: string; muted: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '0.9rem 0',
        borderBottom: '1px solid var(--color-border)',
        gap: '1rem',
      }}
    >
      <dt
        style={{
          fontSize: '0.86rem',
          color: muted ? 'var(--color-stone)' : 'var(--color-ink)',
          fontWeight: 300,
          fontStyle: muted ? 'italic' : 'normal',
        }}
      >
        {label}
      </dt>
      <dd
        className="font-serif"
        style={{
          fontSize: '1.1rem',
          color: muted ? 'var(--color-stone)' : 'var(--color-ink)',
          fontWeight: 400,
          margin: 0,
        }}
      >
        {value}
      </dd>
    </div>
  );
}
