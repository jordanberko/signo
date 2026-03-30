'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Search, Menu, X, Heart, MessageCircle, User } from 'lucide-react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-primary">
              SIGNO
            </span>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="Search artwork, artists, styles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          </div>

          {/* Nav Links - Desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/browse"
              className="text-sm font-medium text-foreground hover:text-accent transition-colors"
            >
              Browse Art
            </Link>
            <Link
              href="/how-it-works"
              className="text-sm font-medium text-foreground hover:text-accent transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/dashboard"
              className="text-muted hover:text-accent transition-colors"
              aria-label="Favourites"
            >
              <Heart className="h-5 w-5" />
            </Link>
            <Link
              href="/messages"
              className="text-muted hover:text-accent transition-colors"
              aria-label="Messages"
            >
              <MessageCircle className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light transition-colors"
            >
              <User className="h-4 w-4" />
              Sign In
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-foreground"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-white">
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="Search artwork..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <nav className="px-4 pb-4 space-y-2">
            <Link href="/browse" className="block py-2 text-sm font-medium text-foreground hover:text-accent">
              Browse Art
            </Link>
            <Link href="/how-it-works" className="block py-2 text-sm font-medium text-foreground hover:text-accent">
              How It Works
            </Link>
            <Link href="/dashboard" className="block py-2 text-sm font-medium text-foreground hover:text-accent">
              Favourites
            </Link>
            <Link href="/messages" className="block py-2 text-sm font-medium text-foreground hover:text-accent">
              Messages
            </Link>
            <Link
              href="/login"
              className="block w-full text-center py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light"
            >
              Sign In
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
