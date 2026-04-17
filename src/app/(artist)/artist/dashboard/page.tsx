'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useCallback, useRef } from 'react';
import { formatPrice, getStatusStyle, formatStatus } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import EditorialSpinner from '@/components/ui/EditorialSpinner';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { uploadStudioImage } from '@/lib/supabase/storage';
import type { StudioPost } from '@/lib/types/database';

// ── Types ──

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

// ── Shell ──

const KICKER: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
};

// ── Component ──

export default function ArtistDashboardPage() {
  const { loading: authLoading } = useRequireAuth('artist');
  const { user } = useAuth();

  const showOnboardingBanner = user && !user.onboarding_completed;

  const [totalSales, setTotalSales] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [activeListings, setActiveListings] = useState(0);
  const [pendingReview, setPendingReview] = useState(0);

  const [subscriptionStatus, setSubscriptionStatus] = useState<string>(
    user?.subscription_status || 'trial'
  );
  const [gracePeriodDeadline, setGracePeriodDeadline] = useState<string | null>(
    user?.grace_period_deadline || null
  );

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);

  const [studioPosts, setStudioPosts] = useState<StudioPost[]>([]);
  const [studioLoaded, setStudioLoaded] = useState(false);
  const [showStudioForm, setShowStudioForm] = useState(false);
  const [studioCaption, setStudioCaption] = useState('');
  const [studioUploading, setStudioUploading] = useState(false);
  const [studioImageFile, setStudioImageFile] = useState<File | null>(null);
  const [studioImagePreview, setStudioImagePreview] = useState<string | null>(null);
  const [studioError, setStudioError] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const studioFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      setOrdersLoaded(true);
      return;
    }

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

        if (data.stats) {
          setTotalSales(data.stats.totalSales ?? 0);
          setTotalEarnings(data.stats.totalEarnings ?? 0);
          setActiveListings(data.stats.activeListings ?? 0);
          setPendingReview(data.stats.pendingReview ?? 0);
        }

        if (data.subscription_status) setSubscriptionStatus(data.subscription_status);
        if (data.grace_period_deadline !== undefined)
          setGracePeriodDeadline(data.grace_period_deadline);

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
              date: new Date(o.date as string).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
              }),
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

  const fetchStudioPosts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/studio-posts?artistId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setStudioPosts(data.posts ?? []);
      }
    } catch (err) {
      console.error('[Studio] Fetch error:', err);
    } finally {
      setStudioLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    fetchStudioPosts();
  }, [fetchStudioPosts]);

  const handleStudioImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setStudioImageFile(file);
      setStudioImagePreview(URL.createObjectURL(file));
      setStudioError(null);
    },
    []
  );

  const handleStudioSubmit = useCallback(async () => {
    if (!user || !studioImageFile) return;
    setStudioUploading(true);
    setStudioError(null);

    try {
      const imageUrl = await uploadStudioImage(studioImageFile, user.id);

      const res = await fetch('/api/studio-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          caption: studioCaption.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create post');
      }

      setStudioCaption('');
      setStudioImageFile(null);
      setStudioImagePreview(null);
      setShowStudioForm(false);
      if (studioFileRef.current) studioFileRef.current.value = '';
      await fetchStudioPosts();
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setStudioUploading(false);
    }
  }, [user, studioImageFile, studioCaption, fetchStudioPosts]);

  const handleStudioDelete = useCallback(async (postId: string) => {
    if (!confirm('Remove this studio post?')) return;
    setDeletingPostId(postId);
    try {
      const res = await fetch(`/api/studio-posts?postId=${postId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStudioPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (err) {
      console.error('[Studio] Delete error:', err);
    } finally {
      setDeletingPostId(null);
    }
  }, []);

  const timeAgo = useCallback((dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    const months = Math.floor(days / 30);
    return `${months}mo`;
  }, []);

  if (authLoading) return <EditorialSpinner />;

  const STATS = [
    { label: 'Total sales', value: String(totalSales) },
    { label: 'Total earnings', value: formatPrice(totalEarnings) },
    { label: 'Active listings', value: String(activeListings) },
    { label: 'Pending review', value: String(pendingReview) },
  ];

  // ── Subscription banner copy ──
  const daysRemaining = gracePeriodDeadline
    ? Math.max(
        0,
        Math.ceil(
          (new Date(gracePeriodDeadline).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  type SubBanner = {
    kicker: string;
    headline: string;
    body: string;
    cta?: { href: string; label: string };
    tone: 'ink' | 'amber' | 'terracotta' | 'stone';
  };

  let subBanner: SubBanner | null = null;
  if (subscriptionStatus === 'trial') {
    subBanner = {
      kicker: '— Status —',
      headline: 'On the house, until your first sale.',
      body: 'Your $30 monthly subscription only begins after a work changes hands. Until then, list freely.',
      tone: 'ink',
    };
  } else if (subscriptionStatus === 'pending_activation') {
    subBanner = {
      kicker: '— Action required —',
      headline: 'A payment method keeps the lights on.',
      body: `Congratulations on your first sale. Add a card within ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} to keep your listings live.`,
      cta: { href: '/artist/subscribe', label: 'Add payment method' },
      tone: 'amber',
    };
  } else if (subscriptionStatus === 'active') {
    subBanner = {
      kicker: '— Status —',
      headline: 'Subscription active.',
      body: '$30 per month · your listings are live across the collection.',
      cta: { href: '/artist/subscribe', label: 'Manage subscription' },
      tone: 'ink',
    };
  } else if (subscriptionStatus === 'past_due') {
    subBanner = {
      kicker: '— Payment failed —',
      headline: 'Your last payment did not go through.',
      body: 'Update your payment method to keep your listings visible to collectors.',
      cta: { href: '/artist/subscribe', label: 'Update payment' },
      tone: 'terracotta',
    };
  } else {
    subBanner = {
      kicker: '— Status —',
      headline:
        subscriptionStatus === 'paused'
          ? 'Your subscription is paused.'
          : 'Your subscription was cancelled.',
      body:
        subscriptionStatus === 'paused'
          ? 'Listings are paused. Add a payment method to bring them back.'
          : 'Resubscribe whenever you are ready to put works back on the wall.',
      cta: { href: '/artist/subscribe', label: 'Reactivate' },
      tone: 'stone',
    };
  }

  const subToneBg: Record<SubBanner['tone'], string> = {
    ink: 'var(--color-ink)',
    amber: 'var(--color-ink)',
    terracotta: 'var(--color-ink)',
    stone: 'var(--color-ink)',
  };
  const subToneAccent: Record<SubBanner['tone'], string> = {
    ink: 'var(--color-warm-white)',
    amber: 'var(--color-terracotta, #c45d3e)',
    terracotta: 'var(--color-terracotta, #c45d3e)',
    stone: 'var(--color-stone)',
  };

  // ── Quick actions ──
  const QUICK_ACTIONS = [
    {
      num: '01',
      label: 'Upload a work',
      detail: 'Add a new listing to the collection.',
      href: '/artist/artworks/new',
    },
    {
      num: '02',
      label: 'Manage listings',
      detail: 'Edit, archive, or update existing works.',
      href: '/artist/artworks',
    },
    {
      num: '03',
      label: 'Earnings',
      detail: 'Sales history and payout ledger.',
      href: '/artist/earnings',
    },
    {
      num: '04',
      label: 'Analytics',
      detail: 'Performance, views, and collector insight.',
      href: '/artist/analytics',
    },
    {
      num: '05',
      label: 'Payout settings',
      detail: 'Bank details and Stripe Connect.',
      href: '/artist/settings/payouts',
    },
  ];

  const showStripeConnectBanner = user && !user.stripe_account_id;

  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      {/* ── Stripe Connect enforcement banner ── */}
      {showStripeConnectBanner && (
        <div
          className="px-6 sm:px-10"
          style={{
            borderTop: '1px solid var(--color-terracotta)',
            borderBottom: '1px solid var(--color-terracotta)',
            paddingTop: '1rem',
            paddingBottom: '1rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ flex: 1, minWidth: '16rem' }}>
            <p
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-terracotta)',
                marginBottom: '0.3rem',
              }}
            >
              Action required
            </p>
            <p
              className="font-serif"
              style={{
                fontStyle: 'italic',
                fontSize: '0.92rem',
                color: 'var(--color-ink)',
                fontWeight: 400,
              }}
            >
              <em>Connect Stripe to receive payouts.</em>
            </p>
          </div>
          <Link href="/artist/onboarding?step=4" className="editorial-link">
            Connect now &rarr;
          </Link>
        </div>
      )}
      <div
        className="px-6 sm:px-10"
        style={{
          maxWidth: '78rem',
          margin: '0 auto',
          paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
        }}
      >
        {/* ── Editorial header ── */}
        <header
          style={{
            marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.4rem',
          }}
        >
          <div>
            <p style={{ ...KICKER, marginBottom: '1rem' }}>
              The Studio · Artist panel
            </p>
            <h1
              className="font-serif"
              style={{
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.015em',
                color: 'var(--color-ink)',
                fontWeight: 400,
                marginBottom: '0.7rem',
              }}
            >
              {user?.full_name ? `${user.full_name.split(' ')[0]}'s ` : 'Your '}
              <em style={{ fontStyle: 'italic' }}>studio.</em>
            </h1>
            <p
              style={{
                fontSize: '0.92rem',
                fontWeight: 300,
                color: 'var(--color-stone-dark)',
                lineHeight: 1.6,
                maxWidth: '48ch',
              }}
            >
              Listings, orders, and the quiet ledger of your practice — all in
              one place.
            </p>
          </div>

          <Link
            href="/artist/artworks/new"
            className="artwork-primary-cta--compact"
            style={{ alignSelf: 'flex-start' }}
          >
            Upload a new work
          </Link>
        </header>

        {/* ── Onboarding banner ── */}
        {showOnboardingBanner && (
          <Link
            href="/artist/onboarding"
            style={{
              display: 'block',
              background: 'var(--color-ink)',
              color: 'var(--color-warm-white)',
              padding: 'clamp(1.8rem, 3vw, 2.6rem)',
              marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)',
              textDecoration: 'none',
            }}
          >
            <p
              style={{
                ...KICKER,
                color: 'var(--color-stone)',
                marginBottom: '0.9rem',
              }}
            >
              — First steps —
            </p>
            <p
              className="font-serif"
              style={{
                fontSize: 'clamp(1.4rem, 2.4vw, 1.85rem)',
                lineHeight: 1.2,
                fontWeight: 400,
                marginBottom: '0.7rem',
              }}
            >
              Finish setting up your <em style={{ fontStyle: 'italic' }}>studio.</em>
            </p>
            <p
              style={{
                fontSize: '0.9rem',
                fontWeight: 300,
                lineHeight: 1.6,
                opacity: 0.82,
                maxWidth: '52ch',
              }}
            >
              Complete your artist profile and list your first work to open
              the door to collectors. →
            </p>
          </Link>
        )}

        {/* ── Stats as typographic dl ── */}
        <section
          style={{
            borderTop: '1px solid var(--color-border-strong)',
            borderBottom: '1px solid var(--color-border-strong)',
            marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)',
          }}
        >
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
              margin: 0,
              padding: 0,
            }}
          >
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  padding: '1.8rem 1.6rem',
                  borderLeft: i === 0 ? 'none' : '1px solid var(--color-border)',
                }}
              >
                <dt
                  style={{
                    ...KICKER,
                    marginBottom: '0.9rem',
                  }}
                >
                  {stat.label}
                </dt>
                <dd
                  className="font-serif"
                  style={{
                    margin: 0,
                    fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
                    fontWeight: 400,
                    color: 'var(--color-ink)',
                    lineHeight: 1,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Subscription banner ── */}
        {subBanner && (
          <section
            style={{
              background: subToneBg[subBanner.tone],
              color: 'var(--color-warm-white)',
              padding: 'clamp(1.8rem, 3vw, 2.6rem)',
              marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.2rem',
            }}
          >
            <p
              style={{
                ...KICKER,
                color: subToneAccent[subBanner.tone],
              }}
            >
              {subBanner.kicker}
            </p>
            <p
              className="font-serif"
              style={{
                fontSize: 'clamp(1.3rem, 2.2vw, 1.65rem)',
                lineHeight: 1.25,
                fontWeight: 400,
                margin: 0,
              }}
            >
              {subBanner.headline}
            </p>
            <p
              style={{
                fontSize: '0.92rem',
                fontWeight: 300,
                lineHeight: 1.6,
                opacity: 0.84,
                margin: 0,
                maxWidth: '58ch',
              }}
            >
              {subBanner.body}
            </p>
            {subBanner.cta && (
              <Link
                href={subBanner.cta.href}
                className="font-serif"
                style={{
                  alignSelf: 'flex-start',
                  fontStyle: 'italic',
                  fontSize: '0.95rem',
                  color: 'var(--color-warm-white)',
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--color-warm-white)',
                  paddingBottom: '0.2rem',
                }}
              >
                {subBanner.cta.label} →
              </Link>
            )}
          </section>
        )}

        {/* ── Quick actions as numbered typographic index ── */}
        <section style={{ marginBottom: 'clamp(3rem, 5vw, 4.5rem)' }}>
          <p style={{ ...KICKER, marginBottom: '1.2rem' }}>
            — The desk —
          </p>
          <ol
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              borderTop: '1px solid var(--color-border-strong)',
            }}
          >
            {QUICK_ACTIONS.map((action) => (
              <li
                key={action.num}
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <Link
                  href={action.href}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '3.2rem 1fr auto',
                    alignItems: 'baseline',
                    gap: '1.4rem',
                    padding: '1.4rem 0',
                    textDecoration: 'none',
                    color: 'var(--color-ink)',
                  }}
                >
                  <span
                    className="font-serif"
                    style={{
                      fontStyle: 'italic',
                      fontSize: '0.9rem',
                      color: 'var(--color-stone)',
                    }}
                  >
                    {action.num}
                  </span>
                  <div>
                    <p
                      className="font-serif"
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 400,
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {action.label}
                    </p>
                    <p
                      style={{
                        marginTop: '0.3rem',
                        fontSize: '0.85rem',
                        fontWeight: 300,
                        color: 'var(--color-stone-dark)',
                        lineHeight: 1.5,
                      }}
                    >
                      {action.detail}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="font-serif"
                    style={{
                      fontStyle: 'italic',
                      fontSize: '0.9rem',
                      color: 'var(--color-stone)',
                    }}
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Recent orders ── */}
        <section style={{ marginBottom: 'clamp(3rem, 5vw, 4.5rem)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: '1.2rem',
              gap: '1rem',
            }}
          >
            <p style={KICKER}>— Recent orders —</p>
            {recentOrders.length > 0 && (
              <Link href="/artist/orders" className="editorial-link">
                All orders →
              </Link>
            )}
          </div>

          {!ordersLoaded ? (
            <div
              style={{
                padding: '3rem 0',
                borderTop: '1px solid var(--color-border-strong)',
              }}
            >
              <p
                className="font-serif"
                style={{
                  fontStyle: 'italic',
                  fontSize: '0.95rem',
                  color: 'var(--color-stone)',
                }}
              >
                Gathering the ledger…
              </p>
            </div>
          ) : recentOrders.length === 0 ? (
            <div
              style={{
                borderTop: '1px solid var(--color-border-strong)',
                paddingTop: '2rem',
                maxWidth: '46ch',
              }}
            >
              <p
                className="font-serif"
                style={{
                  fontSize: 'clamp(1.3rem, 2.4vw, 1.7rem)',
                  lineHeight: 1.25,
                  color: 'var(--color-ink)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                }}
              >
                Nothing sold yet.
              </p>
              <p
                style={{
                  marginTop: '0.9rem',
                  fontSize: '0.9rem',
                  color: 'var(--color-stone-dark)',
                  fontWeight: 300,
                  lineHeight: 1.6,
                }}
              >
                Once a work is listed and approved, orders will settle here —
                with sale price, Stripe fee, and your share laid plain.
              </p>
              <Link
                href="/artist/artworks/new"
                className="editorial-link"
                style={{ marginTop: '1.4rem', display: 'inline-block' }}
              >
                Upload your first work
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <table
                className="hidden md:table"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  borderTop: '1px solid var(--color-border-strong)',
                }}
              >
                <thead>
                  <tr>
                    {['Work', 'Buyer', 'Sale', 'Fee', 'Your share', 'Status', 'Date'].map(
                      (h, i) => (
                        <th
                          key={h}
                          style={{
                            ...KICKER,
                            padding: '1rem 0.8rem',
                            textAlign: i >= 2 && i <= 4 ? 'right' : 'left',
                            borderBottom: '1px solid var(--color-border)',
                            fontWeight: 400,
                          }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                    >
                      <td
                        className="font-serif"
                        style={{
                          padding: '1.2rem 0.8rem',
                          fontSize: '1rem',
                          color: 'var(--color-ink)',
                        }}
                      >
                        {order.title}
                      </td>
                      <td
                        style={{
                          padding: '1.2rem 0.8rem',
                          fontSize: '0.88rem',
                          color: 'var(--color-stone-dark)',
                          fontWeight: 300,
                        }}
                      >
                        {order.buyer}
                      </td>
                      <td
                        className="font-serif"
                        style={{
                          padding: '1.2rem 0.8rem',
                          fontSize: '0.95rem',
                          color: 'var(--color-ink)',
                          textAlign: 'right',
                        }}
                      >
                        {formatPrice(order.salePrice)}
                      </td>
                      <td
                        style={{
                          padding: '1.2rem 0.8rem',
                          fontSize: '0.85rem',
                          color: 'var(--color-stone)',
                          fontStyle: 'italic',
                          textAlign: 'right',
                          fontWeight: 300,
                        }}
                      >
                        −{formatPrice(order.stripeFee)}
                      </td>
                      <td
                        className="font-serif"
                        style={{
                          padding: '1.2rem 0.8rem',
                          fontSize: '1rem',
                          color: 'var(--color-ink)',
                          textAlign: 'right',
                        }}
                      >
                        {formatPrice(order.youReceive)}
                      </td>
                      <td
                        style={{
                          padding: '1.2rem 0.8rem',
                          fontSize: '0.72rem',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: 'var(--color-stone-dark)',
                        }}
                      >
                        <span className={`status-pill ${getStatusStyle(order.status)}`}>
                          {formatStatus(order.status)}
                        </span>
                      </td>
                      <td
                        className="font-serif"
                        style={{
                          padding: '1.2rem 0.8rem',
                          fontSize: '0.8rem',
                          fontStyle: 'italic',
                          color: 'var(--color-stone)',
                        }}
                      >
                        {order.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile stacked list */}
              <ul
                className="md:hidden"
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  borderTop: '1px solid var(--color-border-strong)',
                }}
              >
                {recentOrders.map((order) => (
                  <li
                    key={order.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      padding: '1.2rem 0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: '1rem',
                        marginBottom: '0.4rem',
                      }}
                    >
                      <p
                        className="font-serif"
                        style={{
                          fontSize: '1rem',
                          margin: 0,
                          color: 'var(--color-ink)',
                        }}
                      >
                        {order.title}
                      </p>
                      <span
                        className="font-serif"
                        style={{
                          fontSize: '0.78rem',
                          fontStyle: 'italic',
                          color: 'var(--color-stone)',
                          flexShrink: 0,
                        }}
                      >
                        {order.date}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--color-stone-dark)',
                        fontWeight: 300,
                        margin: 0,
                        marginBottom: '0.5rem',
                      }}
                    >
                      {order.buyer}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontStyle: 'italic',
                          color: 'var(--color-stone)',
                          fontWeight: 300,
                        }}
                      >
                        {formatPrice(order.salePrice)} − {formatPrice(order.stripeFee)} fee
                      </span>
                      <span
                        className="font-serif"
                        style={{
                          fontSize: '1rem',
                          color: 'var(--color-ink)',
                        }}
                      >
                        {formatPrice(order.youReceive)}
                      </span>
                    </div>
                    <p
                      style={{
                        marginTop: '0.4rem',
                        fontSize: '0.68rem',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--color-stone-dark)',
                      }}
                    >
                      <span className={`status-pill ${getStatusStyle(order.status)}`}>
                        {formatStatus(order.status)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>

              <p
                className="font-serif"
                style={{
                  marginTop: '1.4rem',
                  fontSize: '0.78rem',
                  fontStyle: 'italic',
                  color: 'var(--color-stone)',
                  lineHeight: 1.6,
                }}
              >
                You receive the full sale price minus Stripe processing
                (~1.75% + 30¢). Zero commission.
              </p>
            </>
          )}
        </section>

        {/* ── In the studio ── */}
        <section>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: '1.2rem',
              gap: '1rem',
            }}
          >
            <p style={KICKER}>— In the studio · {studioPosts.length}/20 —</p>
            {studioPosts.length < 20 && (
              <button
                onClick={() => {
                  setShowStudioForm(!showStudioForm);
                  setStudioError(null);
                }}
                className="editorial-link"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showStudioForm ? 'Close' : 'Add a photo →'}
              </button>
            )}
          </div>

          <p
            style={{
              fontSize: '0.9rem',
              fontWeight: 300,
              color: 'var(--color-stone-dark)',
              lineHeight: 1.6,
              marginBottom: '1.8rem',
              maxWidth: '52ch',
            }}
          >
            A living scrapbook of the work in progress. Followers see each
            post in their feed — show the dust, the drafts, the hands.
          </p>

          {/* Add post form */}
          {showStudioForm && (
            <div
              style={{
                borderTop: '1px solid var(--color-border-strong)',
                borderBottom: '1px solid var(--color-border-strong)',
                padding: '1.8rem 0',
                marginBottom: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.4rem',
                maxWidth: '36rem',
              }}
            >
              <input
                ref={studioFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={handleStudioImageSelect}
                className="hidden"
                id="studio-image-upload"
              />
              {studioImagePreview ? (
                <div style={{ position: 'relative', width: 220 }}>
                  <Image
                    src={studioImagePreview}
                    alt="Preview"
                    width={220}
                    height={220}
                    style={{
                      width: 220,
                      height: 220,
                      objectFit: 'cover',
                      border: '1px solid var(--color-border)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setStudioImageFile(null);
                      setStudioImagePreview(null);
                      if (studioFileRef.current) studioFileRef.current.value = '';
                    }}
                    className="font-serif"
                    style={{
                      position: 'absolute',
                      top: '0.6rem',
                      right: '0.6rem',
                      background: 'var(--color-warm-white)',
                      border: '1px solid var(--color-border)',
                      fontSize: '0.72rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      padding: '0.35rem 0.7rem',
                      cursor: 'pointer',
                      color: 'var(--color-ink)',
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="studio-image-upload"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 220,
                    height: 220,
                    border: '1px dashed var(--color-border-strong)',
                    cursor: 'pointer',
                    background: 'var(--color-cream)',
                  }}
                >
                  <span
                    className="font-serif"
                    style={{
                      fontStyle: 'italic',
                      fontSize: '0.95rem',
                      color: 'var(--color-ink)',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Choose a photo
                  </span>
                  <span
                    style={{
                      ...KICKER,
                      fontSize: '0.6rem',
                    }}
                  >
                    JPG · PNG · WebP
                  </span>
                </label>
              )}

              <div>
                <textarea
                  value={studioCaption}
                  onChange={(e) => setStudioCaption(e.target.value.slice(0, 500))}
                  rows={2}
                  placeholder="A line about the work — optional."
                  className="commission-field"
                  style={{ resize: 'none' }}
                />
                <p
                  className="font-serif"
                  style={{
                    textAlign: 'right',
                    fontSize: '0.72rem',
                    fontStyle: 'italic',
                    color: 'var(--color-stone)',
                    marginTop: '0.4rem',
                  }}
                >
                  {studioCaption.length}/500
                </p>
              </div>

              {studioError && (
                <p
                  className="font-serif"
                  style={{
                    fontSize: '0.88rem',
                    fontStyle: 'italic',
                    color: 'var(--color-terracotta, #c45d3e)',
                  }}
                >
                  — {studioError}
                </p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.4rem' }}>
                <button
                  type="button"
                  onClick={handleStudioSubmit}
                  disabled={!studioImageFile || studioUploading}
                  className="artwork-primary-cta--compact"
                >
                  {studioUploading ? 'Posting…' : 'Post to studio'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowStudioForm(false);
                    setStudioCaption('');
                    setStudioImageFile(null);
                    setStudioImagePreview(null);
                    setStudioError(null);
                    if (studioFileRef.current) studioFileRef.current.value = '';
                  }}
                  disabled={studioUploading}
                  className="font-serif"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontStyle: 'italic',
                    fontSize: '0.9rem',
                    color: 'var(--color-stone)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Posts grid */}
          {!studioLoaded ? (
            <div
              style={{
                borderTop: '1px solid var(--color-border-strong)',
                padding: '3rem 0',
              }}
            >
              <p
                className="font-serif"
                style={{
                  fontStyle: 'italic',
                  fontSize: '0.95rem',
                  color: 'var(--color-stone)',
                }}
              >
                Loading the studio…
              </p>
            </div>
          ) : studioPosts.length === 0 ? (
            <div
              style={{
                borderTop: '1px solid var(--color-border-strong)',
                paddingTop: '2rem',
                maxWidth: '46ch',
              }}
            >
              <p
                className="font-serif"
                style={{
                  fontSize: 'clamp(1.2rem, 2.2vw, 1.55rem)',
                  lineHeight: 1.3,
                  color: 'var(--color-ink)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                }}
              >
                A blank wall, for now.
              </p>
              <p
                style={{
                  marginTop: '0.9rem',
                  fontSize: '0.9rem',
                  color: 'var(--color-stone-dark)',
                  fontWeight: 300,
                  lineHeight: 1.6,
                }}
              >
                Share a photo from the studio — a brush, a half-finished
                canvas, the light through your window. Collectors notice the
                quiet parts.
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-2 md:grid-cols-3"
              style={{
                columnGap: '1.6rem',
                rowGap: '2.6rem',
                borderTop: '1px solid var(--color-border-strong)',
                paddingTop: '2rem',
              }}
            >
              {studioPosts.map((post) => (
                <figure
                  key={post.id}
                  style={{ margin: 0, position: 'relative' }}
                >
                  <div
                    style={{
                      position: 'relative',
                      aspectRatio: '1 / 1',
                      background: 'var(--color-cream)',
                      overflow: 'hidden',
                    }}
                  >
                    <Image
                      src={post.image_url}
                      alt={post.caption || 'Studio post'}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                  </div>
                  <figcaption
                    style={{
                      marginTop: '0.8rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: '0.8rem',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {post.caption && (
                        <p
                          className="font-serif"
                          style={{
                            fontSize: '0.88rem',
                            color: 'var(--color-ink)',
                            fontWeight: 300,
                            lineHeight: 1.5,
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {post.caption}
                        </p>
                      )}
                      <p
                        className="font-serif"
                        style={{
                          marginTop: '0.3rem',
                          fontSize: '0.72rem',
                          fontStyle: 'italic',
                          color: 'var(--color-stone)',
                        }}
                      >
                        {timeAgo(post.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleStudioDelete(post.id)}
                      disabled={deletingPostId === post.id}
                      className="font-serif"
                      style={{
                        background: 'none',
                        border: 'none',
                        fontStyle: 'italic',
                        fontSize: '0.78rem',
                        color: 'var(--color-stone)',
                        cursor:
                          deletingPostId === post.id ? 'wait' : 'pointer',
                        padding: 0,
                        flexShrink: 0,
                      }}
                    >
                      {deletingPostId === post.id ? 'Removing…' : 'Remove'}
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
