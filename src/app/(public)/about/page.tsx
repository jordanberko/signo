import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold">About Signo</h1>
        <p className="text-lg text-muted max-w-2xl mx-auto">
          We believe Australian artists deserve a fair platform. Signo takes just 16.5% commission —
          less than half of what other platforms charge — so artists keep more of what they earn.
        </p>
      </section>

      {/* Mission */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Our Mission</h2>
        <p className="text-muted leading-relaxed">
          The Australian art market is thriving, but artists are losing too much of their income to platform fees.
          Traditional galleries take 40-60%, and even online marketplaces charge up to 35%. We started Signo to change that.
        </p>
        <p className="text-muted leading-relaxed">
          Our platform connects artists directly with art lovers, removing unnecessary middlemen while still providing
          the curation and trust that buyers need. Every piece on Signo goes through our quality review process,
          ensuring a consistent standard across the marketplace.
        </p>
      </section>

      {/* Commission Comparison */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Fair Commission, Transparent Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-muted-bg rounded-lg text-center">
            <p className="text-3xl font-bold text-error">35-60%</p>
            <p className="text-sm text-muted mt-2">Traditional Galleries & Platforms</p>
            <p className="text-xs text-muted mt-1">Artists keep $40-65 per $100 sale</p>
          </div>
          <div className="p-6 bg-muted-bg rounded-lg text-center">
            <p className="text-3xl font-bold text-amber-500">35%</p>
            <p className="text-sm text-muted mt-2">Blue Thumb & Others</p>
            <p className="text-xs text-muted mt-1">Artists keep $65 per $100 sale</p>
          </div>
          <div className="p-6 bg-accent/10 border-2 border-accent rounded-lg text-center">
            <p className="text-3xl font-bold text-accent">16.5%</p>
            <p className="text-sm font-medium mt-2">Signo</p>
            <p className="text-xs text-muted mt-1">Artists keep $83.50 per $100 sale</p>
          </div>
        </div>
      </section>

      {/* How We Protect You */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">How We Protect Buyers & Artists</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 border border-border rounded-lg space-y-2">
            <h3 className="font-semibold">For Buyers</h3>
            <ul className="text-sm text-muted space-y-1.5">
              <li>All payments held in escrow until delivery confirmed</li>
              <li>48-hour inspection window after delivery</li>
              <li>Full refund for damaged items — no returns needed</li>
              <li>Every artwork quality-reviewed before listing</li>
              <li>Tracked shipping on all physical orders</li>
            </ul>
          </div>
          <div className="p-6 border border-border rounded-lg space-y-2">
            <h3 className="font-semibold">For Artists</h3>
            <ul className="text-sm text-muted space-y-1.5">
              <li>Keep 83.5% of every sale</li>
              <li>Set your own prices — no minimums or maximums</li>
              <li>Fast 24-48 hour artwork review</li>
              <li>Guaranteed payouts after buyer inspection window</li>
              <li>Simple upload flow — list in minutes</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center space-y-4 bg-primary text-white p-10 rounded-2xl">
        <h2 className="text-2xl font-bold">Ready to Get Started?</h2>
        <p className="text-gray-300">
          Whether you&apos;re an artist looking to sell or a collector looking to discover, Signo is for you.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register?role=artist"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-light transition-colors"
          >
            Start Selling <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/browse"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-primary transition-colors"
          >
            Browse Art
          </Link>
        </div>
      </section>
    </div>
  );
}
