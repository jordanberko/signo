import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Returns & Refunds — Signo',
  description:
    'Signo returns and refunds policy — escrow protection, inspection windows, and how disputes are resolved.',
};

export default function ReturnsPage() {
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
          Buyer Protection
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
          Returns, <em style={{ fontStyle: 'italic' }}>refunds &amp; disputes.</em>
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
          Every purchase on Signo is held in escrow until you confirm delivery. If anything goes wrong on
          arrival, here is exactly what happens — in plain language.
        </p>
      </header>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── Escrow explainer — editorial pullquote ── */}
      <section
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(3.5rem, 7vw, 6rem)',
          paddingBottom: 'clamp(3.5rem, 7vw, 6rem)',
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 'clamp(1.6rem, 4vw, 4rem)' }}>
          <div className="lg:col-span-3">
            <p
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
              }}
            >
              How escrow protects you
            </p>
          </div>
          <p
            className="font-serif lg:col-span-8"
            style={{
              fontSize: 'clamp(1.4rem, 2.4vw, 2rem)',
              lineHeight: 1.35,
              color: 'var(--color-ink)',
              fontWeight: 400,
              fontStyle: 'italic',
              letterSpacing: '-0.005em',
              maxWidth: '42ch',
            }}
          >
            &ldquo;Your payment is held securely by Stripe. The artist only receives the funds when you
            confirm delivery — or after the 48-hour inspection window passes without a dispute.&rdquo;
          </p>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── Scenarios ── */}
      <PolicySection number="01" kicker="Scenario" title="Damaged in transit" headline="A full refund, no return required.">
        <p>
          If your artwork arrives damaged, we issue a full refund. You do not need to post anything back — we know
          that&apos;s impractical with a damaged piece.
        </p>
        <SubList
          title="What to do"
          items={[
            'Photograph the damage — the artwork and the packaging.',
            'Open a dispute on your order page within 48 hours of delivery.',
            'Upload the photographs as evidence.',
            'We review and process your refund within 1–2 business days.',
          ]}
        />
        <p style={{ marginTop: '1.4rem' }}>
          The artist may claim shipping insurance separately — this does not affect your refund.
        </p>
      </PolicySection>

      <PolicySection number="02" kicker="Scenario" title="Not as described" headline="A full refund on return.">
        <p>
          If the artwork differs materially from the listing — wrong size, different colours, different medium, or
          significantly different from the photos — you can return it for a full refund.
        </p>
        <SubList
          title="What to do"
          items={[
            'Open a dispute through your order page within 48 hours of delivery.',
            'Describe the discrepancy and upload comparison photos.',
            'If we agree the work is not as described, we approve the return.',
            'Ship the work back to the artist at your cost (we provide the address).',
            'Once the artist confirms receipt, your refund is processed within 1–2 business days.',
          ]}
        />
        <p style={{ marginTop: '1.4rem', fontStyle: 'italic' }}>
          We review every case individually. Minor differences arising from monitor calibration or the inherent
          qualities of handmade work are not grounds for return.
        </p>
      </PolicySection>

      <PolicySection number="03" kicker="Scenario" title="Changed your mind" headline="Before shipping, yes. After, the sale is final.">
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'clamp(1.5rem, 4vw, 3.5rem)', marginTop: '1.2rem' }}>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.2rem' }}>
            <p
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                marginBottom: '0.6rem',
              }}
            >
              Before shipping
            </p>
            <p style={{ fontSize: '0.94rem', lineHeight: 1.65, color: 'var(--color-stone-dark)', fontWeight: 300 }}>
              Cancel within 24 hours of purchase for a full refund, provided the artist has not yet shipped.
            </p>
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.2rem' }}>
            <p
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                marginBottom: '0.6rem',
              }}
            >
              After shipping
            </p>
            <p style={{ fontSize: '0.94rem', lineHeight: 1.65, color: 'var(--color-stone-dark)', fontWeight: 300 }}>
              Once the work has been shipped, the sale is final. The artist has already packed and posted the piece.
            </p>
          </div>
        </div>
        <p style={{ marginTop: '1.6rem' }}>
          Please review the listing photos, dimensions and description carefully before purchasing. If you have
          questions about a piece, message the artist directly first.
        </p>
      </PolicySection>

      <PolicySection number="04" kicker="Scenario" title="Digital downloads" headline="All digital sales are final.">
        <p>
          Due to the nature of digital files, we cannot offer refunds once the download link has been accessed.
        </p>
        <p style={{ marginTop: '1rem' }}>
          The exception is corrupted or inaccessible files — if you receive a file that will not open, contact
          us and we will either provide a working file or issue a refund.
        </p>
      </PolicySection>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── How to raise a dispute ── */}
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
              Raising a dispute
            </p>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
                lineHeight: 1.1,
                color: 'var(--color-ink)',
                fontWeight: 400,
                letterSpacing: '-0.01em',
                maxWidth: '16ch',
              }}
            >
              Four steps, <em style={{ fontStyle: 'italic' }}>within 48 hours.</em>
            </h2>
          </div>
          <ol className="list-none p-0 m-0 lg:col-span-8">
            {[
              'Go to your order page (My Orders → select the order).',
              'Click "Raise a Dispute" — this must happen within 48 hours of delivery.',
              'Select the reason, describe the issue, upload supporting photographs.',
              'Our team reviews the dispute and responds within 1–2 business days.',
            ].map((step, i) => (
              <li
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.4rem 1fr',
                  gap: '1rem',
                  padding: '1.3rem 0',
                  borderTop: '1px solid var(--color-border)',
                  borderBottom: i === 3 ? '1px solid var(--color-border)' : 'none',
                  alignItems: 'baseline',
                }}
              >
                <span
                  className="font-serif"
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--color-stone)',
                    fontStyle: 'italic',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  style={{
                    fontSize: '0.96rem',
                    color: 'var(--color-ink)',
                    fontWeight: 300,
                    lineHeight: 1.6,
                  }}
                >
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── Timeline ── */}
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
              Refund timeline
            </p>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
                lineHeight: 1.1,
                color: 'var(--color-ink)',
                fontWeight: 400,
                letterSpacing: '-0.01em',
                maxWidth: '14ch',
              }}
            >
              Start to <em style={{ fontStyle: 'italic' }}>settlement.</em>
            </h2>
          </div>
          <dl className="lg:col-span-8 m-0">
            {[
              { label: 'Dispute review', value: '1–2 business days' },
              { label: 'Refund processing (after approval)', value: '1–2 business days' },
              { label: 'Funds back to card / bank', value: '3–5 business days' },
              { label: 'Total estimated time', value: '5–9 business days', highlight: true },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  padding: '1.1rem 0',
                  borderBottom: '1px solid var(--color-border)',
                  gap: '1rem',
                }}
              >
                <dt
                  style={{
                    fontSize: '0.94rem',
                    color: 'var(--color-ink)',
                    fontWeight: row.highlight ? 400 : 300,
                    fontStyle: row.highlight ? 'normal' : 'italic',
                  }}
                >
                  {row.label}
                </dt>
                <dd
                  className="font-serif"
                  style={{
                    fontSize: row.highlight ? 'clamp(1.3rem, 2vw, 1.6rem)' : '1.05rem',
                    color: 'var(--color-ink)',
                    fontWeight: 400,
                    margin: 0,
                  }}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <p
          style={{
            marginTop: '1.8rem',
            fontSize: '0.72rem',
            color: 'var(--color-stone)',
            fontStyle: 'italic',
            fontWeight: 300,
            maxWidth: '64ch',
          }}
        >
          Refund timing ultimately depends on your bank or card issuer. Signo processes refunds promptly, but
          your financial institution may take additional time to credit your account.
        </p>
      </section>

      {/* ── Contact CTA ── */}
      <section
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(4rem, 7vw, 6rem)',
          paddingBottom: 'clamp(5rem, 9vw, 8rem)',
          borderTop: '1px solid var(--color-border)',
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
          Still unsure?
        </p>
        <h2
          className="font-serif"
          style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            lineHeight: 1.1,
            color: 'var(--color-ink)',
            fontWeight: 400,
            letterSpacing: '-0.01em',
            maxWidth: '18ch',
            marginBottom: '2rem',
          }}
        >
          Our support team will walk you <em style={{ fontStyle: 'italic' }}>through it.</em>
        </h2>
        <Link href="/contact" className="editorial-link">
          Contact support
        </Link>
      </section>
    </div>
  );
}

