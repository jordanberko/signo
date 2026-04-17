'use client';

import Link from 'next/link';
import Image from 'next/image';

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
 * MeetOurArtists — horizontal-scroll artist strip, Huxley-aligned.
 *
 * Each "card" is a 4:5 sample image above a light-first/bold-surname
 * typographic treatment. No rounded container, no drop shadow, no
 * metadata pills. Gated to 3+ artists so the strip never looks sparse.
 */
export default function MeetOurArtists({ artists }: { artists: SpotlightArtist[] }) {
  if (artists.length < 3) return null;

  return (
    <section className="py-20 md:py-28" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className="px-6 sm:px-10">
        <div className="flex items-baseline justify-between mb-10">
          <h2
            className="font-serif"
            style={{
              fontSize: '1.2rem',
              fontWeight: 400,
              color: 'var(--color-ink)',
              letterSpacing: '-0.005em',
              margin: 0,
            }}
          >
            Artists on Signo
          </h2>
          <Link href="/artists" className="editorial-link no-underline">
            View all
          </Link>
        </div>

        {/* Horizontal scroll strip */}
        <div className="flex gap-6 overflow-x-auto scrollbar-hide -mx-6 sm:-mx-10 px-6 sm:px-10 pb-2">
          {artists.map((artist) => (
            <Link
              key={artist.id}
              href={`/artists/${artist.id}`}
              className="shrink-0 no-underline block group"
              style={{ width: 280 }}
            >
              <div
                className="overflow-hidden mb-4"
                style={{
                  width: 280,
                  height: 350,
                  background: 'var(--color-cream)',
                }}
              >
                {artist.sampleImages[0] ? (
                  <Image
                    src={artist.sampleImages[0]}
                    alt={`Work by ${artist.fullName}`}
                    width={280}
                    height={350}
                    className="w-full h-full object-cover"
                    style={{
                      transition: 'transform var(--dur-cinematic) var(--ease-out), filter var(--dur-base) var(--ease-out)',
                      filter: 'grayscale(20%)',
                    }}
                    sizes="280px"
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.03)';
                      (e.currentTarget as HTMLImageElement).style.filter = 'grayscale(0%)';
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)';
                      (e.currentTarget as HTMLImageElement).style.filter = 'grayscale(20%)';
                    }}
                  />
                ) : (
                  <div className="w-full h-full" style={{ background: 'var(--color-cream)' }} />
                )}
              </div>
              <ArtistName fullName={artist.fullName} />
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 300,
                  color: 'var(--color-stone)',
                  marginTop: '0.3rem',
                  letterSpacing: '0.02em',
                }}
              >
                {artist.artworkCount} work{artist.artworkCount === 1 ? '' : 's'}
                {artist.location ? ` · ${artist.location}` : ''}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Light first name, bold surname — Huxley signature move. */
function ArtistName({ fullName }: { fullName: string }) {
  const parts = fullName.trim().split(' ').filter(Boolean);
  const first = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
  const last = parts[parts.length - 1] || fullName;

  return (
    <div
      className="font-serif"
      style={{
        fontSize: '1.1rem',
        color: 'var(--color-ink)',
        letterSpacing: '-0.005em',
        lineHeight: 1.2,
      }}
    >
      {first && (
        <span style={{ fontWeight: 300, color: 'var(--color-stone-dark)' }}>{first} </span>
      )}
      <span style={{ fontWeight: 500 }}>{last}</span>
    </div>
  );
}
