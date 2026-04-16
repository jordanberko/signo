import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Seller Guide — Signo',
  description:
    'Everything artists need to know about selling on Signo — pricing, shipping, payouts, and best practices.',
};

export default function SellerGuidePage() {
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
          Artist Resources
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
          The Seller <em style={{ fontStyle: 'italic' }}>Guide.</em>
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
          Everything you need to list, sell and ship your work on Signo — photography, copy, pricing,
          packing, review, payouts. Read it once; return when something changes.
        </p>
      </header>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      <ChapterSection
        number="01"
        kicker="Photography"
        title="Take great photos"
        headline="Photos do the heavy lifting — get them right and the rest follows."
        intro="Your photos are the single most important factor in selling online. Buyers can't see the work in person, so your images carry the trust."
      >
        <TipList
          items={[
            {
              label: 'Natural lighting',
              detail:
                'Photograph near a large window during the day. Avoid direct sunlight — overcast days or indirect light give the most accurate colours. Never use flash.',
            },
            {
              label: 'Clean background',
              detail:
                'Use a plain white or neutral wall. Remove any clutter. The artwork should be the only focal point in the frame.',
            },
            {
              label: 'Multiple angles',
              detail:
                'Include a straight-on shot, a detail close-up, an angled shot showing depth or texture, and the back of the work showing the hanging mechanism.',
            },
            {
              label: 'Scale reference',
              detail:
                'Include at least one photo in context — on a wall above a sofa, on a desk, or next to a common object. This helps buyers visualise size.',
            },
            {
              label: 'Accurate colours',
              detail:
                'Match the real colours. Avoid heavy filters or editing. Use your camera\'s true tone or auto white balance if available.',
            },
            {
              label: 'High resolution',
              detail:
                'Upload the highest quality images your camera can produce. Signo supports zoom, so buyers inspect details up close.',
            },
          ]}
        />
      </ChapterSection>

      <ChapterSection
        number="02"
        kicker="Writing listings"
        title="Write a compelling listing"
        headline="Title, story, tags — three pieces of copy that carry the sale."
      >
        <TipList
          items={[
            {
              label: 'Title',
              detail:
                'Descriptive but concise. Include the subject or theme. Avoid generic names like "Untitled #47" unless genuinely part of the work. Good examples: "Morning Light on the Yarra", "Coastal Abstract in Blue and Gold", "Portrait of Solitude".',
            },
            {
              label: 'Description',
              detail:
                'Tell the story behind the piece. What inspired it? What mood does it evoke? Mention medium, technique and any special materials. Include practical details: framed, stretched or rolled, and whether it is ready to hang.',
            },
            {
              label: 'Tags & category',
              detail:
                'Choose the most accurate category (painting, drawing, photography, sculpture, digital, mixed media, print). Add tags for style, subject and colour palette so buyers can find the work through search and filters.',
            },
          ]}
        />
      </ChapterSection>

      <ChapterSection
        number="03"
        kicker="Pricing"
        title="Price your work"
        headline="Pricing art is never easy. Five practical guidelines."
      >
        <TipList
          items={[
            {
              label: 'Research comparables',
              detail:
                'Look at what similar artists — same medium, style, career stage — are charging on other platforms. This gives you a realistic baseline.',
            },
            {
              label: 'Materials + time',
              detail:
                'Calculate material costs, then add a fair hourly rate for your time. This is your minimum — your creative value comes on top.',
            },
            {
              label: 'Career stage',
              detail:
                'Emerging artists typically price lower to build a collector base. As your reputation grows and demand increases, raise prices gradually.',
            },
            {
              label: 'Include shipping',
              detail:
                'Signo offers free shipping to buyers. Factor your average shipping cost into the artwork price so there are no surprises.',
            },
            {
              label: 'Be consistent',
              detail:
                'Price similar-sized works in the same medium at similar price points. Erratic pricing can confuse buyers and undermine trust.',
            },
          ]}
        />
      </ChapterSection>

      <ChapterSection
        number="04"
        kicker="Shipping"
        title="Pack it properly"
        headline="A few extra dollars of materials prevents refunds and disappointment."
        intro="Professional packaging protects the work and creates a considered unboxing experience. Damaged artwork means refunds and disappointed buyers."
      >
        <TipList
          items={[
            {
              label: 'Corner protectors',
              detail:
                'Use cardboard corner protectors on all framed works. They cost a few cents and prevent the most common type of shipping damage.',
            },
            {
              label: 'Bubble wrap & padding',
              detail:
                'Wrap in at least two layers of bubble wrap. Fill empty box space with packing paper or foam to prevent movement.',
            },
            {
              label: 'Rigid mailers',
              detail:
                'For unframed prints and works on paper, use rigid cardboard mailers marked "DO NOT BEND". Consider rolling larger works in sturdy tubes.',
            },
            {
              label: 'Double-box fragile items',
              detail:
                'For glass-framed or delicate works, use a box-in-a-box method. Place the wrapped work in a smaller box, then inside a larger box with padding between.',
            },
            {
              label: 'Tracked shipping only',
              detail:
                'Always use tracked postage. Signo requires a tracking number — without it you cannot mark the order as shipped.',
            },
            {
              label: 'Fragile labels',
              detail:
                'Apply fragile stickers or write "FRAGILE — ARTWORK" clearly on all sides. It does not guarantee gentle handling, but it helps.',
            },
          ]}
        />
        <div
          style={{
            marginTop: '2.5rem',
            borderTop: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
            padding: '1.8rem 0',
          }}
        >
          <p
            style={{
              fontSize: '0.62rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--color-stone)',
              marginBottom: '0.6rem',
            }}
          >
            Reminder
          </p>
          <p
            className="font-serif"
            style={{
              fontSize: 'clamp(1.1rem, 1.8vw, 1.4rem)',
              lineHeight: 1.35,
              color: 'var(--color-ink)',
              fontStyle: 'italic',
              fontWeight: 400,
              maxWidth: '48ch',
            }}
          >
            Ship within 7 days, or the order is auto-cancelled and the buyer refunded.
          </p>
        </div>
      </ChapterSection>

      <ChapterSection
        number="05"
        kicker="Review"
        title="The review process"
        headline="Two stages. Curated, so buyers trust what they see."
      >
        <ol className="list-none p-0 m-0" style={{ marginTop: '1.5rem' }}>
          {[
            {
              title: 'AI quality check',
              detail:
                'Our automated system checks image quality, appropriate content and listing completeness. Happens within minutes of submission.',
            },
            {
              title: 'Human sign-off',
              detail:
                'A member of our team reviews every submission personally. We check the listing is accurate, the photos professional, and the work meets our standards. Typically 24–48 hours.',
            },
            {
              title: 'Approved, or feedback',
              detail:
                'If approved, the work goes live immediately. If we need changes, you receive specific feedback — usually photo quality or listing details. Rejections are rare and always explained.',
            },
          ].map((step, i) => (
            <li
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '2.4rem 1fr',
                gap: '1rem',
                padding: '1.3rem 0',
                borderTop: '1px solid var(--color-border)',
                borderBottom: i === 2 ? '1px solid var(--color-border)' : 'none',
                alignItems: 'baseline',
              }}
            >
              <span
                className="font-serif"
                style={{ fontSize: '0.9rem', color: 'var(--color-stone)', fontStyle: 'italic' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <p
                  className="font-serif"
                  style={{
                    fontSize: '1rem',
                    color: 'var(--color-ink)',
                    fontWeight: 400,
                    fontStyle: 'italic',
                    marginBottom: '0.3rem',
                  }}
                >
                  {step.title}
                </p>
                <p
                  style={{
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    color: 'var(--color-stone-dark)',
                    fontWeight: 300,
                  }}
                >
                  {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </ChapterSection>

      <ChapterSection
        number="06"
        kicker="Payouts"
        title="How you get paid"
        headline="Escrow, a 48-hour window, then direct to your bank."
      >
        <TipList
          items={[
            {
              label: 'Escrow protection',
              detail:
                'When a buyer purchases, the payment is held securely by Stripe. This protects both sides — you know the payment is real, they know their money is safe until the work arrives.',
            },
            {
              label: '48-hour inspection',
              detail:
                'After delivery is confirmed, the buyer has 48 hours to inspect. If they do not raise a dispute, funds are automatically released to your bank account.',
            },
            {
              label: 'Stripe transfer',
              detail:
                'Payouts are sent via Stripe Connect directly to your linked bank account. Transfers typically arrive within 2–3 business days.',
            },
            {
              label: 'What you receive',
              detail:
                'Signo charges zero commission. The only deduction is Stripe\'s processing fee (~1.75% + 30c). For a $500 sale, you receive approximately $490.95.',
            },
          ]}
        />
      </ChapterSection>

      {/* ── FAQ ── */}
      <section
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(4rem, 7vw, 6rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
          background: 'var(--color-cream)',
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 'clamp(2rem, 5vw, 5rem)' }}>
          <div className="lg:col-span-4">
            <p
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                marginBottom: '1rem',
              }}
            >
              Common questions
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
              Seller <em style={{ fontStyle: 'italic' }}>FAQ.</em>
            </h2>
          </div>
          <dl className="lg:col-span-8 m-0">
            {[
              {
                q: 'How much does it cost to sell on Signo?',
                a: 'Free until your first sale. After that, it\'s $30/month — no listing fees, no commission, no hidden charges. No payment method is needed to sign up. The only deduction from sales is Stripe\'s processing fee (~1.75% + 30c).',
              },
              {
                q: 'Can I cancel my subscription?',
                a: 'Yes, cancel anytime. Your $30/month subscription only starts after your first sale. If you do cancel later, your listings will be paused (not deleted). Reactivate anytime to make them live again.',
              },
              {
                q: 'How long does the review process take?',
                a: 'Most submissions are reviewed within 24–48 hours. If we need changes, we send specific feedback.',
              },
              {
                q: 'What happens if a buyer disputes an order?',
                a: 'If a buyer raises a dispute within the 48-hour inspection window, the funds remain in escrow while we help resolve the issue. We aim to be fair to both parties.',
              },
              {
                q: 'Can I sell prints as well as originals?',
                a: 'Yes. You can list originals, limited edition prints, open edition prints and digital downloads. Just make sure the listing clearly states what the buyer is getting.',
              },
              {
                q: 'Do I need to offer free shipping?',
                a: 'Signo shows free shipping to buyers. We recommend factoring your average shipping cost into your artwork price.',
              },
              {
                q: "What if a buyer doesn't confirm delivery?",
                a: 'If the buyer does not confirm or raise a dispute within the inspection window, funds are automatically released to you. You are always protected.',
              },
              {
                q: 'Can I sell from outside Australia?',
                a: 'Signo is currently focused on Australian artists selling to Australian buyers. International expansion is planned.',
              },
            ].map((item, i, arr) => (
              <div
                key={item.q}
                style={{
                  padding: '1.6rem 0',
                  borderTop: '1px solid var(--color-border)',
                  borderBottom: i === arr.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <dt
                  className="font-serif"
                  style={{
                    fontSize: '1.05rem',
                    color: 'var(--color-ink)',
                    fontWeight: 400,
                    fontStyle: 'italic',
                    marginBottom: '0.6rem',
                  }}
                >
                  {item.q}
                </dt>
                <dd
                  style={{
                    fontSize: '0.92rem',
                    lineHeight: 1.65,
                    color: 'var(--color-stone-dark)',
                    fontWeight: 300,
                    margin: 0,
                    maxWidth: '58ch',
                  }}
                >
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
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
            Ready to start <em style={{ fontStyle: 'italic' }}>selling?</em>
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
            Join Signo and keep the full price of every sale. No commission, ever.
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
              Create Your Account
            </Link>
            <Link
              href="/pricing"
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
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ChapterSection({
  number,
  kicker,
  title,
  headline,
  intro,
  children,
}: {
  number: string;
  kicker: string;
  title: string;
  headline: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <section
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(4rem, 7vw, 6rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
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
                fontSize: 'clamp(1.6rem, 2.8vw, 2.3rem)',
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
                fontSize: 'clamp(1.3rem, 2.2vw, 1.8rem)',
                lineHeight: 1.25,
                color: 'var(--color-ink)',
                fontWeight: 400,
                fontStyle: 'italic',
                letterSpacing: '-0.005em',
                marginBottom: intro ? '1.5rem' : '0.5rem',
                maxWidth: '40ch',
              }}
            >
              {headline}
            </p>
            {intro && (
              <p
                style={{
                  fontSize: '1rem',
                  lineHeight: 1.75,
                  color: 'var(--color-stone-dark)',
                  fontWeight: 300,
                  maxWidth: '58ch',
                  marginBottom: '0.5rem',
                }}
              >
                {intro}
              </p>
            )}
            {children}
          </div>
        </div>
      </section>
      <div style={{ borderTop: '1px solid var(--color-border)' }} />
    </>
  );
}

function TipList({ items }: { items: Array<{ label: string; detail: string }> }) {
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
