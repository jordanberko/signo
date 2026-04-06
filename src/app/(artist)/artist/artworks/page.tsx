'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Edit,
  Pause,
  Play,
  Trash2,
  CheckCircle,
  Send,
  MoreVertical,
  AlertCircle,
  ImageIcon,
  ArrowRight,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { getReadyClient } from '@/lib/supabase/client';
import type { Artwork, ArtworkStatus } from '@/types/database';
import { Suspense } from 'react';

// ── Status config ──

interface TabConfig {
  label: string;
  status: ArtworkStatus | '';
}

const TABS: TabConfig[] = [
  { label: 'All', status: '' },
  { label: 'Drafts', status: 'draft' },
  { label: 'Pending Review', status: 'pending_review' },
  { label: 'Approved', status: 'approved' },
  { label: 'Sold', status: 'sold' },
  { label: 'Paused', status: 'paused' },
  { label: 'Rejected', status: 'rejected' },
];

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft' },
  pending_review: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending Review' },
  approved: { bg: 'bg-green-50', text: 'text-green-700', label: 'Live' },
  sold: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Sold' },
  paused: { bg: 'border border-border bg-white', text: 'text-gray-500', label: 'Paused' },
  rejected: { bg: 'bg-red-50', text: 'text-red-600', label: 'Rejected' },
};

// ── Submitted banner ──

function SubmittedBanner() {
  const searchParams = useSearchParams();
  const submitted = searchParams.get('submitted');
  if (submitted !== 'true') return null;
  return (
    <div className="mb-6 p-4 bg-success/5 border border-success/20 text-success text-sm rounded-xl animate-fade-in flex items-start gap-3">
      <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">Your artwork has been submitted!</p>
        <p className="text-success/80 mt-0.5">
          We&apos;ll review it within 24–48 hours. You&apos;ll receive an email when it&apos;s approved.
        </p>
      </div>
    </div>
  );
}

