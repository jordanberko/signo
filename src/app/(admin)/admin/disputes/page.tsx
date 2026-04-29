'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import EditorialSpinner from '@/components/ui/EditorialSpinner';

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

const KICKER: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
  fontWeight: 400,
  margin: 0,
};

type Filter = 'open' | 'under_review' | 'all';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under review' },
  { value: 'all', label: 'All' },
];

type Resolution = 'resolved_refund' | 'resolved_no_refund' | 'resolved_return';

function statusToPill(status: string): string {
  switch (status) {
    case 'open':
      return 'status-pill--error';
    case 'under_review':
      return 'status-pill--attention';
    case 'resolved_refund':
    case 'resolved_return':
      return 'status-pill--success';
    case 'resolved_no_refund':
      return 'status-pill--neutral';
    default:
      return 'status-pill--neutral';
  }
}

export default function AdminDisputesPage() {
  const { loading: authLoading } = useRequireAuth('admin');
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>('open');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    fetchDisputes();
  }, [filter, authLoading]);

  async function fetchDisputes() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/disputes?status=${filter}`);
      const json = await res.json();
      if (!res.ok) {
        console.error('[AdminDisputes] API error:', json.error);
        setDisputes([]);
        return;
      }
      setDisputes((json.data || []) as DisputeRow[]);
    } catch (err) {
      console.error('[AdminDisputes] Fetch error:', err);
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }

  async function resolveDispute(disputeId: string, resolution: Resolution) {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution,
          resolution_notes: resolutionNotes || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const message =
          json.error ||
          `Couldn't resolve this dispute (${res.status}). Please try again.`;
        console.error('[AdminDisputes] Resolve error:', message);
        setActionError(message);
        setActionLoading(false);
        return;
      }
    } catch (err) {
      console.error('[AdminDisputes] Resolve exception:', err);
      setActionError('Network error. Please check your connection and try again.');
      setActionLoading(false);
      return;
    }
    setSelectedId(null);
    setResolutionNotes('');
    setActionLoading(false);
    fetchDisputes();
  }

  if (authLoading) {
    return <EditorialSpinner label="Disputes" headline="One moment\u2026" />;
  }

  return (
    <div
      className="px-6 sm:px-10"
      style={{
        maxWidth: '78rem',
        margin: '0 auto',
        paddingTop: 'clamp(3rem, 5vw, 4.5rem)',
        paddingBottom: 'clamp(5rem, 8vw, 7rem)',
      }}
    >
      {/* ── Heading ── */}
      <div style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
        <p style={KICKER}>— Disputes —</p>
        <h1
          className="font-serif"
          style={{
            marginTop: '1.2rem',
            fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.015em',
            color: 'var(--color-ink)',
            fontWeight: 400,
            maxWidth: '22ch',
          }}
        >
          Sort each case <em style={{ fontStyle: 'italic' }}>fairly.</em>
        </h1>
      </div>

      {/* ── Filter tabs ── */}
      <div
        style={{
          display: 'flex',
          gap: '0',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '2.4rem',
        }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setFilter(f.value);
                setSelectedId(null);
                setActionError(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '0.8rem 0',
                marginRight: '2rem',
                fontSize: '0.72rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 400,
                color: active ? 'var(--color-ink)' : 'var(--color-stone)',
                borderBottom: active
                  ? '1px solid var(--color-ink)'
                  : '1px solid transparent',
                marginBottom: '-1px',
                cursor: 'pointer',
                transition: 'color var(--dur-fast) var(--ease-out)',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ── List ── */}
      {loading ? (
        <EditorialSpinner label="Disputes" headline="Fetching cases\u2026" />
      ) : disputes.length === 0 ? (
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
            padding: '4rem 0',
            textAlign: 'center',
          }}
        >
          <p
            className="font-serif"
            style={{
              fontStyle: 'italic',
              color: 'var(--color-stone)',
              fontSize: '1rem',
            }}
          >
            {filter === 'open'
              ? 'No open disputes. Quiet news.'
              : 'Nothing to show.'}
          </p>
        </div>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {disputes.map((dispute) => {
            const isOpen = selectedId === dispute.id;
            const canResolve =
              dispute.status === 'open' || dispute.status === 'under_review';
            return (
              <li
                key={dispute.id}
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(isOpen ? null : dispute.id);
                    setResolutionNotes(dispute.resolution_notes || '');
                    setActionError(null);
                  }}
                  style={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '1.4rem',
                    padding: '1.8rem 0',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.6rem',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        marginBottom: '0.7rem',
                      }}
                    >
                      <span className={`status-pill ${statusToPill(dispute.status)}`}>
                        {dispute.status.replace(/_/g, ' ')}
                      </span>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          color: 'var(--color-stone)',
                        }}
                      >
                        {dispute.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p
                      className="font-serif"
                      style={{
                        fontSize: '1.1rem',
                        color: 'var(--color-ink)',
                        margin: 0,
                      }}
                    >
                      {dispute.orders?.artworks?.title || 'Unknown artwork'}
                    </p>
                    <p
                      style={{
                        marginTop: '0.5rem',
                        fontSize: '0.88rem',
                        color: 'var(--color-stone-dark)',
                        fontWeight: 300,
                        lineHeight: 1.55,
                        maxWidth: '60ch',
                      }}
                    >
                      {dispute.description}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p
                      className="font-serif"
                      style={{
                        fontSize: '1rem',
                        color: 'var(--color-ink)',
                        margin: 0,
                      }}
                    >
                      {dispute.orders
                        ? formatPrice(dispute.orders.total_amount_aud)
                        : '—'}
                    </p>
                    <p
                      className="font-serif"
                      style={{
                        marginTop: '0.3rem',
                        fontSize: '0.78rem',
                        fontStyle: 'italic',
                        color: 'var(--color-stone)',
                      }}
                    >
                      {new Date(dispute.created_at).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </button>

                {isOpen && canResolve && (
                  <div
                    style={{
                      paddingBottom: '2.4rem',
                      paddingTop: '0.2rem',
                      paddingLeft: 0,
                      paddingRight: 0,
                      display: 'grid',
                      gap: '1.8rem',
                    }}
                  >
                    <div>
                      <label htmlFor={`resolution-${dispute.id}`} className="commission-label">
                        Resolution notes
                      </label>
                      <textarea
                        id={`resolution-${dispute.id}`}
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        rows={3}
                        className="commission-field"
                        placeholder="Why this resolution was reached…"
                      />
                    </div>
                    {actionError && (
                      <p
                        className="font-serif"
                        role="alert"
                        style={{
                          fontStyle: 'italic',
                          color: 'var(--color-terracotta)',
                          fontSize: '0.88rem',
                          margin: 0,
                          lineHeight: 1.5,
                        }}
                      >
                        {actionError}
                      </p>
                    )}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
                        gap: '0.8rem',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => resolveDispute(dispute.id, 'resolved_refund')}
                        disabled={actionLoading}
                        className="artwork-primary-cta artwork-primary-cta--compact"
                        style={{ width: '100%' }}
                      >
                        Refund buyer
                      </button>
                      <button
                        type="button"
                        onClick={() => resolveDispute(dispute.id, 'resolved_return')}
                        disabled={actionLoading}
                        className="artwork-primary-cta artwork-primary-cta--compact"
                        style={{ width: '100%' }}
                      >
                        Return &amp; refund
                      </button>
                      <button
                        type="button"
                        onClick={() => resolveDispute(dispute.id, 'resolved_no_refund')}
                        disabled={actionLoading}
                        style={{
                          width: '100%',
                          padding: '0.7rem 1.3rem',
                          background: 'transparent',
                          border: '1px solid var(--color-border-strong)',
                          fontSize: '0.68rem',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: 'var(--color-ink)',
                          fontWeight: 400,
                          cursor: actionLoading ? 'not-allowed' : 'pointer',
                          opacity: actionLoading ? 0.55 : 1,
                          transition: 'border-color var(--dur-fast) var(--ease-out)',
                        }}
                      >
                        No refund
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
