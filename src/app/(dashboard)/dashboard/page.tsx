'use client';

import Link from 'next/link';
import { Heart, ShoppingBag, MessageCircle, Settings, ArrowRight, Palette } from 'lucide-react';

export default function BuyerDashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <p className="text-muted mt-1">Welcome back! Manage your orders, favourites, and messages.</p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Link href="/dashboard" className="flex items-center gap-4 p-5 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors">
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="font-semibold">Orders</p>
            <p className="text-xs text-muted">0 orders</p>
          </div>
        </Link>
        <Link href="/dashboard" className="flex items-center gap-4 p-5 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors">
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
            <Heart className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="font-semibold">Favourites</p>
            <p className="text-xs text-muted">0 saved</p>
          </div>
        </Link>
        <Link href="/messages" className="flex items-center gap-4 p-5 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors">
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="font-semibold">Messages</p>
            <p className="text-xs text-muted">0 unread</p>
          </div>
        </Link>
        <Link href="/settings" className="flex items-center gap-4 p-5 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors">
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
            <Settings className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="font-semibold">Settings</p>
            <p className="text-xs text-muted">Account & preferences</p>
          </div>
        </Link>
      </div>

      {/* Sell Art CTA */}
      <div className="mb-10 p-6 bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
            <Palette className="h-6 w-6 text-accent" />
          </div>
          <div>
            <p className="font-semibold text-lg">Want to sell your artwork?</p>
            <p className="text-sm text-muted">Every Signo member can list artwork for sale. Upload your first piece today.</p>
          </div>
        </div>
        <Link
          href="/artist/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light transition-colors whitespace-nowrap"
        >
          Start Selling <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="border border-border rounded-lg">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold text-lg">Recent Orders</h2>
        </div>
        <div className="p-10 text-center">
          <p className="text-muted mb-4">You haven&apos;t purchased any artwork yet.</p>
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 text-accent font-medium hover:underline"
          >
            Browse Artwork <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
