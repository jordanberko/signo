import Link from 'next/link';
import NewsletterSignup from '@/components/ui/NewsletterSignup';

export default function Footer() {
  return (
    <footer className="bg-cream border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Brand */}
          <div className="md:col-span-2 space-y-5">
            <h3 className="font-editorial text-3xl font-medium tracking-wide text-primary">SIGNO</h3>
            <p className="text-sm text-muted leading-relaxed max-w-xs">
              A curated Australian art marketplace built on fairness.
              Artists keep 100% of every sale.
            </p>
            {/* TODO: Add social links once accounts are created */}
          </div>

          {/* Explore */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-warm-gray">Explore</h4>
            <nav className="flex flex-col gap-3">
              <Link href="/browse" className="text-sm text-muted hover:text-primary transition-colors">
                Browse Art
              </Link>
              <Link href="/how-it-works" className="text-sm text-muted hover:text-primary transition-colors">
                How It Works
              </Link>
              <Link href="/about" className="text-sm text-muted hover:text-primary transition-colors">
                About Signo
              </Link>
            </nav>
          </div>

          {/* Sell */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-warm-gray">Sell</h4>
            <nav className="flex flex-col gap-3">
              <Link href="/register" className="text-sm text-muted hover:text-primary transition-colors">
                Start Selling
              </Link>
              <Link href="/seller-guide" className="text-sm text-muted hover:text-primary transition-colors">
                Seller Guide
              </Link>
              <Link href="/pricing" className="text-sm text-muted hover:text-primary transition-colors">
                Pricing Info
              </Link>
            </nav>
          </div>

          {/* Business */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-warm-gray">Business</h4>
            <nav className="flex flex-col gap-3">
              <Link href="/trade" className="text-sm text-muted hover:text-primary transition-colors">
                Trade Enquiries
              </Link>
            </nav>
          </div>

          {/* Support */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-warm-gray">Support</h4>
            <nav className="flex flex-col gap-3">
              <Link href="/contact" className="text-sm text-muted hover:text-primary transition-colors">
                Contact Us
              </Link>
              <Link href="/returns" className="text-sm text-muted hover:text-primary transition-colors">
                Returns Policy
              </Link>
              <Link href="/privacy" className="text-sm text-muted hover:text-primary transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-muted hover:text-primary transition-colors">
                Terms of Service
              </Link>
            </nav>
          </div>

          {/* Newsletter signup */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-warm-gray">Stay in Touch</h4>
            <p className="text-sm text-muted leading-relaxed">
              New artists and collections, delivered to your inbox.
            </p>
            <NewsletterSignup />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-warm-gray">
            &copy; {new Date().getFullYear()} Signo. All rights reserved.
          </p>
          <p className="text-xs text-warm-gray/60">
            Made with care in Australia
          </p>
        </div>
      </div>
    </footer>
  );
}
