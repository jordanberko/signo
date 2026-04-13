import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    "Signo's privacy policy explaining how Signo collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-cream border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <p className="text-accent-dark text-sm font-medium tracking-[0.2em] uppercase mb-4">Legal</p>
          <h1 className="font-editorial text-4xl md:text-5xl lg:text-6xl font-medium leading-tight">
            Privacy Policy
          </h1>
          <p className="mt-6 text-lg text-muted max-w-xl mx-auto leading-relaxed">
            How we collect, use, and protect your personal information.
          </p>
          <p className="mt-3 text-sm text-warm-gray">Last updated: March 2026</p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {/* Intro */}
          <div className="p-6 bg-accent/5 rounded-xl border border-accent/20">
            <p className="text-sm text-muted leading-relaxed">
              Signo operates in accordance with the Australian Privacy Principles (APPs) under the
              <em> Privacy Act 1988</em> (Cth). We are committed to protecting your personal information
              and being transparent about how we use it.
            </p>
          </div>

          {/* What We Collect */}
          <div>
            <h2 className="font-editorial text-2xl font-medium mb-6">What we collect</h2>
            <div className="space-y-4">
              <div className="p-5 bg-muted-bg rounded-xl border border-border">
                <h3 className="font-medium text-sm mb-2">Account information</h3>
                <p className="text-sm text-muted leading-relaxed">
                  When you create an account, we collect your name, email address, and optionally your profile photo
                  and bio. Artists also provide their location and social media links.
                </p>
              </div>
              <div className="p-5 bg-muted-bg rounded-xl border border-border">
                <h3 className="font-medium text-sm mb-2">Shipping addresses</h3>
                <p className="text-sm text-muted leading-relaxed">
                  When you purchase physical artwork, we collect your shipping address to fulfil the order.
                  You can choose to save this for future purchases.
                </p>
              </div>
              <div className="p-5 bg-muted-bg rounded-xl border border-border">
                <h3 className="font-medium text-sm mb-2">Payment information</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Payment details (credit card numbers, bank account details) are collected and processed
                  directly by Stripe. Signo never stores your full card number or bank details on our servers.
                </p>
              </div>
              <div className="p-5 bg-muted-bg rounded-xl border border-border">
                <h3 className="font-medium text-sm mb-2">Artwork and content</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Images, titles, descriptions, and other content you upload when listing artwork.
                  This content is displayed publicly on the platform.
                </p>
              </div>
              <div className="p-5 bg-muted-bg rounded-xl border border-border">
                <h3 className="font-medium text-sm mb-2">Usage data</h3>
                <p className="text-sm text-muted leading-relaxed">
                  We automatically collect information about how you use Signo, including pages visited,
                  features used, browser type, and device information. This helps us improve the platform.
                </p>
              </div>
            </div>
          </div>

          {/* How We Use It */}
          <div>
            <h2 className="font-editorial text-2xl font-medium mb-6">How we use your information</h2>
            <div className="space-y-3">
              {[
                {
                  purpose: 'Processing orders',
                  detail: 'To facilitate purchases, ship artwork, and handle refunds or disputes.',
                },
                {
                  purpose: 'Communication',
                  detail: 'To send order confirmations, shipping updates, and important account notifications.',
                },
                {
                  purpose: 'Platform improvement',
                  detail: 'To understand how people use Signo, fix bugs, and develop new features.',
                },
                {
                  purpose: 'Quality review',
                  detail: 'To review artwork submissions and maintain marketplace standards.',
                },
                {
                  purpose: 'Legal compliance',
                  detail: 'To comply with Australian law, prevent fraud, and resolve disputes.',
                },
              ].map((item) => (
                <div key={item.purpose} className="flex gap-4 p-4 bg-muted-bg rounded-xl border border-border">
                  <div className="w-2 h-2 bg-accent rounded-full mt-1.5 shrink-0" />
                  <div>
                    <span className="font-medium text-sm">{item.purpose}:</span>{' '}
                    <span className="text-sm text-muted">{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Third Parties */}
          <div>
            <h2 className="font-editorial text-2xl font-medium mb-6">Third parties we work with</h2>
            <p className="text-sm text-muted leading-relaxed mb-6">
              We share your information only with trusted service providers who help us run Signo.
              We never sell your personal information.
            </p>
            <div className="space-y-4">
              <div className="p-5 bg-muted-bg rounded-xl border border-border">
                <h3 className="font-medium text-sm mb-1">Stripe</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Handles all payment processing, including credit card payments and artist payouts.
                  Stripe has its own{' '}
                  <a href="https://stripe.com/au/privacy" target="_blank" rel="noopener noreferrer" className="text-accent-dark hover:underline">
                    privacy policy
                  </a>.
                </p>
              </div>
              <div className="p-5 bg-muted-bg rounded-xl border border-border">
                <h3 className="font-medium text-sm mb-1">Supabase</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Provides our database and authentication infrastructure. Your data is stored securely
                  with encryption at rest and in transit.
                </p>
              </div>
              <div className="p-5 bg-muted-bg rounded-xl border border-border">
                <h3 className="font-medium text-sm mb-1">Vercel</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Hosts the Signo website. Vercel processes request logs and may collect basic analytics
                  data (IP address, browser type).
                </p>
              </div>
            </div>
          </div>

          {/* Cookies */}
          <div>
            <h2 className="font-editorial text-2xl font-medium mb-6">Cookies and analytics</h2>
            <p className="text-sm text-muted leading-relaxed mb-4">
              Signo uses essential cookies to keep you signed in and maintain your session. These are
              strictly necessary for the platform to function.
            </p>
            <p className="text-sm text-muted leading-relaxed">
              We may use analytics tools to understand how the platform is used. These tools collect
              anonymous, aggregated data about page views, feature usage, and performance. We do not
              use cookies for advertising or tracking across other websites.
            </p>
          </div>

          {/* Data Retention */}
          <div>
            <h2 className="font-editorial text-2xl font-medium mb-6">Data retention</h2>
            <p className="text-sm text-muted leading-relaxed mb-4">
              We keep your account information for as long as your account is active. If you delete your
              account, we will remove your personal information within 30 days, except where we need to
              retain it for legal or financial record-keeping purposes (e.g., transaction records for
              tax compliance, which we retain for 7 years as required by Australian law).
            </p>
            <p className="text-sm text-muted leading-relaxed">
              Artwork listings and associated images are removed when an artist deletes them or closes
              their account. Cached copies may persist briefly in content delivery networks.
            </p>
          </div>

          {/* Your Rights */}
          <div>
            <h2 className="font-editorial text-2xl font-medium mb-6">Your rights</h2>
            <p className="text-sm text-muted leading-relaxed mb-6">
              Under the Australian Privacy Principles, you have the right to:
            </p>
            <div className="space-y-3">
              {[
                {
                  right: 'Access',
                  detail: 'Request a copy of the personal information we hold about you.',
                },
                {
                  right: 'Correction',
                  detail: 'Ask us to correct any inaccurate or out-of-date information.',
                },
                {
                  right: 'Deletion',
                  detail: 'Request that we delete your personal information (subject to legal retention requirements).',
                },
                {
                  right: 'Complaint',
                  detail: 'Lodge a complaint with us or with the Office of the Australian Information Commissioner (OAIC) if you believe your privacy has been breached.',
                },
              ].map((item) => (
                <div key={item.right} className="flex gap-4 p-4 bg-muted-bg rounded-xl border border-border">
                  <div className="w-2 h-2 bg-accent rounded-full mt-1.5 shrink-0" />
                  <div>
                    <span className="font-medium text-sm">{item.right}:</span>{' '}
                    <span className="text-sm text-muted">{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="p-8 bg-muted-bg rounded-2xl border border-border">
            <h2 className="font-editorial text-xl font-medium mb-4">Privacy concerns?</h2>
            <p className="text-sm text-muted leading-relaxed mb-4">
              If you have questions about this policy or want to exercise your privacy rights,
              contact us at:
            </p>
            <p className="text-sm">
              <a href="mailto:privacy@signoart.com.au" className="text-accent-dark hover:underline">
                privacy@signoart.com.au
              </a>
            </p>
            <p className="text-sm text-muted mt-4">
              Or visit our{' '}
              <Link href="/contact" className="text-accent-dark hover:underline">
                contact page
              </Link>{' '}
              to send us a message.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
