'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import type { Artwork, ArtworkStatus } from '@/types/database';

// ── Types ──

interface TabConfig {
  label: string;
  status: ArtworkStatus | '';
}

const TABS: TabConfig[] = [
  { label: 'All', status: '' },
  { label: 'Drafts', status: 'draft' },
  { label: 'In review', status: 'pending_review' },
  { label: 'Live', status: 'approved' },
  { label: 'Sold', status: 'sold' },
  { label: 'Paused', status: 'paused' },
  { label: 'Rejected', status: 'rejected' },
];

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'In review',
  approved: 'Live',
  sold: 'Sold',
  paused: 'Paused',
  rejected: 'Rejected',
};

const KICKER: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
};

// ── Spinner ──

function EditorialSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-warm-white)',
      }}
    >
      <p
        className="font-serif"
        style={{ fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--color-stone)' }}
      >
        {label}
      </p>
    </div>
  );
}

// ── Submitted banner ──

function SubmittedBanner() {
  const searchParams = useSearchParams();
  const submitted = searchParams.get('submitted');
  if (submitted !== 'true') return null;
  return (
    <div
      style={{
        marginBottom: '2rem',
        padding: '1.4rem 1.6rem',
        background: 'var(--color-cream)',
        borderTop: '1px solid var(--color-border-strong)',
        borderBottom: '1px solid var(--color-border-strong)',
      }}
    >
      <p style={{ ...KICKER, marginBottom: '0.6rem' }}>— Submitted —</p>
      <p
        className="font-serif"
        style={{
          fontSize: '1.05rem',
          fontStyle: 'italic',
          color: 'var(--color-ink)',
          lineHeight: 1.4,
        }}
      >
        Your work is with the editors.
      </p>
      <p
        style={{
          marginTop: '0.4rem',
          fontSize: '0.88rem',
          fontWeight: 300,
          color: 'var(--color-stone-dark)',
          lineHeight: 1.6,
        }}
      >
        We review submissions within 24–48 hours. You&apos;ll get an email
        when it&apos;s approved.
      </p>
    </div>
  );
}

// ── Delete confirmation ──

