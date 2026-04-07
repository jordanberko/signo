import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ArtworkDetailClient from './ArtworkDetailClient';
import type { ArtworkDetail, RelatedArtwork } from './ArtworkDetailClient';

type Props = {
  params: Promise<{ id: string }>;
};

// ── Shared data fetcher ──

async function getArtwork(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('artworks')
    .select(
      '*, profiles!artworks_artist_id_fkey(id, full_name, avatar_url, bio, location)'
    )
    .eq('id', id)
    .eq('status', 'approved')
    .single();

  if (error || !data) return null;
  return data;
}

// ── SEO Metadata ──

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getArtwork(id);

  if (!data) {
    return { title: 'Artwork Not Found — Signo' };
  }

  const artistName =
    (data.profiles as Record<string, string>)?.full_name || 'Unknown Artist';
  const title = `${data.title} by ${artistName} — Signo`;
  const description =
    data.description?.slice(0, 160) ||
    `${data.title} — ${data.category} artwork by ${artistName}. Available on Signo.`;
  const ogImage = (data.images as string[])?.[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

// ── Page Component ──

export default async function ArtworkDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getArtwork(id);

  if (!data) {
    notFound();
  }

  const supabase = await createClient();
  const profile = data.profiles as Record<string, string | null>;

  // Build the artwork detail object
  const artwork: ArtworkDetail = {
    id: data.id,
    title: data.title,
    description: data.description,
    category: data.category as ArtworkDetail['category'],
    medium: data.medium,
    style: data.style,
    width_cm: data.width_cm,
    height_cm: data.height_cm,
    depth_cm: data.depth_cm,
    price_aud: data.price_aud,
    is_framed: data.is_framed,
    images: (data.images as string[]) || [],
    tags: (data.tags as string[]) || [],
    shipping_weight_kg: data.shipping_weight_kg,
    artist: {
      id: profile?.id || '',
      full_name: profile?.full_name || null,
      avatar_url: profile?.avatar_url || null,
      bio: profile?.bio || null,
      location: profile?.location || null,
    },
  };

  // Count artist's approved artworks
  const { count: artistArtworkCount } = await supabase
    .from('artworks')
    .select('*', { count: 'exact', head: true })
    .eq('artist_id', data.artist_id)
    .eq('status', 'approved');

  // Fetch related artworks: same artist first, then same style/medium
  const { data: artistWorks } = await supabase
    .from('artworks')
    .select(
      'id, title, price_aud, images, medium, category, artist_id, profiles!artworks_artist_id_fkey(full_name)'
    )
    .eq('artist_id', data.artist_id)
    .eq('status', 'approved')
    .neq('id', id)
    .order('created_at', { ascending: false })
    .limit(4);

  let related: RelatedArtwork[] = (artistWorks || []).map(
    (a: Record<string, unknown>) => ({
      id: a.id as string,
      title: a.title as string,
      price_aud: a.price_aud as number,
      images: (a.images as string[]) || [],
      medium: a.medium as string | null,
      category: a.category as RelatedArtwork['category'],
      artist_id: a.artist_id as string,
      artistName:
        (a.profiles as Record<string, string>)?.full_name || 'Unknown Artist',
    })
  );

  // If artist has fewer than 4 other works, pad with similar style/medium
  if (related.length < 4 && (data.style || data.medium)) {
    const existingIds = [id, ...related.map((r) => r.id)];

    let similarQuery = supabase
      .from('artworks')
      .select(
        'id, title, price_aud, images, medium, category, artist_id, profiles!artworks_artist_id_fkey(full_name)'
      )
      .eq('status', 'approved')
      .not('id', 'in', `(${existingIds.join(',')})`)
      .order('created_at', { ascending: false })
      .limit(4 - related.length);

    if (data.style) {
      similarQuery = similarQuery.eq('style', data.style);
    } else if (data.medium) {
      similarQuery = similarQuery.eq('medium', data.medium);
    }

    const { data: similar } = await similarQuery;

    if (similar) {
      const extraRelated: RelatedArtwork[] = similar.map(
        (a: Record<string, unknown>) => ({
          id: a.id as string,
          title: a.title as string,
          price_aud: a.price_aud as number,
          images: (a.images as string[]) || [],
          medium: a.medium as string | null,
          category: a.category as RelatedArtwork['category'],
          artist_id: a.artist_id as string,
          artistName:
            (a.profiles as Record<string, string>)?.full_name ||
            'Unknown Artist',
        })
      );
      related = [...related, ...extraRelated];
    }
  }

  // Fetch "You may also like" — random artworks of same category/style
  const existingIds = [id, ...related.map((r) => r.id)];
  let suggested: RelatedArtwork[] = [];

  // Try same category or style first
  const { data: suggestedData } = await supabase
    .from('artworks')
    .select(
      'id, title, price_aud, images, medium, category, artist_id, profiles!artworks_artist_id_fkey(full_name)'
    )
    .eq('status', 'approved')
    .not('id', 'in', `(${existingIds.join(',')})`)
    .or(
      [
        data.category ? `category.eq.${data.category}` : null,
        data.style ? `style.eq.${data.style}` : null,
      ]
        .filter(Boolean)
        .join(',') || 'id.neq.impossible'
    )
    .limit(8);

  if (suggestedData && suggestedData.length > 0) {
    // Shuffle and take 4
    const shuffled = suggestedData.sort(() => Math.random() - 0.5).slice(0, 4);
    suggested = shuffled.map((a: Record<string, unknown>) => ({
      id: a.id as string,
      title: a.title as string,
      price_aud: a.price_aud as number,
      images: (a.images as string[]) || [],
      medium: a.medium as string | null,
      category: a.category as RelatedArtwork['category'],
      artist_id: a.artist_id as string,
      artistName:
        (a.profiles as Record<string, string>)?.full_name || 'Unknown Artist',
    }));
  }

  // If not enough, fill with random approved artworks
  if (suggested.length < 4) {
    const usedIds = [...existingIds, ...suggested.map((s) => s.id)];
    const { data: randomData } = await supabase
      .from('artworks')
      .select(
        'id, title, price_aud, images, medium, category, artist_id, profiles!artworks_artist_id_fkey(full_name)'
      )
      .eq('status', 'approved')
      .not('id', 'in', `(${usedIds.join(',')})`)
      .limit(4 - suggested.length);

    if (randomData) {
      const extra = randomData.map((a: Record<string, unknown>) => ({
        id: a.id as string,
        title: a.title as string,
        price_aud: a.price_aud as number,
        images: (a.images as string[]) || [],
        medium: a.medium as string | null,
        category: a.category as RelatedArtwork['category'],
        artist_id: a.artist_id as string,
        artistName:
          (a.profiles as Record<string, string>)?.full_name || 'Unknown Artist',
      }));
      suggested = [...suggested, ...extra];
    }
  }

  return (
    <ArtworkDetailClient
      artwork={artwork}
      relatedArtworks={related}
      suggestedArtworks={suggested}
      artistArtworkCount={artistArtworkCount || 0}
    />
  );
}
