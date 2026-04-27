'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import EditorialSpinner from '@/components/ui/EditorialSpinner';
import type { Artwork, User } from '@/types/database';

type ReviewArtwork = Artwork & { artist: User };
type Filter = 'pending_review' | 'approved' | 'rejected';

const KICKER: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
  fontWeight: 400,
  margin: 0,
};

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'pending_review', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const DETAIL_LABEL: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
  fontWeight: 400,
};

const DETAIL_VALUE: React.CSSProperties = {
  fontSize: '0.88rem',
  color: 'var(--color-ink)',
  fontWeight: 400,
  textAlign: 'right',
};

const SECONDARY_BUTTON: React.CSSProperties = {
  padding: '0.7rem 1.3rem',
  background: 'transparent',
  border: '1px solid var(--color-border-strong)',
  fontSize: '0.68rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--color-ink)',
  fontWeight: 400,
  cursor: 'pointer',
  transition: 'border-color var(--dur-fast) var(--ease-out)',
};

export default function AdminReviewsPage() {
  const { loading: authLoading } = useRequireAuth('admin');
  const [artworks, setArtworks] = useState<ReviewArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtwork, setSelectedArtwork] = useState<ReviewArtwork | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [filter, setFilter] = useState<Filter>('pending_review');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    fetchArtworks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, authLoading]);

  async function fetchArtworks() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/artworks?status=${filter}`);
      const json = await res.json();
      if (!res.ok) {
        console.error('[AdminReviews] API error:', json.error);
        setArtworks([]);
        return;
      }
      setArtworks((json.data || []) as ReviewArtwork[]);
    } catch (err) {
      console.error('[AdminReviews] Fetch exception:', err);
      setArtworks([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(artworkId: string, action: 'approved' | 'rejected') {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/artworks/${artworkId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, review_notes: reviewNotes || null }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const message =
          json.error ||
          `Couldn't ${action === 'approved' ? 'approve' : 'reject'} this artwork (${res.status}). Please try again.`;
        console.error('[AdminReviews] Action error:', message);
        setActionError(message);
        setActionLoading(false);
        return;
      }
    } catch (err) {
      console.error('[AdminReviews] Action exception:', err);
      setActionError('Network error. Please check your connection and try again.');
      setActionLoading(false);
      return;
    }
    setSelectedArtwork(null);
    setReviewNotes('');
    setSelectedImage(0);
    setActionLoading(false);
    fetchArtworks();
  }

  async function handleFeatureToggle(artworkId: string, currentlyFeatured: boolean) {
    try {
      const res = await fetch(`/api/admin/artworks/${artworkId}/feature`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !currentlyFeatured }),
      });
      if (res.ok) {
        const updated = !currentlyFeatured;
        setArtworks((prev) =>
          prev.map((a) => (a.id === artworkId ? { ...a, is_featured: updated } : a))
        );
        if (selectedArtwork?.id === artworkId) {
          setSelectedArtwork((prev) => (prev ? { ...prev, is_featured: updated } : prev));
        }
      }
    } catch (err) {
      console.error('[AdminReviews] Feature toggle error:', err);
    }
  }

  function openReview(artwork: ReviewArtwork) {
    setSelectedArtwork(artwork);
    setReviewNotes(artwork.review_notes || '');
    setSelectedImage(0);
    setActionError(null);
  }

  const images = selectedArtwork ? ((selectedArtwork.images as string[]) || []) : [];
  const isFeatured = !!(selectedArtwork as Record<string, unknown> | null)?.is_featured;

  if (authLoading) {
    return <EditorialSpinner label="Reviews" headline="One moment\u2026" />;
  }

  return (
    <div
      className="px-6 sm:px-10"
      style={{
        maxWidth: '84rem',
        margin: '0 auto',
        paddingTop: 'clamp(3rem, 5vw, 4.5rem)',
        paddingBottom: 'clamp(5rem, 8vw, 7rem)',
      }}
    >
      {/* ── Heading ── */}
      <div style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
        <p style={KICKER}>— Reviews —</p>
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
          Read every work <em style={{ fontStyle: 'italic' }}>carefully.</em>
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
                setSelectedArtwork(null);
                setSelectedImage(0);
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

      {/* ── Two-column grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 'clamp(2rem, 4vw, 3.5rem)',
          alignItems: 'start',
        }}
      >
        {/* ── Queue list ── */}
        <div>
          {loading ? (
            <EditorialSpinner label="Reviews" headline="Loading the queue\u2026" />
          ) : artworks.length === 0 ? (
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
                {filter === 'pending_review'
                  ? 'No artworks pending review.'
                  : `No ${filter} artworks.`}
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
              {artworks.map((artwork) => {
                const active = selectedArtwork?.id === artwork.id;
                const artworkFeatured = !!(artwork as Record<string, unknown>).is_featured;
                const thumb = (artwork.images as string[])?.[0];
                return (
                  <li
                    key={artwork.id}
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <button
                      type="button"
                      onClick={() => openReview(artwork)}
                      style={{
                        width: '100%',
                        display: 'grid',
                        gridTemplateColumns: '4rem 1fr auto',
                        alignItems: 'center',
                        gap: '1.2rem',
                        padding: '1.2rem',
                        paddingLeft: active ? 'calc(1.2rem - 3px)' : '1.2rem',
                        background: active ? 'var(--color-cream)' : 'transparent',
                        border: 'none',
                        borderLeft: active
                          ? '3px solid var(--color-ink)'
                          : '3px solid transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition:
                          'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
                      }}
                    >
                      <div
                        style={{
                          width: '4rem',
                          height: '4rem',
                          background: 'var(--color-cream)',
                          border: '1px solid var(--color-border)',
                          overflow: 'hidden',
                          flexShrink: 0,
                          position: 'relative',
                        }}
                      >
                        {thumb && (
                          <Image
                            src={thumb}
                            alt={artwork.title}
                            fill
                            sizes="64px"
                            style={{ objectFit: 'cover' }}
                          />
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p
                          className="font-serif"
                          style={{
                            fontSize: '1rem',
                            color: 'var(--color-ink)',
                            margin: 0,
                            fontWeight: 400,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {artwork.title}
                        </p>
                        <p
                          style={{
                            marginTop: '0.3rem',
                            fontSize: '0.78rem',
                            color: 'var(--color-stone-dark)',
                            fontWeight: 300,
                          }}
                        >
                          {artwork.artist?.full_name}
                        </p>
                        <p
                          style={{
                            marginTop: '0.2rem',
                            fontSize: '0.72rem',
                            color: 'var(--color-stone)',
                            fontWeight: 300,
                            textTransform: 'capitalize',
                          }}
                        >
                          {artwork.category} · {artwork.medium}
                          {artworkFeatured && (
                            <>
                              {' · '}
                              <span
                                className="font-serif"
                                style={{
                                  fontStyle: 'italic',
                                  color: 'var(--color-terracotta)',
                                }}
                              >
                                featured
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p
                          className="font-serif"
                          style={{
                            fontSize: '0.95rem',
                            color: 'var(--color-ink)',
                            margin: 0,
                            fontWeight: 400,
                          }}
                        >
                          {formatPrice(artwork.price_aud)}
                        </p>
                        <p
                          className="font-serif"
                          style={{
                            marginTop: '0.3rem',
                            fontSize: '0.72rem',
                            color: 'var(--color-stone)',
                            fontStyle: 'italic',
                          }}
                        >
                          {new Date(artwork.created_at).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Detail panel ── */}
        <div style={{ position: 'sticky', top: '6rem' }}>
          {selectedArtwork ? (
            <div style={{ display: 'grid', gap: '1.8rem' }}>
              {/* Image */}
              <div>
                <div
                  style={{
                    position: 'relative',
                    background: 'var(--color-warm-white)',
                    border: '1px solid var(--color-border)',
                    aspectRatio: '4/3',
                    overflow: 'hidden',
                  }}
                >
                  {images[selectedImage] ? (
                    <Image
                      src={images[selectedImage]}
                      alt={selectedArtwork.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 40vw"
                      style={{ objectFit: 'contain' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-stone)',
                        fontStyle: 'italic',
                      }}
                      className="font-serif"
                    >
                      No image
                    </div>
                  )}
                </div>

                {images.length > 1 && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '0.8rem',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedImage((prev) =>
                            prev === 0 ? images.length - 1 : prev - 1
                          )
                        }
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          fontSize: '0.68rem',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: 'var(--color-ink)',
                          cursor: 'pointer',
                          fontWeight: 400,
                        }}
                      >
                        ← Previous
                      </button>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          color: 'var(--color-stone)',
                        }}
                      >
                        {selectedImage + 1} / {images.length}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedImage((prev) =>
                            prev === images.length - 1 ? 0 : prev + 1
                          )
                        }
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          fontSize: '0.68rem',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: 'var(--color-ink)',
                          cursor: 'pointer',
                          fontWeight: 400,
                        }}
                      >
                        Next →
                      </button>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginTop: '0.8rem',
                        overflowX: 'auto',
                      }}
                    >
                      {images.map((img, i) => {
                        const activeThumb = selectedImage === i;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedImage(i)}
                            style={{
                              position: 'relative',
                              flexShrink: 0,
                              width: '3.2rem',
                              height: '3.2rem',
                              padding: 0,
                              background: 'var(--color-cream)',
                              border: activeThumb
                                ? '1px solid var(--color-ink)'
                                : '1px solid var(--color-border)',
                              cursor: 'pointer',
                              overflow: 'hidden',
                              transition:
                                'border-color var(--dur-fast) var(--ease-out)',
                            }}
                          >
                            <Image
                              src={img}
                              alt=""
                              fill
                              sizes="52px"
                              style={{ objectFit: 'cover' }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Title / artist / price */}
              <div>
                <h2
                  className="font-serif"
                  style={{
                    fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)',
                    lineHeight: 1.15,
                    letterSpacing: '-0.01em',
                    color: 'var(--color-ink)',
                    fontWeight: 400,
                    margin: 0,
                  }}
                >
                  {selectedArtwork.title}
                </h2>
                <div
                  style={{
                    marginTop: '0.6rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.7rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <Link
                    href={`/artists/${selectedArtwork.artist_id}`}
                    className="editorial-link"
                    style={{ fontSize: '0.8rem' }}
                  >
                    by {selectedArtwork.artist?.full_name}
                  </Link>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-stone)',
                    }}
                  >
                    ·
                  </span>
                  <span
                    className="font-serif"
                    style={{
                      fontSize: '1rem',
                      color: 'var(--color-stone-dark)',
                      fontWeight: 400,
                    }}
                  >
                    {formatPrice(selectedArtwork.price_aud)}
                  </span>
                </div>

                {filter === 'approved' && (
                  <div style={{ marginTop: '1.2rem' }}>
                    <button
                      type="button"
                      onClick={() =>
                        handleFeatureToggle(selectedArtwork.id, isFeatured)
                      }
                      className={
                        isFeatured
                          ? 'artwork-primary-cta artwork-primary-cta--compact'
                          : undefined
                      }
                      style={
                        isFeatured
                          ? undefined
                          : {
                              ...SECONDARY_BUTTON,
                            }
                      }
                    >
                      {isFeatured ? 'Featured · Remove' : 'Add to featured'}
                    </button>
                  </div>
                )}
              </div>

              {/* Details grid */}
              <div
                style={{
                  borderTop: '1px solid var(--color-border)',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <DetailRow label="Category" value={selectedArtwork.category} capitalize />
                <DetailRow label="Medium" value={selectedArtwork.medium} />
                <DetailRow label="Style" value={selectedArtwork.style} />
                {selectedArtwork.width_cm && (
                  <DetailRow
                    label="Dimensions"
                    value={`${selectedArtwork.width_cm} × ${selectedArtwork.height_cm}${
                      selectedArtwork.depth_cm ? ` × ${selectedArtwork.depth_cm}` : ''
                    } cm`}
                  />
                )}
                <DetailRow
                  label="Framed"
                  value={selectedArtwork.is_framed ? 'Yes' : 'No'}
                  last
                />
              </div>

              {/* Description */}
              {selectedArtwork.description && (
                <div>
                  <p style={DETAIL_LABEL}>— Description —</p>
                  <p
                    style={{
                      marginTop: '0.8rem',
                      fontSize: '0.88rem',
                      lineHeight: 1.6,
                      color: 'var(--color-stone-dark)',
                      fontWeight: 300,
                      whiteSpace: 'pre-line',
                      maxHeight: '10rem',
                      overflowY: 'auto',
                    }}
                  >
                    {selectedArtwork.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {selectedArtwork.tags && (selectedArtwork.tags as string[]).length > 0 && (
                <div>
                  <p style={DETAIL_LABEL}>— Tags —</p>
                  <div
                    style={{
                      marginTop: '0.7rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.4rem',
                    }}
                  >
                    {(selectedArtwork.tags as string[]).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: '0.3rem 0.7rem',
                          border: '1px solid var(--color-border)',
                          fontSize: '0.72rem',
                          color: 'var(--color-stone-dark)',
                          fontWeight: 300,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Review notes */}
              <div>
                <label htmlFor="review-notes" className="commission-label">
                  Review notes
                  {filter === 'pending_review' && ' (visible to artist if rejected)'}
                </label>
                <textarea
                  id="review-notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  disabled={filter !== 'pending_review'}
                  className="commission-field"
                  placeholder={
                    filter === 'pending_review'
                      ? 'Add feedback for the artist…'
                      : 'Review notes…'
                  }
                />
              </div>

              {/* Action error */}
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

              {/* Actions */}
              {filter === 'pending_review' && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.8rem',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleAction(selectedArtwork.id, 'approved')}
                    disabled={actionLoading}
                    className="artwork-primary-cta artwork-primary-cta--compact"
                    style={{ width: '100%' }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(selectedArtwork.id, 'rejected')}
                    disabled={actionLoading}
                    style={{
                      width: '100%',
                      padding: '0.7rem 1.3rem',
                      background: 'transparent',
                      border: '1px solid var(--color-terracotta)',
                      fontSize: '0.68rem',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--color-terracotta)',
                      fontWeight: 400,
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      opacity: actionLoading ? 0.55 : 1,
                      transition: 'opacity var(--dur-fast) var(--ease-out)',
                    }}
                  >
                    Reject
                  </button>
                </div>
              )}

              {filter === 'rejected' && (
                <button
                  type="button"
                  onClick={() => handleAction(selectedArtwork.id, 'approved')}
                  disabled={actionLoading}
                  className="artwork-primary-cta artwork-primary-cta--compact"
                  style={{ width: '100%' }}
                >
                  Approve this artwork
                </button>
              )}

              {filter === 'approved' && (
                <Link
                  href={`/artwork/${selectedArtwork.id}`}
                  style={{
                    ...SECONDARY_BUTTON,
                    width: '100%',
                    display: 'inline-block',
                    textAlign: 'center',
                    textDecoration: 'none',
                  }}
                >
                  View live listing
                </Link>
              )}
            </div>
          ) : (
            <div
              style={{
                borderTop: '1px solid var(--color-border)',
                borderBottom: '1px solid var(--color-border)',
                padding: '5rem 0',
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
                Select an artwork to review.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  last,
  capitalize,
}: {
  label: string;
  value: string | null | undefined;
  last?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        alignItems: 'baseline',
        gap: '1rem',
        padding: '0.9rem 0',
        borderBottom: last ? 'none' : '1px solid var(--color-border)',
      }}
    >
      <span style={DETAIL_LABEL}>{label}</span>
      <span
        className="font-serif"
        style={{
          ...DETAIL_VALUE,
          textTransform: capitalize ? 'capitalize' : 'none',
        }}
      >
        {value || '—'}
      </span>
    </div>
  );
}