function DeleteModal({
  artworkTitle,
  onConfirm,
  onCancel,
}: {
  artworkTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        onClick={onCancel}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(20, 18, 14, 0.55)',
        }}
      />
      <div
        style={{
          position: 'relative',
          background: 'var(--color-warm-white)',
          maxWidth: '32rem',
          width: '100%',
          padding: 'clamp(2rem, 4vw, 2.8rem)',
          borderTop: '1px solid var(--color-terracotta, #c45d3e)',
          borderBottom: '1px solid var(--color-terracotta, #c45d3e)',
        }}
      >
        <p
          style={{
            ...KICKER,
            color: 'var(--color-terracotta, #c45d3e)',
            marginBottom: '0.9rem',
          }}
        >
          — Remove this work —
        </p>
        <h3
          className="font-serif"
          style={{
            fontSize: 'clamp(1.3rem, 2.4vw, 1.7rem)',
            lineHeight: 1.25,
            color: 'var(--color-ink)',
            fontWeight: 400,
            marginBottom: '1rem',
          }}
        >
          Remove <em style={{ fontStyle: 'italic' }}>{artworkTitle}</em>?
        </h3>
        <p
          style={{
            fontSize: '0.92rem',
            fontWeight: 300,
            color: 'var(--color-stone-dark)',
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}
        >
          This removes the listing and its images permanently. There is no
          undo.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.6rem' }}>
          <button
            type="button"
            onClick={onConfirm}
            className="font-serif"
            style={{
              background: 'var(--color-terracotta, #c45d3e)',
              color: 'var(--color-warm-white)',
              border: 'none',
              padding: '0.9rem 1.6rem',
              fontSize: '0.88rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Remove permanently
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="font-serif"
            style={{
              background: 'none',
              border: 'none',
              fontStyle: 'italic',
              fontSize: '0.95rem',
              color: 'var(--color-stone)',
              cursor: 'pointer',
            }}
          >
            Keep it
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Row actions menu ──

function ArtworkActions({
  artwork,
  onSubmitForReview,
  onTogglePause,
  onDelete,
}: {
  artwork: Artwork;
  onSubmitForReview: () => void;
  onTogglePause: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="font-serif"
        style={{
          background: 'none',
          border: 'none',
          fontStyle: 'italic',
          fontSize: '0.82rem',
          color: 'var(--color-stone)',
          cursor: 'pointer',
          padding: '0.3rem 0',
          borderBottom: '1px solid var(--color-border-strong)',
          letterSpacing: '0.04em',
        }}
      >
        Actions ▾
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
            onClick={() => setOpen(false)}
          />
          <ul
            style={{
              position: 'absolute',
              right: 0,
              marginTop: '0.6rem',
              minWidth: '14rem',
              background: 'var(--color-warm-white)',
              border: '1px solid var(--color-border-strong)',
              zIndex: 20,
              listStyle: 'none',
              padding: 0,
              margin: 0,
            }}
          >
            <li>
              <Link
                href={`/artist/artworks/${artwork.id}/edit`}
                onClick={() => setOpen(false)}
                className="font-serif"
                style={{
                  display: 'block',
                  padding: '0.85rem 1.1rem',
                  fontSize: '0.92rem',
                  color: 'var(--color-ink)',
                  textDecoration: 'none',
                }}
              >
                {artwork.status === 'rejected' ? 'Edit & resubmit' : 'Edit'}
              </Link>
            </li>
            {artwork.status === 'draft' && (
              <li style={{ borderTop: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => {
                    onSubmitForReview();
                    setOpen(false);
                  }}
                  className="font-serif"
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.85rem 1.1rem',
                    fontSize: '0.92rem',
                    color: 'var(--color-ink)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Submit for review
                </button>
              </li>
            )}
            {(artwork.status === 'approved' || artwork.status === 'paused') && (
              <li style={{ borderTop: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => {
                    onTogglePause();
                    setOpen(false);
                  }}
                  className="font-serif"
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.85rem 1.1rem',
                    fontSize: '0.92rem',
                    color: 'var(--color-ink)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {artwork.status === 'paused'
                    ? 'Resume listing'
                    : 'Pause listing'}
                </button>
              </li>
            )}
            <li style={{ borderTop: '1px solid var(--color-border)' }}>
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  setOpen(false);
                }}
                className="font-serif"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.85rem 1.1rem',
                  fontSize: '0.92rem',
                  fontStyle: 'italic',
                  color: 'var(--color-terracotta, #c45d3e)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Remove permanently
              </button>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}

// ── Page ──

export default function ArtistArtworksPage() {
  const { loading: authLoading } = useRequireAuth('artist');
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [allArtworks, setAllArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Artwork | null>(null);
  const [actionError, setActionError] = useState('');

  const fetchArtworks = useCallback(async () => {
    if (!user) {
      if (!authLoading) setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('/api/artworks/mine', {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('[Artworks] API error:', body.error || res.status);
      } else {
        const { artworks } = await res.json();
        if (artworks) setAllArtworks(artworks as Artwork[]);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        console.error('[Artworks] Fetch timed out');
      } else {
        console.error('[Artworks] Fetch exception:', err);
      }
    }
    setLoading(false);
  }, [user, authLoading]);

  useEffect(() => {
    if (authLoading) return;
    fetchArtworks();
  }, [authLoading, fetchArtworks]);

  const counts: Record<string, number> = { '': allArtworks.length };
  for (const a of allArtworks) {
    counts[a.status] = (counts[a.status] || 0) + 1;
  }

  const activeStatus = TABS[activeTab].status;
  const filtered = activeStatus
    ? allArtworks.filter((a) => a.status === activeStatus)
    : allArtworks;

  async function submitForReview(id: string) {
    setActionError('');
    try {
      const res = await fetch(`/api/artworks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending_review' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to submit for review');
      }
      fetchArtworks();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  async function togglePause(artwork: Artwork) {
    setActionError('');
    try {
      const newStatus: ArtworkStatus =
        artwork.status === 'paused' ? 'approved' : 'paused';
      const res = await fetch(`/api/artworks/${artwork.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to update status');
      }
      fetchArtworks();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setActionError('');
    try {
      const res = await fetch(`/api/artworks/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete artwork');
      }
      setDeleteTarget(null);
      fetchArtworks();
    } catch (err) {
      setDeleteTarget(null);
      setActionError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (authLoading) return <EditorialSpinner />;

  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      {deleteTarget && (
        <DeleteModal
          artworkTitle={deleteTarget.title}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
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
        <Suspense>
          <SubmittedBanner />
        </Suspense>

        {/* Error banner */}
        {actionError && (
          <div
            style={{
              marginBottom: '2rem',
              padding: '1.2rem 0',
              borderTop: '1px solid var(--color-terracotta, #c45d3e)',
              borderBottom: '1px solid var(--color-terracotta, #c45d3e)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <p
              className="font-serif"
              style={{
                fontSize: '0.92rem',
                fontStyle: 'italic',
                color: 'var(--color-terracotta, #c45d3e)',
              }}
            >
              — {actionError}
            </p>
            <button
              type="button"
              onClick={() => setActionError('')}
              className="font-serif"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.82rem',
                fontStyle: 'italic',
                color: 'var(--color-stone)',
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Header */}
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
              The Studio · Listings
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
              Your <em style={{ fontStyle: 'italic' }}>catalogue.</em>
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
              Every work you&apos;ve brought to Signo — draft, in review,
              live, or retired.
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

        {/* Tabs — typographic */}
        <nav
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.6rem 2.2rem',
            marginBottom: '2rem',
            paddingBottom: '1.2rem',
            borderBottom: '1px solid var(--color-border-strong)',
          }}
        >
          {TABS.map((tab, i) => {
            const count = counts[tab.status] || 0;
            const isActive = activeTab === i;
            return (
              <button
                key={tab.label}
                onClick={() => setActiveTab(i)}
                className="font-serif"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.95rem',
                  fontStyle: isActive ? 'italic' : 'normal',
                  color: isActive
                    ? 'var(--color-ink)'
                    : 'var(--color-stone)',
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: '0.5rem',
                  position: 'relative',
                }}
              >
                {isActive && (
                  <span
                    aria-hidden
                    style={{
                      display: 'inline-block',
                      width: 16,
                      height: 1,
                      background: 'var(--color-ink)',
                      marginRight: 4,
                      verticalAlign: 'middle',
                    }}
                  />
                )}
                {tab.label}
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontStyle: 'italic',
                    color: 'var(--color-stone)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Content */}
        {loading ? (
          <p
            className="font-serif"
            style={{
              fontStyle: 'italic',
              fontSize: '0.95rem',
              color: 'var(--color-stone)',
              padding: '3rem 0',
            }}
          >
            Gathering your catalogue…
          </p>
        ) : filtered.length === 0 ? (
          <div
            style={{
              paddingTop: '2rem',
              borderTop: '1px solid var(--color-border)',
              maxWidth: '46ch',
            }}
          >
            <p
              className="font-serif"
              style={{
                fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)',
                lineHeight: 1.2,
                color: 'var(--color-ink)',
                fontStyle: 'italic',
                fontWeight: 400,
                marginTop: '1.4rem',
              }}
            >
              {activeTab === 0
                ? 'The catalogue is empty.'
                : `Nothing ${TABS[activeTab].label.toLowerCase()}.`}
            </p>
            <p
              style={{
                marginTop: '1rem',
                fontSize: '0.9rem',
                color: 'var(--color-stone-dark)',
                fontWeight: 300,
                lineHeight: 1.6,
              }}
            >
              {activeTab === 0
                ? 'Upload your first piece and the rest of the studio will follow.'
                : 'Works with this status will appear here once you have some.'}
            </p>
            {activeTab === 0 && (
              <Link
                href="/artist/artworks/new"
                className="editorial-link"
                style={{ marginTop: '1.6rem', display: 'inline-block' }}
              >
                Upload your first piece
              </Link>
            )}
          </div>
        ) : (
          <ul
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              columnGap: '1.8rem',
              rowGap: '3.2rem',
              borderTop: '1px solid var(--color-border-strong)',
              paddingTop: '2.4rem',
            }}
          >
            {filtered.map((artwork) => {
              const primaryImage = (artwork.images as string[])?.[0];
              const statusLabel =
                STATUS_LABEL[artwork.status] || artwork.status;

              return (
                <li key={artwork.id} style={{ position: 'relative' }}>
                  <Link
                    href={`/artist/artworks/${artwork.id}/edit`}
                    style={{
                      display: 'block',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div
                      className="aspect-[4/5]"
                      style={{
                        position: 'relative',
                        background: 'var(--color-cream)',
                        overflow: 'hidden',
                      }}
                    >
                      {primaryImage ? (
                        <Image
                          src={primaryImage}
                          alt={artwork.title}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <p
                          className="font-serif"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontStyle: 'italic',
                            fontSize: '0.85rem',
                            color: 'var(--color-stone)',
                          }}
                        >
                          No image yet
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: '0.9rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: '0.8rem',
                      }}
                    >
                      <p style={{ ...KICKER, fontSize: '0.6rem' }}>
                        {statusLabel}
                      </p>
                      <p
                        className="font-serif"
                        style={{
                          fontSize: '0.78rem',
                          fontStyle: 'italic',
                          color: 'var(--color-stone)',
                        }}
                      >
                        {new Date(artwork.created_at).toLocaleDateString(
                          'en-AU',
                          { day: 'numeric', month: 'short', year: 'numeric' }
                        )}
                      </p>
                    </div>

                    <h3
                      className="font-serif"
                      style={{
                        marginTop: '0.5rem',
                        fontSize: '1.1rem',
                        fontWeight: 400,
                        color: 'var(--color-ink)',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {artwork.title}
                    </h3>
                    <p
                      className="font-serif"
                      style={{
                        marginTop: '0.3rem',
                        fontSize: '0.95rem',
                        color: 'var(--color-stone-dark)',
                      }}
                    >
                      {formatPrice(artwork.price_aud)}
                    </p>
                  </Link>

                  <div style={{ marginTop: '0.8rem' }}>
                    <ArtworkActions
                      artwork={artwork}
                      onSubmitForReview={() => submitForReview(artwork.id)}
                      onTogglePause={() => togglePause(artwork)}
                      onDelete={() => setDeleteTarget(artwork)}
                    />
                  </div>

                  {artwork.status === 'rejected' && artwork.review_notes && (
                    <div
                      style={{
                        marginTop: '0.9rem',
                        padding: '0.9rem 0',
                        borderTop: '1px solid var(--color-terracotta, #c45d3e)',
                        borderBottom: '1px solid var(--color-terracotta, #c45d3e)',
                      }}
                    >
                      <p
                        style={{
                          ...KICKER,
                          color: 'var(--color-terracotta, #c45d3e)',
                          marginBottom: '0.4rem',
                        }}
                      >
                        — Editor&apos;s note —
                      </p>
                      <p
                        className="font-serif"
                        style={{
                          fontSize: '0.85rem',
                          fontStyle: 'italic',
                          color: 'var(--color-ink)',
                          lineHeight: 1.5,
                        }}
                      >
                        {artwork.review_notes}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
