import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, X } from 'lucide-react';
import { calculateStripeFee } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Signo pricing for artists: $30/month flat subscription, zero commission. See how much more you keep compared to galleries and other platforms.',
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
    <div>
      {/* Hero */}
      <section className="bg-cream border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <div className="inline-block px-4 py-1.5 bg-accent/10 text-accent-dark text-xs font-semibold tracking-wider uppercase rounded-full mb-6">
            Free during launch
          </div>
          <h1 className="font-editorial text-4xl md:text-5xl lg:text-6xl font-medium leading-tight">
            Simple, honest{' '}
            <span className="italic text-accent-dark">pricing</span>
          </h1>
          <p className="mt-6 text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            One flat subscription. Zero commission. You keep everything you earn.
          </p>
        </div>
      </section>

      {/* Pricing Card */}
      <section className="py-20 md:py-28">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border-2 border-accent p-8 md:p-10 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-white text-xs font-semibold tracking-wider uppercase rounded-full">
              Artist Plan
            </div>
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-1 mt-4">
                <span className="font-editorial text-5xl font-semibold">$30</span>
                <span className="text-muted text-lg">/month</span>
              </div>
              <p className="text-sm text-muted mt-2">Cancel anytime. No lock-in contracts.</p>
            </div>

            <div className="space-y-3 mb-8">
              {[
                'Unlimited artwork listings',
                'Zero commission on sales',
                'Personal artist storefront',
                'Direct messaging with buyers',
                'Sales analytics dashboard',
                'Stripe Connect payouts to your bank',
                'AI-assisted quality review',
                'Buyer protection & escrow',
                'Tracked shipping integration',
              ].map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-accent-dark mt-0.5 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <Link
              href="/register"
              className="group w-full inline-flex items-center justify-center gap-3 px-7 py-3.5 bg-accent text-primary font-semibold rounded-full hover:bg-accent-light transition-all duration-300"
            >
              Start Selling
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <p className="text-xs text-center text-warm-gray mt-4">
              Free during our launch period — no credit card required to start.
            </p>
          </div>

          <p className="text-center text-sm text-muted mt-8">
            Browsing and buying art on Signo is always free. No account needed to browse.
          </p>
        </div>
      </section>

      {/* Stripe Fee Explanation */}
      <section className="py-20 md:py-28 bg-cream border-y border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-accent-dark text-sm font-medium tracking-[0.15em] uppercase mb-3">Transparency</p>
            <h2 className="font-editorial text-3xl md:text-4xl font-medium">The only fee: payment processing</h2>
            <p className="mt-4 text-muted max-w-2xl mx-auto leading-relaxed">
              Stripe charges ~1.75% + 30c per transaction for Australian domestic cards.
              This is Stripe&apos;s fee, not ours — it&apos;s the cost of securely processing credit card payments.
              We pass it through at cost with zero markup.
            </p>
          </div>

          {/* Example Calculations */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="grid grid-cols-4 gap-4 p-4 md:p-6 bg-muted-bg border-b border-border text-xs font-semibold tracking-wider uppercase text-warm-gray">
              <div>Sale Price</div>
              <div>Stripe Fee</div>
              <div>You Receive</div>
              <div>You Keep</div>
            </div>
            {priceExamples.map((ex) => (
              <div key={ex.price} className="grid grid-cols-4 gap-4 p-4 md:p-6 border-b border-border last:border-0 items-center">
                <div className="font-editorial text-lg font-medium">${ex.price.toLocaleString()}</div>
                <div className="text-sm text-muted">-${ex.fee.toFixed(2)}</div>
                <div className="font-medium text-accent-dark">${ex.payout.toFixed(2)}</div>
                <div className="text-sm text-muted">{ex.percent}%</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-warm-gray text-center mt-4">
            Fees shown are for standard Australian domestic card transactions. International cards may incur a slightly higher Stripe fee.
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-accent-dark text-sm font-medium tracking-[0.15em] uppercase mb-3">Compare</p>
            <h2 className="font-editorial text-3xl md:text-4xl font-medium">How Signo stacks up</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-4 pr-4 font-medium text-warm-gray"></th>
                  <th className="py-4 px-4 font-semibold text-accent-dark bg-accent/5 rounded-t-xl">Signo</th>
                  <th className="py-4 px-4 font-medium text-warm-gray">Blue Thumb</th>
                  <th className="py-4 px-4 font-medium text-warm-gray">Traditional Gallery</th>
                  <th className="py-4 px-4 font-medium text-warm-gray">Etsy</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    feature: 'Commission',
                    signo: '0%',
                    bluethumb: '35%',
                    gallery: '40-60%',
                    etsy: '6.5% + fees',
                    signoHighlight: true,
                  },
                  {
                    feature: 'Monthly Fee',
                    signo: '$30/mo',
                    bluethumb: 'Free',
                    gallery: 'Varies',
                    etsy: 'Free + $0.20/listing',
                    signoHighlight: false,
                  },
                  {
                    feature: 'Artist keeps (on $500 sale)',
                    signo: '~$491',
                    bluethumb: '~$325',
                    gallery: '~$200-300',
                    etsy: '~$450',
                    signoHighlight: true,
                  },
                  {
                    feature: 'Curated marketplace',
                    signo: true,
                    bluethumb: true,
                    gallery: true,
                    etsy: false,
                  },
                  {
                    feature: 'Buyer protection',
                    signo: true,
                    bluethumb: true,
                    gallery: 'Varies',
                    etsy: true,
                  },
                  {
                    feature: 'Artist storefront',
                    signo: true,
                    bluethumb: true,
                    gallery: false,
                    etsy: true,
                  },
                  {
                    feature: 'Direct payouts to bank',
                    signo: true,
                    bluethumb: true,
                    gallery: 'Varies',
                    etsy: true,
                  },
                  {
                    feature: 'Australian-focused',
                    signo: true,
                    bluethumb: true,
                    gallery: true,
                    etsy: false,
                  },
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-border">
                    <td className="py-4 pr-4 font-medium">{row.feature}</td>
                    <td className={`py-4 px-4 text-center ${row.signoHighlight ? 'bg-accent/5 font-semibold text-accent-dark' : 'bg-accent/5'}`}>
                      {typeof row.signo === 'boolean' ? (
                        row.signo ? <Check className="w-4 h-4 text-accent-dark mx-auto" /> : <X className="w-4 h-4 text-warm-gray mx-auto" />
                      ) : row.signo}
                    </td>
                    <td className="py-4 px-4 text-center text-muted">
                      {typeof row.bluethumb === 'boolean' ? (
                        row.bluethumb ? <Check className="w-4 h-4 text-muted mx-auto" /> : <X className="w-4 h-4 text-warm-gray mx-auto" />
                      ) : row.bluethumb}
                    </td>
                    <td className="py-4 px-4 text-center text-muted">
                      {typeof row.gallery === 'boolean' ? (
                        row.gallery ? <Check className="w-4 h-4 text-muted mx-auto" /> : <X className="w-4 h-4 text-warm-gray mx-auto" />
                      ) : row.gallery}
                    </td>
                    <td className="py-4 px-4 text-center text-muted">
                      {typeof row.etsy === 'boolean' ? (
                        row.etsy ? <Check className="w-4 h-4 text-muted mx-auto" /> : <X className="w-4 h-4 text-warm-gray mx-auto" />
                      ) : row.etsy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-primary text-white relative texture-grain overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="font-editorial text-3xl md:text-4xl font-medium leading-snug">
            Keep what you{' '}
            <span className="italic text-accent-dark">earn</span>
          </h2>
          <p className="text-gray-400 mt-6 max-w-md mx-auto">
            $30/month. Zero commission. The maths speaks for itself.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-3 px-7 py-3.5 bg-accent text-primary font-semibold rounded-full hover:bg-accent-light transition-all duration-300"
            >
              Start Selling Today
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-white/30 text-white font-medium rounded-full hover:bg-white hover:text-primary transition-all duration-300"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
