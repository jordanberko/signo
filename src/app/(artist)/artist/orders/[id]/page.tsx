'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Check,
  Circle,
  Loader2,
  Package,
  Truck,
  ImageIcon,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { formatPrice } from '@/lib/utils';

// ── Types ──

interface OrderDetail {
  id: string;
  total_amount_aud: number | null;
  artist_payout_aud: number | null;
  status: string;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  payout_released_at: string | null;
  shipping_tracking_number: string | null;
  shipping_carrier: string | null;
  shipping_address: Record<string, string> | null;
  artworks: {
    id: string;
    title: string;
    images: string[];
    category: string;
    medium: string;
  } | null;
  profiles: { full_name: string; email: string } | null;
}

interface DisputeInfo {
  type: string;
  description: string;
  status: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  paid: { label: 'Awaiting Shipment', color: 'bg-amber-50 text-amber-700' },
  shipped: { label: 'Shipped', color: 'bg-blue-50 text-blue-700' },
  delivered: { label: 'Delivered', color: 'bg-blue-50 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-green-50 text-green-700' },
  disputed: { label: 'Disputed', color: 'bg-red-50 text-red-700' },
  refunded: { label: 'Refunded', color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
};

const CARRIERS = [
  'Australia Post',
  'Sendle',
  'StarTrack',
  'Aramex',
  'Other',
];

const DISPUTE_TYPE_LABELS: Record<string, string> = {
  damaged: 'Item Damaged',
  not_as_described: 'Not as Described',
  not_received: 'Not Received',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Inner content component ──

function OrderContent({ orderId }: { orderId: string }) {
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [dispute, setDispute] = useState<DisputeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Ship form state
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [packagingPhoto, setPackagingPhoto] = useState<File | null>(null);

  async function fetchOrder() {
    if (!user) return;
    try {
      const res = await fetch(`/api/artist/orders/${orderId}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.order) {
        setOrder(data.order as OrderDetail);
      }
      if (data.dispute) {
        setDispute(data.dispute as DisputeInfo);
      }
    } catch (err) {
      console.error('[ArtistOrderDetail] Fetch error:', err);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!user) return;
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, orderId]);

  async function handleShipOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingNumber.trim() || !carrier) return;

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/orders/${orderId}/ship`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracking_number: trackingNumber.trim(),
          carrier,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to mark order as shipped');
      }

      setSuccessMessage('Order marked as shipped successfully!');
      setTrackingNumber('');
      setCarrier('');
      setPackagingPhoto(null);

      // Refetch order
      setLoading(true);
      await fetchOrder();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <Package className="h-10 w-10 text-muted mx-auto mb-3" />
          <p className="font-medium mb-1">Order not found</p>
          <p className="text-sm text-muted mb-4">
            This order doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Link
            href="/artist/orders"
            className="text-sm text-accent-dark hover:underline"
          >
            Back to orders
          </Link>
        </div>
      </div>
    );
  }

  const badge = STATUS_CONFIG[order.status] ?? {
    label: order.status,
    color: 'bg-gray-50 text-gray-600',
  };
  const salePrice = order.total_amount_aud ?? 0;
  const payout = order.artist_payout_aud ?? 0;
  const stripeFee = Math.round((salePrice - payout) * 100) / 100;
  const artwork = order.artworks;
  const thumbnail = artwork?.images?.[0];
  const address = order.shipping_address;

  // Timeline step statuses
  const isShipped = ['shipped', 'delivered', 'completed'].includes(order.status);
  const isDelivered = ['delivered', 'completed'].includes(order.status);
  const isCompleted = order.status === 'completed';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/artist/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to orders
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Order Details</h1>
            <p className="text-sm text-muted mt-1">
              Order placed{' '}
              {new Date(order.created_at).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <span
            className={`text-xs font-medium px-3 py-1.5 rounded-full ${badge.color}`}
          >
            {badge.label}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Success / Error messages */}
        {successMessage && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm font-medium text-green-800">{successMessage}</p>
          </div>
        )}
        {errorMessage && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm font-medium text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Artwork card */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-4">Artwork</h2>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-muted-bg flex-shrink-0 overflow-hidden">
              {thumbnail ? (
                <Image
                  src={thumbnail}
                  alt={artwork?.title ?? ''}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-border" />
                </div>
              )}
            </div>
            <div>
              <p className="font-medium">{artwork?.title ?? 'Unknown'}</p>
              {artwork?.category && (
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 mt-1 capitalize">
                  {artwork.category}
                </span>
              )}
              {artwork?.medium && (
                <p className="text-sm text-muted mt-1">{artwork.medium}</p>
              )}
            </div>
          </div>
        </div>

        {/* Buyer info */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-4">Buyer</h2>
          <p className="text-sm">{order.profiles?.full_name ?? 'Unknown'}</p>

          {address && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted mb-2">
                Shipping Address
              </p>
              <div className="text-sm text-muted space-y-0.5">
                {address.line1 && <p>{address.line1}</p>}
                {address.line2 && <p>{address.line2}</p>}
                <p>
                  {[address.city, address.state, address.postal_code]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                {address.country && <p>{address.country}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Payment summary */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-4">Payment Summary</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Sale price</span>
              <span>{formatPrice(salePrice)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Stripe processing fee</span>
              <span className="text-muted">&minus;{formatPrice(stripeFee)}</span>
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="font-semibold">You receive</span>
              <span className="font-bold text-green-700 text-lg">
                {formatPrice(payout)}
              </span>
            </div>
          </div>
        </div>

        {/* Status timeline */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-4">Order Timeline</h2>
          <div className="relative pl-8 space-y-6">
            {/* Vertical line */}
            <div className="absolute left-[11px] top-1 bottom-1 w-0.5 bg-border" />

            {/* Order placed */}
            <div className="relative">
              <div className="absolute -left-8 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-green-600" />
              </div>
              <p className="font-medium text-sm">Order placed</p>
              <p className="text-xs text-muted mt-0.5">
                {formatDate(order.created_at)}
              </p>
            </div>

            {/* Payment confirmed */}
            <div className="relative">
              <div className="absolute -left-8 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-green-600" />
              </div>
              <p className="font-medium text-sm">Payment confirmed</p>
              <p className="text-xs text-muted mt-0.5">
                {formatDate(order.created_at)}
              </p>
            </div>

            {/* Shipped */}
            <div className="relative">
              <div
                className={`absolute -left-8 w-6 h-6 rounded-full flex items-center justify-center ${
                  isShipped
                    ? 'bg-green-100'
                    : 'bg-gray-100'
                }`}
              >
                {isShipped ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-gray-400" />
                )}
              </div>
              <p className="font-medium text-sm">Shipped</p>
              <p className="text-xs text-muted mt-0.5">
                {isShipped && order.shipped_at
                  ? formatDate(order.shipped_at)
                  : 'Awaiting your shipment'}
              </p>
            </div>

            {/* Delivered */}
            <div className="relative">
              <div
                className={`absolute -left-8 w-6 h-6 rounded-full flex items-center justify-center ${
                  isDelivered
                    ? 'bg-green-100'
                    : 'bg-gray-100'
                }`}
              >
                {isDelivered ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-gray-400" />
                )}
              </div>
              <p className="font-medium text-sm">Delivered</p>
              {isDelivered && order.delivered_at && (
                <p className="text-xs text-muted mt-0.5">
                  {formatDate(order.delivered_at)}
                </p>
              )}
            </div>

            {/* Completed */}
            <div className="relative">
              <div
                className={`absolute -left-8 w-6 h-6 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? 'bg-green-100'
                    : 'bg-gray-100'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-gray-400" />
                )}
              </div>
              <p className="font-medium text-sm">Completed &amp; Payout Released</p>
              {isCompleted && order.payout_released_at && (
                <p className="text-xs text-muted mt-0.5">
                  {formatDate(order.payout_released_at)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tracking info (shown if shipped or later) */}
        {isShipped && order.shipping_tracking_number && (
          <div className="bg-white border border-border rounded-2xl p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Tracking Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted mb-1">
                  Carrier
                </p>
                <p className="text-sm font-medium">
                  {order.shipping_carrier ?? 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted mb-1">
                  Tracking Number
                </p>
                <p className="text-sm font-medium font-mono">
                  {order.shipping_tracking_number}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dispute alert */}
        {order.status === 'disputed' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-red-800">Dispute Raised</h2>
                {dispute ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-red-700">
                      <span className="font-medium">Type:</span>{' '}
                      {DISPUTE_TYPE_LABELS[dispute.type] ?? dispute.type}
                    </p>
                    <p className="text-sm text-red-700">
                      <span className="font-medium">Description:</span>{' '}
                      {dispute.description}
                    </p>
                    <p className="text-xs text-red-600 mt-2">
                      Opened{' '}
                      {new Date(dispute.created_at).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-red-700 mt-1">
                    The buyer has raised a dispute on this order. Our team will review it shortly.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ship form (only when status is 'paid') */}
        {order.status === 'paid' && (
          <div className="bg-white border border-border rounded-2xl p-5">
            <h2 className="font-semibold mb-1">Mark as Shipped</h2>
            <p className="text-sm text-muted mb-5">
              Enter your shipping details below to notify the buyer.
            </p>

            <form onSubmit={handleShipOrder} className="space-y-4">
              {/* Tracking number */}
              <div>
                <label
                  htmlFor="tracking_number"
                  className="block text-sm font-medium mb-1.5"
                >
                  Tracking Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="tracking_number"
                  type="text"
                  required
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. AP123456789AU"
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              {/* Carrier */}
              <div>
                <label
                  htmlFor="carrier"
                  className="block text-sm font-medium mb-1.5"
                >
                  Carrier <span className="text-red-500">*</span>
                </label>
                <select
                  id="carrier"
                  required
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white"
                >
                  <option value="">Select a carrier</option>
                  {CARRIERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Packaging photo */}
              <div>
                <label
                  htmlFor="packaging_photo"
                  className="block text-sm font-medium mb-1.5"
                >
                  Packaging Photo{' '}
                  <span className="text-muted font-normal">(optional)</span>
                </label>
                <input
                  id="packaging_photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setPackagingPhoto(e.target.files?.[0] ?? null)
                  }
                  className="w-full text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
                <p className="text-xs text-muted mt-1">
                  Helps resolve disputes if the buyer claims damage during shipping.
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !trackingNumber.trim() || !carrier}
                className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4" />
                    Confirm Shipped
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page wrapper with params resolution ──

export default function ArtistOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { loading: authLoading } = useRequireAuth('artist');
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
