'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Check,
  CreditCard,
  Store,
  MessageCircle,
  BarChart3,
  Search,
  Shield,
  Loader2,
  ArrowLeft,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Suspense } from 'react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';

// ── Feature list ──

const FEATURES = [
  { icon: Store, text: 'Your own public artist storefront' },
  { icon: CreditCard, text: 'Unlimited listings — no per-item fees' },
  { icon: Check, text: '0% commission — keep 100% of every sale' },
  { icon: MessageCircle, text: 'Buyer-artist messaging' },
  { icon: BarChart3, text: 'Earnings dashboard & payout tracking' },
  { icon: Search, text: 'AI-assisted quality review (24-48h)' },
  { icon: Shield, text: 'Escrow protection & buyer guarantee' },
];

// ── Component ──

function SubscribeContent() {
  const searchParams = useSearchParams();
  const cancelled = searchParams.get('cancelled') === 'true';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [launchPeriod, setLaunchPeriod] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/stripe/create-subscription-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: window.location.origin }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.launch_period) {
          setLaunchPeriod(true);
          setLoading(false);
          return;
        }
        throw new Error(data.error || 'Failed to start checkout');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('[Subscribe] Error:', err);
      setError(
        err instanceof Error ? err.message : 'Something went wrong'
      );
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        {/* Back link */}
        <Link
          href="/artist/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-editorial text-3xl md:text-4xl font-medium">
            Signo for Artists
          </h1>
          <p className="text-muted mt-2">
            One simple plan. Zero commission. Keep everything you earn.
          </p>
        </div>

        {/* Cancelled notice */}
        {cancelled && (
          <div className="flex items-center gap-2 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl mb-6 animate-fade-in">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            Checkout was cancelled. You can try again whenever you&apos;re
            ready.
          </div>
        )}

        {/* Launch period banner */}
        {launchPeriod && (
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl mb-6 animate-fade-in">
            <Sparkles className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">
                You already have free access!
              </p>
              <p className="mt-1 text-green-700">
                Subscriptions aren&apos;t being charged yet — all artists
                get free access during our launch period. We&apos;ll notify
                you before billing begins.
              </p>
              <Link
                href="/artist/dashboard"
                className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-green-800 hover:underline"
              >
                Go to your dashboard →
              </Link>
            </div>
          </div>
        )}

        {/* Plan card */}
        <div className="bg-white border-2 border-accent rounded-2xl overflow-hidden">
          {/* Price header */}
          <div className="p-6 text-center border-b border-border">
            <p className="font-editorial text-4xl font-semibold text-accent-dark">
              $30
              <span className="text-lg text-muted font-normal">/month</span>
            </p>
            <p className="text-sm text-muted mt-1.5">
              Billed monthly in AUD. Cancel anytime.
            </p>
          </div>

          {/* Features */}
          <div className="p-6 space-y-3">
            <p className="text-xs font-medium tracking-wide uppercase text-muted">
              What&apos;s included
            </p>
            {FEATURES.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent-subtle rounded-full flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-4 w-4 text-accent-dark" />
                </div>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Stripe fees note */}
          <div className="px-6 pb-2">
            <div className="h-px bg-border" />
          </div>
          <div className="px-6 pb-6 text-center">
            <p className="text-sm text-muted">
              You keep 100% of every sale (minus Stripe payment processing
              fees of ~1.75% + 30c)
            </p>
          </div>

          {/* CTA */}
          <div className="px-6 pb-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-error/5 border border-error/20 text-error text-sm rounded-xl mb-4 animate-fade-in">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubscribe}
              disabled={loading || launchPeriod}
              className="w-full py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-accent transition-colors duration-300 disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Redirecting to Stripe...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  Subscribe — $30/month
                </>
              )}
            </button>
          </div>
        </div>

        {/* Early access note */}
        <div className="mt-6 p-4 bg-accent-subtle/50 border border-accent/10 rounded-xl text-center">
          <p className="text-sm font-medium text-foreground mb-1">
            Early access: Free during launch
          </p>
          <p className="text-xs text-muted">
            We&apos;ll notify you before billing begins. No credit card
            required right now.
          </p>
        </div>

        {/* Fine print */}
        <p className="text-xs text-warm-gray text-center mt-6">
          By subscribing you agree to Signo&apos;s{' '}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  const { loading: authLoading } = useRequireAuth('artist');
  if (authLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div style={{ width: 32, height: 32, border: '3px solid #E5E2DB', borderTopColor: '#2C2C2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style></div>;

  return (
    <Suspense>
      <SubscribeContent />
    </Suspense>
  );
}
