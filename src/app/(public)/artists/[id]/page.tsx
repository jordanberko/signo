import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import ArtistProfileClient from './ArtistProfileClient';

// ── Metadata ──

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const [artistResult, artworkCountResult] = await Promise.all([
    supabase.from('profiles').select('full_name, bio, avatar_url').eq('id', id).single(),
    supabase.from('artworks').select('*', { count: 'exact', head: true }).eq('artist_id', id).eq('status', 'approved'),
  ]);

  const artist = artistResult.data;
  if (!artist) {
    return { title: 'Artist Not Found' };
  }

  const name = artist.full_name ?? 'Artist';
  const count = artworkCountResult.count || 0;
  const bioSnippet = artist.bio ? artist.bio.slice(0, 150) : '';
  const description = bioSnippet
    ? `${bioSnippet}${bioSnippet.length >= 150 ? '...' : ''}${count > 0 ? ` Browse ${count} original artwork${count === 1 ? '' : 's'}.` : ''}`
    : `Discover artwork by ${name} on Signo — Australia\u2019s curated art marketplace.${count > 0 ? ` ${count} artwork${count === 1 ? '' : 's'} available.` : ''}`;

  const title = `${name} \u2014 Artist on Signo`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://signoart.com.au';
  const url = `${appUrl}/artists/${id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'profile',
      ...(artist.avatar_url ? { images: [{ url: artist.avatar_url, alt: name }] } : {}),
    },
    twitter: {
      card: artist.avatar_url ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(artist.avatar_url ? { images: [artist.avatar_url] } : {}),
    },
  };
}

// ── Server Component ──

export default async function ArtistProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch artist
  const { data: artist } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!artist || artist.role !== 'artist') notFound();

  // Fetch approved artworks
  const { data: artworks } = await supabase
    .from('artworks')
    .select('*')
    .eq('artist_id', id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  // Fetch reviews for this artist
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, profiles!reviews_buyer_id_fkey(full_name, avatar_url)')
    .eq('artist_id', id)
    .order('created_at', { ascending: false });

  // Count sold artworks
  const { count: salesCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('artist_id', id)
    .in('status', ['completed', 'delivered', 'shipped', 'paid']);

  // Average rating
  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  // Follower count (server-side for initial render)
  const { count: followerCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('followed_id', id);

  // Fetch featured artworks if the artist has any selected
  let featuredArtworks: typeof artworks = [];
  const featuredIds = (artist.featured_artworks as string[]) || [];
  if (featuredIds.length > 0) {
    const { data: featuredData } = await supabase
      .from('artworks')
      .select('*')
      .in('id', featuredIds)
      .eq('status', 'approved');

    // Maintain the order from the featured_artworks array
    if (featuredData && featuredData.length > 0) {
      const artworkMap = new Map(featuredData.map((a) => [a.id, a]));
      featuredArtworks = featuredIds
        .map((fid) => artworkMap.get(fid))
        .filter(Boolean) as typeof artworks;
    }
  }

  // Fetch studio posts for "In The Studio" section
  const { data: studioPosts } = await supabase
    .from('studio_posts')
    .select('*')
    .eq('artist_id', id)
    .order('created_at', { ascending: false })
    .limit(12);

  // Fire-and-forget profile view tracking
  supabase
    .from('profile_views')
    .insert({ profile_id: id })
    .then(() => {});

  return (
    <ArtistProfileClient
      artist={artist}
      artworks={(artworks ?? []) as typeof artworks & { images: string[] }[]}
      reviews={reviews ?? []}
      salesCount={salesCount ?? 0}
      avgRating={avgRating}
      initialFollowerCount={followerCount ?? 0}
      featuredArtworks={(featuredArtworks ?? []) as typeof artworks & { images: string[] }[]}
      studioPosts={studioPosts ?? []}
    />
  );
}
