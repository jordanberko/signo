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
    return { title: 'Artwork Not Found' };
  }

  const artistName =
    (data.profiles as Record<string, string>)?.full_name || 'Unknown Artist';
  const title = `${data.title} by ${artistName}`;
  const ogTitle = `${data.title} by ${artistName}`;

  // Build a rich description: medium, dimensions, price, then description text
  const parts: string[] = [];
  if (data.medium) parts.push(`${data.medium} artwork`);
  if (data.width_cm && data.height_cm) parts.push(`${Math.round(data.width_cm)}\u00d7${Math.round(data.height_cm)}cm`);
  if (data.price_aud) parts.push(`$${Number(data.price_aud).toFixed(0)} AUD`);
  const prefix = parts.length > 0 ? parts.join(', ') + '. ' : '';
  const descBody = data.description?.slice(0, 120) || `Available on Signo.`;
  const description = `${prefix}${descBody}`.slice(0, 200);

  const ogImage = (data.images as string[])?.[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://signoart.com.au';
  const url = `${appUrl}/artwork/${id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description,
      url,
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 1200, alt: data.title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
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
    availability: (data.availability as ArtworkDetail['availability']) || 'available',
    available_from: data.available_from || null,
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

  // Fetch the artist's artworks for the detail page's artist-works strip.
  // Bounded at 24 to prevent unbounded page weight for prolific artists;
  // the detail view only renders a short list (not a full portfolio).
  const { data: allArtistWorksRaw } = await supabase
    .from('artworks')
    .select('id, title, images')
    .eq('artist_id', data.artist_id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(24);

  const artistArtworks = (allArtistWorksRaw || []).map(
    (a: Record<string, unknown>) => ({
      id: a.id as string,
      title: a.title as string,
      images: (a.images as string[]) || [],
    })
  );

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

  // JSON-LD structured data for artwork (VisualArtwork schema)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://signoart.com.au';
  const jsonLdRaw = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: artwork.title,
    description: data.description || `${artwork.title} by ${artwork.artist.full_name}`,
    image: artwork.images[0] || undefined,
    url: `${appUrl}/artwork/${id}`,
    artist: {
      '@type': 'Person',
      name: artwork.artist.full_name || 'Artist',
    },
    artMedium: artwork.medium || undefined,
    width: artwork.width_cm
      ? { '@type': 'Distance', name: `${artwork.width_cm} cm` }
      : undefined,
    height: artwork.height_cm
      ? { '@type': 'Distance', name: `${artwork.height_cm} cm` }
      : undefined,
    offers: {
      '@type': 'Offer',
      price: artwork.price_aud,
      priceCurrency: 'AUD',
      availability: data.status === 'approved'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
      url: `${appUrl}/artwork/${id}`,
    },
  };
  // Strip undefined values for clean JSON-LD output
  const jsonLd = JSON.parse(JSON.stringify(jsonLdRaw));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArtworkDetailClient
        artwork={artwork}
        relatedArtworks={related}
        suggestedArtworks={suggested}
        artistArtworkCount={artistArtworkCount || 0}
        artistArtworks={artistArtworks}
      />
    </>
  );
}
