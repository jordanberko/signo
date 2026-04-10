import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about Signo — an Australian art marketplace where artists keep 100% of every sale. Zero commission, just a flat monthly subscription.',
};

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-cream border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <p className="text-accent-dark text-sm font-medium tracking-[0.2em] uppercase mb-4">Our Story</p>
          <h1 className="font-editorial text-4xl md:text-5xl lg:text-6xl font-medium leading-tight">
            Art deserves a{' '}
            <span className="italic text-accent-dark">fairer deal</span>
          </h1>
          <p className="mt-6 text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            We believe Australian artists deserve a platform that respects their work.
            Signo charges zero commission — just a $30/month subscription, so artists keep everything they earn.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="divider-accent" />
            <p className="text-accent-dark text-sm font-medium tracking-[0.15em] uppercase">Our Mission</p>
          </div>
          <p className="font-editorial text-2xl md:text-3xl font-medium leading-relaxed">
            The Australian art market is thriving, but artists are losing too much of their income to platform fees.
          </p>
          <p className="text-muted leading-relaxed">
            Traditional galleries take 40-60%. Even popular online marketplaces charge up to 35%.
            We started Signo to change that equation. Our platform connects artists directly with collectors,
            removing unnecessary middlemen while still providing the curation and trust that buyers need.
          </p>
          <p className="text-muted leading-relaxed">
            Every piece on Signo goes through our quality review process, ensuring a consistent standard
            across the marketplace. We take care of the platform so artists can focus on what matters most — creating.
          </p>
        </div>
      </section>

      {/* Commission Comparison */}
      <section className="py-16 md:py-20 bg-muted-bg border-y border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-accent-dark text-sm font-medium tracking-[0.15em] uppercase mb-3">The Numbers</p>
            <h2 className="font-editorial text-3xl md:text-4xl font-medium">Zero commission, transparent pricing</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-6 text-center border border-border">
              <p className="text-xs text-warm-gray tracking-wider uppercase mb-3">Traditional Galleries</p>
              <p className="font-editorial text-3xl font-semibold text-error/70">35-60%</p>
              <p className="text-xs text-muted mt-2">Artists keep $40-65 per $100</p>
            </div>
            <div className="bg-white rounded-xl p-6 text-center border border-border">
              <p className="text-xs text-warm-gray tracking-wider uppercase mb-3">Other Platforms</p>
              <p className="font-editorial text-3xl font-semibold text-warm-gray">35%</p>
              <p className="text-xs text-muted mt-2">Artists keep $65 per $100</p>
            </div>
            <div className="bg-white rounded-xl p-6 text-center border-2 border-accent relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-accent text-white text-[10px] font-semibold tracking-wider uppercase rounded-full">
                Signo
              </div>
              <p className="text-xs text-warm-gray tracking-wider uppercase mb-3">With Signo</p>
              <p className="font-editorial text-3xl font-semibold text-accent-dark">0%</p>
              <p className="text-xs text-muted mt-2">Artists keep $100 per $100 (plus $30/mo subscription)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Protections */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-accent-dark text-sm font-medium tracking-[0.15em] uppercase mb-3">Trust & Safety</p>
            <h2 className="font-editorial text-3xl md:text-4xl font-medium">How we protect everyone</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-muted-bg rounded-2xl border border-border space-y-4">
              <div className="w-2 h-2 bg-accent rounded-full" />
              <h3 className="font-editorial text-xl font-medium">For Buyers</h3>
              <ul className="text-sm text-muted space-y-2.5 leading-relaxed">
                <li>All payments held in escrow until delivery confirmed</li>
                <li>48-hour inspection window after delivery</li>
                <li>Full refund for damaged items — no returns needed</li>
                <li>Every artwork quality-reviewed before listing</li>
                <li>Tracked shipping on all physical orders</li>
              </ul>
            </div>
            <div className="p-8 bg-muted-bg rounded-2xl border border-border space-y-4">
              <div className="w-2 h-2 bg-accent rounded-full" />
              <h3 className="font-editorial text-xl font-medium">For Sellers</h3>
              <ul className="text-sm text-muted space-y-2.5 leading-relaxed">
                <li>Keep 100% of every sale</li>
                <li>$30/month flat subscription — no hidden fees</li>
                <li>Set your own prices — no minimums</li>
                <li>Fast 24-48 hour artwork review</li>
                <li>Guaranteed payouts after inspection window</li>
                <li>Simple upload flow — list in minutes</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-primary text-white relative texture-grain overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="font-editorial text-3xl md:text-4xl font-medium leading-snug">
            Ready to get started?
          </h2>
          <p className="text-gray-400 mt-6 max-w-md mx-auto">
            Whether you&apos;re an artist or a collector, Signo is built for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-3 px-7 py-3.5 bg-accent text-primary font-semibold rounded-full hover:bg-accent-light transition-all duration-300"
            >
              Join Signo
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
