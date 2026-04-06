'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  CheckCircle2,
  Package,
  Truck,
  ShieldCheck,
  Clock,
  ImageIcon,
  Loader2,
  ArrowRight,
  Download,
  Copy,
  Check,
  AlertCircle,
  Star,
  CircleDot,
  Circle,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { getReadyClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';

// ── Types ──

interface OrderDetail {
  id: string;
  total_amount_aud: number;
  shipping_cost_aud: number | null;
  platform_fee_aud: number | null;
  artist_payout_aud: number | null;
  stripe_payment_intent_id: string | null;
  status: string;
  shipping_tracking_number: string | null;
  shipping_carrier: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  inspection_deadline: string | null;
  payout_released_at: string | null;
  shipping_address: Record<string, string> | null;
  created_at: string;
  artwork: {
    id: string;
    title: string;
    images: string[];
    category: string | null;
    medium: string | null;
  } | null;
  artist: {
    id: string;
    full_name: string | null;
  } | null;
}

function statusConfig(status: string) {
  switch (status) {
    case 'paid':
      return {
        label: 'Paid — Awaiting Shipment',
        color: 'text-amber-700 bg-amber-50',
        icon: Clock,
      };
    case 'shipped':
      return {
        label: 'Shipped',
        color: 'text-blue-700 bg-blue-50',
        icon: Truck,
      };
    case 'delivered':
      return {
        label: 'Delivered — Inspection Window',
        color: 'text-blue-700 bg-blue-50',
        icon: ShieldCheck,
      };
    case 'completed':
      return {
        label: 'Completed',
        color: 'text-green-700 bg-green-50',
        icon: CheckCircle2,
      };
    case 'disputed':
      return {
        label: 'Disputed',
        color: 'text-red-700 bg-red-50',
        icon: AlertCircle,
      };
    case 'refunded':
      return {
        label: 'Refunded',
        color: 'text-gray-700 bg-gray-100',
        icon: AlertCircle,
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        color: 'text-gray-700 bg-gray-100',
        icon: AlertCircle,
      };
    default:
      return {
        label: status,
        color: 'text-gray-700 bg-gray-100',
        icon: Package,
      };
  }
}

// ── Content component ──

function OrderContent({
  orderId,
}: {
  orderId: string;
}) {
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get('success') === 'true';

  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number } | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!user) return;

    async function doFetch() {
      const supabase = await getReadyClient();

      // If orderId looks like a Stripe checkout session ID (cs_*), find by that
      // Otherwise it's a UUID order ID
      let query;
      if (orderId.startsWith('cs_')) {
        // For success redirect — the order may not exist yet (webhook race condition)
        // We'll poll a few times
        for (let attempt = 0; attempt < 5; attempt++) {
          const { data } = await supabase
            .from('orders')
            .select(
              '*, artworks(id, title, images, category, medium), profiles!orders_artist_id_fkey(id, full_name)'
            )
            .eq('buyer_id', user!.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (data) {
            const artwork = data.artworks as Record<string, unknown> | null;
            const artist = data.profiles as Record<string, string> | null;
            setOrder({
              id: data.id as string,
              total_amount_aud: (data.total_amount_aud as number) || 0,
              shipping_cost_aud: data.shipping_cost_aud as number | null,
              platform_fee_aud: data.platform_fee_aud as number | null,
              artist_payout_aud: data.artist_payout_aud as number | null,
              stripe_payment_intent_id: data.stripe_payment_intent_id as string | null,
              status: data.status as string,
              shipping_tracking_number: data.shipping_tracking_number as string | null,
              shipping_carrier: data.shipping_carrier as string | null,
              shipped_at: data.shipped_at as string | null,
              delivered_at: data.delivered_at as string | null,
              inspection_deadline: data.inspection_deadline as string | null,
              payout_released_at: data.payout_released_at as string | null,
              shipping_address: data.shipping_address as Record<string, string> | null,
              created_at: data.created_at as string,
              artwork: artwork
                ? {
                    id: artwork.id as string,
                    title: artwork.title as string,
                    images: (artwork.images as string[]) || [],
                    category: artwork.category as string | null,
                    medium: artwork.medium as string | null,
                  }
                : null,
              artist: artist
                ? {
                    id: artist.id || '',
                    full_name: artist.full_name || null,
                  }
                : null,
            });
            setLoading(false);
            return;
          }

          // Wait before retrying
          if (attempt < 4) {
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
        // If we still don't have an order, show a pending message
        setLoading(false);
        return;
      }

      // Regular order ID lookup
      query = supabase
        .from('orders')
        .select(
          '*, artworks(id, title, images, category, medium), profiles!orders_artist_id_fkey(id, full_name)'
        )
        .eq('id', orderId)
        .eq('buyer_id', user!.id)
        .single();

      const { data } = await query;
      if (data) {
        const artwork = data.artworks as Record<string, unknown> | null;
        const artist = data.profiles as Record<string, string> | null;
        setOrder({
          id: data.id as string,
          total_amount_aud: (data.total_amount_aud as number) || 0,
          shipping_cost_aud: data.shipping_cost_aud as number | null,
          platform_fee_aud: data.platform_fee_aud as number | null,
          artist_payout_aud: data.artist_payout_aud as number | null,
          stripe_payment_intent_id: data.stripe_payment_intent_id as string | null,
          status: data.status as string,
          shipping_tracking_number: data.shipping_tracking_number as string | null,
          shipping_carrier: data.shipping_carrier as string | null,
          shipped_at: data.shipped_at as string | null,
          delivered_at: data.delivered_at as string | null,
          inspection_deadline: data.inspection_deadline as string | null,
          payout_released_at: data.payout_released_at as string | null,
          shipping_address: data.shipping_address as Record<string, string> | null,
          created_at: data.created_at as string,
          artwork: artwork
            ? {
                id: artwork.id as string,
                title: artwork.title as string,
                images: (artwork.images as string[]) || [],
                category: artwork.category as string | null,
                medium: artwork.medium as string | null,
              }
            : null,
          artist: artist
            ? {
                id: artist.id || '',
                full_name: artist.full_name || null,
              }
            : null,
        });
      }
      setLoading(false);
    }

    doFetch();
  }, [user, orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Countdown timer for inspection window
  useEffect(() => {
    if (!order || order.status !== 'delivered' || !order.inspection_deadline) return;

    function updateCountdown() {
      const deadline = new Date(order!.inspection_deadline!).getTime();
      const now = Date.now();
      const diff = deadline - now;

      if (diff <= 0) {
        setCountdown(null);
        return;
      }

      setCountdown({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      });
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 60_000);
    return () => clearInterval(interval);
  }, [order]);

  async function handleComplete() {
    if (!order) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/complete`, { method: 'PUT' });
      if (res.ok) {
        await fetchOrder();
      }
    } finally {
      setCompleting(false);
    }
  }

  function copyOrderId() {
    if (!order) return;
    navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Loading ──

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
        {isSuccess && (
          <p className="text-sm text-muted">Processing your order...</p>
        )}
      </div>
    );
  }

  // ── Order not found / still processing ──

  if (!order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        {isSuccess ? (
          <>
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="font-editorial text-2xl font-medium mb-2">
              Payment received!
            </h1>
            <p className="text-muted mb-6">
              Your order is being processed. This page will update automatically,
              or you can check your{' '}
              <Link href="/dashboard" className="text-accent-dark underline">
                dashboard
              </Link>{' '}
              in a moment.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-accent hover:text-primary transition-colors"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        ) : (
          <>
            <AlertCircle className="h-12 w-12 text-muted mx-auto mb-4" />
            <h1 className="font-editorial text-2xl font-medium mb-2">
              Order not found
            </h1>
            <p className="text-muted mb-6">
              This order doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-accent hover:text-primary transition-colors"
            >
              Go to Dashboard
            </Link>
          </>
        )}
      </div>
    );
  }

  // ── Order found ──

  const status = statusConfig(order.status);
  const StatusIcon = status.icon;
  const thumbnail = order.artwork?.images?.[0];
  const isDigital = order.artwork?.category === 'digital';
  const orderDate = new Date(order.created_at).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Success banner */}
      {isSuccess && (
        <div className="mb-8 p-5 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-4 animate-fade-in">
          <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-green-800">
              Order placed successfully!
            </h2>
            <p className="text-sm text-green-700 mt-1">
              {isDigital
                ? 'Your download link will be available shortly.'
                : 'The artist will ship your artwork within 5 business days. You\u2019ll receive tracking information once it ships.'}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-editorial text-2xl md:text-3xl font-medium">
            {isSuccess ? 'Order Confirmation' : 'Order Details'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted">
              Order #{order.id.slice(0, 8)}
            </p>
            <button
              onClick={copyOrderId}
              className="text-muted hover:text-foreground transition-colors"
              title="Copy order ID"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${status.color}`}
        >
          <StatusIcon className="h-4 w-4" />
          {status.label}
        </div>
      </div>

      {/* Artwork card */}
      <div className="bg-white border border-border rounded-2xl p-5 mb-6">
        <div className="flex gap-5">
          <Link
            href={`/artwork/${order.artwork?.id}`}
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl bg-muted-bg flex-shrink-0 overflow-hidden"
          >
            {thumbnail ? (
              <Image
                src={thumbnail}
                alt={order.artwork?.title || ''}
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-border" />
              </div>
            )}
          </Link>

          <div className="flex-1 min-w-0">
            <Link
              href={`/artwork/${order.artwork?.id}`}
              className="font-editorial text-lg font-medium hover:text-accent-dark transition-colors"
            >
              {order.artwork?.title || 'Artwork'}
            </Link>
            <p className="text-sm text-muted mt-0.5">
              by{' '}
              <Link
                href={`/artists/${order.artist?.id}`}
                className="hover:text-accent-dark transition-colors"
              >
                {order.artist?.full_name || 'Unknown Artist'}
              </Link>
            </p>
            {order.artwork?.medium && (
              <p className="text-xs text-warm-gray mt-1">
                {order.artwork.medium}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {isDigital ? (
                <span className="text-[10px] font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full flex items-center gap-1">
                  <Download className="h-2.5 w-2.5" />
                  Digital
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 bg-muted-bg text-muted rounded-full flex items-center gap-1">
                  <Package className="h-2.5 w-2.5" />
                  {order.artwork?.category === 'print' ? 'Print' : 'Original'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="bg-white border border-border rounded-2xl p-5 mb-6">
        <h3 className="font-medium text-sm mb-4">Payment Summary</h3>
        <div className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Artwork</span>
            <span>
              {formatPrice(
                order.total_amount_aud - (order.shipping_cost_aud || 0)
              )}
            </span>
          </div>
          {!isDigital && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Shipping</span>
              <span className="text-green-700 font-medium">
                {(order.shipping_cost_aud || 0) > 0
                  ? formatPrice(order.shipping_cost_aud!)
                  : 'Free'}
              </span>
            </div>
          )}
          <div className="border-t border-border pt-2.5 flex justify-between">
            <span className="font-medium">Total paid</span>
            <span className="font-bold text-lg">
              {formatPrice(order.total_amount_aud)}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted mt-3">
          Ordered on {orderDate}
        </p>
      </div>

      {/* Shipping info */}
      {!isDigital && order.shipping_address && (
        <div className="bg-white border border-border rounded-2xl p-5 mb-6">
          <h3 className="font-medium text-sm mb-3">Shipping Address</h3>
          <p className="text-sm text-muted leading-relaxed">
            {order.shipping_address.street}
            <br />
            {order.shipping_address.city}, {order.shipping_address.state}{' '}
            {order.shipping_address.postcode}
            <br />
            {order.shipping_address.country || 'Australia'}
          </p>
          {order.shipping_tracking_number && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-medium tracking-wide uppercase text-muted mb-1">
                Tracking
              </p>
              <p className="text-sm font-mono">
                {order.shipping_carrier && (
                  <span className="text-muted">
                    {order.shipping_carrier}:{' '}
                  </span>
                )}
                {order.shipping_tracking_number}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Status Timeline */}
      <div className="bg-white border border-border rounded-2xl p-5 mb-6">
        <h3 className="font-medium text-sm mb-5">Order Timeline</h3>
        <div className="space-y-0">
          {(() => {
            const fmtDate = (d: string | null) =>
              d
                ? new Date(d).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null;

            const statusOrder = ['paid', 'shipped', 'delivered', 'completed'];
            const currentIdx = statusOrder.indexOf(order.status);

            const steps = [
              {
                label: 'Order placed',
                detail: fmtDate(order.created_at),
                done: true,
              },
              {
                label: 'Payment confirmed',
                detail: fmtDate(order.created_at),
                done: currentIdx >= 0,
              },
              {
                label: 'Shipped',
                detail: order.shipped_at
                  ? fmtDate(order.shipped_at)
                  : 'Awaiting shipment',
                done: currentIdx >= 1,
                current: currentIdx === 0,
                extra:
                  order.shipped_at && order.shipping_tracking_number
                    ? `${order.shipping_carrier ? order.shipping_carrier + ': ' : ''}${order.shipping_tracking_number}`
                    : null,
              },
              {
                label: 'Delivered',
                detail: order.delivered_at
                  ? fmtDate(order.delivered_at)
                  : null,
                done: currentIdx >= 2,
                current: currentIdx === 1,
              },
              {
                label: 'Completed',
                detail: order.payout_released_at
                  ? fmtDate(order.payout_released_at)
                  : null,
                done: currentIdx >= 3,
                current: currentIdx === 2,
              },
            ];

            return steps.map((step, i) => (
              <div key={step.label} className="flex gap-3">
                {/* Vertical line + dot */}
                <div className="flex flex-col items-center">
                  {step.done ? (
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    </div>
                  ) : step.current ? (
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <CircleDot className="h-3.5 w-3.5 text-accent-dark" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                      <Circle className="h-3 w-3 text-gray-300" />
                    </div>
                  )}
                  {i < steps.length - 1 && (
                    <div
                      className={`w-0.5 flex-1 min-h-[24px] ${
                        step.done ? 'bg-green-200' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
                {/* Content */}
                <div className="pb-5">
                  <p
                    className={`text-sm ${
                      step.current
                        ? 'font-semibold text-foreground'
                        : step.done
                          ? 'text-muted'
                          : 'text-muted/60'
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.detail && (
                    <p
                      className={`text-xs mt-0.5 ${
                        step.done ? 'text-muted' : 'text-muted/50'
                      }`}
                    >
                      {step.detail}
                    </p>
                  )}
                  {step.extra && (
                    <p className="text-xs font-mono text-muted mt-1">
                      {step.extra}
                    </p>
                  )}
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Inspection Window — only for delivered orders */}
      {order.status === 'delivered' && order.inspection_deadline && (
        <div className="bg-white border border-blue-200 rounded-2xl p-5 mb-6">
          {(() => {
            const deadlinePassed =
              new Date(order.inspection_deadline).getTime() < Date.now();

            if (deadlinePassed) {
              return (
                <div className="text-center">
                  <Clock className="h-6 w-6 text-muted mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted">
                    Inspection window has closed
                  </p>
                </div>
              );
            }

            return (
              <>
                <div className="text-center mb-4">
                  <h3 className="font-medium text-sm mb-1">
                    You have 48 hours to inspect your artwork
                  </h3>
                  {countdown && (
                    <div className="flex items-center justify-center gap-1 text-lg font-mono font-semibold text-blue-700">
                      <Clock className="h-4 w-4" />
                      {countdown.hours}h {countdown.minutes}m remaining
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleComplete}
                    disabled={completing}
                    className="flex-1 py-2.5 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-colors text-center text-sm disabled:opacity-50"
                  >
                    {completing ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    ) : (
                      'Everything looks great'
                    )}
                  </button>
                  <Link
                    href={`/orders/${order.id}/dispute`}
                    className="flex-1 py-2.5 border border-red-200 text-red-600 font-medium rounded-full hover:bg-red-50 transition-colors text-center text-sm"
                  >
                    Report an issue
                  </Link>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Dispute banner */}
      {order.status === 'disputed' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">
            A dispute has been opened for this order. We&apos;re reviewing it.
          </p>
        </div>
      )}

      {/* Buyer protection */}
      <div className="bg-accent-subtle/50 border border-accent/10 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-accent-dark flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Buyer Protection</p>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Your payment is held securely in escrow. After delivery, you have
              a 48-hour inspection window. If anything isn&apos;t as described,
              you can open a dispute for a full refund.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/dashboard"
          className="flex-1 py-3 bg-primary text-white font-semibold rounded-full hover:bg-accent hover:text-primary transition-colors text-center"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/browse"
          className="flex-1 py-3 border border-border font-medium rounded-full hover:bg-cream transition-colors text-center"
        >
          Continue Browsing
        </Link>
        {order.status === 'completed' && (
          <Link
            href="#"
            className="flex-1 py-3 border border-border font-medium rounded-full hover:bg-cream transition-colors text-center flex items-center justify-center gap-2"
          >
            <Star className="h-4 w-4" />
            Leave a Review
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Page wrapper ──

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { loading: authLoading } = useRequireAuth();
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setOrderId(p.id));
  }, [params]);

  if (authLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div style={{ width: 32, height: 32, border: '3px solid #E5E2DB', borderTopColor: '#2C2C2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style></div>;

  if (!orderId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      }
    >
      <OrderContent orderId={orderId} />
    </Suspense>
  );
}
