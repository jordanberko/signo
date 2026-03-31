import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-cream border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <p className="text-accent text-sm font-medium tracking-[0.2em] uppercase mb-4">The Process</p>
          <h1 className="font-editorial text-4xl md:text-5xl lg:text-6xl font-medium leading-tight">
            How Signo Works
          </h1>
          <p className="mt-6 text-lg text-muted max-w-xl mx-auto leading-relaxed">
            A simple, transparent process for artists and art lovers alike.
          </p>
        </div>
      </section>

      {/* For Sellers */}
      <section className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="divider-accent" />
              <p className="text-accent text-sm font-medium tracking-[0.15em] uppercase">For Sellers</p>
            </div>
            <h2 className="font-editorial text-3xl md:text-4xl font-medium">Start selling in minutes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
            {[
              {
                step: '01',
                title: 'Create Your Profile',
                desc: 'Sign up, add your bio, photo, and social links. Your profile becomes your personal storefront on Signo.',
              },
              {
                step: '02',
                title: 'Upload Artwork',
                desc: 'Add high-quality photos, set your price, describe the medium and dimensions. No minimum prices or listing fees.',
              },
              {
                step: '03',
                title: 'Quick Review',
                desc: 'Our AI-assisted quality review checks your submission within 24-48 hours. Much faster than traditional galleries.',
              },
              {
                step: '04',
                title: 'Get Paid',
                desc: 'When your artwork sells, you keep 100%. Funds are released automatically after the buyer confirms delivery.',
              },
            ].map((item) => (
              <div key={item.step} className="group">
                <span className="text-accent/40 font-mono text-sm tracking-wider">{item.step}</span>
                <h3 className="font-editorial text-xl font-medium mt-2 mb-3 group-hover:text-accent transition-colors duration-300">{item.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Commission Box */}
          <div className="mt-20 bg-muted-bg rounded-2xl p-8 md:p-10 max-w-lg mx-auto">
            <h3 className="font-editorial text-xl font-medium text-center mb-6">Example: $500 painting</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted">Sale price</span>
                <span className="font-medium text-lg">$500.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Stripe processing fee (~1.75% + 30c)</span>
                <span className="text-muted">-$9.05</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Signo commission</span>
                <span className="text-muted">$0</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="font-semibold text-base">You receive</span>
                <span className="font-editorial text-2xl font-semibold text-accent">$490.95</span>
              </div>
              <p className="text-xs text-warm-gray text-center pt-3">
                Signo charges a flat $30/month subscription with zero commission. The only deduction from your sales is Stripe&apos;s payment processing fee.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Buyers */}
      <section className="py-20 md:py-28 bg-cream border-y border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="divider-accent" />
              <p className="text-accent text-sm font-medium tracking-[0.15em] uppercase">For Buyers</p>
            </div>
            <h2 className="font-editorial text-3xl md:text-4xl font-medium">Find art you love</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
            {[
              {
                step: '01',
                title: 'Browse & Discover',
                desc: 'Search by style, medium, price, size, or colour. Every piece is quality-reviewed before listing.',
              },
              {
                step: '02',
                title: 'Secure Checkout',
                desc: 'Pay with card, Apple Pay, or Google Pay. Your payment is held in escrow until you confirm delivery.',
              },
              {
                step: '03',
                title: 'Tracked Delivery',
                desc: 'Artists ship with tracked postage within 5 business days. Follow your artwork in real time.',
              },
              {
                step: '04',
                title: 'Inspect & Review',
                desc: 'You have 48 hours after delivery to inspect. If there\'s an issue, our buyer protection has you covered.',
              },
            ].map((item) => (
              <div key={item.step} className="group">
                <span className="text-accent/40 font-mono text-sm tracking-wider">{item.step}</span>
                <h3 className="font-editorial text-xl font-medium mt-2 mb-3 group-hover:text-accent transition-colors duration-300">{item.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Buyer Protection */}
      <section className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-accent text-sm font-medium tracking-[0.15em] uppercase mb-3">Peace of Mind</p>
            <h2 className="font-editorial text-3xl md:text-4xl font-medium">Buyer Protection Guarantee</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Damaged in Transit',
                desc: 'Full refund, no return required. Upload photos of the damage and we handle everything.',
              },
              {
                title: 'Not as Described',
                desc: 'If the artwork differs materially from the listing, return it for a full refund. Simple.',
              },
              {
                title: 'Escrow Protection',
                desc: 'Your payment is held securely by Stripe until you confirm the artwork arrived safely.',
              },
            ].map((item) => (
              <div key={item.title} className="p-8 bg-muted-bg rounded-2xl border border-border hover:border-accent/30 transition-colors duration-300">
                <div className="w-2 h-2 bg-accent rounded-full mb-5" />
                <h3 className="font-editorial text-lg font-medium mb-3">{item.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-primary text-white relative texture-grain overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="font-editorial text-3xl md:text-4xl font-medium leading-snug">
            Ready to join the{' '}
            <span className="italic text-accent">community?</span>
          </h2>
          <p className="text-gray-400 mt-6 max-w-md mx-auto">
            Whether you&apos;re looking to sell your work or discover your next favourite piece.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-3 px-7 py-3.5 bg-accent text-primary font-semibold rounded-full hover:bg-accent-light transition-all duration-300"
            >
              Get Started
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/browse"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-white/30 text-white font-medium rounded-full hover:bg-white hover:text-primary transition-all duration-300"
            >
              Browse Art
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
