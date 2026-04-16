'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';

// ── Types ──

interface FollowedArtist {
  id: string;
  full_name: string;
  avatar_url: string | null;
  location: string | null;
  artworkCount: number;
  followedAt: string;
}

// ── Component ──

export default function FollowingPage() {
  const { loading: authLoading } = useRequireAuth();
  const [artists, setArtists] = useState<FollowedArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unfollowing, setUnfollowing] = useState<Set<string>>(new Set());

  const fetchFollowing = useCallback(async () => {
    try {
      setError(null);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch('/api/follows/list', {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error('Failed to load following list');
      }

      const data = await res.json();
      setArtists(data.artists || []);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('[Following]', err);
        setError('Failed to load your followed artists. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    fetchFollowing();
  }, [authLoading, fetchFollowing]);

  const handleUnfollow = useCallback(async (artistId: string) => {
    setUnfollowing((prev) => new Set(prev).add(artistId));

    try {
      const res = await fetch(`/api/follows?followedId=${artistId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        setUnfollowing((prev) => {
          const next = new Set(prev);
          next.delete(artistId);
          return next;
        });
        return;
      }
    } catch {
      setUnfollowing((prev) => {
        const next = new Set(prev);
        next.delete(artistId);
        return next;
      });
      return;
    }

    setTimeout(() => {
      setArtists((prev) => prev.filter((a) => a.id !== artistId));
      setUnfollowing((prev) => {
        const next = new Set(prev);
        next.delete(artistId);
        return next;
      });
    }, 400);
  }, []);

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-warm-white)',
        }}
      >
        <p
          className="font-serif"
          style={{ fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--color-stone)' }}
        >
          Loading…
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      <div
        className="px-6 sm:px-10"
        style={{
          maxWidth: '78rem',
          margin: '0 auto',
          paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
        }}
      >
        {/* ── Editorial header ── */}
        <header style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
          <p
            style={{
              fontSize: '0.62rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--color-stone)',
              marginBottom: '1rem',
            }}
          >
            The Studio · Following
          </p>
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.015em',
              color: 'var(--color-ink)',
              fontWeight: 400,
              marginBottom: '0.7rem',
            }}
          >
            Artists you <em style={{ fontStyle: 'italic' }}>track.</em>
          </h1>
          <p
            style={{
              fontSize: '0.92rem',
              fontWeight: 300,
              color: 'var(--color-stone-dark)',
              lineHeight: 1.6,
            }}
          >
            {loading
              ? 'Retrieving your list…'
              : artists.length > 0
                ? `${artists.length} artist${artists.length === 1 ? '' : 's'} on your watch list.`
                : 'A personal watch list of the artists whose work you want to follow.'}
          </p>
        </header>

        {loading ? (
          <p
            className="font-serif"
            style={{
              padding: '3rem 0',
              fontStyle: 'italic',
              color: 'var(--color-stone)',
            }}
          >
            Loading…
          </p>
        ) : error ? (
          <div
            style={{
              paddingTop: '2rem',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <p
              className="font-serif"
              style={{
                fontSize: '0.92rem',
                color: 'var(--color-terracotta, #c45d3e)',
                fontStyle: 'italic',
                marginBottom: '1.4rem',
              }}
            >
              {error}
            </p>
            <button
              onClick={() => {
                setLoading(true);
                fetchFollowing();
              }}
              className="editorial-link"
            >
              Try again
            </button>
          </div>
        ) : artists.length === 0 ? (
          <div
            style={{
              paddingTop: '2rem',
              borderTop: '1px solid var(--color-border)',
              maxWidth: '46ch',
            }}
          >
            <p
              className="font-serif"
              style={{
                fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)',
                lineHeight: 1.2,
                color: 'var(--color-ink)',
                fontStyle: 'italic',
                fontWeight: 400,
                marginTop: '1.4rem',
              }}
            >
              You&apos;re not following anyone yet.
            </p>
            <p
              style={{
                marginTop: '1rem',
                fontSize: '0.9rem',
                color: 'var(--color-stone-dark)',
                fontWeight: 300,
                lineHeight: 1.6,
              }}
            >
              When you find an artist whose work you want to stay close to, follow them from their
              profile — they&apos;ll appear here.
            </p>
            <Link
              href="/artists"
              className="editorial-link"
              style={{ marginTop: '1.6rem', display: 'inline-block' }}
            >
              Visit the artist directory →
            </Link>
          </div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              borderTop: '1px solid var(--color-border-strong)',
            }}
          >
            {artists.map((artist) => (
              <li
                key={artist.id}
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  opacity: unfollowing.has(artist.id) ? 0 : 1,
                  transform: unfollowing.has(artist.id)
                    ? 'translateY(-4px)'
                    : 'translateY(0)',
                  transition: 'opacity 350ms cubic-bezier(0.22, 1, 0.36, 1), transform 350ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.4rem',
                    padding: '1.4rem 0',
                  }}
                >
                  <Link
                    href={`/artists/${artist.id}`}
                    style={{
                      flexShrink: 0,
                      textDecoration: 'none',
                      display: 'block',
                    }}
                  >
                    <Avatar
                      avatarUrl={artist.avatar_url}
                      name={artist.full_name}
                      size={64}
                    />
                  </Link>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      href={`/artists/${artist.id}`}
                      className="font-serif"
                      style={{
                        fontSize: '1.2rem',
                        color: 'var(--color-ink)',
                        fontWeight: 400,
                        textDecoration: 'none',
                        display: 'block',
                        lineHeight: 1.2,
                      }}
                    >
                      {artist.full_name}
                    </Link>
                    <p
                      style={{
                        marginTop: '0.3rem',
                        fontSize: '0.82rem',
                        color: 'var(--color-stone-dark)',
                        fontWeight: 300,
                      }}
                    >
                      {artist.location && (
                        <em style={{ fontStyle: 'italic' }}>{artist.location}</em>
                      )}
                      {artist.location && ' · '}
                      <span style={{ color: 'var(--color-stone)' }}>
                        {artist.artworkCount} work{artist.artworkCount === 1 ? '' : 's'}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnfollow(artist.id)}
                    disabled={unfollowing.has(artist.id)}
                    className="font-serif"
                    style={{
                      flexShrink: 0,
                      fontSize: '0.68rem',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      fontStyle: 'italic',
                      color: 'var(--color-stone)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.3rem 0',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    Unfollow
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
