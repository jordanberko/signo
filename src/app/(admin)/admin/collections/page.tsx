'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import EditorialSpinner from '@/components/ui/EditorialSpinner';

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

const KICKER: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
  fontWeight: 400,
  margin: 0,
};

const SECONDARY_BUTTON: React.CSSProperties = {
  padding: '0.65rem 1.2rem',
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

const INLINE_ACTION: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: 0,
  fontSize: '0.64rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--color-ink)',
  fontWeight: 400,
  cursor: 'pointer',
};

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
        setSearchQuery('');
        setSearchResults([]);
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
      const res = await fetch(
        `/api/artworks/browse?q=${encodeURIComponent(searchQuery)}&limit=10&status=approved`
      );
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
            artist_name:
              (a.profiles as Record<string, string> | null)?.full_name || 'Unknown',
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
        await openEdit(editingId);
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
      const res = await fetch(
        `/api/admin/collections/${editingId}/artworks?artworkId=${artworkId}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setCollectionArtworks((prev) =>
          prev.filter((ca) => ca.artwork_id !== artworkId)
        );
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

    [newArtworks[index], newArtworks[targetIndex]] = [
      newArtworks[targetIndex],
      newArtworks[index],
    ];
    setCollectionArtworks(newArtworks);

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
    return <EditorialSpinner label="Collections" headline="One moment\u2026" />;
  }

  const isEditing = creating || editingId !== null;

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
      <div
        style={{
          marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '2rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p style={KICKER}>— Collections —</p>
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
            Curate the <em style={{ fontStyle: 'italic' }}>rooms.</em>
          </h1>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="artwork-primary-cta artwork-primary-cta--compact"
        >
          Create collection
        </button>
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
        {/* ── Collection list ── */}
        <div>
          {loading ? (
            <EditorialSpinner
              label="Collections"
              headline="Fetching the rooms\u2026"
            />
          ) : collections.length === 0 ? (
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
                No collections yet. Create one to get started.
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
              {collections.map((c) => {
                const active = editingId === c.id;
                return (
                  <li
                    key={c.id}
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <button
                      type="button"
                      onClick={() => openEdit(c.id)}
                      style={{
                        width: '100%',
                        display: 'grid',
                        gridTemplateColumns: '3.5rem 1fr auto',
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
                          width: '3.5rem',
                          height: '3.5rem',
                          background: 'var(--color-cream)',
                          border: '1px solid var(--color-border)',
                          overflow: 'hidden',
                          position: 'relative',
                          flexShrink: 0,
                        }}
                      >
                        {c.cover_image_url && (
                          <Image
                            src={c.cover_image_url}
                            alt={c.title}
                            fill
                            sizes="56px"
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
                          {c.title}
                        </p>
                        <p
                          style={{
                            marginTop: '0.3rem',
                            fontSize: '0.76rem',
                            color: 'var(--color-stone-dark)',
                            fontWeight: 300,
                          }}
                        >
                          /{c.slug} · {c.artwork_count} work
                          {c.artwork_count === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p
                          className="font-serif"
                          style={{
                            fontStyle: 'italic',
                            fontSize: '0.78rem',
                            color: c.is_published
                              ? 'var(--color-success)'
                              : 'var(--color-stone)',
                            margin: 0,
                          }}
                        >
                          {c.is_published ? 'published' : 'draft'}
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
                          {new Date(c.created_at).toLocaleDateString('en-AU', {
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

        {/* ── Editor panel ── */}
        <div style={{ position: 'sticky', top: '6rem' }}>
          {isEditing ? (
            <div
              style={{
                borderTop: '1px solid var(--color-border-strong)',
                paddingTop: '2rem',
                display: 'grid',
                gap: '1.6rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                }}
              >
                <div>
                  <p style={KICKER}>
                    — {creating ? 'New collection' : 'Editing'} —
                  </p>
                  <h2
                    className="font-serif"
                    style={{
                      marginTop: '0.8rem',
                      fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)',
                      lineHeight: 1.15,
                      color: 'var(--color-ink)',
                      fontWeight: 400,
                      margin: 0,
                    }}
                  >
                    {creating ? (
                      <em style={{ fontStyle: 'italic' }}>A new room.</em>
                    ) : (
                      title || <em style={{ fontStyle: 'italic' }}>Untitled</em>
                    )}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    ...INLINE_ACTION,
                    color: 'var(--color-stone)',
                  }}
                  aria-label="Close editor"
                >
                  Close ×
                </button>
              </div>

              {saving && (
                <EditorialSpinner label="Collections" headline="Saving\u2026" />
              )}

              {/* Title */}
              <div>
                <label htmlFor="col-title" className="commission-label">
                  Title
                </label>
                <input
                  id="col-title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (creating) setSlug(generateSlug(e.target.value));
                  }}
                  className="commission-field"
                  placeholder="e.g. Summer landscapes"
                />
              </div>

              {/* Slug */}
              <div>
                <label htmlFor="col-slug" className="commission-label">
                  Slug
                </label>
                <input
                  id="col-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="commission-field"
                  placeholder="summer-landscapes"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="col-description" className="commission-label">
                  Description
                </label>
                <textarea
                  id="col-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="commission-field"
                  placeholder="Brief description of the collection…"
                />
              </div>

              {/* Curator note */}
              <div>
                <label htmlFor="col-curator" className="commission-label">
                  Curator note
                </label>
                <textarea
                  id="col-curator"
                  value={curatorNote}
                  onChange={(e) => setCuratorNote(e.target.value)}
                  rows={3}
                  className="commission-field"
                  placeholder="Why this collection was curated…"
                />
              </div>

              {/* Cover image */}
              <div>
                <label htmlFor="col-cover" className="commission-label">
                  Cover image URL
                </label>
                <input
                  id="col-cover"
                  type="text"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  className="commission-field"
                  placeholder="https://…"
                />
                {coverImageUrl && (
                  <div
                    style={{
                      marginTop: '0.8rem',
                      width: '8rem',
                      height: '8rem',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-cream)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverImageUrl}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Published status — paired hairline radios */}
              <div>
                <span className="commission-label">Status</span>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    marginTop: '0.6rem',
                    border: '1px solid var(--color-border-strong)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsPublished(false)}
                    style={{
                      padding: '0.8rem 1rem',
                      background: !isPublished
                        ? 'var(--color-ink)'
                        : 'transparent',
                      color: !isPublished
                        ? 'var(--color-warm-white)'
                        : 'var(--color-ink)',
                      border: 'none',
                      borderRight: '1px solid var(--color-border-strong)',
                      fontSize: '0.68rem',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      fontWeight: 400,
                      cursor: 'pointer',
                      transition: 'background var(--dur-fast) var(--ease-out)',
                    }}
                  >
                    Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublished(true)}
                    style={{
                      padding: '0.8rem 1rem',
                      background: isPublished
                        ? 'var(--color-ink)'
                        : 'transparent',
                      color: isPublished
                        ? 'var(--color-warm-white)'
                        : 'var(--color-ink)',
                      border: 'none',
                      fontSize: '0.68rem',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      fontWeight: 400,
                      cursor: 'pointer',
                      transition: 'background var(--dur-fast) var(--ease-out)',
                    }}
                  >
                    Published
                  </button>
                </div>
              </div>

              {/* Save / Delete actions */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: editingId ? '1fr auto' : '1fr',
                  gap: '0.8rem',
                }}
              >
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !title.trim()}
                  className="artwork-primary-cta artwork-primary-cta--compact"
                  style={{ width: '100%' }}
                >
                  {saving
                    ? 'Saving…'
                    : creating
                    ? 'Create collection'
                    : 'Save changes'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    style={{
                      ...SECONDARY_BUTTON,
                      borderColor: 'var(--color-terracotta)',
                      color: 'var(--color-terracotta)',
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Artworks in collection (editing only) */}
              {editingId && (
                <div
                  style={{
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: '1.8rem',
                    display: 'grid',
                    gap: '1.4rem',
                  }}
                >
                  <div>
                    <p style={KICKER}>— Artworks —</p>
                    <p
                      className="font-serif"
                      style={{
                        marginTop: '0.6rem',
                        fontSize: '1.1rem',
                        color: 'var(--color-ink)',
                        fontWeight: 400,
                        fontStyle: 'italic',
                      }}
                    >
                      {collectionArtworks.length === 0
                        ? 'Nothing added yet.'
                        : `${collectionArtworks.length} in order.`}
                    </p>
                  </div>

                  {collectionArtworks.length > 0 && (
                    <ul
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        borderTop: '1px solid var(--color-border)',
                        maxHeight: '20rem',
                        overflowY: 'auto',
                      }}
                    >
                      {collectionArtworks.map((ca, index) => (
                        <li
                          key={ca.id}
                          style={{
                            borderBottom: '1px solid var(--color-border)',
                            display: 'grid',
                            gridTemplateColumns: '2.5rem 1fr auto',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.9rem 0',
                          }}
                        >
                          <div
                            style={{
                              width: '2.5rem',
                              height: '2.5rem',
                              background: 'var(--color-cream)',
                              border: '1px solid var(--color-border)',
                              overflow: 'hidden',
                              position: 'relative',
                              flexShrink: 0,
                            }}
                          >
                            {ca.artwork?.images?.[0] && (
                              <Image
                                src={ca.artwork.images[0]}
                                alt={ca.artwork?.title || ''}
                                fill
                                sizes="40px"
                                style={{ objectFit: 'cover' }}
                              />
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p
                              className="font-serif"
                              style={{
                                fontSize: '0.9rem',
                                color: 'var(--color-ink)',
                                margin: 0,
                                fontWeight: 400,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {ca.artwork?.title || 'Unknown'}
                            </p>
                            <p
                              style={{
                                marginTop: '0.2rem',
                                fontSize: '0.72rem',
                                color: 'var(--color-stone-dark)',
                                fontWeight: 300,
                              }}
                            >
                              {ca.artwork?.profiles?.full_name || ''}
                            </p>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              gap: '0.9rem',
                              alignItems: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => moveArtwork(index, 'up')}
                              disabled={index === 0}
                              style={{
                                ...INLINE_ACTION,
                                opacity: index === 0 ? 0.3 : 1,
                                cursor: index === 0 ? 'not-allowed' : 'pointer',
                              }}
                            >
                              ↑ Up
                            </button>
                            <button
                              type="button"
                              onClick={() => moveArtwork(index, 'down')}
                              disabled={index === collectionArtworks.length - 1}
                              style={{
                                ...INLINE_ACTION,
                                opacity:
                                  index === collectionArtworks.length - 1
                                    ? 0.3
                                    : 1,
                                cursor:
                                  index === collectionArtworks.length - 1
                                    ? 'not-allowed'
                                    : 'pointer',
                              }}
                            >
                              ↓ Down
                            </button>
                            <button
                              type="button"
                              onClick={() => removeArtwork(ca.artwork_id)}
                              style={{
                                ...INLINE_ACTION,
                                color: 'var(--color-terracotta)',
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Search */}
                  <div>
                    <label htmlFor="col-search" className="commission-label">
                      Add artwork
                    </label>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: '0.6rem',
                      }}
                    >
                      <input
                        id="col-search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchArtworks()}
                        className="commission-field"
                        placeholder="Search artworks by title…"
                      />
                      <button
                        type="button"
                        onClick={searchArtworks}
                        disabled={searching || !searchQuery.trim()}
                        style={{
                          ...SECONDARY_BUTTON,
                          opacity: searching || !searchQuery.trim() ? 0.55 : 1,
                        }}
                      >
                        {searching ? 'Searching…' : 'Search'}
                      </button>
                    </div>
                  </div>

                  {searchResults.length > 0 && (
                    <ul
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        borderTop: '1px solid var(--color-border)',
                        maxHeight: '18rem',
                        overflowY: 'auto',
                      }}
                    >
                      {searchResults.map((r) => (
                        <li
                          key={r.id}
                          style={{
                            borderBottom: '1px solid var(--color-border)',
                            display: 'grid',
                            gridTemplateColumns: '2.5rem 1fr auto',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.9rem 0',
                          }}
                        >
                          <div
                            style={{
                              width: '2.5rem',
                              height: '2.5rem',
                              background: 'var(--color-cream)',
                              border: '1px solid var(--color-border)',
                              overflow: 'hidden',
                              position: 'relative',
                              flexShrink: 0,
                            }}
                          >
                            {r.images?.[0] && (
                              <Image
                                src={r.images[0]}
                                alt={r.title}
                                fill
                                sizes="40px"
                                style={{ objectFit: 'cover' }}
                              />
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p
                              className="font-serif"
                              style={{
                                fontSize: '0.9rem',
                                color: 'var(--color-ink)',
                                margin: 0,
                                fontWeight: 400,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.title}
                            </p>
                            <p
                              style={{
                                marginTop: '0.2rem',
                                fontSize: '0.72rem',
                                color: 'var(--color-stone-dark)',
                                fontWeight: 300,
                              }}
                            >
                              {r.artist_name}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addArtwork(r.id)}
                            style={SECONDARY_BUTTON}
                          >
                            Add
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
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
                Select a collection to edit, or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
