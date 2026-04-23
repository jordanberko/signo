import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { appUrl } from '@/lib/urls';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = appUrl();
  const supabase = getServiceClient();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/browse`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/how-it-works`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/pricing`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/seller-guide`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/returns`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Fetch approved artworks (includes artist_id for deduplicating artist pages)
  const { data: artworks } = await supabase
    .from('artworks')
    .select('id, artist_id, updated_at')
    .eq('status', 'approved')
    .order('updated_at', { ascending: false });

  const artworkPages: MetadataRoute.Sitemap = (artworks || []).map((artwork) => ({
    url: `${baseUrl}/artwork/${artwork.id}`,
    lastModified: artwork.updated_at ? new Date(artwork.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Artist profile pages — only artists with at least one approved artwork
  const uniqueArtistIds = [...new Set((artworks || []).map((a) => a.artist_id))];

  const { data: artists } = uniqueArtistIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, updated_at')
        .in('id', uniqueArtistIds)
    : { data: [] };

  const artistPages: MetadataRoute.Sitemap = (artists || []).map((artist) => ({
    url: `${baseUrl}/artists/${artist.id}`,
    lastModified: artist.updated_at ? new Date(artist.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...artworkPages, ...artistPages];
}
