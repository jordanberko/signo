import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — Signo',
  description:
    "Read Signo's terms of service covering artwork listings, purchases, escrow payments, and dispute resolution.",
};

export default function TermsPage() {
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
            maxWidth: '22ch',
          }}
        >
          Terms, <em style={{ fontStyle: 'italic' }}>kept as readable as we can.</em>
        </h1>
        <p
          style={{
            marginTop: '1.8rem',
            fontSize: '1rem',
            fontWeight: 300,
            lineHeight: 1.7,
            color: 'var(--color-stone-dark)',
            maxWidth: '56ch',
          }}
        >
          By using Signo you agree to these terms — a binding agreement between you and Signo Pty Ltd
          (ABN: to be confirmed). If anything is unclear,{' '}
          <Link
            href="/contact"
            style={{
              color: 'var(--color-ink)',
              borderBottom: '1px solid var(--color-stone)',
              textDecoration: 'none',
            }}
          >
            get in touch
          </Link>
          .
        </p>
      </header>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      <Clause
        number="01"
        kicker="Using Signo"
        title="The basics"
        headline="A marketplace where artists and buyers transact directly, with Signo facilitating."
      >
        <Prose>
          Signo is an online marketplace that connects Australian artists with art buyers. We provide
          the platform — artists and buyers transact directly, with Signo facilitating payments, escrow,
          and dispute resolution.
        </Prose>
        <Prose>
          To use Signo you must be at least 18 years old and provide accurate information when creating
          your account. You are responsible for keeping your login credentials secure, and for all
          activity under your account.
        </Prose>
        <Prose>
          We reserve the right to suspend or terminate accounts that violate these terms, engage in
          fraudulent activity, or harm the Signo community.
        </Prose>
      </Clause>

      <Clause
        number="02"
        kicker="Artist obligations"
        title="If you sell on Signo"
        headline="Five commitments to the buyers who trust you."
      >
        <ClauseList
          items={[
            {
              label: 'Original work only',
              detail:
                "All artwork must be your own original creation, or clearly labelled as a licensed reproduction or print. Uploading work that infringes on someone else's copyright will result in immediate removal and potential account suspension.",
            },
            {
              label: 'Accurate listings',
              detail:
                'Titles, descriptions, dimensions, medium and photos must accurately represent the artwork. Misleading listings harm buyers and damage trust.',
            },
            {
              label: 'Ship within 7 days',
              detail:
                'Once an order is placed, you must ship with tracked postage within 7 days. Orders not shipped within this window are automatically cancelled and the buyer refunded.',
            },
            {
              label: 'Professional packaging',
              detail:
                'Package appropriately to prevent damage in transit — corner protectors, bubble wrap, rigid mailers as needed. See the Seller Guide for best practices.',
            },
            {
              label: 'Respond to disputes',
              detail:
                'If a buyer raises a dispute, respond promptly and in good faith. Work with our team to resolve issues fairly.',
            },
          ]}
        />
      </Clause>

      <Clause
        number="03"
        kicker="Buyer obligations"
        title="If you purchase on Signo"
        headline="Four commitments to the artists you collect."
      >
        <ClauseList
          items={[
            {
              label: 'Honest disputes',
              detail:
                "Only raise disputes for genuine issues (damage, not as described). Fraudulent disputes — such as claiming damage that didn't occur — will result in account suspension.",
            },
            {
              label: 'Inspection window',
              detail:
                'You have 48 hours after delivery to inspect the work and raise any issues. After this window closes, funds are released to the artist and the sale is considered final.',
            },
            {
              label: 'Accurate shipping details',
              detail:
                'Provide a correct and complete shipping address. Signo and the artist are not responsible for delivery issues caused by incorrect address information.',
            },
            {
              label: 'Respectful communication',
              detail:
                'Communicate respectfully with artists. Harassment, abusive messages and threats are not tolerated.',
            },
          ]}
        />
      </Clause>

      <Clause
        number="04"
        kicker="Subscription"
        title="$30 / month, cancel any time"
        headline="Billed monthly through Stripe; no commission on sales."
      >
        <Prose>
          Selling on Signo requires an active artist subscription at{' '}
          <em style={{ fontStyle: 'italic' }}>$30 AUD per month</em>. The subscription is billed monthly
          through Stripe and can be cancelled at any time.
        </Prose>
        <ClauseList
          items={[
            {
              label: 'Cancellation',
              detail:
                'Cancel at any time from your account settings. Your listings remain active until the end of your current billing period, then pause (not deleted).',
            },
            {
              label: 'Reactivation',
              detail:
                'Resubscribing at any time immediately makes your paused listings live again.',
            },
            {
              label: 'Outstanding orders',
              detail:
                'Even after cancellation, you must fulfil any outstanding orders. Cancelling a subscription does not cancel orders buyers have already paid for.',
            },
            {
              label: 'Price changes',
              detail:
                'We may adjust subscription pricing with 30 days notice. Existing subscribers will be notified by email before any change takes effect.',
            },
          ]}
        />
      </Clause>

      <Clause
        number="05"
        kicker="Intellectual property"
        title="Artists retain full copyright"
        headline="Listing on Signo does not transfer ownership."
      >
        <Prose>
          <em style={{ fontStyle: 'italic' }}>Artists retain full copyright</em> to all artwork uploaded
          to Signo. Listing your work on our platform does not transfer ownership of your intellectual
          property.
        </Prose>
        <Prose>
          By listing, you grant us a non-exclusive, worldwide licence to display, reproduce and
          distribute images of your artwork for the purposes of operating the marketplace — showing your
          work on the website, in search results, in promotional materials and on social media. This
          licence ends when you remove the listing or close your account.
        </Prose>
        <Prose>
          When a buyer purchases artwork, they acquire the physical piece (or digital file). Copyright
          remains with the artist unless explicitly transferred in writing.
        </Prose>
      </Clause>

      <Clause
        number="06"
        kicker="Dispute resolution"
        title="How we resolve disagreements"
        headline="Fair, fast, and based on the evidence."
      >
        <Prose>We aim to resolve all disputes fairly and efficiently. Our process:</Prose>
        <ol className="list-none p-0 m-0" style={{ marginTop: '1.5rem' }}>
          {[
            'Buyer raises a dispute through their order page within 48 hours of delivery.',
            'Both parties provide their account of the issue, with supporting evidence.',
            'Signo reviews the dispute and makes a decision within 1–2 business days.',
            'If a refund is warranted, it is processed from the escrowed funds.',
          ].map((step, i) => (
            <li
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '2.4rem 1fr',
                gap: '1rem',
                padding: '1rem 0',
                borderTop: '1px solid var(--color-border)',
                borderBottom: i === 3 ? '1px solid var(--color-border)' : 'none',
                alignItems: 'baseline',
              }}
            >
              <span
                className="font-serif"
                style={{ fontSize: '0.9rem', color: 'var(--color-stone)', fontStyle: 'italic' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                style={{
                  fontSize: '0.95rem',
                  color: 'var(--color-ink)',
                  fontWeight: 300,
                  lineHeight: 1.55,
                }}
              >
                {step}
              </span>
            </li>
          ))}
        </ol>
        <div style={{ marginTop: '2rem' }}>
          <Prose>
            Dispute decisions are made in good faith based on the evidence provided. If you disagree
            with a decision, you can request a review by writing to{' '}
            <a
              href="mailto:disputes@signoart.com.au"
              style={{
                color: 'var(--color-ink)',
                borderBottom: '1px solid var(--color-stone)',
                textDecoration: 'none',
              }}
            >
              disputes@signoart.com.au
            </a>
            .
          </Prose>
          <Prose>
            For disputes we cannot resolve internally, Australian Consumer Law and the relevant state or
            territory consumer affairs body may provide additional remedies.
          </Prose>
        </div>
      </Clause>

      <Clause
        number="07"
        kicker="Liability"
        title="What Signo is — and isn't — responsible for"
        headline="We facilitate. We do not warrant every transaction."
      >
        <Prose>
          Signo provides a marketplace platform. We are not a party to the transaction between artists
          and buyers. While we facilitate payments through escrow and provide buyer protection, we do
          not guarantee the quality, safety or legality of listed artwork.
        </Prose>
        <Prose>To the maximum extent permitted by Australian law:</Prose>
        <ClauseList
          items={[
            {
              label: 'Damage in transit',
              detail:
                'Signo is not liable for artwork damaged in transit, though our buyer protection covers refunds.',
            },
            {
              label: 'Between parties',
              detail:
                'We are not responsible for disputes between artists and buyers beyond our facilitation role.',
            },
            {
              label: 'Capped liability',
              detail:
                'Our total liability for any claim is limited to the fees you have paid to Signo in the 12 months preceding the claim.',
            },
            {
              label: 'Indirect damages',
              detail: 'We are not liable for indirect, incidental or consequential damages.',
            },
          ]}
        />
        <Prose>
          Nothing in these terms excludes or limits liability that cannot be excluded under Australian
          Consumer Law.
        </Prose>
      </Clause>

      <Clause
        number="08"
        kicker="Changes"
        title="Updates to these terms"
        headline="14 days notice on anything significant."
      >
        <Prose>
          We may update these terms from time to time. For significant changes we will notify you by
          email at least 14 days before they take effect. Continued use of Signo after changes take
          effect constitutes acceptance of the updated terms.
        </Prose>
      </Clause>

      <Clause
        number="09"
        kicker="Governing law"
        title="Victoria, Australia"
        headline="The courts of Victoria have exclusive jurisdiction."
      >
        <Prose>
          These terms are governed by the laws of the State of Victoria, Australia. Any disputes arising
          from these terms will be subject to the exclusive jurisdiction of the courts of Victoria.
        </Prose>
      </Clause>

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
            Questions
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
            Anything unclear, <em style={{ fontStyle: 'italic' }}>just ask.</em>
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
            We are happy to explain any part of these terms in plain language.
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
            <Link
              href="/contact"
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
              Contact Us
            </Link>
            <a
              href="mailto:hello@signoart.com.au"
              className="font-serif"
              style={{
                fontSize: '1.05rem',
                color: 'var(--color-warm-white)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--color-stone-dark)',
                paddingBottom: '0.2rem',
                fontStyle: 'italic',
              }}
            >
              hello@signoart.com.au
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: '1rem',
        lineHeight: 1.75,
        color: 'var(--color-stone-dark)',
        fontWeight: 300,
        maxWidth: '58ch',
        marginTop: '1.2rem',
      }}
    >
      {children}
    </p>
  );
}

function Clause({
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
                marginBottom: '1.5rem',
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

function ClauseList({
  items,
}: {
  items: Array<{ label: string; detail: React.ReactNode }>;
}) {
  return (
    <dl className="m-0" style={{ marginTop: '1.5rem' }}>
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
