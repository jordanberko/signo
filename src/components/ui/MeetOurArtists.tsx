'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MapPin } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';

export interface SpotlightArtist {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  artworkCount: number;
  sampleImages: string[];
  sampleTitle: string;
}

/**
 * MeetOurArtists — horizontal-scroll row of artist cards.
 * Only rendered when 3+ artists are passed in.
 */
export default function MeetOurArtists({ artists }: { artists: SpotlightArtist[] }) {
  if (artists.length < 3) return null;

  return (
    <section className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-accent-dark text-xs font-semibold tracking-[0.2em] uppercase mb-2">
              Our Community
            </p>
            <h2 className="font-editorial text-2xl md:text-3xl font-medium text-primary">
              Meet Our Artists
            </h2>
          </div>
          <Link
            href="/browse"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-accent-dark transition-colors group"
          >
            Browse all artwork
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Horizontal scroll container */}
        <div className="flex gap-5 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scrollbar-hide">
          {artists.map((artist) => (
            <Link
              key={artist.id}
              href={`/artists/${artist.id}`}
              className="flex-shrink-0 w-[240px] sm:w-[260px] snap-start group"
            >
              <div className="bg-white border border-border rounded-2xl overflow-hidden hover:border-accent/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                {/* Sample artwork as card header */}
                <div className="aspect-[3/2] bg-sand relative overflow-hidden">
                  {artist.sampleImages[0] ? (
                    <Image
                      src={artist.sampleImages[0]}
                      alt={`Work by ${artist.fullName}`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="260px"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-stone-200 to-stone-300" />
                  )}
                </div>

                {/* Artist info */}
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <Avatar
                      avatarUrl={artist.avatarUrl}
                      name={artist.fullName}
                      size={40}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-primary truncate">
                        {artist.fullName}
                      </p>
                      {artist.location && (
                        <p className="flex items-center gap-1 text-xs text-muted truncate">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {artist.location}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Artwork count pill */}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted">
                      {artist.artworkCount} artwork{artist.artworkCount !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs font-medium text-accent-dark group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                      View profile
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
