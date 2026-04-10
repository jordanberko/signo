'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MessageCircle, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { getInitials } from '@/lib/utils';

// ── Types ──

interface ConversationDisplay {
  id: string;
  otherUser: { id: string; full_name: string | null; avatar_url: string | null };
  artwork: { id: string; title: string; images: string[] } | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
}

// ── Helpers ──

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// ── Component ──

export default function MessagesPage() {
  const { loading: authLoading } = useRequireAuth();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    setError(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch('/api/messages/inbox', {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Failed to load messages (${res.status})`);
        return;
      }

      const json = await res.json();
      setConversations(json.data || []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Could not load messages — request timed out.');
      } else {
        setError('Could not load messages. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user, loadConversations]);

  // Safety timeout: if loading takes more than 10 seconds, stop
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('Could not load messages. Please try again.');
      }
    }, 10000);
    return () => clearTimeout(t);
  }, [loading]);

  // ── Auth loading ──
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // ── Data loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <MessageCircle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="font-editorial text-2xl font-medium mb-2">
          Something went wrong
        </h1>
        <p className="text-muted mb-6">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
            loadConversations();
          }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-accent hover:text-primary transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  // ── Empty state ──
  if (conversations.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mx-auto mb-5">
          <MessageCircle className="h-8 w-8 text-warm-gray" />
        </div>
        <h1 className="font-editorial text-2xl font-medium mb-2">
          No messages yet
        </h1>
        <p className="text-muted mb-6">
          Browse artwork and message an artist to get started.
        </p>
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-accent hover:text-primary transition-colors"
        >
          Browse Artwork
        </Link>
      </div>
    );
  }

  // ── Conversation list ──
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-editorial text-2xl md:text-3xl font-medium mb-6">
        Messages
      </h1>

      <div className="bg-white border border-border rounded-2xl overflow-hidden divide-y divide-border">
        {conversations.map((convo) => (
          <Link
            key={convo.id}
            href={`/messages/${convo.id}`}
            className="flex items-center gap-4 p-4 hover:bg-cream/50 transition-colors"
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-muted-bg flex items-center justify-center overflow-hidden">
                {convo.otherUser.avatar_url ? (
                  <img
                    src={convo.otherUser.avatar_url}
                    alt={convo.otherUser.full_name ?? ''}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-muted">
                    {getInitials(convo.otherUser.full_name || '?')}
                  </span>
                )}
              </div>
              {convo.unreadCount > 0 && (
                <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {convo.unreadCount > 9 ? '9+' : convo.unreadCount}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-sm truncate ${
                    convo.unreadCount > 0
                      ? 'font-semibold text-foreground'
                      : 'font-medium text-foreground'
                  }`}
                >
                  {convo.otherUser.full_name || 'Unknown User'}
                </p>
                <span className="text-xs text-warm-gray flex-shrink-0">
                  {timeAgo(convo.lastMessageAt)}
                </span>
              </div>
              {convo.artwork && (
                <p className="text-xs text-accent-dark truncate">
                  Re: {convo.artwork.title}
                </p>
              )}
              <p
                className={`text-sm truncate mt-0.5 ${
                  convo.unreadCount > 0 ? 'text-foreground' : 'text-muted'
                }`}
              >
                {convo.lastMessage || 'No messages yet'}
              </p>
            </div>

            {/* Artwork thumbnail */}
            {convo.artwork && convo.artwork.images?.[0] && (
              <div className="hidden sm:block w-10 h-10 rounded-lg bg-muted-bg flex-shrink-0 overflow-hidden">
                <img
                  src={convo.artwork.images[0]}
                  alt={convo.artwork.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
