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
  evidence_images: string[] | null;
  evidence_video: string | null;
  orders: {
    id: string;
    total_amount_aud: number;
    dispatch_photo_urls: Array<{ type: string; url: string; uploaded_at: string }> | null;
    artworks: { title: string };
    buyer: { full_name: string; email: string };
    artist: {
      full_name: string;
      email: string;
      street_address: string | null;
      city: string | null;
      postcode: string | null;
      country: string | null;
    };
  };
}

const DISPATCH_PHOTO_LABELS: Record<string, string> = {
  work_before_packing: 'Before packing',
  work_during_packing: 'During packing',
  sealed_package: 'Sealed package',
};

const KICKER: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
  fontWeight: 400,
  margin: 0,
};

type Filter = 'open' | 'under_review' | 'return_pending' | 'return_in_transit' | 'all';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under review' },
  { value: 'return_pending', label: 'Awaiting return' },
  { value: 'return_in_transit', label: 'In transit' },
  { value: 'all', label: 'All' },
];

type Resolution = 'resolved_refund' | 'resolved_no_refund' | 'resolved_return';
type ShippingPayer = 'buyer' | 'seller' | 'split';

function statusToPill(status: string): string {
  switch (status) {
    case 'open':
      return 'status-pill--error';
    case 'under_review':
      return 'status-pill--attention';
    case 'return_pending':
    case 'return_in_transit':
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

function buildSellerAddress(artist: DisputeRow['orders']['artist']): string {
  const parts = [artist.street_address, artist.city, artist.postcode, artist.country].filter(Boolean);
  return parts.join('\n');
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

  // Return form state
  const [showReturnForm, setShowReturnForm] = useState<string | null>(null);
  const [returnAddress, setReturnAddress] = useState('');
  const [returnShippingPayer, setReturnShippingPayer] = useState<ShippingPayer>('buyer');
  const [returnWindowDays, setReturnWindowDays] = useState(14);

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

  async function approveReturn(disputeId: string) {
    if (!returnAddress.trim()) {
      setActionError('Return address is required.');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution: 'approve_return',
          resolution_notes: resolutionNotes || null,
          return_address: returnAddress,
          return_shipping_payer: returnShippingPayer,
          return_window_days: returnWindowDays,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setActionError(json.error || `Failed to approve return (${res.status}).`);
        setActionLoading(false);
        return;
      }
    } catch (err) {
      console.error('[AdminDisputes] Approve return exception:', err);
      setActionError('Network error. Please check your connection and try again.');
      setActionLoading(false);
      return;
    }
    setSelectedId(null);
    setShowReturnForm(null);
    setResolutionNotes('');
    setReturnAddress('');
    setReturnShippingPayer('buyer');
    setReturnWindowDays(14);
    setActionLoading(false);
    fetchDisputes();
  }

  function openReturnForm(dispute: DisputeRow) {
    setShowReturnForm(dispute.id);
    setReturnAddress(buildSellerAddress(dispute.orders.artist));
    setReturnShippingPayer('buyer');
    setReturnWindowDays(14);
    setActionError(null);
  }

  if (authLoading) {
    return <EditorialSpinner label="Disputes" headline="One moment…" />;
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
        <p style={KICKER}>&mdash; Disputes &mdash;</p>
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
                setShowReturnForm(null);
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
        <EditorialSpinner label="Disputes" headline="Fetching cases…" />
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
            const isReturnFormOpen = showReturnForm === dispute.id;
            return (
              <li
                key={dispute.id}
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(isOpen ? null : dispute.id);
                    setShowReturnForm(null);
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
                        fontWeight: 400,
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

                {/* Evidence comparison */}
                {isOpen && (dispute.evidence_images?.length || dispute.orders.dispatch_photo_urls?.length) && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '2rem',
                      paddingBottom: '2rem',
                    }}
                  >
                    {/* Buyer evidence */}
                    <div>
                      <p style={{ ...KICKER, marginBottom: '0.8rem' }}>Buyer evidence</p>
                      {dispute.evidence_images && dispute.evidence_images.length > 0 ? (
                        <div style={{ display: 'grid', gap: '0.6rem' }}>
                          {dispute.evidence_images.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={url}
                                alt={`Buyer evidence ${i + 1}`}
                                style={{
                                  width: '100%',
                                  maxHeight: '200px',
                                  objectFit: 'cover',
                                  border: '1px solid var(--color-border)',
                                }}
                              />
                            </a>
                          ))}
                          {dispute.evidence_video && (
                            <a
                              href={dispute.evidence_video}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'block',
                                padding: '0.8rem',
                                border: '1px solid var(--color-border)',
                                fontSize: '0.82rem',
                                color: 'var(--color-ink)',
                                textDecoration: 'none',
                              }}
                            >
                              Video evidence →
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="font-serif" style={{ fontStyle: 'italic', fontSize: '0.82rem', color: 'var(--color-stone)' }}>
                          No buyer photos submitted.
                        </p>
                      )}
                    </div>

                    {/* Artist dispatch evidence */}
                    <div>
                      <p style={{ ...KICKER, marginBottom: '0.8rem' }}>Artist dispatch evidence</p>
                      {dispute.orders.dispatch_photo_urls && dispute.orders.dispatch_photo_urls.length > 0 ? (
                        <div style={{ display: 'grid', gap: '0.6rem' }}>
                          {dispute.orders.dispatch_photo_urls.map((photo, i) => (
                            <div key={i}>
                              <a href={photo.url} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={photo.url}
                                  alt={DISPATCH_PHOTO_LABELS[photo.type] || photo.type}
                                  style={{
                                    width: '100%',
                                    maxHeight: '200px',
                                    objectFit: 'cover',
                                    border: '1px solid var(--color-border)',
                                  }}
                                />
                              </a>
                              <p style={{ fontSize: '0.72rem', color: 'var(--color-stone)', marginTop: '0.3rem' }}>
                                {DISPATCH_PHOTO_LABELS[photo.type] || photo.type}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="font-serif" style={{ fontStyle: 'italic', fontSize: '0.82rem', color: 'var(--color-stone)' }}>
                          No dispatch photos on file.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {isOpen && canResolve && !isReturnFormOpen && (
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
                        placeholder="Why this resolution was reached..."
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
                    {dispute.orders.total_amount_aud > 500 && (
                      <div
                        style={{
                          background: 'var(--color-cream)',
                          border: '1px solid var(--color-border)',
                          padding: '1rem 1.2rem',
                          fontSize: '0.82rem',
                          fontWeight: 400,
                          color: 'var(--color-stone-dark)',
                          lineHeight: 1.6,
                        }}
                      >
                        For this order value ({formatPrice(dispute.orders.total_amount_aud)}), return and refund is the recommended default. Refund-only should be used only for catastrophic damage with strong evidence.
                      </div>
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
                        onClick={() => openReturnForm(dispute)}
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

                {/* ── Return approval form ── */}
                {isOpen && isReturnFormOpen && (
                  <div
                    style={{
                      paddingBottom: '2.4rem',
                      paddingTop: '0.2rem',
                      display: 'grid',
                      gap: '1.6rem',
                    }}
                  >
                    <p
                      className="font-serif"
                      style={{
                        fontSize: '1rem',
                        fontStyle: 'italic',
                        color: 'var(--color-ink)',
                        margin: 0,
                      }}
                    >
                      Approve return for &ldquo;{dispute.orders?.artworks?.title}&rdquo;
                    </p>

                    <div>
                      <label htmlFor={`return-address-${dispute.id}`} className="commission-label">
                        Return address
                      </label>
                      <textarea
                        id={`return-address-${dispute.id}`}
                        value={returnAddress}
                        onChange={(e) => setReturnAddress(e.target.value)}
                        rows={4}
                        className="commission-field"
                        placeholder="Seller's return address..."
                      />
                    </div>

                    <div>
                      <p className="commission-label" style={{ marginBottom: '0.6rem' }}>
                        Return shipping paid by
                      </p>
                      <div style={{ display: 'flex', gap: '1.6rem', flexWrap: 'wrap' }}>
                        {([
                          ['buyer', 'Buyer pays'],
                          ['seller', 'Seller pays'],
                          ['split', 'Split 50/50'],
                        ] as const).map(([value, label]) => (
                          <label
                            key={value}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              cursor: 'pointer',
                              fontSize: '0.82rem',
                              color: 'var(--color-ink)',
                            }}
                          >
                            <input
                              type="radio"
                              name={`shipping-payer-${dispute.id}`}
                              value={value}
                              checked={returnShippingPayer === value}
                              onChange={() => setReturnShippingPayer(value)}
                              style={{ accentColor: 'var(--color-ink)' }}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label htmlFor={`return-window-${dispute.id}`} className="commission-label">
                        Return window (days)
                      </label>
                      <input
                        id={`return-window-${dispute.id}`}
                        type="number"
                        min={1}
                        max={90}
                        value={returnWindowDays}
                        onChange={(e) => setReturnWindowDays(Number(e.target.value) || 14)}
                        className="commission-field"
                        style={{ maxWidth: '8rem' }}
                      />
                    </div>

                    <div>
                      <label htmlFor={`return-notes-${dispute.id}`} className="commission-label">
                        Resolution notes
                      </label>
                      <textarea
                        id={`return-notes-${dispute.id}`}
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        rows={3}
                        className="commission-field"
                        placeholder="Internal record of why this return was approved..."
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

                    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => approveReturn(dispute.id)}
                        disabled={actionLoading}
                        className="artwork-primary-cta artwork-primary-cta--compact"
                      >
                        {actionLoading ? 'Sending...' : 'Approve return and notify buyer'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowReturnForm(null);
                          setActionError(null);
                        }}
                        disabled={actionLoading}
                        style={{
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
                        }}
                      >
                        Cancel
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
