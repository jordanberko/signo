'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Plus, Trash2, ChevronUp, ChevronDown, Search, X } from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';

interface CollectionItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  curator_note: string | null;
  is_published: boolean;
  artwork_count: number;
  created_at: string;
}

interface CollectionArtworkItem {
  id: string;
  artwork_id: string;
  position: number;
  artwork: {
    id: string;
    title: string;
    images: string[];
    price_aud: number;
    profiles: { id: string; full_name: string | null } | null;
  } | null;
}

interface SearchResult {
  id: string;
  title: string;
  images: string[];
  artist_name: string;
}

export default function AdminCollectionsPage() {
  const { loading: authLoading } = useRequireAuth('admin');
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [curatorNote, setCuratorNote] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [collectionArtworks, setCollectionArtworks] = useState<CollectionArtworkItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Artwork search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/collections');
      const json = await res.json();
      if (res.ok) {
        setCollections(json.data || []);
      }
    } catch (err) {
      console.error('[AdminCollections] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    fetchCollections();
  }, [authLoading, fetchCollections]);

  function resetForm() {
    setTitle('');
    setSlug('');
    setDescription('');
    setCuratorNote('');
    setCoverImageUrl('');
    setIsPublished(false);
    setCollectionArtworks([]);
    setEditingId(null);
    setCreating(false);
    setSearchQuery('');
    setSearchResults([]);
  }

  function generateSlug(t: string) {
    return t
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async function openEdit(id: string) {
    try {
      const res = await fetch(`/api/admin/collections/${id}`);
      const json = await res.json();
      if (res.ok && json.data) {
        const c = json.data;
        setEditingId(c.id);
        setCreating(false);
        setTitle(c.title);
        setSlug(c.slug);
        setDescription(c.description || '');
        setCuratorNote(c.curator_note || '');
        setCoverImageUrl(c.cover_image_url || '');
        setIsPublished(c.is_published);
        setCollectionArtworks(c.artworks || []);
      }
    } catch (err) {
      console.error('[AdminCollections] Fetch detail error:', err);
    }
  }

  function startCreate() {
    resetForm();
    setCreating(true);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const finalSlug = slug || generateSlug(title);

      if (creating) {
        // Create collection
        const res = await fetch('/api/admin/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            slug: finalSlug,
            description: description || null,
            curator_note: curatorNote || null,
            cover_image_url: coverImageUrl || null,
            is_published: isPublished,
          }),
        });
        const json = await res.json();
        if (res.ok && json.data) {
          setEditingId(json.data.id);
          setCreating(false);
          await fetchCollections();
        }
      } else if (editingId) {
        // Update collection
        await fetch(`/api/admin/collections/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            slug: finalSlug,
            description: description || null,
            curator_note: curatorNote || null,
            cover_image_url: coverImageUrl || null,
            is_published: isPublished,
          }),
        });
        await fetchCollections();
      }
    } catch (err) {
      console.error('[AdminCollections] Save error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingId || !confirm('Delete this collection? This cannot be undone.')) return;
    try {
      await fetch(`/api/admin/collections/${editingId}`, { method: 'DELETE' });
      resetForm();
      await fetchCollections();
    } catch (err) {
      console.error('[AdminCollections] Delete error:', err);
    }
  }

  async function searchArtworks() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/artworks/browse?q=${encodeURIComponent(searchQuery)}&limit=10&status=approved`);
      const json = await res.json();
      if (res.ok) {
        const rows = (json.data || []) as Array<Record<string, unknown>>;
        const existingIds = new Set(collectionArtworks.map((ca) => ca.artwork_id));
        const results: SearchResult[] = rows
          .filter((a) => !existingIds.has(a.id as string))
          .map((a) => ({
            id: a.id as string,
            title: a.title as string,
            images: (a.images as string[]) || [],
            artist_name: (a.profiles as Record<string, string> | null)?.full_name || 'Unknown',
          }));
        setSearchResults(results);
      }
    } catch (err) {
      console.error('[AdminCollections] Search error:', err);
    } finally {
      setSearching(false);
    }
  }

  async function addArtwork(artworkId: string) {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/admin/collections/${editingId}/artworks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId }),
      });
      if (res.ok) {
        // Refresh collection detail
        await openEdit(editingId);
        // Remove from search results
        setSearchResults((prev) => prev.filter((r) => r.id !== artworkId));
        await fetchCollections();
      }
    } catch (err) {
      console.error('[AdminCollections] Add artwork error:', err);
    }
  }

  async function removeArtwork(artworkId: string) {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/admin/collections/${editingId}/artworks?artworkId=${artworkId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCollectionArtworks((prev) => prev.filter((ca) => ca.artwork_id !== artworkId));
        await fetchCollections();
      }
    } catch (err) {
      console.error('[AdminCollections] Remove artwork error:', err);
    }
  }

  async function moveArtwork(index: number, direction: 'up' | 'down') {
    if (!editingId) return;
    const newArtworks = [...collectionArtworks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newArtworks.length) return;

    [newArtworks[index], newArtworks[targetIndex]] = [newArtworks[targetIndex], newArtworks[index]];
    setCollectionArtworks(newArtworks);

    // Save new order
    const artworkIds = newArtworks.map((ca) => ca.artwork_id);
    try {
      await fetch(`/api/admin/collections/${editingId}/artworks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkIds }),
      });
    } catch (err) {
      console.error('[AdminCollections] Reorder error:', err);
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isEditing = creating || editingId !== null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Collections</h1>
          <p className="text-muted mt-1">Manage curated artwork collections</p>
        </div>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent-dark transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Collection
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collection List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-16 border border-border rounded-lg">
              <p className="text-muted">No collections yet. Create one to get started.</p>
            </div>
          ) : (
            collections.map((c) => (
              <button
                key={c.id}
                onClick={() => openEdit(c.id)}
                className={`w-full flex items-center gap-4 p-4 border rounded-lg text-left transition-colors ${
                  editingId === c.id
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-gray-300'
                }`}
              >
                <div className="w-12 h-12 rounded bg-muted-bg flex-shrink-0 overflow-hidden relative">
                  {c.cover_image_url && (
                    <Image src={c.cover_image_url} alt={c.title} fill className="object-cover" sizes="48px" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.title}</p>
                  <p className="text-xs text-muted">/{c.slug}</p>
                </div>
                <div className="text-right flex-shrink-0 flex items-center gap-3">
                  <span className="text-xs text-muted">{c.artwork_count} artworks</span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      c.is_published ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    title={c.is_published ? 'Published' : 'Draft'}
                  />
                  <span className="text-xs text-muted">
                    {new Date(c.created_at).toLocaleDateString('en-AU')}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Edit/Create Panel */}
        {isEditing ? (
          <div className="border border-border rounded-lg p-6 space-y-5 sticky top-24">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {creating ? 'New Collection' : 'Edit Collection'}
              </h2>
              <button onClick={resetForm} className="text-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (creating) setSlug(generateSlug(e.target.value));
                }}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="e.g. Summer Landscapes"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium mb-1">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="summer-landscapes"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                placeholder="Brief description of the collection..."
              />
            </div>

            {/* Curator Note */}
            <div>
              <label className="block text-sm font-medium mb-1">Curator Note</label>
              <textarea
                value={curatorNote}
                onChange={(e) => setCuratorNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                placeholder="Why this collection was curated..."
              />
            </div>

            {/* Cover Image URL */}
            <div>
              <label className="block text-sm font-medium mb-1">Cover Image URL</label>
              <input
                type="text"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="https://..."
              />
            </div>

            {/* Published Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPublished(!isPublished)}
                className={`relative w-10 h-6 rounded-full transition-colors ${
                  isPublished ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isPublished ? 'translate-x-4' : ''
                  }`}
                />
              </button>
              <span className="text-sm font-medium">
                {isPublished ? 'Published' : 'Draft'}
              </span>
            </div>

            {/* Save / Delete buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="flex-1 py-2.5 bg-accent text-white font-medium rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : creating ? 'Create' : 'Save Changes'}
              </button>
              {editingId && (
                <button
                  onClick={handleDelete}
                  className="py-2.5 px-4 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Add Artworks Section — only when editing (not creating) */}
            {editingId && (
              <div className="border-t border-border pt-5 space-y-4">
                <h3 className="text-sm font-bold">Artworks in Collection</h3>

                {/* Current artworks */}
                {collectionArtworks.length === 0 ? (
                  <p className="text-xs text-muted">No artworks added yet.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {collectionArtworks.map((ca, index) => (
                      <div
                        key={ca.id}
                        className="flex items-center gap-3 p-2 border border-border rounded-lg"
                      >
                        <div className="w-10 h-10 rounded bg-muted-bg flex-shrink-0 overflow-hidden relative">
                          {ca.artwork?.images?.[0] && (
                            <Image
                              src={ca.artwork.images[0]}
                              alt={ca.artwork?.title || ''}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {ca.artwork?.title || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted">
                            {(ca.artwork as Record<string, unknown>)?.profiles
                              ? ((ca.artwork as Record<string, unknown>).profiles as Record<string, string>)?.full_name
                              : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => moveArtwork(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-muted hover:text-foreground disabled:opacity-30"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => moveArtwork(index, 'down')}
                            disabled={index === collectionArtworks.length - 1}
                            className="p-1 text-muted hover:text-foreground disabled:opacity-30"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => removeArtwork(ca.artwork_id)}
                            className="p-1 text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search artworks to add */}
                <div>
                  <label className="block text-xs font-medium mb-1">Add Artwork</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchArtworks()}
                        className="w-full pl-8 pr-3 py-2 border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="Search artworks by title..."
                      />
                    </div>
                    <button
                      onClick={searchArtworks}
                      disabled={searching}
                      className="px-3 py-2 bg-muted-bg text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      {searching ? '...' : 'Search'}
                    </button>
                  </div>
                </div>

                {/* Search results */}
                {searchResults.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => addArtwork(r.id)}
                        className="w-full flex items-center gap-3 p-2 border border-border rounded-lg text-left hover:bg-accent/5 transition-colors"
                      >
                        <div className="w-8 h-8 rounded bg-muted-bg flex-shrink-0 overflow-hidden relative">
                          {r.images?.[0] && (
                            <Image src={r.images[0]} alt={r.title} fill className="object-cover" sizes="32px" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{r.title}</p>
                          <p className="text-xs text-muted">{r.artist_name}</p>
                        </div>
                        <Plus className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="border border-border rounded-lg p-10 text-center flex items-center justify-center min-h-[400px]">
            <div>
              <p className="text-muted">Select a collection to edit, or create a new one.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
