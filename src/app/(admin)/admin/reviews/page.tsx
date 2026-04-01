'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, X, Eye, ChevronLeft, ChevronRight, Clock, MessageSquare } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Artwork, User } from '@/types/database';

type ReviewArtwork = Artwork & { artist: User };

export default function AdminReviewsPage() {
  const [artworks, setArtworks] = useState<ReviewArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtwork, setSelectedArtwork] = useState<ReviewArtwork | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [filter, setFilter] = useState<'pending_review' | 'approved' | 'rejected'>('pending_review');

  useEffect(() => {
    fetchArtworks();
  }, [filter]);

  async function fetchArtworks() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('artworks')
      .select('*, profiles!artworks_artist_id_fkey(*)')
      .eq('status', filter)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[AdminReviews] Query error:', error.message, error.details);
    }

    console.log(`[AdminReviews] Fetched ${data?.length ?? 0} artworks with status "${filter}"`);

    if (data) {
      setArtworks(data.map((a: Record<string, unknown>) => ({
        ...a,
        artist: a.profiles,
      })) as unknown as ReviewArtwork[]);
    }
    setLoading(false);
  }

  async function handleAction(artworkId: string, action: 'approved' | 'rejected') {
    setActionLoading(true);
    const supabase = createClient();

    await supabase
      .from('artworks')
      .update({
        status: action,
        review_notes: reviewNotes || null,
      })
      .eq('id', artworkId);

    setSelectedArtwork(null);
    setReviewNotes('');
    setSelectedImage(0);
    setActionLoading(false);
    fetchArtworks();
  }

  function openReview(artwork: ReviewArtwork) {
    setSelectedArtwork(artwork);
    setReviewNotes(artwork.review_notes || '');
    setSelectedImage(0);
  }

  const images = selectedArtwork ? (selectedArtwork.images as string[]) || [] : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Artwork Reviews</h1>
        <p className="text-muted mt-1">Review and approve artwork submissions</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { value: 'pending_review', label: 'Pending', icon: Clock },
          { value: 'approved', label: 'Approved', icon: Check },
          { value: 'rejected', label: 'Rejected', icon: X },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setFilter(tab.value as typeof filter); setSelectedArtwork(null); }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === tab.value
                ? 'bg-primary text-white'
                : 'bg-muted-bg text-foreground hover:bg-gray-200'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Artwork List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : artworks.length === 0 ? (
            <div className="text-center py-16 border border-border rounded-lg">
              <p className="text-muted">
                {filter === 'pending_review' ? 'No artworks pending review.' : `No ${filter} artworks.`}
              </p>
            </div>
          ) : (
            artworks.map((artwork) => (
              <button
                key={artwork.id}
                onClick={() => openReview(artwork)}
                className={`w-full flex items-center gap-4 p-4 border rounded-lg text-left transition-colors ${
                  selectedArtwork?.id === artwork.id
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-gray-300'
                }`}
              >
                <div className="w-16 h-16 rounded-lg bg-muted-bg flex-shrink-0 overflow-hidden">
                  {(artwork.images as string[])?.[0] && (
                    <img src={(artwork.images as string[])[0]} alt={artwork.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{artwork.title}</p>
                  <p className="text-xs text-muted">{artwork.artist?.full_name}</p>
                  <p className="text-xs text-muted capitalize">{artwork.category} · {artwork.medium}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-sm">{formatPrice(artwork.price_aud)}</p>
                  <p className="text-xs text-muted">
                    {new Date(artwork.created_at).toLocaleDateString('en-AU')}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Review Panel */}
        {selectedArtwork ? (
          <div className="border border-border rounded-lg p-6 space-y-6 sticky top-24">
            {/* Images */}
            <div className="space-y-3">
              <div className="relative aspect-[4/3] bg-muted-bg rounded-lg overflow-hidden">
                {images[selectedImage] ? (
                  <img src={images[selectedImage]} alt={selectedArtwork.title} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted">No image</div>
                )}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 rounded-full hover:bg-white"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 rounded-full hover:bg-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`flex-shrink-0 w-14 h-14 rounded overflow-hidden border-2 ${
                        selectedImage === i ? 'border-accent' : 'border-transparent'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div>
              <h2 className="text-xl font-bold">{selectedArtwork.title}</h2>
              <Link href={`/artists/${selectedArtwork.artist_id}`} className="text-sm text-accent-dark hover:underline">
                by {selectedArtwork.artist?.full_name}
              </Link>
              <p className="text-lg font-semibold mt-2">{formatPrice(selectedArtwork.price_aud)}</p>
            </div>

            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted">Category</span>
              <span className="capitalize">{selectedArtwork.category}</span>
              <span className="text-muted">Medium</span>
              <span>{selectedArtwork.medium}</span>
              <span className="text-muted">Style</span>
              <span>{selectedArtwork.style}</span>
              {selectedArtwork.width_cm && (
                <>
                  <span className="text-muted">Dimensions</span>
                  <span>{selectedArtwork.width_cm} x {selectedArtwork.height_cm}{selectedArtwork.depth_cm ? ` x ${selectedArtwork.depth_cm}` : ''} cm</span>
                </>
              )}
              <span className="text-muted">Framed</span>
              <span>{selectedArtwork.is_framed ? 'Yes' : 'No'}</span>
            </div>

            {selectedArtwork.description && (
              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted leading-relaxed whitespace-pre-line max-h-32 overflow-y-auto">
                  {selectedArtwork.description}
                </p>
              </div>
            )}

            {selectedArtwork.tags && (selectedArtwork.tags as string[]).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(selectedArtwork.tags as string[]).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-muted-bg text-xs rounded">{tag}</span>
                ))}
              </div>
            )}

            {/* Review Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">
                <MessageSquare className="h-4 w-4 inline mr-1" />
                Review Notes {filter === 'pending_review' && '(visible to artist if rejected)'}
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                placeholder={filter === 'pending_review' ? 'Add feedback for the artist...' : 'Review notes...'}
                disabled={filter !== 'pending_review'}
              />
            </div>

            {/* Actions */}
            {filter === 'pending_review' && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleAction(selectedArtwork.id, 'approved')}
                  disabled={actionLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-success text-white font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Approve
                </button>
                <button
                  onClick={() => handleAction(selectedArtwork.id, 'rejected')}
                  disabled={actionLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-error text-white font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Reject
                </button>
              </div>
            )}

            {filter === 'rejected' && (
              <button
                onClick={() => handleAction(selectedArtwork.id, 'approved')}
                disabled={actionLoading}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-success text-white font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Approve This Artwork
              </button>
            )}

            {/* View Live */}
            {filter === 'approved' && (
              <Link
                href={`/artwork/${selectedArtwork.id}`}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted-bg transition-colors"
              >
                <Eye className="h-4 w-4" />
                View Live Listing
              </Link>
            )}
          </div>
        ) : (
          <div className="border border-border rounded-lg p-10 text-center flex items-center justify-center min-h-[400px]">
            <div>
              <Eye className="h-10 w-10 text-muted mx-auto mb-3" />
              <p className="text-muted">Select an artwork to review</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
