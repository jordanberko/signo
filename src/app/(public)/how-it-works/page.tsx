import Link from 'next/link';
import { ArrowRight, Upload, Search, CreditCard, Truck, Star, DollarSign, ShieldCheck, Palette } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
      {/* Header */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold">How Signo Works</h1>
        <p className="text-lg text-muted max-w-2xl mx-auto">
          A simple, transparent process for both artists and buyers.
        </p>
      </section>

      {/* For Artists */}
      <section className="space-y-10">
        <div className="text-center">
          <span className="inline-block px-3 py-1 bg-accent/10 text-accent text-sm font-semibold rounded-full mb-3">
            For Artists
          </span>
          <h2 className="text-3xl font-bold">Start Selling in Minutes</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { step: 1, icon: Palette, title: 'Create Your Profile', desc: 'Sign up as an artist, add your bio, photo, and social links. Your profile becomes your storefront.' },
            { step: 2, icon: Upload, title: 'Upload Artwork', desc: 'Add photos, set your price, describe the medium, dimensions, and style. No minimum prices.' },
            { step: 3, icon: ShieldCheck, title: 'Quick Review', desc: 'Our AI-assisted review checks quality within 24-48 hours. Much faster than other platforms.' },
            { step: 4, icon: DollarSign, title: 'Get Paid', desc: 'When your artwork sells, you keep 83.5%. Funds are released after the buyer confirms delivery.' },
          ].map((item) => (
            <div key={item.step} className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-accent/10 rounded-full relative">
                <item.icon className="h-7 w-7 text-accent" />
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {item.step}
                </span>
              </div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-muted">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Commission Breakdown */}
        <div className="bg-muted-bg rounded-xl p-8 max-w-lg mx-auto">
          <h3 className="font-semibold text-center mb-4">Example: You sell a painting for $500</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Sale price</span>
              <span className="font-semibold">$500.00</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Signo commission (16.5%)</span>
              <span>-$82.50</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between text-lg">
              <span className="font-semibold">You receive</span>
              <span className="font-bold text-accent">$417.50</span>
            </div>
            <p className="text-xs text-muted text-center pt-2">
              On other platforms at 35%, you&apos;d only receive $325.00
            </p>
          </div>
        </div>
      </section>

      {/* For Buyers */}
      <section className="space-y-10">
        <div className="text-center">
          <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-full mb-3">
            For Buyers
          </span>
          <h2 className="text-3xl font-bold">Find Art You Love</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { step: 1, icon: Search, title: 'Browse & Discover', desc: 'Search by style, medium, price, size, or colour. Every piece is quality-reviewed.' },
            { step: 2, icon: CreditCard, title: 'Secure Checkout', desc: 'Pay with card, Apple Pay, or Google Pay. Your payment is held in escrow until delivery.' },
            { step: 3, icon: Truck, title: 'Tracked Delivery', desc: 'Artists ship with tracked postage within 5 business days. Follow your artwork in real time.' },
            { step: 4, icon: Star, title: 'Inspect & Review', desc: 'You have 48 hours after delivery to inspect. If there\'s an issue, we\'ve got you covered.' },
          ].map((item) => (
            <div key={item.step} className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-full relative">
                <item.icon className="h-7 w-7 text-primary" />
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-accent text-primary text-xs font-bold rounded-full flex items-center justify-center">
                  {item.step}
                </span>
              </div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Buyer Protection */}
      <section className="bg-primary text-white rounded-2xl p-10 space-y-6">
        <h2 className="text-2xl font-bold text-center">Buyer Protection Guarantee</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-accent">Damaged in Transit</h3>
            <p className="text-sm text-gray-300">
              Full refund, no return required. Just upload photos of the damage and we handle the rest.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-accent">Not as Described</h3>
            <p className="text-sm text-gray-300">
              If the artwork differs materially from the listing, return it for a full refund.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-accent">Escrow Protection</h3>
            <p className="text-sm text-gray-300">
              Your payment is held securely until you confirm the artwork arrived safely.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center space-y-6">
        <h2 className="text-3xl font-bold">Ready to Join?</h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register?role=artist"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-light transition-colors"
          >
            Start Selling <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/browse"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-light transition-colors"
          >
            Browse Art <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
