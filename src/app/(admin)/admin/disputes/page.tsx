'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';

interface DisputeRow {
  id: string;
  type: string;
  description: string;
  status: string;
  resolution_notes: string | null;
  created_at: string;
  orders: {
    id: string;
    total_amount_aud: number;
    artworks: { title: string };
    buyer: { full_name: string; email: string };
    artist: { full_name: string; email: string };
  };
}

export default function AdminDisputesPage() {
  const { loading: authLoading } = useRequireAuth('admin');
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DisputeRow | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<'open' | 'under_review' | 'all'>('open');

  useEffect(() => {
    if (authLoading) return;
    fetchDisputes();
  }, [filter, authLoading]);

  async function fetchDisputes() {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from('disputes')
      .select('*, orders(id, total_amount_aud, artworks(title), profiles!orders_buyer_id_fkey(full_name, email), profiles!orders_artist_id_fkey(full_name, email))')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data } = await query;
    if (data) {
      setDisputes(data.map((d: Record<string, unknown>) => {
        const order = d.orders as Record<string, unknown>;
        return {
          ...d,
          orders: {
            ...order,
            buyer: (order as Record<string, unknown[]>).profiles?.[0] || { full_name: 'Unknown', email: '' },
            artist: (order as Record<string, unknown[]>).profiles?.[1] || { full_name: 'Unknown', email: '' },
          },
        };
      }) as unknown as DisputeRow[]);
    }
    setLoading(false);
  }

  async function resolveDispute(disputeId: string, resolution: 'resolved_refund' | 'resolved_no_refund' | 'resolved_return') {
    setActionLoading(true);
    const supabase = createClient();

    await supabase
      .from('disputes')
      .update({
        status: resolution,
        resolution_notes: resolutionNotes || null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', disputeId);

    setSelected(null);
    setResolutionNotes('');
    setActionLoading(false);
    fetchDisputes();
  }

  const statusBadge: Record<string, { color: string; icon: typeof Clock }> = {
    open: { color: 'bg-red-50 text-red-700', icon: AlertTriangle },
    under_review: { color: 'bg-amber-50 text-amber-700', icon: Clock },
    resolved_refund: { color: 'bg-green-50 text-green-700', icon: CheckCircle },
    resolved_no_refund: { color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
    resolved_return: { color: 'bg-blue-50 text-blue-700', icon: CheckCircle },
  };

  if (authLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div style={{ width: 32, height: 32, border: '3px solid #E5E2DB', borderTopColor: '#2C2C2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Disputes</h1>
        <p className="text-muted mt-1">Review and resolve buyer disputes</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {[
          { value: 'open', label: 'Open' },
          { value: 'under_review', label: 'Under Review' },
          { value: 'all', label: 'All' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setFilter(tab.value as typeof filter); setSelected(null); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === tab.value
                ? 'bg-primary text-white'
                : 'bg-muted-bg text-foreground hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-16 border border-border rounded-lg">
          <CheckCircle className="h-10 w-10 text-success mx-auto mb-3" />
          <p className="text-muted">No {filter === 'all' ? '' : filter.replace('_', ' ')} disputes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((dispute) => {
            const badge = statusBadge[dispute.status] || statusBadge.open;
            return (
              <div
                key={dispute.id}
                className={`border rounded-lg p-5 transition-colors cursor-pointer ${
                  selected?.id === dispute.id ? 'border-accent bg-accent/5' : 'border-border hover:border-gray-300'
                }`}
                onClick={() => { setSelected(dispute); setResolutionNotes(dispute.resolution_notes || ''); }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded capitalize ${badge.color}`}>
                        <badge.icon className="h-3 w-3" />
                        {dispute.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs px-2 py-1 bg-muted-bg rounded capitalize">{dispute.type.replace('_', ' ')}</span>
                    </div>
                    <p className="font-medium text-sm">{dispute.orders?.artworks?.title || 'Unknown Artwork'}</p>
                    <p className="text-xs text-muted mt-1">{dispute.description}</p>
                  </div>
                  <div className="text-right text-xs text-muted flex-shrink-0 ml-4">
                    <p>{new Date(dispute.created_at).toLocaleDateString('en-AU')}</p>
                    {dispute.orders && <p className="font-medium text-foreground">{formatPrice(dispute.orders.total_amount_aud)}</p>}
                  </div>
                </div>

                {selected?.id === dispute.id && (dispute.status === 'open' || dispute.status === 'under_review') && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3" onClick={(e) => e.stopPropagation()}>
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                      placeholder="Resolution notes..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveDispute(dispute.id, 'resolved_refund')}
                        disabled={actionLoading}
                        className="flex-1 py-2 bg-success text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        Refund Buyer
                      </button>
                      <button
                        onClick={() => resolveDispute(dispute.id, 'resolved_return')}
                        disabled={actionLoading}
                        className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        Return & Refund
                      </button>
                      <button
                        onClick={() => resolveDispute(dispute.id, 'resolved_no_refund')}
                        disabled={actionLoading}
                        className="flex-1 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        No Refund
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
