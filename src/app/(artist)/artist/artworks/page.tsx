'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Pause, Trash2, Eye } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

type ArtworkListItem = {
  id: string;
  title: string;
  price: number;
  status: string;
  category: string;
  views: number;
  created: string;
};

const PLACEHOLDER_ARTWORKS: ArtworkListItem[] = [];

const STATUS_TABS = ['All', 'Draft', 'Pending Review', 'Approved', 'Sold', 'Paused'];

export default function ArtistArtworksPage() {
  const [activeTab, setActiveTab] = useState('All');
  const artworks = PLACEHOLDER_ARTWORKS;

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

      {/* Artworks List */}
      {artworks.length === 0 ? (
        <div className="text-center py-20 border border-border rounded-lg">
          <div className="w-16 h-16 bg-muted-bg rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="h-8 w-8 text-muted" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No artworks yet</h3>
          <p className="text-muted text-sm mb-6">Upload your first piece to start selling on Signo</p>
          <Link
            href="/artist/artworks/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-light transition-colors"
          >
            <Plus className="h-4 w-4" />
            Upload Your First Artwork
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
                <th className="p-4">Views</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {artworks.map((artwork) => (
                <tr key={artwork.id} className="border-b border-border last:border-0 hover:bg-muted-bg/50">
                  <td className="p-4 font-medium text-sm">{artwork.title}</td>
                  <td className="p-4 text-sm">{formatPrice(artwork.price)}</td>
                  <td className="p-4">
                    <span className="text-xs px-2 py-1 bg-muted-bg rounded capitalize">{artwork.status}</span>
                  </td>
                  <td className="p-4 text-sm capitalize">{artwork.category}</td>
                  <td className="p-4 text-sm text-muted">{artwork.views}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Link href={`/artist/artworks/${artwork.id}/edit`} className="p-1.5 hover:bg-muted-bg rounded transition">
                        <Edit className="h-4 w-4 text-muted" />
                      </Link>
                      <button className="p-1.5 hover:bg-muted-bg rounded transition">
                        <Pause className="h-4 w-4 text-muted" />
                      </button>
                      <button className="p-1.5 hover:bg-muted-bg rounded transition">
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
