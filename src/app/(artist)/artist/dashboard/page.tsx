'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  DollarSign,
  Package,
  Eye,
  TrendingUp,
  Plus,
  ArrowRight,
  CreditCard,
  Sparkles,
  Loader2,
  Banknote,
  Palette,
  AlertTriangle,
  Clock,
  CheckCircle2,
  PauseCircle,
  XCircle,
} from 'lucide-react';
import { formatPrice, getStatusStyle, formatStatus } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';

interface RecentOrder {
  id: string;
  title: string;
  buyer: string;
  salePrice: number;
  stripeFee: number;
  youReceive: number;
  status: string;
  date: string;
}

export default function ArtistDashboardPage() {
  const { loading: authLoading } = useRequireAuth('artist');
  const { user } = useAuth();

  const showOnboardingBanner = user && !user.onboarding_completed;

  // Stats default to 0 — never show loading placeholders
  const [totalSales, setTotalSales] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [activeListings, setActiveListings] = useState(0);
  const [pendingReview, setPendingReview] = useState(0);

  // Subscription
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>(user?.subscription_status || 'trial');
  const [gracePeriodDeadline, setGracePeriodDeadline] = useState<string | null>(user?.grace_period_deadline || null);

  // Orders: separate loaded flag with 5s safety timeout
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setOrdersLoaded(true);
      return;
    }

    // Safety timeout: show empty state after 5s no matter what
    const timer = setTimeout(() => setOrdersLoaded(true), 5000);

    const controller = new AbortController();

    async function fetchDashboard() {
      try {
        const res = await fetch('/api/artist/dashboard', {
          signal: controller.signal,
        });

        if (!res.ok) {
          console.error('[ArtistDashboard] API error:', res.status);
          return;
        }

        const data = await res.json();

        // Update stats (they default to 0, so partial failure is fine)
        if (data.stats) {
          setTotalSales(data.stats.totalSales ?? 0);
          setTotalEarnings(data.stats.totalEarnings ?? 0);
          setActiveListings(data.stats.activeListings ?? 0);
          setPendingReview(data.stats.pendingReview ?? 0);
        }

        // Update subscription status
        if (data.subscription_status) {
          setSubscriptionStatus(data.subscription_status);
        }
        if (data.grace_period_deadline !== undefined) {
          setGracePeriodDeadline(data.grace_period_deadline);
        }

        // Update orders
        if (data.recentOrders) {
          setRecentOrders(
            data.recentOrders.map((o: Record<string, unknown>) => ({
              id: o.id as string,
              title: o.title as string,
              buyer: o.buyer as string,
              salePrice: o.salePrice as number,
              stripeFee: o.stripeFee as number,
              youReceive: o.youReceive as number,
              status: o.status as string,
              date: new Date(o.date as string).toLocaleDateString('en-AU'),
            }))
          );
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[ArtistDashboard] Fetch error:', err);
        }
      } finally {
        clearTimeout(timer);
        setOrdersLoaded(true);
      }
    }

    fetchDashboard();

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [user]);

  if (authLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div style={{ width: 32, height: 32, border: '3px solid #E5E2DB', borderTopColor: '#2C2C2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style></div>;

  const STATS = [
    {
      label: 'Total Sales',
      value: String(totalSales),
      icon: TrendingUp,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Total Earnings',
      value: formatPrice(totalEarnings),
      icon: DollarSign,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Active Listings',
      value: String(activeListings),
      icon: Package,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'Pending Review',
      value: String(pendingReview),
      icon: Eye,
      color: 'text-amber-600 bg-amber-50',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Onboarding banner */}
      {showOnboardingBanner && (
        <Link
          href="/artist/onboarding"
          className="flex items-center gap-4 p-4 mb-6 bg-accent-subtle border border-accent/20 rounded-2xl hover:border-accent/40 transition-colors group"
        >
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
            <Palette className="h-5 w-5 text-accent-dark" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground">Complete your artist setup</p>
            <p className="text-xs text-muted mt-0.5">Finish setting up your profile and list your first artwork to start selling.</p>
          </div>
          <ArrowRight className="h-4 w-4 text-accent-dark flex-shrink-0 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-editorial text-3xl md:text-4xl font-medium">Seller Dashboard</h1>
          <p className="text-muted mt-1">
            Manage your listings and sales
            {user ? `, ${user.full_name}` : ''}
          </p>
        </div>
        <Link
          href="/artist/artworks/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light transition-colors"
        >
          <Plus className="h-4 w-4" />
          Upload Artwork
        </Link>
      </div>

      {/* Stats Grid — always shows numbers, defaults to 0 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-border rounded-lg p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted">{stat.label}</span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${stat.color}`}
              >
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Subscription Status Card */}
      {(() => {
        const daysRemaining = gracePeriodDeadline
          ? Math.max(0, Math.ceil((new Date(gracePeriodDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0;

        if (subscriptionStatus === 'trial') {
          return (
            <div className="bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20 rounded-lg p-5 mb-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-accent/15 rounded-full flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-accent-dark" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">Free Plan</p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent-subtle text-accent-dark">
                      Active
                    </span>
                  </div>
                  <p className="text-sm text-muted mt-0.5">
                    Your $30/month subscription starts after your first sale. No payment needed right now.
                  </p>
                </div>
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs text-muted">Your plan</p>
                <p className="text-sm font-semibold text-accent-dark">Free</p>
                <p className="text-xs text-muted">Until first sale</p>
              </div>
            </div>
          );
        }

        if (subscriptionStatus === 'pending_activation') {
          return (
            <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-300 rounded-lg p-5 mb-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">Subscription Required</p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                    </span>
                  </div>
                  <p className="text-sm text-muted mt-0.5">
                    Congratulations on your first sale! Add a payment method within {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} to keep your listings live.
                  </p>
                </div>
              </div>
              <Link
                href="/artist/subscribe"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors flex-shrink-0"
              >
                <CreditCard className="h-4 w-4" />
                Add Payment
              </Link>
            </div>
          );
        }

        if (subscriptionStatus === 'active') {
          return (
            <div className="bg-gradient-to-r from-green-50 to-green-100/30 border border-green-200 rounded-lg p-5 mb-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">Subscription</p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Active
                    </span>
                  </div>
                  <p className="text-sm text-muted mt-0.5">
                    Active &mdash; $30/month. Your listings are live.
                  </p>
                </div>
              </div>
              <Link
                href="/artist/subscribe"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm text-accent-dark hover:underline flex-shrink-0"
              >
                Manage Subscription <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          );
        }

        if (subscriptionStatus === 'past_due') {
          return (
            <div className="bg-gradient-to-r from-red-50 to-red-100/30 border border-red-300 rounded-lg p-5 mb-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">Payment Failed</p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      Past Due
                    </span>
                  </div>
                  <p className="text-sm text-muted mt-0.5">
                    Your payment failed. Please update your payment method to keep your listings visible.
                  </p>
                </div>
              </div>
              <Link
                href="/artist/subscribe"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex-shrink-0"
              >
                <CreditCard className="h-4 w-4" />
                Update Payment
              </Link>
            </div>
          );
        }

        // paused or cancelled
        return (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100/30 border border-gray-300 rounded-lg p-5 mb-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                {subscriptionStatus === 'paused' ? (
                  <PauseCircle className="h-5 w-5 text-gray-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">Subscription {subscriptionStatus === 'paused' ? 'Paused' : 'Cancelled'}</p>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {subscriptionStatus === 'paused' ? 'Paused' : 'Cancelled'}
                  </span>
                </div>
                <p className="text-sm text-muted mt-0.5">
                  {subscriptionStatus === 'paused'
                    ? 'Your listings are paused. Add a payment method to reactivate.'
                    : 'Your subscription was cancelled. Resubscribe to get your listings back.'}
                </p>
              </div>
            </div>
            <Link
              href="/artist/subscribe"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light transition-colors flex-shrink-0"
            >
              <CreditCard className="h-4 w-4" />
              Reactivate
            </Link>
          </div>
        );
      })()}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Link
          href="/artist/artworks/new"
          className="flex items-center gap-4 p-5 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors"
        >
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
            <Plus className="h-5 w-5 text-accent-dark" />
          </div>
          <div>
            <p className="font-semibold text-sm">Upload Artwork</p>
            <p className="text-xs text-muted">
              Add a new listing
            </p>
          </div>
        </Link>
        <Link
          href="/artist/artworks"
          className="flex items-center gap-4 p-5 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors"
        >
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
            <Package className="h-5 w-5 text-accent-dark" />
          </div>
          <div>
            <p className="font-semibold text-sm">Manage Listings</p>
            <p className="text-xs text-muted">
              Edit or update artwork
            </p>
          </div>
        </Link>
        <Link
          href="/artist/earnings"
          className="flex items-center gap-4 p-5 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors"
        >
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-accent-dark" />
          </div>
          <div>
            <p className="font-semibold text-sm">View Earnings</p>
            <p className="text-xs text-muted">
              Sales &amp; payout history
            </p>
          </div>
        </Link>
        <Link
          href="/artist/settings/payouts"
          className="flex items-center gap-4 p-5 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors"
        >
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
            <Banknote className="h-5 w-5 text-accent-dark" />
          </div>
          <div>
            <p className="font-semibold text-sm">Payout Settings</p>
            <p className="text-xs text-muted">
              Bank &amp; Stripe Connect
            </p>
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="border border-border rounded-lg">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-lg">Recent Orders</h2>
          <Link
            href="/artist/orders"
            className="text-sm text-accent-dark hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {!ordersLoaded ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="p-10 text-center">
            <Package className="h-10 w-10 text-muted mx-auto mb-3" />
            <p className="font-medium mb-1">No orders yet</p>
            <p className="text-sm text-muted mb-4">
              Once your artwork is listed and approved, orders will appear
              here.
            </p>
            <Link
              href="/artist/artworks/new"
              className="inline-flex items-center gap-2 text-accent-dark font-medium hover:underline"
            >
              Upload your first artwork <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-muted border-b border-border">
                    <th className="p-4">Artwork</th>
                    <th className="p-4">Buyer</th>
                    <th className="p-4">Sale Price</th>
                    <th className="p-4">Stripe Fee</th>
                    <th className="p-4">You Receive</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="p-4 font-medium text-sm">
                        {order.title}
                      </td>
                      <td className="p-4 text-sm text-muted">
                        {order.buyer}
                      </td>
                      <td className="p-4 text-sm">
                        {formatPrice(order.salePrice)}
                      </td>
                      <td className="p-4 text-sm text-muted">
                        −{formatPrice(order.stripeFee)}
                      </td>
                      <td className="p-4 text-sm font-semibold text-green-700">
                        {formatPrice(order.youReceive)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusStyle(order.status)}`}
                        >
                          {formatStatus(order.status)}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted">{order.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {recentOrders.map((order) => (
                <div key={order.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{order.title}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusStyle(order.status)}`}
                    >
                      {formatStatus(order.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">{order.buyer}</span>
                    <span className="text-muted">{order.date}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">
                      {formatPrice(order.salePrice)} − {formatPrice(order.stripeFee)} fee
                    </span>
                    <span className="font-semibold text-green-700">
                      {formatPrice(order.youReceive)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Earnings note */}
      <p className="text-xs text-muted text-center mt-4">
        Earnings reflect 100% of sale price minus Stripe processing fees (~1.75% + 30c). Zero commission.
      </p>
    </div>
  );
}
