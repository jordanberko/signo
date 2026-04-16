import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'The Artists — Signo',
  description:
    'The Australian artists listing original work on Signo. Painters, printmakers, sculptors — direct from the studio.',
};

// ── Data fetch ──

interface ArtistRow {
  id: string;
  fullName: string;
  location: string | null;
  bio: string | null;
  avatarUrl: string | null;
  artworkCount: number;
  sampleImage: string | null;
}

async function getArtists(): Promise<ArtistRow[]> {
  const supabase = await createClient();

  // Hide paused/cancelled subscriptions
  const { data: hiddenArtists } = await supabase
    .from('profiles')
    .select('id')
    .in('subscription_status', ['paused', 'cancelled']);

  const hiddenIds = new Set((hiddenArtists || []).map((a: { id: string }) => a.id));

  // All approved artworks → aggregate per artist
  const { data: artworkRows } = await supabase
    .from('artworks')
    .select('artist_id, images')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (!artworkRows || artworkRows.length === 0) return [];

  const artistMap = new Map<string, { count: number; sampleImage: string | null }>();
  for (const row of artworkRows) {
    const aid = row.artist_id as string;
    const images = (row.images as string[]) || [];
    const first = images[0] || null;
    if (!artistMap.has(aid)) {
      artistMap.set(aid, { count: 0, sampleImage: first });
    }
    const entry = artistMap.get(aid)!;
    entry.count += 1;
    if (!entry.sampleImage && first) entry.sampleImage = first;
  }

  const artistIds = Array.from(artistMap.keys()).filter((id) => !hiddenIds.has(id));
  if (artistIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, bio, location')
    .in('id', artistIds)
    .eq('role', 'artist');

  return (profiles || [])
    .map((p) => {
      const agg = artistMap.get(p.id);
      return {
        id: p.id,
        fullName: p.full_name || 'Unknown Artist',
        location: p.location,
        bio: p.bio,
        avatarUrl: p.avatar_url,
        artworkCount: agg?.count || 0,
        sampleImage: agg?.sampleImage || null,
      };
    })
    .sort((a, b) => {
      // Alphabetise by surname for editorial feel
      const an = (a.fullName.split(' ').slice(-1)[0] || a.fullName).toLowerCase();
      const bn = (b.fullName.split(' ').slice(-1)[0] || b.fullName).toLowerCase();
      return an.localeCompare(bn);
    });
}

// ── Page ──

export default async function ArtistsIndexPage() {
  const artists = await getArtists();

  // Group by first letter of surname for editorial directory feel
  const groups = new Map<string, ArtistRow[]>();
  for (const a of artists) {
    const lastName = a.fullName.split(' ').slice(-1)[0] || a.fullName;
    const letter = (lastName[0] || '•').toUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter)!.push(a);
  }
  const groupKeys = Array.from(groups.keys()).sort();

  return (
    <div style={{ background: 'var(--color-warm-white)' }}>
      {/* ── Editorial header ── */}
      <header
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(4rem, 9vw, 7rem)',
          paddingBottom: 'clamp(2.5rem, 5vw, 4rem)',
        }}
      >
        <p
          style={{
            fontSize: '0.68rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            marginBottom: '1.2rem',
          }}
        >
          The Artists
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(2.6rem, 6vw, 4.8rem)',
            lineHeight: 1.02,
            letterSpacing: '-0.015em',
            color: 'var(--color-ink)',
            fontWeight: 400,
            maxWidth: '22ch',
          }}
        >
          Painters, printmakers &amp; sculptors working across Australia.
        </h1>
        <p
          style={{
            marginTop: '1.6rem',
            fontSize: '0.92rem',
            fontWeight: 300,
            lineHeight: 1.6,
            color: 'var(--color-stone-dark)',
            maxWidth: '46ch',
          }}
        >
          {artists.length > 0
            ? `${artists.length} ${artists.length === 1 ? 'artist' : 'artists'} currently listing original work. Every sale goes directly to the studio — Signo takes no commission.`
            : 'Every sale goes directly to the studio — Signo takes no commission.'}
        </p>
      </header>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── Directory ── */}
      {artists.length === 0 ? (
        <div
          className="px-6 sm:px-10"
          style={{ paddingTop: '5rem', paddingBottom: '8rem', maxWidth: '46ch' }}
        >
          <p
            className="font-serif"
            style={{
              fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
              lineHeight: 1.15,
              color: 'var(--color-ink)',
            }}
          >
            The roster is being curated.
          </p>
          <p
            style={{
              marginTop: '1rem',
              fontSize: '0.88rem',
              color: 'var(--color-stone-dark)',
              fontWeight: 300,
              lineHeight: 1.6,
            }}
          >
            New artists are catalogued weekly.
          </p>
        </div>
      ) : (
        <div
          className="px-6 sm:px-10"
          style={{ paddingTop: '3rem', paddingBottom: '6rem' }}
        >
          {groupKeys.map((letter) => {
            const group = groups.get(letter)!;
            return (
              <section key={letter} style={{ marginBottom: '4.5rem' }}>
                <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 'clamp(1.5rem, 4vw, 4rem)' }}>
                  {/* Letter gutter */}
                  <div className="lg:col-span-2">
                    <p
                      className="font-serif"
                      style={{
                        fontSize: 'clamp(2.4rem, 4vw, 3.6rem)',
                        lineHeight: 1,
                        color: 'var(--color-stone)',
                        fontWeight: 400,
                        fontStyle: 'italic',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {letter}
                    </p>
                  </div>

                  {/* Artists list */}
                  <ul className="list-none p-0 m-0 lg:col-span-10">
                    {group.map((a) => (
                      <li
                        key={a.id}
                        style={{
                          borderTop: '1px solid var(--color-border)',
                        }}
                      >
                        <Link
                          href={`/artists/${a.id}`}
                          className="artist-row"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '56px minmax(0,1fr) auto',
                            gap: 'clamp(1rem, 3vw, 2.4rem)',
                            alignItems: 'center',
                            padding: '1.6rem 0',
                            textDecoration: 'none',
                          }}
                        >
                          {/* Thumbnail (sample work, not avatar) */}
                          <div
                            className="relative flex-shrink-0"
                            style={{
                              width: 56,
                              height: 56,
                              background: 'var(--color-cream)',
                              overflow: 'hidden',
                            }}
                          >
                            {a.sampleImage ? (
                              <Image
                                src={a.sampleImage}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="56px"
                              />
                            ) : null}
                          </div>

                          {/* Name + location */}
                          <div className="min-w-0">
                            <p
                              className="font-serif"
                              style={{
                                fontSize: 'clamp(1.3rem, 2vw, 1.8rem)',
                                lineHeight: 1.15,
                                color: 'var(--color-ink)',
                                fontWeight: 400,
                                letterSpacing: '-0.01em',
                              }}
                            >
                              {a.fullName}
                            </p>
                            {a.location && (
                              <p
                                style={{
                                  fontSize: '0.82rem',
                                  color: 'var(--color-stone-dark)',
                                  fontStyle: 'italic',
                                  marginTop: '0.25rem',
                                }}
                              >
                                {a.location}
                              </p>
                            )}
                          </div>

                          {/* Work count — right-aligned kicker */}
                          <p
                            style={{
                              fontSize: '0.62rem',
                              letterSpacing: '0.2em',
                              textTransform: 'uppercase',
                              color: 'var(--color-stone)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {a.artworkCount} {a.artworkCount === 1 ? 'work' : 'works'}
                          </p>
                        </Link>
                      </li>
                    ))}
                    {/* Close the list with bottom rule */}
                    <li style={{ borderTop: '1px solid var(--color-border)', height: 0 }} />
                  </ul>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