// ── Shared editorial building blocks ──

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
    <section
      className="px-6 sm:px-10"
      style={{
        paddingTop: 'clamp(3.5rem, 6vw, 5rem)',
        paddingBottom: 'clamp(3.5rem, 6vw, 5rem)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 'clamp(1.5rem, 4vw, 4rem)' }}>
        <div className="lg:col-span-4">
          <p
            style={{
              fontSize: '0.62rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--color-stone)',
              marginBottom: '0.8rem',
            }}
          >
            {kicker} · {number}
          </p>
          <h2
            className="font-serif"
            style={{
              fontSize: 'clamp(1.6rem, 3vw, 2.3rem)',
              lineHeight: 1.1,
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
              fontSize: 'clamp(1.2rem, 1.8vw, 1.5rem)',
              lineHeight: 1.3,
              color: 'var(--color-ink)',
              fontWeight: 400,
              fontStyle: 'italic',
              letterSpacing: '-0.005em',
              marginBottom: '1.6rem',
              maxWidth: '36ch',
            }}
          >
            {headline}
          </p>
          <div
            style={{
              fontSize: '0.96rem',
              lineHeight: 1.7,
              color: 'var(--color-stone-dark)',
              fontWeight: 300,
              maxWidth: '58ch',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function SubList({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ marginTop: '1.6rem' }}>
      <p
        style={{
          fontSize: '0.62rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--color-stone)',
          marginBottom: '0.8rem',
        }}
      >
        {title}
      </p>
      <ol className="list-none p-0 m-0">
        {items.map((item, i) => (
          <li
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '2rem 1fr',
              gap: '0.8rem',
              padding: '0.8rem 0',
              borderTop: '1px solid var(--color-border)',
              borderBottom: i === items.length - 1 ? '1px solid var(--color-border)' : 'none',
              alignItems: 'baseline',
              fontSize: '0.92rem',
              lineHeight: 1.55,
              color: 'var(--color-stone-dark)',
              fontWeight: 300,
            }}
          >
            <span
              className="font-serif"
              style={{ fontSize: '0.78rem', color: 'var(--color-stone)', fontStyle: 'italic' }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
