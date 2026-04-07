'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Banknote,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Building2,
  Info,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';

// ── Types ──

interface ConnectStatus {
  connected: boolean;
  accountId: string | null;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  bankLast4?: string | null;
  bankName?: string | null;
}

// ── Component ──

function PayoutsContent() {
  const { loading: authLoading } = useRequireAuth('artist');
  const searchParams = useSearchParams();
  const onboarded = searchParams.get('onboarded');
  const refresh = searchParams.get('refresh');

  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/connect/status');
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      setStatus(data);
    } catch {
      setError('Unable to load payout status. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Show success message after returning from Stripe onboarding
  useEffect(() => {
    if (onboarded === 'true') {
      setShowSuccess(true);
      // Refetch status to get the latest
      fetchStatus();
      // Auto-dismiss after 8 seconds
      const t = setTimeout(() => setShowSuccess(false), 8000);
      return () => clearTimeout(t);
    }
  }, [onboarded, fetchStatus]);

  // Auto-refresh if returning with expired link
  useEffect(() => {
    if (refresh === 'true' && status?.connected && !status?.detailsSubmitted) {
      handleContinueOnboarding();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, status]);

  async function handleStartOnboarding() {
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: window.location.origin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start onboarding');
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setActionLoading(false);
    }
  }

  async function handleContinueOnboarding() {
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/connect/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: window.location.origin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate link');
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setActionLoading(false);
    }
  }

  // ── Render ──

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  const isFullyConnected =
    status?.connected &&
    status?.detailsSubmitted &&
    status?.payoutsEnabled;

  const isPartiallyConnected =
    status?.connected && !status?.detailsSubmitted;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted mb-6">
        <Link href="/artist/dashboard" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-foreground">Payout Settings</span>
      </div>

      <div className="mb-8">
        <h1 className="font-editorial text-2xl md:text-3xl font-medium">
          Payout Settings
        </h1>
        <p className="text-sm text-muted mt-1">
          Connect your bank account to receive payouts from sales.
        </p>
      </div>

      {/* Success banner */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">
              Payout setup updated!
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              Your Stripe Connect account has been updated. Changes may take a moment to reflect.
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 bg-error/5 border border-error/20 rounded-xl flex items-start gap-3 animate-fade-in">
          <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* ── STATE: Fully connected ── */}
      {isFullyConnected && (
        <div className="space-y-6">
          {/* Status card */}
          <div className="bg-white border border-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Payouts enabled</p>
                <p className="text-xs text-muted">
                  Your account is fully set up and ready to receive payouts.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              {/* Bank info */}
              {status.bankLast4 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted" />
                    <div>
                      <p className="text-sm font-medium">
                        {status.bankName || 'Bank account'}
                      </p>
                      <p className="text-xs text-muted">
                        ••••&nbsp;{status.bankLast4}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                    Active
                  </span>
                </div>
              )}

              {/* Charges */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-muted" />
                  <p className="text-sm">
                    Card payments
                  </p>
                </div>
                <span className="text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                  {status.chargesEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {/* Payouts */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Banknote className="h-4 w-4 text-muted" />
                  <p className="text-sm">
                    Payouts
                  </p>
                </div>
                <span className="text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                  {status.payoutsEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Stripe Dashboard link */}
          <div className="bg-white border border-border rounded-2xl p-6">
            <h3 className="font-medium text-sm mb-2">Manage your payout account</h3>
            <p className="text-xs text-muted mb-4">
              Update bank details, view payout history, and manage tax information in your Stripe Express dashboard.
            </p>
            <a
              href="https://connect.stripe.com/express_login"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-sm font-medium rounded-full hover:bg-cream transition-colors"
            >
              Open Stripe Dashboard
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* ── STATE: Partially connected (onboarding incomplete) ── */}
      {isPartiallyConnected && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-amber-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-amber-50 rounded-full flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">Payout setup incomplete</p>
                <p className="text-xs text-muted">
                  You started setting up payouts but didn&apos;t finish. Complete the setup to receive payouts.
                </p>
              </div>
            </div>

            <button
              onClick={handleContinueOnboarding}
              disabled={actionLoading}
              className="w-full py-3 bg-primary text-white font-semibold rounded-full hover:bg-accent hover:text-primary transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecting to Stripe...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Complete Payout Setup
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STATE: Not connected ── */}
      {!status?.connected && (
        <div className="space-y-6">
          <div className="bg-white border border-border rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-accent-subtle rounded-full flex items-center justify-center mx-auto mb-5">
              <Banknote className="h-8 w-8 text-accent-dark" />
            </div>

            <h2 className="font-editorial text-xl font-medium mb-2">
              Set up payouts
            </h2>
            <p className="text-sm text-muted max-w-sm mx-auto mb-6">
              Connect your bank account through Stripe to receive payouts when your artwork sells.
              Setup takes about 2 minutes.
            </p>

            <button
              onClick={handleStartOnboarding}
              disabled={actionLoading}
              className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-accent text-primary font-semibold rounded-full hover:bg-accent-light transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Connect Bank Account
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>

          {/* What happens section */}
          <div className="bg-cream border border-border rounded-2xl p-6">
            <h3 className="font-medium text-sm mb-4">How payouts work</h3>
            <div className="space-y-3">
              {[
                {
                  step: '1',
                  title: 'Artwork sells',
                  desc: 'Payment is captured and held in escrow via Stripe.',
                },
                {
                  step: '2',
                  title: 'Buyer confirms delivery',
                  desc: 'A 48-hour inspection window begins.',
                },
                {
                  step: '3',
                  title: 'Funds released',
                  desc: 'The full sale amount (minus Stripe processing fee) is transferred to your bank.',
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <div className="w-7 h-7 bg-white border border-border rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium text-muted">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fee info — shown in all states */}
      <div className="mt-6 flex gap-3 p-4 bg-accent-subtle/50 border border-accent/10 rounded-xl">
        <Info className="h-5 w-5 text-accent-dark flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted space-y-1">
          <p>
            <span className="font-medium text-foreground">Zero commission.</span>{' '}
            You keep 100% of every sale. The only deduction is Stripe&apos;s
            payment processing fee (~1.75% + 30c per transaction).
          </p>
          <p>
            On a $500 sale, you receive <span className="font-semibold text-foreground">$491.95</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PayoutsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      }
    >
      <PayoutsContent />
    </Suspense>
  );
}
