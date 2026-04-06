'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Camera,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { getReadyClient } from '@/lib/supabase/client';

// ── Types ──

type DisputeType = 'damaged' | 'not_as_described' | 'not_received' | 'other';

interface OrderBasic {
  id: string;
  status: string;
  inspection_deadline: string | null;
  artwork: {
    title: string;
  } | null;
}

const disputeTypes: { value: DisputeType; label: string; description: string }[] = [
  {
    value: 'damaged',
    label: 'Artwork arrived damaged',
    description: 'The artwork was damaged during shipping or handling',
  },
  {
    value: 'not_as_described',
    label: 'Artwork is not as described',
    description: 'The artwork differs significantly from the listing',
  },
  {
    value: 'not_received',
    label: "Artwork hasn't arrived",
    description: 'The delivery was confirmed but you did not receive it',
  },
  {
    value: 'other',
    label: 'Other issue',
    description: 'Another problem with your order',
  },
];

// ── Content ──

function DisputeContent({ orderId }: { orderId: string }) {
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderBasic | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockReason, setBlockReason] = useState<string | null>(null);

  // Form state
  const [disputeType, setDisputeType] = useState<DisputeType | null>(null);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const supabase = await getReadyClient();

      // Fetch order
      const { data: orderData } = await supabase
        .from('orders')
        .select('id, status, inspection_deadline, artworks(title)')
        .eq('id', orderId)
        .eq('buyer_id', user!.id)
        .single();

      if (!orderData) {
        setBlockReason('Order not found or you do not have access.');
        setLoading(false);
        return;
      }

      const artwork = orderData.artworks as Record<string, string> | null;
      const ord: OrderBasic = {
        id: orderData.id as string,
        status: orderData.status as string,
        inspection_deadline: orderData.inspection_deadline as string | null,
        artwork: artwork ? { title: artwork.title || 'Artwork' } : null,
      };
      setOrder(ord);

      // Validate status
      if (ord.status !== 'delivered') {
        setBlockReason('Disputes can only be opened for delivered orders.');
        setLoading(false);
        return;
      }

      // Validate deadline
      if (
        ord.inspection_deadline &&
        new Date(ord.inspection_deadline).getTime() < Date.now()
      ) {
        setBlockReason('The 48-hour inspection window has closed.');
        setLoading(false);
        return;
      }

      // Check existing dispute
      const { data: existingDispute } = await supabase
        .from('disputes')
        .select('id')
        .eq('order_id', orderId)
        .limit(1)
        .maybeSingle();

      if (existingDispute) {
        setBlockReason('A dispute has already been submitted for this order.');
        setLoading(false);
        return;
      }

      setLoading(false);
    }

    load();
  }, [user, orderId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!disputeType || description.length < 20 || !order) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: disputeType,
          description,
          evidence_images: [],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit dispute');
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ──

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  // ── Blocked ──

  if (blockReason) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <AlertCircle className="h-12 w-12 text-muted mx-auto mb-4" />
        <h1 className="font-editorial text-2xl font-medium mb-2">
          Cannot open dispute
        </h1>
        <p className="text-muted mb-6">{blockReason}</p>
        <Link
          href={`/orders/${orderId}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-accent hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Order
        </Link>
      </div>
    );
  }

  // ── Success ──

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="font-editorial text-2xl font-medium mb-2">
          Dispute submitted
        </h1>
        <p className="text-muted mb-6">
          Your dispute has been submitted. We&apos;ll review it within 48 hours.
        </p>
        <Link
          href={`/orders/${orderId}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-accent hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Order
        </Link>
      </div>
    );
  }

  // ── Form ──

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        href={`/orders/${orderId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to order
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-editorial text-2xl md:text-3xl font-medium">
          Report an Issue
        </h1>
        {order?.artwork && (
          <p className="text-sm text-muted mt-1">
            For: {order.artwork.title}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dispute type */}
        <div>
          <label className="block text-sm font-medium mb-3">
            What&apos;s the issue?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {disputeTypes.map((dt) => (
              <button
                key={dt.value}
                type="button"
                onClick={() => setDisputeType(dt.value)}
                className={`text-left p-4 rounded-xl border-2 transition-colors ${
                  disputeType === dt.value
                    ? 'border-accent-dark bg-accent-subtle/30'
                    : 'border-border hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-medium">{dt.label}</p>
                <p className="text-xs text-muted mt-1">{dt.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium mb-2"
          >
            Describe the issue
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            rows={5}
            className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
            required
            minLength={20}
          />
          <p
            className={`text-xs mt-1 ${
              description.length > 0 && description.length < 20
                ? 'text-red-500'
                : 'text-muted'
            }`}
          >
            {description.length}/20 characters minimum
          </p>
        </div>

        {/* Photo evidence */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Photo evidence
          </label>
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-gray-300 transition-colors">
            <Camera className="h-8 w-8 text-muted mx-auto mb-2" />
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-accent-subtle file:text-accent-dark hover:file:bg-accent/20 cursor-pointer"
            />
            {files && files.length > 0 && (
              <p className="text-xs text-muted mt-2">
                {files.length} file{files.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
          <p className="text-xs text-muted mt-1.5">
            {disputeType === 'damaged'
              ? 'Required for damage claims'
              : 'Recommended to support your claim'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={
            !disputeType || description.length < 20 || submitting
          }
          className="w-full py-3 bg-red-600 text-white font-semibold rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Submit Dispute'
          )}
        </button>
      </form>
    </div>
  );
}

// ── Page wrapper ──

export default function DisputePage({
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

  return <DisputeContent orderId={orderId} />;
}
