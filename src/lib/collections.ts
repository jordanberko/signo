import { createClient as createAnonClient } from '@supabase/supabase-js';

/**
 * Server-side collection fetchers for the public /collections pages and
 * the sitemap.
 *
 * These run during server render with a cookie-less anon client so the
 * collection index and each collection page can ship their content in the
 * initial HTML (and be ISR-cached). The previous implementation was a
 * client component that fetched via `useEffect` — meaning crawlers, link
 * previews, and the initial paint all saw an empty "Loading…" shell with
 * no title, description, structured data, or artwork links. That is the
 * single worst thing you can do to a page you want indexed.
 *
 * RLS ("Anyone can view published collections") already restricts the anon
 * client to `is_published = true` rows, but we filter explicitly too so the
 * intent is readable at the call site.
 */

function anonClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export interface CollectionCard {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  artwork_count: number;
}

export interface CollectionArtwork {
  id: string;
  title: string;
  artist_id: string;
  price_aud: number;
  images: string[];
  medium: string | null;
  category: 'original' | 'print' | 'digital' | null;
  width_cm: number | null;
  height_cm: number | null;
  artist: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface CollectionDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  curator_note: string | null;
  updated_at: string | null;
  artworks: CollectionArtwork[];
}

/**
 * All published collections with a computed artwork count, newest first.
 * Mirrors GET /api/collections (minArtworks = 0).
 */
export async function getPublishedCollections(): Promise<CollectionCard[]> {
  try {
    const supabase = anonClient();
    const { data, error } = await supabase
      .from('collections')
      .select('id, title, slug, description, cover_image_url, collection_artworks(id)')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[collections] getPublishedCollections:', error.message);
      return [];
    }

    return (data || []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      title: c.title as string,
      slug: c.slug as string,
      description: (c.description as string) ?? null,
      cover_image_url: (c.cover_image_url as string) ?? null,
      artwork_count: Array.isArray(c.collection_artworks)
        ? (c.collection_artworks as unknown[]).length
        : 0,
    }));
  } catch (err) {
    console.error('[collections] getPublishedCollections exception:', err);
    return [];
  }
}

/**
 * A single published collection with its artworks (ordered by position),
 * each carrying its artist. Mirrors GET /api/collections/[slug].
 * Returns null when the slug is missing or the collection is unpublished —
 * the caller should `notFound()` so crawlers get a 404, not a soft 200.
 */
export async function getCollectionBySlug(
  slug: string,
): Promise<CollectionDetail | null> {
  try {
    const supabase = anonClient();

    const { data: collection, error } = await supabase
      .from('collections')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error || !collection) return null;
    const c = collection as Record<string, unknown>;

    const { data: collectionArtworks } = await supabase
      .from('collection_artworks')
      .select('*, artworks(*, profiles!artworks_artist_id_fkey(id, full_name, avatar_url))')
      .eq('collection_id', c.id as string)
      .order('position', { ascending: true });

    const artworks: CollectionArtwork[] = (collectionArtworks || [])
      .map((ca: Record<string, unknown>) => {
        const a = ca.artworks as Record<string, unknown> | null;
        if (!a) return null;
        const profile = a.profiles as Record<string, unknown> | null;
        return {
          id: a.id as string,
          title: a.title as string,
          artist_id: a.artist_id as string,
          price_aud: a.price_aud as number,
          images: (a.images as string[]) || [],
          medium: (a.medium as string) ?? null,
          category: (a.category as CollectionArtwork['category']) ?? null,
          width_cm: (a.width_cm as number) ?? null,
          height_cm: (a.height_cm as number) ?? null,
          artist: profile
            ? {
                id: profile.id as string,
                full_name: (profile.full_name as string) ?? null,
                avatar_url: (profile.avatar_url as string) ?? null,
              }
            : null,
        } as CollectionArtwork;
      })
      .filter(Boolean) as CollectionArtwork[];

    return {
      id: c.id as string,
      title: c.title as string,
      slug: c.slug as string,
      description: (c.description as string) ?? null,
      cover_image_url: (c.cover_image_url as string) ?? null,
      curator_note: (c.curator_note as string) ?? null,
      updated_at: (c.updated_at as string) ?? null,
      artworks,
    };
  } catch (err) {
    console.error('[collections] getCollectionBySlug exception:', err);
    return null;
  }
}

/**
 * Slugs + last-modified for every published collection. Used by the sitemap
 * so each /collections/[slug] page is discoverable and dated.
 */
export async function getPublishedCollectionSlugs(): Promise<
  { slug: string; updated_at: string | null }[]
> {
  try {
    const supabase = anonClient();
    const { data, error } = await supabase
      .from('collections')
      .select('slug, updated_at')
      .eq('is_published', true);

    if (error) {
      console.error('[collections] getPublishedCollectionSlugs:', error.message);
      return [];
    }

    return (data || []).map((c: Record<string, unknown>) => ({
      slug: c.slug as string,
      updated_at: (c.updated_at as string) ?? null,
    }));
  } catch (err) {
    console.error('[collections] getPublishedCollectionSlugs exception:', err);
    return [];
  }
}
