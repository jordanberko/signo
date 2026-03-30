'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, Share2, MessageCircle, ShieldCheck, Truck, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Artwork, User } from '@/types/database';

export default function ArtworkDetailPage() {
  const { id } = useParams() as { id: string };
  const [selectedImage, setSelectedImage] = useState(0);
  const [artwork, setArtwork] = useState<(Artwork & { artist: User }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArtwork() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('artworks')
        .select('*, profiles!artworks_artist_id_fkey(*)')
        .eq('id', id)
        .single();

      if (!error && data) {
        setArtwork({
          ...data,
          artist: data.profiles,
        } as unknown as Artwork & { artist: User });
      }
      setLoading(false);
    }
    fetchArtwork();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Artwork Not Found</h1>
        <p className="text-muted mb-4">This artwork may have been removed or doesn&apos;t exist.</p>
        <Link href="/browse" className="text-accent font-medium hover:underline">Browse all artwork</Link>
      </div>
    );
  }

  const images = (artwork.images as string[]) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted">
        <Link href="/browse" className="hover:text-accent">Browse</Link>
        <span className="mx-2">/</span>
        <span className="capitalize">{artwork.category}s</span>
        <span className="mx-2">/</span>
        <span className="text-foreground">{artwork.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-[4/3] bg-muted-bg rounded-lg overflow-hidden">
            {images[selectedImage] ? (
              <img
                src={images[selectedImage]}
                alt={artwork.title}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted">
                No image available
              </div>
            )}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                    selectedImage === index ? 'border-accent' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img src={img} alt={`${artwork.title} ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <span className="inline-block px-2 py-1 bg-muted-bg text-xs font-medium rounded mb-2 capitalize">
              {artwork.category}
            </span>
            <h1 className="text-3xl font-bold">{artwork.title}</h1>
            <p className="text-2xl font-bold text-accent mt-2">{formatPrice(artwork.price_aud)}</p>
          </div>

          {/* Artist Info */}
          {artwork.artist && (
            <Link
              href={`/artists/${artwork.artist.id}`}
              className="flex items-center gap-4 p-4 bg-muted-bg rounded-lg hover:bg-gray-200 transition"
            >
              <div className="w-12 h-12 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                {artwork.artist.avatar_url && (
                  <img src={artwork.artist.avatar_url} alt={artwork.artist.full_name ?? ''} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{artwork.artist.full_name}</p>
                {artwork.artist.location && <p className="text-sm text-muted">{artwork.artist.location}</p>}
              </div>
            </Link>
          )}

          {/* Buy Actions */}
          <div className="space-y-3">
            <button className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-light transition-colors text-lg">
              Buy Now
            </button>
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 border border-border rounded-lg flex items-center justify-center gap-2 hover:bg-muted-bg transition text-sm font-medium">
                <Heart className="h-4 w-4" /> Save
              </button>
              <button className="flex-1 py-2.5 border border-border rounded-lg flex items-center justify-center gap-2 hover:bg-muted-bg transition text-sm font-medium">
                <MessageCircle className="h-4 w-4" /> Ask Artist
              </button>
              <button className="flex-1 py-2.5 border border-border rounded-lg flex items-center justify-center gap-2 hover:bg-muted-bg transition text-sm font-medium">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-muted-bg rounded-lg">
              <ShieldCheck className="h-5 w-5 text-success flex-shrink-0" />
              <div>
                <p className="text-xs font-medium">Buyer Protection</p>
                <p className="text-xs text-muted">48-hour inspection</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted-bg rounded-lg">
              <Truck className="h-5 w-5 text-accent flex-shrink-0" />
              <div>
                <p className="text-xs font-medium">Tracked Shipping</p>
                <p className="text-xs text-muted">Ships within 5 days</p>
              </div>
            </div>
          </div>

          {/* Artwork Details */}
          <div className="border-t border-border pt-6 space-y-4">
            <h2 className="font-semibold text-lg">Artwork Details</h2>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              {artwork.medium && <><span className="text-muted">Medium</span><span>{artwork.medium}</span></>}
              {artwork.style && <><span className="text-muted">Style</span><span>{artwork.style}</span></>}
              {artwork.width_cm && artwork.height_cm && (
                <>
                  <span className="text-muted">Dimensions</span>
                  <span>{artwork.width_cm} x {artwork.height_cm}{artwork.depth_cm ? ` x ${artwork.depth_cm}` : ''} cm</span>
                </>
              )}
              <span className="text-muted">Framed</span>
              <span>{artwork.is_framed ? 'Yes' : 'No'}</span>
              {artwork.shipping_weight_kg && (
                <><span className="text-muted">Weight</span><span>{artwork.shipping_weight_kg} kg</span></>
              )}
            </div>
          </div>

          {/* Description */}
          {artwork.description && (
            <div className="border-t border-border pt-6 space-y-3">
              <h2 className="font-semibold text-lg">About This Piece</h2>
              <div className="text-sm text-muted leading-relaxed whitespace-pre-line">
                {artwork.description}
              </div>
            </div>
          )}

          {/* Tags */}
          {artwork.tags && artwork.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {artwork.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/browse?q=${tag}`}
                  className="px-3 py-1 bg-muted-bg text-xs rounded-full hover:bg-gray-200 transition"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
