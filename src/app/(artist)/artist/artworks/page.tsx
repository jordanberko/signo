'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit, Pause, Play, Trash2 } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import type { Artwork, ArtworkStatus } from '@/types/database';

const STATUS_TABS = ['All', 'Draft', 'Pending Review', 'Approved', 'Sold', 'Paused'];

const statusMap: Record<string, ArtworkStatus | ''> = {
  'All': '',
  'Draft': 'draft',
  'Pending Review': 'pending_review',
  'Approved': 'approved',
  'Sold': 'sold',
  'Paused': 'paused',
};

export default function ArtistArtworksPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchArtworks();
  }, [user, activeTab]);

  async function fetchArtworks() {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from('artworks')
      .select('*')
      .eq('artist_id', user!.id)
      .order('created_at', { ascending: false });

    const status = statusMap[activeTab];
    if (status) {
      query = query.eq('status', status);
    }

    const { data } = await query;
    if (data) setArtworks(data as Artwork[]);
    setLoading(false);
  }

  async function togglePause(artwork: Artwork) {
    const supabase = createClient();
    const newStatus = artwork.status === 'paused' ? 'approved' : 'paused';
    await supabase.from('artworks').update({ status: newStatus }).eq('id', artwork.id);
    fetchArtworks();
  }

  async function deleteArtwork(id: string) {
    if (!confirm('Are you sure you want to delete this artwork?')) return;
    const supabase = createClient();
    await supabase.from('artworks').delete().eq('id', id);
    fetchArtworks();
  }

  const statusBadgeColor: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending_review: 'bg-amber-50 text-amber-700',
    approved: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-700',
    sold: 'bg-blue-50 text-blue-700',
    paused: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Artworks</h1>
          <p className="text-muted mt-1">Manage all your listings</p>
        </div>
        <Link
          href="/artist/artworks/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light transition-colors"
        >
          <Plus className="h-4 w-4" />
          Upload Artwork
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-primary text-white'
                : 'bg-muted-bg text-foreground hover:bg-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : artworks.length === 0 ? (
        <div className="text-center py-20 border border-border rounded-lg">
          <div className="w-16 h-16 bg-muted-bg rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="h-8 w-8 text-muted" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {activeTab === 'All' ? 'No artworks yet' : `No ${activeTab.toLowerCase()} artworks`}
          </h3>
          <p className="text-muted text-sm mb-6">Upload your first piece to start selling on Signo</p>
          <Link
            href="/artist/artworks/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-light transition-colors"
          >
            <Plus className="h-4 w-4" />
            Upload Artwork
          </Link>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-muted border-b border-border bg-muted-bg">
                <th className="p-4">Artwork</th>
                <th className="p-4">Price</th>
                <th className="p-4">Status</th>
                <th className="p-4">Category</th>
                <th className="p-4">Date</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {artworks.map((artwork) => (
                <tr key={artwork.id} className="border-b border-border last:border-0 hover:bg-muted-bg/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded bg-muted-bg flex-shrink-0 overflow-hidden">
                        {(artwork.images as string[])?.[0] && (
                          <img src={(artwork.images as string[])[0]} alt={artwork.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <span className="font-medium text-sm">{artwork.title}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm">{formatPrice(artwork.price_aud)}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded capitalize ${statusBadgeColor[artwork.status] || 'bg-muted-bg'}`}>
                      {artwork.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-sm capitalize">{artwork.category}</td>
                  <td className="p-4 text-sm text-muted">
                    {new Date(artwork.created_at).toLocaleDateString('en-AU')}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Link href={`/artist/artworks/${artwork.id}/edit`} className="p-1.5 hover:bg-muted-bg rounded transition" title="Edit">
                        <Edit className="h-4 w-4 text-muted" />
                      </Link>
                      {(artwork.status === 'approved' || artwork.status === 'paused') && (
                        <button onClick={() => togglePause(artwork)} className="p-1.5 hover:bg-muted-bg rounded transition" title={artwork.status === 'paused' ? 'Unpause' : 'Pause'}>
                          {artwork.status === 'paused' ? <Play className="h-4 w-4 text-success" /> : <Pause className="h-4 w-4 text-muted" />}
                        </button>
                      )}
                      <button onClick={() => deleteArtwork(artwork.id)} className="p-1.5 hover:bg-muted-bg rounded transition" title="Delete">
                        <Trash2 className="h-4 w-4 text-error" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
