'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCheck,
  ImageIcon,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { createClient } from '@/lib/supabase/client';
import { getInitials } from '@/lib/utils';

// ── Types ──

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
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

// ── Helpers ──

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const diffDays = Math.floor(
    (today.getTime() - msgDate.getTime()) / 86400000
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function isSameDay(d1: string, d2: string): boolean {
  const a = new Date(d1);
  const b = new Date(d2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ── Component ──

export default function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { loading: authLoading } = useRequireAuth();
  const { user } = useAuth();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<ProfileBasic | null>(null);
  const [artwork, setArtwork] = useState<ArtworkBasic | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendCooldown, setSendCooldown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Resolve params
  useEffect(() => {
    params.then((p) => {
      console.log('[Chat] Resolved conversation ID:', p.id);
      setConversationId(p.id);
    });
  }, [params]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load conversation data via server API route
  const loadConversation = useCallback(
    async (convoId: string) => {
      console.log('[Chat] Fetching conversation:', convoId);
      setError(null);

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(`/api/messages/${convoId}`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.error('[Chat] API error:', res.status, data.error);
          setError(data.error || `Failed to load conversation (${res.status})`);
          setLoading(false);
          return;
        }

        const json = await res.json();
        console.log(
          '[Chat] Loaded conversation. Messages:',
          json.messages?.length ?? 0
        );

        setOtherUser(json.otherUser);
        setArtwork(json.artwork);
        setMessages(json.messages || []);

        // Mark messages as read
        fetch('/api/messages/read', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: convoId }),
        }).catch(() => {});
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          console.error('[Chat] Request timed out');
          setError('Could not load conversation — request timed out.');
        } else {
          console.error('[Chat] Fetch error:', err);
          setError('Could not load conversation. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!conversationId || !user) return;
    loadConversation(conversationId);
  }, [conversationId, user, loadConversation]);

  // Safety timeout
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      if (loading) {
        console.error('[Chat] Safety timeout — forcing load complete');
        setLoading(false);
        setError('Could not load conversation. Please try again.');
      }
    }, 10000);
    return () => clearTimeout(t);
  }, [loading]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Real-time: subscribe to new messages in this conversation
  useEffect(() => {
    if (!conversationId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes' as unknown as 'system',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        } as unknown as Record<string, unknown>,
        (payload: { new: MessageRow }) => {
          console.log('[Chat] Real-time: new message received');
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });

          // Mark as read if from other user
          if (payload.new.sender_id !== user?.id) {
            fetch('/api/messages/read', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversation_id: conversationId }),
            }).catch(() => {});
          }
        }
      )
      .on(
        'postgres_changes' as unknown as 'system',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        } as unknown as Record<string, unknown>,
        (payload: { new: MessageRow }) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? payload.new : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  // Auto-resize textarea
  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    if (value.length <= 2000) {
      setNewMessage(value);
    }
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || sending || sendCooldown || !conversationId) return;

    console.log('[Chat] Sending message...');
    setSending(true);
    setSendCooldown(true);

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          content: newMessage.trim(),
        }),
      });

      if (res.ok) {
        const { data } = await res.json();
        console.log('[Chat] Message sent:', data?.id);
        setNewMessage('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
        // Optimistically add message if real-time hasn't delivered it
        if (data) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.id)) return prev;
            return [...prev, data as MessageRow];
          });
        }
      } else {
        const data = await res.json().catch(() => ({}));
        console.error('[Chat] Send error:', data.error);
      }
    } catch (err) {
      console.error('[Chat] Send error:', err);
    } finally {
      setSending(false);
      setTimeout(() => setSendCooldown(false), 500);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

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
        <h1 className="font-editorial text-2xl font-medium mb-2">
          Something went wrong
        </h1>
        <p className="text-muted mb-6">{error}</p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/messages"
            className="inline-flex items-center gap-2 px-6 py-3 border border-border font-medium rounded-full hover:bg-cream transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <button
            onClick={() => {
              if (conversationId) {
                setLoading(true);
                setError(null);
                loadConversation(conversationId);
              }
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-accent hover:text-primary transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Conversation not found ──
  if (!otherUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-editorial text-2xl font-medium mb-2">
          Conversation not found
        </h1>
        <p className="text-muted mb-6">
          This conversation may have been deleted.
        </p>
        <Link
          href="/messages"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-accent hover:text-primary transition-colors"
        >
          Back to Messages
        </Link>
      </div>
    );
  }

  const charCount = newMessage.length;
  const showCharCount = charCount > 1800;

  return (
    <div
      className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col"
      style={{ height: 'calc(100vh - 64px)' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 py-4 border-b border-border flex-shrink-0">
        <Link
          href="/messages"
          className="p-1.5 -ml-1.5 hover:bg-cream rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-muted" />
        </Link>

        <div className="w-10 h-10 rounded-full bg-muted-bg flex items-center justify-center overflow-hidden flex-shrink-0">
          {otherUser.avatar_url ? (
            <img
              src={otherUser.avatar_url}
              alt={otherUser.full_name ?? ''}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-muted">
              {getInitials(otherUser.full_name || '?')}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {otherUser.full_name || 'Unknown User'}
          </p>
          {artwork && (
            <Link
              href={`/artwork/${artwork.id}`}
              className="text-xs text-accent-dark hover:underline truncate block"
            >
              Re: {artwork.title}
            </Link>
          )}
        </div>

        {artwork && artwork.images?.[0] && (
          <Link
            href={`/artwork/${artwork.id}`}
            className="w-10 h-10 rounded-lg bg-muted-bg flex-shrink-0 overflow-hidden"
          >
            <img
              src={artwork.images[0]}
              alt={artwork.title}
              className="w-full h-full object-cover"
            />
          </Link>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 bg-cream rounded-full flex items-center justify-center mx-auto mb-4">
              {artwork && artwork.images?.[0] ? (
                <img
                  src={artwork.images[0]}
                  alt=""
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <ImageIcon className="h-6 w-6 text-warm-gray" />
              )}
            </div>
            <p className="text-muted text-sm">
              Start the conversation — say hello!
            </p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isOwn = msg.sender_id === user?.id;
          const showDateSep =
            index === 0 ||
            !isSameDay(messages[index - 1].created_at, msg.created_at);

          return (
            <div key={msg.id}>
              {showDateSep && (
                <div className="flex items-center justify-center py-3">
                  <span className="px-3 py-1 bg-cream text-[11px] font-medium text-warm-gray rounded-full">
                    {formatDateSeparator(msg.created_at)}
                  </span>
                </div>
              )}
              <div
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}
              >
                <div
                  className={`max-w-[75%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl ${
                    isOwn
                      ? 'bg-primary text-white rounded-br-md'
                      : 'bg-cream text-foreground rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {msg.content}
                  </p>
                  <div
                    className={`flex items-center gap-1 mt-1 ${
                      isOwn ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span
                      className={`text-[10px] ${
                        isOwn ? 'text-white/60' : 'text-warm-gray'
                      }`}
                    >
                      {formatTime(msg.created_at)}
                    </span>
                    {isOwn && (
                      <CheckCheck
                        className={`h-3 w-3 ${
                          msg.is_read ? 'text-accent' : 'text-white/40'
                        }`}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div className="flex-shrink-0 border-t border-border py-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              maxLength={2000}
              className="w-full px-4 py-3 bg-cream border border-border rounded-2xl text-sm placeholder:text-warm-gray resize-none focus:bg-white focus:border-accent transition-colors"
              style={{ maxHeight: 120 }}
            />
            {showCharCount && (
              <span
                className={`absolute bottom-1.5 right-3 text-[10px] ${
                  charCount > 1950 ? 'text-red-500' : 'text-warm-gray'
                }`}
              >
                {charCount}/2000
              </span>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending || sendCooldown}
            className="flex-shrink-0 w-11 h-11 bg-accent text-primary rounded-full flex items-center justify-center hover:bg-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
