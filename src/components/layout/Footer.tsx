import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold tracking-tight">SIGNO</h3>
            <p className="text-sm text-gray-300">
              A curated Australian art marketplace where artists keep 83.5% of every sale.
            </p>
          </div>

          {/* For Buyers */}
          <div className="space-y-3">
            <h4 className="font-semibold text-accent">For Buyers</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/browse" className="text-sm text-gray-300 hover:text-white transition-colors">
                Browse Art
              </Link>
              <Link href="/how-it-works" className="text-sm text-gray-300 hover:text-white transition-colors">
                How It Works
              </Link>
              <Link href="/about" className="text-sm text-gray-300 hover:text-white transition-colors">
                About Us
              </Link>
            </nav>
          </div>

          {/* For Artists */}
          <div className="space-y-3">
            <h4 className="font-semibold text-accent">For Artists</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/register?role=artist" className="text-sm text-gray-300 hover:text-white transition-colors">
                Start Selling
              </Link>
              <Link href="/how-it-works" className="text-sm text-gray-300 hover:text-white transition-colors">
                Artist Guide
              </Link>
              <Link href="/about" className="text-sm text-gray-300 hover:text-white transition-colors">
                Our Commission
              </Link>
            </nav>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <h4 className="font-semibold text-accent">Support</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/about" className="text-sm text-gray-300 hover:text-white transition-colors">
                Contact Us
              </Link>
              <Link href="/about" className="text-sm text-gray-300 hover:text-white transition-colors">
                Returns Policy
              </Link>
              <Link href="/about" className="text-sm text-gray-300 hover:text-white transition-colors">
                Privacy Policy
              </Link>
            </nav>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Signo. All rights reserved. Made in Australia.
        </div>
      </div>
    </footer>
  );
}
