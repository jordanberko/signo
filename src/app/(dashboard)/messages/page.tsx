'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { createClient } from '@/lib/supabase/client';
import { getInitials } from '@/lib/utils';

// ── Types ──

interface ConversationRow {
  id: string;
  participant_1: string;
  participant_2: string;
  artwork_id: string | null;
  last_message_at: string;
  created_at: string;
}

interface ProfileBasic {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface ArtworkBasic {
  id: string;
  title: string;
  images: string[];
}

interface ConversationDisplay {
  id: string;
  otherUser: ProfileBasic;
  artwork: ArtworkBasic | null;
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

  useEffect(() => {
    if (!user) return;

    async function loadConversations() {
      try {
        const supabase = createClient();

        // Fetch conversations where user is a participant
        const { data: convos, error } = await (supabase as unknown as {
          from: (table: string) => {
            select: (cols: string) => {
              or: (filter: string) => {
                order: (col: string, opts: { ascending: boolean }) => Promise<{
                  data: ConversationRow[] | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        })
          .from('conversations')
          .select('*')
          .or(`participant_1.eq.${user!.id},participant_2.eq.${user!.id}`)
          .order('last_message_at', { ascending: false });

        if (error || !convos || convos.length === 0) {
          setLoading(false);
          return;
        }

        // Gather all participant IDs and artwork IDs we need to look up
        const otherUserIds = new Set<string>();
        const artworkIds = new Set<string>();

        convos.forEach((c) => {
          const otherId =
            c.participant_1 === user!.id ? c.participant_2 : c.participant_1;
          otherUserIds.add(otherId);
          if (c.artwork_id) artworkIds.add(c.artwork_id);
        });

        // Fetch profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', Array.from(otherUserIds));

        const profileMap = new Map<string, ProfileBasic>();
        (profiles || []).forEach((p: ProfileBasic) => profileMap.set(p.id, p));

        // Fetch artworks
        let artworkMap = new Map<string, ArtworkBasic>();
        if (artworkIds.size > 0) {
          const { data: artworks } = await supabase
            .from('artworks')
            .select('id, title, images')
            .in('id', Array.from(artworkIds));
          (artworks || []).forEach((a: ArtworkBasic) =>
            artworkMap.set(a.id, a)
          );
        }

        // Fetch last message for each conversation + unread counts
        const displayConvos: ConversationDisplay[] = [];

        for (const c of convos) {
          const otherId =
            c.participant_1 === user!.id ? c.participant_2 : c.participant_1;

          // Last message
          const { data: lastMsgs } = await (supabase as unknown as {
            from: (table: string) => {
              select: (cols: string) => {
                eq: (col: string, val: string) => {
                  order: (col: string, opts: { ascending: boolean }) => {
                    limit: (n: number) => Promise<{
                      data: { content: string; sender_id: string }[] | null;
                      error: unknown;
                    }>;
                  };
                };
              };
            };
          })
            .from('messages')
            .select('content, sender_id')
            .eq('conversation_id', c.id)
            .order('created_at', { ascending: false })
            .limit(1);

          // Unread count
          const { count: unread } = await (supabase as unknown as {
            from: (table: string) => {
              select: (cols: string, opts: { count: string; head: boolean }) => {
                eq: (col: string, val: string) => {
                  eq: (col2: string, val2: boolean) => {
                    neq: (col3: string, val3: string) => Promise<{
                      count: number | null;
                      error: unknown;
                    }>;
                  };
                };
              };
            };
          })
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', c.id)
            .eq('read', false)
            .neq('sender_id', user!.id);

          const lastMsg = lastMsgs?.[0] || null;
          let preview = lastMsg?.content || null;
          if (preview && preview.length > 60) {
            preview = preview.substring(0, 57) + '...';
          }

          displayConvos.push({
            id: c.id,
            otherUser: profileMap.get(otherId) || {
              id: otherId,
              full_name: 'Unknown',
              avatar_url: null,
            },
            artwork: c.artwork_id ? artworkMap.get(c.artwork_id) || null : null,
            lastMessage: preview,
            lastMessageAt: c.last_message_at,
            unreadCount: unread ?? 0,
          });
        }

        setConversations(displayConvos);
      } catch (err) {
        console.error('[Messages] Load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadConversations();

    // Real-time: listen for new messages to update the list
    const supabase = createClient();
    const channel = supabase
      .channel('inbox-updates')
      .on(
        'postgres_changes' as unknown as 'system',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        } as unknown as Record<string, unknown>,
        () => {
          // Reload conversations when a new message arrives
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // ── Loading states ──

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
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
