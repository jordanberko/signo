'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Star, ShoppingBag, Calendar } from 'lucide-react';
import ArtworkCard from '@/components/ui/ArtworkCard';
import { createClient } from '@/lib/supabase/client';
import type { User, Artwork } from '@/types/database';

export default function ArtistProfilePage() {
  const { id } = useParams() as { id: string };
  const [activeTab, setActiveTab] = useState<'artworks' | 'reviews'>('artworks');
  const [artist, setArtist] = useState<User | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      // Fetch artist profile
      const { data: artistData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (artistData) setArtist(artistData as User);

      // Fetch their artworks
      const { data: artworksData } = await supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (artworksData) setArtworks(artworksData as Artwork[]);

      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Artist Not Found</h1>
        <Link href="/browse" className="text-accent font-medium hover:underline">Browse artwork</Link>
      </div>
    );
  }

  const memberSince = new Date(artist.created_at).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Artist Header */}
      <div className="flex flex-col md:flex-row gap-6 items-start mb-10">
        <div className="w-24 h-24 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
          {artist.avatar_url && (
            <img src={artist.avatar_url} alt={artist.full_name ?? ''} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex-1 space-y-3">
          <h1 className="text-3xl font-bold">{artist.full_name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
            {artist.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {artist.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" /> Member since {memberSince}
            </span>
          </div>
          {artist.bio && (
            <p className="text-sm text-muted leading-relaxed whitespace-pre-line max-w-2xl">
              {artist.bio}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <button className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light transition-colors">
              Follow
            </button>
            <button className="px-5 py-2 border border-border text-sm font-medium rounded-lg hover:bg-muted-bg transition-colors">
              Message
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-8">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('artworks')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'artworks'
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            Artworks ({artworks.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'reviews'
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            Reviews
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'artworks' ? (
        artworks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted">This artist hasn&apos;t listed any artwork yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {artworks.map((artwork) => (
              <ArtworkCard
                key={artwork.id}
                id={artwork.id}
                title={artwork.title}
                artistName={artist.full_name ?? 'Unknown'}
                artistId={artist.id}
                price={artwork.price_aud}
                imageUrl={(artwork.images as string[])?.[0] || ''}
                medium={artwork.medium ?? ''}
                category={artwork.category as 'original' | 'print' | 'digital'}
              />
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-16">
          <p className="text-muted">No reviews yet.</p>
        </div>
      )}
    </div>
  );
}