// ── Delete confirmation modal ──

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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-scale-in">
        <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="h-5 w-5 text-error" />
        </div>
        <h3 className="font-editorial text-lg font-medium text-center">Delete artwork?</h3>
        <p className="text-sm text-muted text-center mt-2">
          &ldquo;{artworkTitle}&rdquo; will be permanently removed. This action cannot be undone.
        </p>
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 border border-border rounded-full text-sm font-medium hover:bg-muted-bg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-error text-white rounded-full text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Action menu per artwork ──

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
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-muted-bg rounded-lg transition-colors"
      >
        <MoreVertical className="h-4 w-4 text-muted" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white border border-border rounded-xl shadow-lg py-1 animate-scale-in origin-top-right">
            {/* Edit */}
            <Link
              href={
                artwork.status === 'rejected'
                  ? `/artist/artworks/${artwork.id}/edit`
                  : `/artist/artworks/${artwork.id}/edit`
              }
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted-bg transition-colors w-full"
              onClick={() => setOpen(false)}
            >
              <Edit className="h-4 w-4 text-muted" />
              {artwork.status === 'rejected' ? 'Edit & Resubmit' : 'Edit'}
            </Link>

            {/* Submit for review (drafts only) */}
            {artwork.status === 'draft' && (
              <button
                type="button"
                onClick={() => { onSubmitForReview(); setOpen(false); }}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted-bg transition-colors w-full text-left"
              >
                <Send className="h-4 w-4 text-accent-dark" />
                Submit for Review
              </button>
            )}

            {/* Pause / Resume */}
            {(artwork.status === 'approved' || artwork.status === 'paused') && (
              <button
                type="button"
                onClick={() => { onTogglePause(); setOpen(false); }}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted-bg transition-colors w-full text-left"
              >
                {artwork.status === 'paused' ? (
                  <>
                    <Play className="h-4 w-4 text-success" />
                    Resume Listing
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 text-muted" />
                    Pause Listing
                  </>
                )}
              </button>
            )}

            {/* Delete */}
            <div className="border-t border-border my-1" />
            <button
              type="button"
              onClick={() => { onDelete(); setOpen(false); }}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-error hover:bg-error/5 transition-colors w-full text-left"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main page ──

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
      // If auth is done loading and there's no user, stop the spinner
      if (!authLoading) setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = await getReadyClient();
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[Artworks] Fetch error:', error.message);
      }
      if (data) setAllArtworks(data as Artwork[]);
    } catch (err) {
      console.error('[Artworks] Fetch exception:', err);
    }
    setLoading(false);
  }, [user, authLoading]);

  useEffect(() => {
    fetchArtworks();
  }, [fetchArtworks]);

  // Count per status
  const counts: Record<string, number> = { '': allArtworks.length };
  for (const a of allArtworks) {
    counts[a.status] = (counts[a.status] || 0) + 1;
  }

  // Filter
  const activeStatus = TABS[activeTab].status;
  const filtered = activeStatus
    ? allArtworks.filter((a) => a.status === activeStatus)
    : allArtworks;

  // Actions — use API routes for server-side validation & image cleanup
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
      const newStatus: ArtworkStatus = artwork.status === 'paused' ? 'approved' : 'paused';
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
      const res = await fetch(`/api/artworks/${deleteTarget.id}`, { method: 'DELETE' });
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

  if (authLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div style={{ width: 32, height: 32, border: '3px solid #E5E2DB', borderTopColor: '#2C2C2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Suspense><SubmittedBanner /></Suspense>

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          artworkTitle={deleteTarget.title}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Error banner */}
      {actionError && (
        <div className="mb-4 p-3.5 bg-error/5 border border-error/20 rounded-xl flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2 text-sm text-error">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {actionError}
          </div>
          <button
            type="button"
            onClick={() => setActionError('')}
            className="text-error/60 hover:text-error transition-colors ml-3"
          >
            <span className="sr-only">Dismiss</span>
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-editorial text-2xl md:text-3xl font-medium">My Artworks</h1>
          <p className="text-sm text-muted mt-1">Manage all your listings</p>
        </div>
        <Link
          href="/artist/artworks/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-full hover:bg-accent transition-colors duration-300"
        >
          <Plus className="h-4 w-4" />
          Upload Artwork
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map((tab, i) => {
          const count = counts[tab.status] || 0;
          const isActive = activeTab === i;
          return (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-white'
                  : 'bg-muted-bg text-foreground hover:bg-border'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                    isActive ? 'bg-white/20 text-white' : 'bg-border text-muted'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
          <div className="w-16 h-16 bg-muted-bg rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="h-7 w-7 text-muted" />
          </div>
          <h3 className="font-editorial text-lg font-medium mb-2">
            {activeTab === 0 ? 'You haven\'t uploaded any artwork yet' : `No ${TABS[activeTab].label.toLowerCase()} artworks`}
          </h3>
          <p className="text-sm text-muted mb-6 max-w-sm mx-auto">
            {activeTab === 0
              ? 'Upload your first piece to start selling on Signo.'
              : 'Artworks with this status will appear here.'}
          </p>
          {activeTab === 0 && (
            <Link
              href="/artist/artworks/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-accent transition-colors duration-300"
            >
              Upload your first piece
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      ) : (
        /* Artwork grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((artwork) => {
            const badge = STATUS_BADGE[artwork.status] || STATUS_BADGE.draft;
            const primaryImage = (artwork.images as string[])?.[0];

            return (
              <div
                key={artwork.id}
                className="bg-white border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300 group"
              >
                {/* Image */}
                <Link href={`/artist/artworks/${artwork.id}/edit`} className="block">
                  <div className="relative aspect-[4/3] bg-muted-bg overflow-hidden">
                    {primaryImage ? (
                      <Image
                        src={primaryImage}
                        alt={artwork.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon className="h-10 w-10 text-border" />
                      </div>
                    )}
                    {/* Status badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                </Link>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm truncate">{artwork.title}</h3>
                      <p className="text-lg font-bold mt-0.5">{formatPrice(artwork.price_aud)}</p>
                    </div>
                    <ArtworkActions
                      artwork={artwork}
                      onSubmitForReview={() => submitForReview(artwork.id)}
                      onTogglePause={() => togglePause(artwork)}
                      onDelete={() => setDeleteTarget(artwork)}
                    />
                  </div>

                  <p className="text-xs text-muted mt-2">
                    {new Date(artwork.created_at).toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>

                  {/* Rejection reason */}
                  {artwork.status === 'rejected' && artwork.review_notes && (
                    <div className="mt-3 p-3 bg-error/5 border border-error/15 rounded-xl flex gap-2.5">
                      <AlertCircle className="h-4 w-4 text-error flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-error">Rejection reason</p>
                        <p className="text-xs text-error/80 mt-0.5 leading-relaxed">{artwork.review_notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
