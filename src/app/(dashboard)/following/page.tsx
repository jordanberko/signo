'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Users, ArrowRight, Loader2, MapPin, Image as ImageIcon, UserMinus } from 'lucide-react';
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

  // Handle unfollow — optimistic fade out then remove
  const handleUnfollow = useCallback(async (artistId: string) => {
    setUnfollowing((prev) => new Set(prev).add(artistId));

    try {
      const res = await fetch(`/api/follows?followedId=${artistId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        // Revert on error
        setUnfollowing((prev) => {
          const next = new Set(prev);
          next.delete(artistId);
          return next;
        });
        return;
      }
    } catch {
      // Revert on error
      setUnfollowing((prev) => {
        const next = new Set(prev);
        next.delete(artistId);
        return next;
      });
      return;
    }

    // Remove from list after fade-out animation
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-editorial text-3xl md:text-4xl font-semibold">
          Following
        </h1>
        <p className="text-muted mt-1.5">
          {loading
            ? 'Loading artists you follow...'
            : artists.length > 0
              ? `${artists.length} artist${artists.length === 1 ? '' : 's'} you follow`
              : 'Artists you follow'}
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : error ? (
        <div className="text-center py-24">
          <p className="text-error mb-4">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchFollowing();
            }}
            className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-full hover:bg-accent transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : artists.length === 0 ? (
        /* Empty state */
        <div className="text-center py-24">
          <div className="w-20 h-20 bg-muted-bg rounded-full flex items-center justify-center mx-auto mb-5">
            <Users className="h-10 w-10 text-muted" />
          </div>
          <h2 className="font-editorial text-2xl font-semibold mb-2">
            You&apos;re not following any artists yet
          </h2>
          <p className="text-muted mb-8 max-w-md mx-auto">
            Browse artists to find ones you love. Follow them to stay updated on their latest work.
          </p>
          <Link
            href="/browse"
            className="group inline-flex items-center gap-2 px-8 py-3 bg-primary text-white text-sm font-semibold rounded-full hover:bg-accent transition-colors duration-300"
          >
            Browse Artists
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      ) : (
        /* Artist grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {artists.map((artist) => (
            <div
              key={artist.id}
              style={{
                opacity: unfollowing.has(artist.id) ? 0 : 1,
                transform: unfollowing.has(artist.id)
                  ? 'scale(0.95)'
                  : 'scale(1)',
                transition: 'opacity 400ms ease-out, transform 400ms ease-out',
              }}
              className="bg-white border border-border rounded-2xl p-6 hover:shadow-md transition-shadow"
            >
              <Link
                href={`/artists/${artist.id}`}
                className="flex items-center gap-4 no-underline"
              >
                <Avatar
                  avatarUrl={artist.avatar_url}
                  name={artist.full_name}
                  size={64}
                  className="flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {artist.full_name}
                  </h3>
                  {artist.location && (
                    <p className="text-sm text-muted flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{artist.location}</span>
                    </p>
                  )}
                  <p className="text-sm text-muted flex items-center gap-1 mt-0.5">
                    <ImageIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    {artist.artworkCount} artwork{artist.artworkCount === 1 ? '' : 's'}
                  </p>
                </div>
              </Link>

              <div className="mt-4 pt-4 border-t border-border">
                <button
                  onClick={() => handleUnfollow(artist.id)}
                  disabled={unfollowing.has(artist.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 w-full justify-center border-2 border-border text-sm font-medium rounded-full text-muted hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-all duration-200"
                >
                  <UserMinus className="h-4 w-4" />
                  Unfollow
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
