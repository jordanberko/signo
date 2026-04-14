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
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Suspense } from 'react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { useAuth } from '@/components/providers/AuthProvider';

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
  const { user } = useAuth();

  const subscriptionStatus = user?.subscription_status || 'trial';
  const gracePeriodDeadline = user?.grace_period_deadline || null;

  const daysRemaining = gracePeriodDeadline
    ? Math.max(0, Math.ceil((new Date(gracePeriodDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
          <h1 className="font-editorial text-3xl md:text-4xl font-semibold">
            {subscriptionStatus === 'trial' && 'Signo for Artists'}
            {subscriptionStatus === 'pending_activation' && 'Complete Your Subscription'}
            {subscriptionStatus === 'active' && 'Your Subscription'}
            {subscriptionStatus === 'past_due' && 'Update Payment Method'}
            {subscriptionStatus === 'paused' && 'Reactivate Your Subscription'}
            {subscriptionStatus === 'cancelled' && 'Resubscribe to Signo'}
          </h1>
          <p className="text-muted mt-2">
            {subscriptionStatus === 'trial' && 'One simple plan. Zero commission. Keep everything you earn.'}
            {subscriptionStatus === 'pending_activation' && 'Set up your $30/month subscription to keep selling.'}
            {subscriptionStatus === 'active' && 'Manage your $30/month artist subscription.'}
            {subscriptionStatus === 'past_due' && 'Update your payment to keep your listings live.'}
            {subscriptionStatus === 'paused' && 'Subscribe to make your listings visible again.'}
            {subscriptionStatus === 'cancelled' && 'Resubscribe to get your listings back.'}
          </p>
        </div>

        {/* Cancelled checkout notice */}
        {cancelled && (
          <div className="flex items-center gap-2 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl mb-6 animate-fade-in">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            Checkout was cancelled. You can try again whenever you&apos;re
            ready.
          </div>
        )}

        {/* ── TRIAL ── */}
        {subscriptionStatus === 'trial' && (
          <>
            <div className="flex items-start gap-3 p-5 bg-accent-subtle/50 border border-accent/10 rounded-2xl mb-6">
              <Sparkles className="h-5 w-5 text-accent-dark flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">You&apos;re on the free plan</p>
                <p className="text-sm text-muted mt-1">
                  No payment needed until your first sale. Once you make your first sale,
                  your $30/month subscription begins. We&apos;ll give you time to set up
                  your payment method.
                </p>
              </div>
            </div>

            {/* Plan card (informational) */}
            <div className="bg-white border-2 border-accent rounded-2xl overflow-hidden">
              <div className="p-6 text-center border-b border-border">
                <p className="font-editorial text-4xl font-semibold text-accent-dark">
                  $30
                  <span className="text-lg text-muted font-normal">/month</span>
                </p>
                <p className="text-sm text-muted mt-1.5">
                  Starts after your first sale. Cancel anytime.
                </p>
              </div>

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

              <div className="px-6 pb-2">
                <div className="h-px bg-border" />
              </div>
              <div className="px-6 pb-6 text-center">
                <p className="text-sm text-muted">
                  You keep 100% of every sale (minus Stripe payment processing
                  fees of ~1.75% + 30c)
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── PENDING ACTIVATION ── */}
        {subscriptionStatus === 'pending_activation' && (
          <>
            <div className="flex items-start gap-3 p-5 bg-amber-50 border border-amber-200 rounded-2xl mb-6">
              <Clock className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-amber-900">
                  Your first sale completed!
                </p>
                <p className="text-sm text-amber-800 mt-1">
                  Set up your $30/month subscription to keep your listings visible.
                  {daysRemaining > 0 && (
                    <> You have <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong> to add a payment method.</>
                  )}
                </p>
              </div>
            </div>

            <div className="bg-white border-2 border-amber-300 rounded-2xl overflow-hidden">
              <div className="p-6 text-center border-b border-border">
                <p className="font-editorial text-4xl font-semibold text-accent-dark">
                  $30
                  <span className="text-lg text-muted font-normal">/month</span>
                </p>
                <p className="text-sm text-muted mt-1.5">
                  Billed monthly in AUD. Cancel anytime.
                </p>
              </div>

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
                  disabled={loading}
                  className="w-full py-3.5 bg-amber-600 text-white font-semibold rounded-full hover:bg-amber-700 transition-colors duration-300 disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Redirecting to Stripe...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      Add Payment Method
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── ACTIVE ── */}
        {subscriptionStatus === 'active' && (
          <div className="bg-white border-2 border-green-200 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="font-semibold">Your subscription is active</p>
                  <p className="text-sm text-muted">$30/month &mdash; billed monthly in AUD</p>
                </div>
              </div>
            </div>

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

            <div className="px-6 pb-6">
              <div className="h-px bg-border mb-6" />
              <p className="text-sm text-muted text-center mb-4">
                To cancel your subscription or update billing details, please contact us at{' '}
                <a href="mailto:support@signoart.com.au" className="text-accent-dark hover:underline">support@signoart.com.au</a>.
              </p>
            </div>
          </div>
        )}

        {/* ── PAST DUE ── */}
        {subscriptionStatus === 'past_due' && (
          <>
            <div className="flex items-start gap-3 p-5 bg-red-50 border border-red-200 rounded-2xl mb-6">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-red-900">Your payment failed</p>
                <p className="text-sm text-red-700 mt-1">
                  Update your payment method to keep your listings live and continue selling.
                </p>
              </div>
            </div>

            <div className="bg-white border-2 border-red-200 rounded-2xl overflow-hidden">
              <div className="p-6 text-center border-b border-border">
                <p className="font-editorial text-4xl font-semibold text-accent-dark">
                  $30
                  <span className="text-lg text-muted font-normal">/month</span>
                </p>
              </div>

              <div className="px-6 py-6">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-error/5 border border-error/20 text-error text-sm rounded-xl mb-4 animate-fade-in">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="w-full py-3.5 bg-red-600 text-white font-semibold rounded-full hover:bg-red-700 transition-colors duration-300 disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Redirecting to Stripe...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      Update Payment Method
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── PAUSED / CANCELLED ── */}
        {(subscriptionStatus === 'paused' || subscriptionStatus === 'cancelled') && (
          <>
            <div className="flex items-start gap-3 p-5 bg-gray-50 border border-gray-200 rounded-2xl mb-6">
              <AlertCircle className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-gray-900">
                  {subscriptionStatus === 'paused'
                    ? 'Your listings are hidden'
                    : 'Your subscription was cancelled'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {subscriptionStatus === 'paused'
                    ? 'Subscribe to reactivate your listings and start selling again.'
                    : 'Resubscribe to get your listings back and continue selling.'}
                </p>
              </div>
            </div>

            <div className="bg-white border-2 border-accent rounded-2xl overflow-hidden">
              <div className="p-6 text-center border-b border-border">
                <p className="font-editorial text-4xl font-semibold text-accent-dark">
                  $30
                  <span className="text-lg text-muted font-normal">/month</span>
                </p>
                <p className="text-sm text-muted mt-1.5">
                  Billed monthly in AUD. Cancel anytime.
                </p>
              </div>

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
                  disabled={loading}
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
                      {subscriptionStatus === 'paused' ? 'Reactivate' : 'Resubscribe'} &mdash; $30/month
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

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
