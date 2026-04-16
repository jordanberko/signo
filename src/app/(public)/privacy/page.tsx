import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Signo',
  description:
    "Signo's privacy policy explaining how Signo collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
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
          Legal · Last updated April 2026
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
          }}
        >
          Privacy, <em style={{ fontStyle: 'italic' }}>plainly stated.</em>
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
          Signo operates in accordance with the Australian Privacy Principles (APPs) under the
          {' '}<em style={{ fontStyle: 'italic' }}>Privacy Act 1988</em> (Cth). What follows is what we collect,
          why we collect it, and the control you have over it.
        </p>
      </header>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      <PolicySection
        number="01"
        kicker="What we collect"
        title="Account, order & content"
        headline="Only what's necessary to run the marketplace."
      >
        <CollectList
          items={[
            {
              label: 'Account information',
              detail:
                'Name, email, and (optionally) profile photo and bio. Artists also provide location and social links.',
            },
            {
              label: 'Shipping addresses',
              detail:
                'Collected at purchase to fulfil physical orders. You may save this for future use.',
            },
            {
              label: 'Payment information',
              detail:
                'Card and bank details are collected and processed directly by Stripe. Signo never stores full card or account numbers.',
            },
            {
              label: 'Artwork and content',
              detail:
                'Images, titles, descriptions and listing metadata you upload. This content is displayed publicly on the platform.',
            },
            {
              label: 'Usage data',
              detail:
                'Pages visited, features used, browser type and device information. Collected to improve the platform.',
            },
          ]}
        />
      </PolicySection>

      <PolicySection
        number="02"
        kicker="How we use it"
        title="Five purposes, nothing more"
        headline="We use your information to run the marketplace — not to sell it on."
      >
        <CollectList
          items={[
            { label: 'Processing orders', detail: 'Facilitating purchases, shipping artwork, handling refunds and disputes.' },
            { label: 'Communication', detail: 'Order confirmations, shipping updates and important account notifications.' },
            { label: 'Platform improvement', detail: 'Understanding usage patterns, fixing bugs, developing new features.' },
            { label: 'Quality review', detail: 'Reviewing artwork submissions and maintaining marketplace standards.' },
            { label: 'Legal compliance', detail: 'Complying with Australian law, preventing fraud, resolving disputes.' },
          ]}
        />
      </PolicySection>

      <PolicySection
        number="03"
        kicker="Third parties"
        title="Three trusted processors"
        headline="We never sell your personal information."
      >
        <CollectList
          items={[
            {
              label: 'Stripe',
              detail: (
                <>
                  Handles all payment processing, including card payments and artist payouts. Stripe maintains its own{' '}
                  <a
                    href="https://stripe.com/au/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--color-ink)',
                      borderBottom: '1px solid var(--color-stone)',
                      textDecoration: 'none',
                    }}
                  >
                    privacy policy
                  </a>.
                </>
              ),
            },
            {
              label: 'Supabase',
              detail:
                'Provides our database and authentication infrastructure. Data is stored with encryption at rest and in transit.',
            },
            {
              label: 'Vercel',
              detail:
                'Hosts the Signo website. Vercel processes request logs and may collect basic analytics (IP address, browser type).',
            },
          ]}
        />
      </PolicySection>

      <PolicySection
        number="04"
        kicker="Cookies"
        title="Essential only"
        headline="No advertising cookies. No cross-site tracking."
      >
        <p style={policyProseStyle}>
          Signo uses essential cookies to keep you signed in and maintain your session — strictly necessary
          for the platform to function.
        </p>
        <p style={{ ...policyProseStyle, marginTop: '1.2rem' }}>
          We may use analytics tools to understand how the platform is used. These collect anonymous,
          aggregated data about page views, feature usage and performance. We do not use cookies for
          advertising or tracking across other websites.
        </p>
      </PolicySection>

      <PolicySection
        number="05"
        kicker="Retention"
        title="How long we keep it"
        headline="Active while your account is; 30 days to delete on request."
      >
        <p style={policyProseStyle}>
          We keep your account information for as long as your account is active. If you delete your
          account, we remove your personal information within 30 days — except where we must retain it
          for legal or financial record-keeping (transaction records are retained for 7 years under
          Australian tax law).
        </p>
        <p style={{ ...policyProseStyle, marginTop: '1.2rem' }}>
          Artwork listings and associated images are removed when an artist deletes them or closes their
          account. Cached copies may persist briefly in content delivery networks.
        </p>
      </PolicySection>

      <PolicySection
        number="06"
        kicker="Your rights"
        title="Under the APPs"
        headline="Four rights you can exercise at any time."
      >
        <CollectList
          items={[
            { label: 'Access', detail: 'Request a copy of the personal information we hold about you.' },
            { label: 'Correction', detail: 'Ask us to correct any inaccurate or out-of-date information.' },
            {
              label: 'Deletion',
              detail: 'Request that we delete your personal information, subject to legal retention requirements.',
            },
            {
              label: 'Complaint',
              detail:
                'Lodge a complaint with us or with the Office of the Australian Information Commissioner (OAIC) if you believe your privacy has been breached.',
            },
          ]}
        />
      </PolicySection>

      {/* ── Contact ── */}
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
            Privacy concerns
          </p>
          <h2
            className="font-serif"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.015em',
              color: 'var(--color-warm-white)',
              fontWeight: 400,
            }}
          >
            Questions, or exercising a <em style={{ fontStyle: 'italic' }}>right?</em>
          </h2>
          <p
            style={{
              marginTop: '1.6rem',
              fontSize: '1rem',
              fontWeight: 300,
              lineHeight: 1.7,
              color: 'var(--color-stone)',
              maxWidth: '46ch',
            }}
          >
            Write to us directly. A real person on the Signo team will reply.
          </p>
          <div
            style={{
              marginTop: '2.6rem',
              display: 'flex',
              gap: '2.2rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <a
              href="mailto:privacy@signoart.com.au"
              className="font-serif"
              style={{
                fontSize: '1.15rem',
                color: 'var(--color-warm-white)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--color-stone-dark)',
                paddingBottom: '0.2rem',
                fontStyle: 'italic',
              }}
            >
              privacy@signoart.com.au
            </a>
            <Link
              href="/contact"
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
              Contact form
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

const policyProseStyle: React.CSSProperties = {
  fontSize: '1rem',
  lineHeight: 1.75,
  color: 'var(--color-stone-dark)',
  fontWeight: 300,
  maxWidth: '58ch',
};

function PolicySection({
  number,
  kicker,
  title,
  headline,
  children,
}: {
  number: string;
  kicker: string;
  title: string;
  headline: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <section
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(3.5rem, 6vw, 5.5rem)',
          paddingBottom: 'clamp(3.5rem, 6vw, 5.5rem)',
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 'clamp(2rem, 5vw, 5rem)' }}>
          <div className="lg:col-span-4">
            <p
              className="font-serif"
              style={{
                fontSize: '0.9rem',
                color: 'var(--color-stone)',
                fontStyle: 'italic',
                marginBottom: '0.8rem',
              }}
            >
              {number}
            </p>
            <p
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                marginBottom: '1rem',
              }}
            >
              {kicker}
            </p>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(1.5rem, 2.6vw, 2.1rem)',
                lineHeight: 1.15,
                color: 'var(--color-ink)',
                fontWeight: 400,
                letterSpacing: '-0.01em',
                maxWidth: '14ch',
              }}
            >
              {title}
            </h2>
          </div>
          <div className="lg:col-span-8">
            <p
              className="font-serif"
              style={{
                fontSize: 'clamp(1.2rem, 2vw, 1.65rem)',
                lineHeight: 1.3,
                color: 'var(--color-ink)',
                fontWeight: 400,
                fontStyle: 'italic',
                letterSpacing: '-0.005em',
                marginBottom: '2rem',
                maxWidth: '40ch',
              }}
            >
              {headline}
            </p>
            {children}
          </div>
        </div>
      </section>
      <div style={{ borderTop: '1px solid var(--color-border)' }} />
    </>
  );
}

function CollectList({
  items,
}: {
  items: Array<{ label: string; detail: React.ReactNode }>;
}) {
  return (
    <dl className="m-0">
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 14rem) minmax(0, 1fr)',
            gap: '1.5rem',
            alignItems: 'baseline',
            padding: '1.3rem 0',
            borderTop: '1px solid var(--color-border)',
            borderBottom: i === items.length - 1 ? '1px solid var(--color-border)' : 'none',
          }}
        >
          <dt
            className="font-serif"
            style={{
              fontSize: '0.98rem',
              color: 'var(--color-ink)',
              fontWeight: 400,
              fontStyle: 'italic',
            }}
          >
            {item.label}
          </dt>
          <dd
            style={{
              fontSize: '0.92rem',
              lineHeight: 1.6,
              color: 'var(--color-stone-dark)',
              fontWeight: 300,
              margin: 0,
            }}
          >
            {item.detail}
          </dd>
        </div>
      ))}
    </dl>
  );
}
