import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-cream border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Brand */}
          <div className="md:col-span-4 space-y-5">
            <h3 className="font-editorial text-3xl font-medium tracking-wide text-primary">SIGNO</h3>
            <p className="text-sm text-muted leading-relaxed max-w-xs">
              A curated Australian art marketplace built on fairness.
              Artists keep 100% of every sale.
            </p>
            <div className="flex gap-5 pt-2">
              <a href="#" className="text-warm-gray hover:text-accent-dark transition-colors text-sm link-underline" aria-label="Instagram">
                Instagram
              </a>
              <a href="#" className="text-warm-gray hover:text-accent-dark transition-colors text-sm link-underline" aria-label="Twitter">
                Twitter
              </a>
              <a href="#" className="text-warm-gray hover:text-accent-dark transition-colors text-sm link-underline" aria-label="Facebook">
                Facebook
              </a>
            </div>
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
              <Link href="/how-it-works" className="text-sm text-muted hover:text-primary transition-colors">
                Seller Guide
              </Link>
              <Link href="/about" className="text-sm text-muted hover:text-primary transition-colors">
                Pricing Info
              </Link>
            </nav>
          </div>

          {/* Support */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-warm-gray">Support</h4>
            <nav className="flex flex-col gap-3">
              <Link href="/about" className="text-sm text-muted hover:text-primary transition-colors">
                Contact Us
              </Link>
              <Link href="/about" className="text-sm text-muted hover:text-primary transition-colors">
                Returns Policy
              </Link>
              <Link href="/about" className="text-sm text-muted hover:text-primary transition-colors">
                Privacy
              </Link>
            </nav>
          </div>

          {/* Newsletter teaser */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-warm-gray">Stay in Touch</h4>
            <p className="text-sm text-muted leading-relaxed">
              New artists and collections, delivered to your inbox.
            </p>
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
