import type { Metadata } from 'next';
import Link from 'next/link';
import { calculateStripeFee } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Pricing — Signo',
  description:
    'Signo pricing for artists: free until your first sale, then $30/month. Zero commission. Keep what the work earns.',
};

function calculatePayout(price: number) {
  const fee = calculateStripeFee(price);
  const payout = Math.round((price - fee) * 100) / 100;
  const percent = ((payout / price) * 100).toFixed(1);
  return { fee, payout, percent };
}

export default function PricingPage() {
  const priceExamples = [100, 250, 500, 1000, 2500].map((price) => {
    const { fee, payout, percent } = calculatePayout(price);
    return { price, fee, payout, percent };
  });

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
          Free until your first sale
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
            animation: 'fade-up var(--dur-slow) var(--ease-out) forwards',
          }}
        >
          Simple, honest <em style={{ fontStyle: 'italic' }}>pricing.</em>
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
          One flat subscription. Zero commission. You keep what the work earns.
        </p>
      </header>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── The Plan — typographic ── */}
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
              The Artist Plan
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.8rem' }}>
              <span
                className="font-serif"
                style={{
                  fontSize: 'clamp(3.5rem, 7vw, 5.5rem)',
                  lineHeight: 1,
                  color: 'var(--color-ink)',
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                }}
              >
                $30
              </span>
              <span
                style={{
                  fontSize: '0.92rem',
                  color: 'var(--color-stone-dark)',
                  fontStyle: 'italic',
                  fontWeight: 300,
                }}
              >
                / month
              </span>
            </div>
            <p
              style={{
                fontSize: '0.82rem',
                color: 'var(--color-stone-dark)',
                fontStyle: 'italic',
                fontWeight: 300,
                maxWidth: '28ch',
              }}
            >
              Starts only after your first sale. Cancel anytime, no lock-in.
            </p>

            <div style={{ marginTop: '2.4rem' }}>
              <Link href="/register" className="artwork-primary-cta artwork-primary-cta--compact">
                Start Selling Free
              </Link>
            </div>
            <p
              style={{
                marginTop: '1.2rem',
                fontSize: '0.72rem',
                color: 'var(--color-stone)',
                fontStyle: 'italic',
                fontWeight: 300,
                maxWidth: '32ch',
                lineHeight: 1.5,
              }}
            >
              No payment method needed to sign up. Browsing &amp; buying is always free.
            </p>
          </div>

          <ul className="list-none p-0 m-0 lg:col-span-8">
            {[
              'Unlimited artwork listings',
              'Zero commission on every sale',
              'A personal artist storefront',
              'Direct messaging with collectors',
              'Sales analytics & insights',
              'Stripe Connect payouts to your bank',
              'AI-assisted quality review',
              'Buyer protection &amp; escrow',
              'Tracked shipping integration',
            ].map((feature, i) => (
              <li
                key={i}
                style={{
                  padding: '1.1rem 0',
                  borderTop: '1px solid var(--color-border)',
                  borderBottom: i === 8 ? '1px solid var(--color-border)' : 'none',
                  fontSize: '1rem',
                  color: 'var(--color-ink)',
                  fontWeight: 300,
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '1.4rem',
                }}
              >
                <span
                  className="font-serif"
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--color-stone)',
                    fontStyle: 'italic',
                    width: '1.4rem',
                    flexShrink: 0,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span dangerouslySetInnerHTML={{ __html: feature }} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── Stripe Ledger ── */}
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
              Transparency
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
              The only fee: <em style={{ fontStyle: 'italic' }}>payment processing.</em>
            </h2>
            <p
              style={{
                marginTop: '1.4rem',
                fontSize: '0.92rem',
                lineHeight: 1.65,
                color: 'var(--color-stone-dark)',
                fontWeight: 300,
                maxWidth: '38ch',
              }}
            >
              Stripe charges ~1.75% + 30¢ on Australian domestic cards. It&apos;s their fee, not ours — passed
              through at cost, with zero markup.
            </p>
          </div>

          <div className="lg:col-span-8">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                gap: '1rem',
                padding: '0.9rem 0',
                borderBottom: '1px solid var(--color-border-strong)',
                fontSize: '0.62rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
              }}
            >
              <div>Sale price</div>
              <div>Stripe fee</div>
              <div>Artist gets</div>
              <div>% kept</div>
            </div>
            {priceExamples.map((ex) => (
              <div
                key={ex.price}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr',
                  gap: '1rem',
                  padding: '1.1rem 0',
                  borderBottom: '1px solid var(--color-border)',
                  alignItems: 'baseline',
                }}
              >
                <div
                  className="font-serif"
                  style={{
                    fontSize: 'clamp(1.05rem, 1.6vw, 1.3rem)',
                    color: 'var(--color-ink)',
                    fontWeight: 400,
                  }}
                >
                  ${ex.price.toLocaleString()}
                </div>
                <div
                  style={{
                    fontSize: '0.88rem',
                    color: 'var(--color-stone)',
                    fontStyle: 'italic',
                    fontWeight: 300,
                  }}
                >
                  −${ex.fee.toFixed(2)}
                </div>
                <div
                  className="font-serif"
                  style={{
                    fontSize: 'clamp(1.05rem, 1.6vw, 1.3rem)',
                    color: 'var(--color-ink)',
                    fontWeight: 400,
                  }}
                >
                  ${ex.payout.toFixed(2)}
                </div>
                <div
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--color-stone-dark)',
                    fontWeight: 300,
                  }}
                >
                  {ex.percent}%
                </div>
              </div>
            ))}
            <p
              style={{
                marginTop: '1.4rem',
                fontSize: '0.72rem',
                color: 'var(--color-stone)',
                fontStyle: 'italic',
                fontWeight: 300,
              }}
            >
              Rates shown for standard Australian domestic cards. International cards may incur a slightly
              higher Stripe fee.
            </p>
          </div>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── Comparison — editorial table ── */}
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
          In context
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
            maxWidth: '18ch',
          }}
        >
          How Signo sits next to the <em style={{ fontStyle: 'italic' }}>alternatives.</em>
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.88rem',
              minWidth: '640px',
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '1.2rem 1rem 1.2rem 0',
                    borderBottom: '1px solid var(--color-border-strong)',
                    fontSize: '0.62rem',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--color-stone)',
                    fontWeight: 400,
                  }}
                />
                {['Signo', 'Blue Thumb', 'Gallery', 'Etsy'].map((h, i) => (
                  <th
                    key={h}
                    className="font-serif"
                    style={{
                      textAlign: 'left',
                      padding: '1.2rem 1rem',
                      borderBottom: '1px solid var(--color-border-strong)',
                      fontSize: '1rem',
                      color: 'var(--color-ink)',
                      fontWeight: 400,
                      fontStyle: i === 0 ? 'italic' : 'normal',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { feature: 'Commission', signo: '0%', bluethumb: '35%', gallery: '40–60%', etsy: '6.5% + fees' },
                {
                  feature: 'Monthly fee',
                  signo: 'Free → $30 / mo',
                  bluethumb: 'Free',
                  gallery: 'Varies',
                  etsy: 'Free + $0.20 / listing',
                },
                { feature: 'Artist keeps (on $500)', signo: '~$491', bluethumb: '~$325', gallery: '~$200–300', etsy: '~$450' },
                { feature: 'Curated', signo: 'Yes', bluethumb: 'Yes', gallery: 'Yes', etsy: 'No' },
                { feature: 'Buyer protection', signo: 'Yes', bluethumb: 'Yes', gallery: 'Varies', etsy: 'Yes' },
                { feature: 'Artist storefront', signo: 'Yes', bluethumb: 'Yes', gallery: 'No', etsy: 'Yes' },
                { feature: 'Direct payout to bank', signo: 'Yes', bluethumb: 'Yes', gallery: 'Varies', etsy: 'Yes' },
                { feature: 'Australian-focused', signo: 'Yes', bluethumb: 'Yes', gallery: 'Yes', etsy: 'No' },
              ].map((row) => (
                <tr key={row.feature}>
                  <td
                    style={{
                      padding: '1.1rem 1rem 1.1rem 0',
                      borderBottom: '1px solid var(--color-border)',
                      color: 'var(--color-ink)',
                      fontWeight: 300,
                      fontStyle: 'italic',
                    }}
                  >
                    {row.feature}
                  </td>
                  <td
                    style={{
                      padding: '1.1rem 1rem',
                      borderBottom: '1px solid var(--color-border)',
                      color: 'var(--color-ink)',
                      fontWeight: 400,
                    }}
                  >
                    {row.signo}
                  </td>
                  <td
                    style={{
                      padding: '1.1rem 1rem',
                      borderBottom: '1px solid var(--color-border)',
                      color: 'var(--color-stone-dark)',
                      fontWeight: 300,
                    }}
                  >
                    {row.bluethumb}
                  </td>
                  <td
                    style={{
                      padding: '1.1rem 1rem',
                      borderBottom: '1px solid var(--color-border)',
                      color: 'var(--color-stone-dark)',
                      fontWeight: 300,
                    }}
                  >
                    {row.gallery}
                  </td>
                  <td
                    style={{
                      padding: '1.1rem 1rem',
                      borderBottom: '1px solid var(--color-border)',
                      color: 'var(--color-stone-dark)',
                      fontWeight: 300,
                    }}
                  >
                    {row.etsy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            The arithmetic
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
            Keep what you <em style={{ fontStyle: 'italic' }}>earn.</em>
          </h2>
          <p
            style={{
              marginTop: '1.4rem',
              fontSize: '0.96rem',
              color: 'var(--color-stone)',
              fontWeight: 300,
              maxWidth: '46ch',
              lineHeight: 1.65,
            }}
          >
            List for free. Thirty dollars a month after the first sale. Zero commission, ever.
          </p>
          <div
            style={{
              marginTop: '2.4rem',
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
              Start Selling Free
            </Link>
            <Link
              href="/how-it-works"
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
              How it works
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
