'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Heart, ShoppingBag, MessageCircle, Settings, ArrowRight, Palette } from 'lucide-react';
import { Suspense } from 'react';

function DashboardContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {error === 'unauthorized' && (
        <div className="mb-6 p-4 bg-error/5 border border-error/20 text-error text-sm rounded-xl animate-fade-in">
          You don&apos;t have permission to access that page. If you believe this is an error, please contact support.
        </div>
      )}

      <div className="mb-10">
        <h1 className="font-editorial text-3xl md:text-4xl font-medium">My Dashboard</h1>
        <p className="text-muted mt-2">Manage your orders, favourites, and messages.</p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { href: '/dashboard', icon: ShoppingBag, label: 'Orders', sub: '0 orders' },
          { href: '/dashboard', icon: Heart, label: 'Favourites', sub: '0 saved' },
          { href: '/messages', icon: MessageCircle, label: 'Messages', sub: '0 unread' },
          { href: '/settings', icon: Settings, label: 'Settings', sub: 'Account & preferences' },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-4 p-5 bg-white border border-border rounded-xl hover:border-accent/40 hover:shadow-sm transition-all duration-300 group"
          >
            <div className="w-10 h-10 bg-muted-bg rounded-full flex items-center justify-center group-hover:bg-accent-subtle transition-colors duration-300">
              <item.icon className="h-5 w-5 text-muted group-hover:text-accent transition-colors duration-300" />
            </div>
            <div>
              <p className="font-medium text-sm">{item.label}</p>
              <p className="text-xs text-muted">{item.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Sell Art CTA */}
      <div className="mb-10 p-8 bg-primary text-white rounded-2xl relative overflow-hidden texture-grain">
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Palette className="h-7 w-7 text-accent" />
            </div>
            <div>
              <p className="font-editorial text-xl font-medium">Want to sell your artwork?</p>
              <p className="text-sm text-gray-400 mt-1">Every Signo member can list artwork for sale. Upload your first piece today.</p>
            </div>
          </div>
          <Link
            href="/artist/dashboard"
            className="group inline-flex items-center gap-2 px-6 py-3 bg-accent text-primary text-sm font-semibold rounded-full hover:bg-accent-light transition-colors whitespace-nowrap"
          >
            Start Selling <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="font-editorial text-lg font-medium">Recent Orders</h2>
        </div>
        <div className="p-12 text-center">
          <p className="text-muted mb-4">You haven&apos;t purchased any artwork yet.</p>
          <Link
            href="/browse"
            className="group inline-flex items-center gap-2 text-accent font-medium text-sm link-underline"
          >
            Browse Artwork <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BuyerDashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
