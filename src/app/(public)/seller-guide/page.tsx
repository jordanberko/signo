import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Camera, FileText, DollarSign, Package, CheckCircle, Banknote } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Seller Guide',
  description:
    'Everything artists need to know about selling on Signo — pricing, shipping, payouts, and best practices.',
};

export default function SellerGuidePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-cream border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <p className="text-accent-dark text-sm font-medium tracking-[0.2em] uppercase mb-4">Artist Resources</p>
          <h1 className="font-editorial text-4xl md:text-5xl lg:text-6xl font-medium leading-tight">
            Seller Guide
          </h1>
          <p className="mt-6 text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            Everything you need to know to list, sell, and ship your artwork on Signo.
            Follow these tips to maximise your sales and create a great experience for buyers.
          </p>
        </div>
      </section>

      {/* Photography */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
              <Camera className="w-6 h-6 text-accent-dark" />
            </div>
            <div>
              <p className="text-accent-dark text-xs font-medium tracking-[0.15em] uppercase">Step 1</p>
              <h2 className="font-editorial text-2xl md:text-3xl font-medium">Take Great Photos</h2>
            </div>
          </div>
          <p className="text-muted leading-relaxed mb-8">
            Your photos are the single most important factor in selling online. Buyers can&apos;t see your work in person,
            so your images need to do the heavy lifting. Here&apos;s how to get it right:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'Natural lighting',
                desc: 'Photograph near a large window during the day. Avoid direct sunlight — overcast days or indirect light give the most accurate colours. Never use flash.',
              },
              {
                title: 'Clean background',
                desc: 'Use a plain white or neutral wall. Remove any clutter. The artwork should be the only focal point in the image.',
              },
              {
                title: 'Multiple angles',
                desc: 'Include a straight-on shot, a detail/texture close-up, an angled shot showing depth or texture, and the back of the work showing the hanging mechanism.',
              },
              {
                title: 'Scale reference',
                desc: 'Include at least one photo showing the work in context — on a wall above a sofa, on a desk, or next to a common object. This helps buyers visualise the size.',
              },
              {
                title: 'Accurate colours',
                desc: 'Make sure your photos match the real colours. Avoid heavy filters or editing. If your phone has a "true tone" or "auto white balance" setting, use it.',
              },
              {
                title: 'High resolution',
                desc: 'Upload the highest quality images your camera can produce. Signo supports zoom, so buyers will inspect details up close.',
              },
            ].map((tip) => (
              <div key={tip.title} className="p-6 bg-muted-bg rounded-xl border border-border">
                <h3 className="font-medium text-sm mb-2">{tip.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Writing Listings */}
      <section className="py-20 md:py-28 bg-cream border-y border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-accent-dark" />
            </div>
            <div>
              <p className="text-accent-dark text-xs font-medium tracking-[0.15em] uppercase">Step 2</p>
              <h2 className="font-editorial text-2xl md:text-3xl font-medium">Write a Compelling Listing</h2>
            </div>
          </div>
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-xl border border-border">
              <h3 className="font-medium mb-2">Title</h3>
              <p className="text-sm text-muted leading-relaxed">
                Keep it descriptive but concise. Include the subject or theme. Avoid generic names like &quot;Untitled #47&quot;
                unless that&apos;s genuinely part of the work. Good examples: &quot;Morning Light on the Yarra&quot;,
                &quot;Coastal Abstract in Blue and Gold&quot;, &quot;Portrait of Solitude&quot;.
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-border">
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-sm text-muted leading-relaxed">
                Tell the story behind the piece. What inspired it? What mood does it evoke? Mention the medium,
                technique, and any special materials. Buyers connect with the story as much as the visual.
                Include practical details: whether it&apos;s framed, stretched, or rolled, and if it&apos;s ready to hang.
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-border">
              <h3 className="font-medium mb-2">Tags & Category</h3>
              <p className="text-sm text-muted leading-relaxed">
                Choose the most accurate category (painting, drawing, photography, sculpture, digital, mixed media, print).
                Add relevant tags for style (abstract, realism, contemporary, minimalist), subject (landscape, portrait,
                still life, urban), and colour palette. Good tags help buyers find your work through search and filters.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-accent-dark" />
            </div>
            <div>
              <p className="text-accent-dark text-xs font-medium tracking-[0.15em] uppercase">Step 3</p>
              <h2 className="font-editorial text-2xl md:text-3xl font-medium">Price Your Work</h2>
            </div>
          </div>
          <p className="text-muted leading-relaxed mb-8">
            Pricing art is never easy, but here are some practical guidelines:
          </p>
          <div className="space-y-4">
            {[
              {
                title: 'Research comparable work',
                desc: 'Look at what similar artists (same medium, style, career stage) are charging on other platforms. This gives you a realistic baseline.',
              },
              {
                title: 'Factor in materials and time',
                desc: 'Calculate your material costs, then add a fair hourly rate for your time. This is your minimum — your creative value comes on top.',
              },
              {
                title: 'Consider your career stage',
                desc: 'Emerging artists typically price lower to build a collector base. As your reputation grows and demand increases, raise your prices gradually.',
              },
              {
                title: 'Include shipping in your price',
                desc: 'Signo offers free shipping to buyers. Factor your average shipping cost into the artwork price so there are no surprises.',
              },
              {
                title: 'Be consistent',
                desc: 'Price similar-sized works in the same medium at similar price points. Erratic pricing can confuse buyers and undermine trust.',
              },
            ].map((tip) => (
              <div key={tip.title} className="flex gap-4 p-5 bg-muted-bg rounded-xl border border-border">
                <div className="w-2 h-2 bg-accent rounded-full mt-1.5 shrink-0" />
                <div>
                  <h3 className="font-medium text-sm mb-1">{tip.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shipping */}
      <section className="py-20 md:py-28 bg-cream border-y border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-accent-dark" />
            </div>
            <div>
              <p className="text-accent-dark text-xs font-medium tracking-[0.15em] uppercase">Step 4</p>
              <h2 className="font-editorial text-2xl md:text-3xl font-medium">Shipping Best Practices</h2>
            </div>
          </div>
          <p className="text-muted leading-relaxed mb-8">
            Professional packaging protects your work and creates a great unboxing experience. Damaged artwork
            means refunds and disappointed buyers — it&apos;s worth investing a few extra dollars in proper materials.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'Corner protectors',
                desc: 'Use cardboard corner protectors on all framed works. They cost a few cents and prevent the most common type of shipping damage.',
              },
              {
                title: 'Bubble wrap & padding',
                desc: 'Wrap the artwork in at least two layers of bubble wrap. Fill any empty space in the box with packing paper or foam to prevent movement.',
              },
              {
                title: 'Rigid mailers for flat works',
                desc: 'For unframed prints and works on paper, use rigid cardboard mailers. Mark them "DO NOT BEND". Consider rolling larger works in sturdy tubes.',
              },
              {
                title: 'Double-box for fragile items',
                desc: 'For glass-framed or delicate works, use a box-in-a-box method. Place the wrapped artwork in a smaller box, then place that inside a larger box with padding between.',
              },
              {
                title: 'Tracked shipping only',
                desc: 'Always use tracked postage (Australia Post or courier). Signo requires a tracking number — without it, you won\'t be able to mark the order as shipped.',
              },
              {
                title: '"FRAGILE" labels',
                desc: 'Apply fragile stickers or write "FRAGILE — ARTWORK" clearly on all sides of the package. It doesn\'t guarantee gentle handling, but it helps.',
              },
            ].map((tip) => (
              <div key={tip.title} className="p-6 bg-white rounded-xl border border-border">
                <h3 className="font-medium text-sm mb-2">{tip.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{tip.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-accent/5 rounded-xl border border-accent/20">
            <p className="text-sm font-medium mb-1">Ship within 7 days</p>
            <p className="text-sm text-muted leading-relaxed">
              Orders that aren&apos;t shipped within 7 days are automatically cancelled and the buyer is refunded.
              Mark your order as shipped and add the tracking number as soon as you drop off the package.
            </p>
          </div>
        </div>
      </section>

      {/* Review Process */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-accent-dark" />
            </div>
            <div>
              <p className="text-accent-dark text-xs font-medium tracking-[0.15em] uppercase">Step 5</p>
              <h2 className="font-editorial text-2xl md:text-3xl font-medium">The Review Process</h2>
            </div>
          </div>
          <p className="text-muted leading-relaxed mb-8">
            Every artwork submitted to Signo goes through a two-stage review process. This keeps the marketplace
            curated and trustworthy for buyers, which ultimately benefits you as a seller.
          </p>
          <div className="space-y-6">
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 bg-muted-bg rounded-full flex items-center justify-center shrink-0 border border-border">
                <span className="text-sm font-mono text-accent-dark">1</span>
              </div>
              <div>
                <h3 className="font-medium mb-1">AI quality check</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Our automated system checks image quality, appropriate content, and listing completeness.
                  This happens within minutes of submission.
                </p>
              </div>
            </div>
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 bg-muted-bg rounded-full flex items-center justify-center shrink-0 border border-border">
                <span className="text-sm font-mono text-accent-dark">2</span>
              </div>
              <div>
                <h3 className="font-medium mb-1">Human sign-off</h3>
                <p className="text-sm text-muted leading-relaxed">
                  A member of our team reviews every submission personally. We check that the listing is accurate,
                  the photos are professional, and the work meets our quality standards. This typically takes 24-48 hours.
                </p>
              </div>
            </div>
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 bg-muted-bg rounded-full flex items-center justify-center shrink-0 border border-border">
                <span className="text-sm font-mono text-accent-dark">3</span>
              </div>
              <div>
                <h3 className="font-medium mb-1">Approved or feedback</h3>
                <p className="text-sm text-muted leading-relaxed">
                  If approved, your artwork goes live immediately. If we need changes, you&apos;ll receive specific feedback
                  on what to improve — usually photo quality or listing details. Rejections are rare and always explained.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Payouts */}
      <section className="py-20 md:py-28 bg-cream border-y border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
              <Banknote className="w-6 h-6 text-accent-dark" />
            </div>
            <div>
              <p className="text-accent-dark text-xs font-medium tracking-[0.15em] uppercase">Step 6</p>
              <h2 className="font-editorial text-2xl md:text-3xl font-medium">How Payouts Work</h2>
            </div>
          </div>
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-xl border border-border">
              <h3 className="font-medium mb-2">Escrow protection</h3>
              <p className="text-sm text-muted leading-relaxed">
                When a buyer purchases your artwork, the payment is held securely by Stripe (our payment processor).
                This protects both you and the buyer — you know the payment is real, and they know their money is safe
                until the artwork arrives.
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-border">
              <h3 className="font-medium mb-2">48-hour inspection window</h3>
              <p className="text-sm text-muted leading-relaxed">
                After the buyer confirms delivery, they have 48 hours to inspect the artwork. If they don&apos;t raise
                a dispute within this window, the funds are automatically released to your bank account.
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-border">
              <h3 className="font-medium mb-2">Stripe transfer</h3>
              <p className="text-sm text-muted leading-relaxed">
                Payouts are sent via Stripe Connect directly to your linked bank account. You&apos;ll need to set up
                your payout details in your artist settings. Transfers typically arrive within 2-3 business days.
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-border">
              <h3 className="font-medium mb-2">What you receive</h3>
              <p className="text-sm text-muted leading-relaxed">
                Signo charges zero commission. The only deduction is Stripe&apos;s payment processing fee
                (~1.75% + 30c per transaction). For a $500 sale, you receive approximately $490.95.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-accent-dark text-sm font-medium tracking-[0.15em] uppercase mb-3">Common Questions</p>
            <h2 className="font-editorial text-3xl md:text-4xl font-medium">Seller FAQ</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: 'How much does it cost to sell on Signo?',
                a: '$30/month flat subscription. No listing fees, no commission, no hidden charges. The only deduction from sales is Stripe\'s payment processing fee (~1.75% + 30c).',
              },
              {
                q: 'Can I cancel my subscription?',
                a: 'Yes, cancel anytime. Your listings will be paused (not deleted) when your subscription ends. Reactivate anytime to make them live again.',
              },
              {
                q: 'How long does the review process take?',
                a: 'Most submissions are reviewed within 24-48 hours. If we need changes, we\'ll send you specific feedback.',
              },
              {
                q: 'What happens if a buyer disputes an order?',
                a: 'If a buyer raises a dispute within the 48-hour inspection window, the funds remain in escrow while we help resolve the issue. We aim to be fair to both parties.',
              },
              {
                q: 'Can I sell prints as well as originals?',
                a: 'Yes. You can list originals, limited edition prints, open edition prints, and digital downloads. Just make sure the listing clearly states what the buyer is getting.',
              },
              {
                q: 'Do I need to offer free shipping?',
                a: 'Signo shows free shipping to buyers. We recommend factoring your average shipping cost into your artwork price.',
              },
              {
                q: 'What if a buyer doesn\'t confirm delivery?',
                a: 'If the buyer doesn\'t confirm delivery or raise a dispute within the inspection window, funds are automatically released to you. You\'re always protected.',
              },
              {
                q: 'Can I sell from outside Australia?',
                a: 'Signo is currently focused on Australian artists selling to Australian buyers. International expansion is planned for the future.',
              },
            ].map((item) => (
              <div key={item.q} className="p-6 bg-muted-bg rounded-xl border border-border">
                <h3 className="font-medium text-sm mb-2">{item.q}</h3>
                <p className="text-sm text-muted leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-primary text-white relative texture-grain overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="font-editorial text-3xl md:text-4xl font-medium leading-snug">
            Ready to start{' '}
            <span className="italic text-accent-dark">selling?</span>
          </h2>
          <p className="text-gray-400 mt-6 max-w-md mx-auto">
            Join Signo and keep 100% of every sale. No commission, ever.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-3 px-7 py-3.5 bg-accent text-primary font-semibold rounded-full hover:bg-accent-light transition-all duration-300"
            >
              Create Your Account
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-white/30 text-white font-medium rounded-full hover:bg-white hover:text-primary transition-all duration-300"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
