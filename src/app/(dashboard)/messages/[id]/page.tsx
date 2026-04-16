'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { createClient } from '@/lib/supabase/client';
import Avatar from '@/components/ui/Avatar';

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

// ── Spinner ──

function EditorialSpinner({ label = 'Loading…' }: { label?: string }) {
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
        style={{
          fontStyle: 'italic',
          fontSize: '0.95rem',
          color: 'var(--color-stone)',
        }}
      >
        {label}
      </p>
    </div>
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

  useEffect(() => {
    params.then((p) => {
      setConversationId(p.id);
    });
  }, [params]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadConversation = useCallback(async (convoId: string) => {
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
        setError(data.error || `Failed to load conversation (${res.status})`);
        setLoading(false);
        return;
      }

      const json = await res.json();
      setOtherUser(json.otherUser);
      setArtwork(json.artwork);
      setMessages(json.messages || []);

      fetch('/api/messages/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: convoId }),
      }).catch(() => {});
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Could not load conversation — request timed out.');
      } else {
        setError('Could not load conversation. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!conversationId || !user) return;
    loadConversation(conversationId);
  }, [conversationId, user, loadConversation]);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('Could not load conversation. Please try again.');
      }
    }, 10000);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

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
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });

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

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    if (value.length <= 2000) {
      setNewMessage(value);
    }
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 140) + 'px';
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || sending || sendCooldown || !conversationId)
      return;

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
        setNewMessage('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
        if (data) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.id)) return prev;
            return [...prev, data as MessageRow];
          });
        }
      }
    } catch {
      // silent failure — real-time will catch up
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

  // ── Shell helper ──
  const pageShell = (children: React.ReactNode) => (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      <div
        className="px-6 sm:px-10"
        style={{
          maxWidth: '52rem',
          margin: '0 auto',
          paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
        }}
      >
        {children}
      </div>
    </div>
  );

  if (authLoading) return <EditorialSpinner />;
  if (loading) return <EditorialSpinner label="Retrieving the thread…" />;

  if (error) {
    return pageShell(
      <>
        <p
          style={{
            fontSize: '0.62rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            marginBottom: '1.2rem',
          }}
        >
          — Unable to load —
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(1.9rem, 3.6vw, 2.6rem)',
            lineHeight: 1.1,
            color: 'var(--color-ink)',
            fontWeight: 400,
            marginBottom: '1.2rem',
          }}
        >
          The thread didn&apos;t open.
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--color-stone-dark)',
            fontWeight: 300,
            lineHeight: 1.6,
            marginBottom: '2rem',
            maxWidth: '52ch',
          }}
        >
          {error}
        </p>
        <div style={{ display: 'flex', gap: '1.6rem', alignItems: 'center' }}>
          <Link
            href="/messages"
            className="artwork-primary-cta artwork-primary-cta--compact"
            style={{ minWidth: '13rem' }}
          >
            ← Back to messages
          </Link>
          <button
            onClick={() => {
              if (conversationId) {
                setLoading(true);
                setError(null);
                loadConversation(conversationId);
              }
            }}
            className="editorial-link"
          >
            Try again
          </button>
        </div>
      </>
    );
  }

  if (!otherUser) {
    return pageShell(
      <>
        <p
          style={{
            fontSize: '0.62rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            marginBottom: '1.2rem',
          }}
        >
          — Not found —
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(1.9rem, 3.6vw, 2.6rem)',
            lineHeight: 1.1,
            color: 'var(--color-ink)',
            fontWeight: 400,
            marginBottom: '1.2rem',
          }}
        >
          This thread has closed.
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--color-stone-dark)',
            fontWeight: 300,
            lineHeight: 1.6,
            marginBottom: '2rem',
            maxWidth: '52ch',
          }}
        >
          The conversation may have been deleted.
        </p>
        <Link
          href="/messages"
          className="artwork-primary-cta artwork-primary-cta--compact"
          style={{ minWidth: '13rem' }}
        >
          ← Back to messages
        </Link>
      </>
    );
  }

  const charCount = newMessage.length;
  const showCharCount = charCount > 1800;

  return (
    <div
      style={{
        background: 'var(--color-warm-white)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        className="px-6 sm:px-10"
        style={{
          width: '100%',
          maxWidth: '52rem',
          margin: '0 auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 'clamp(7rem, 9vw, 8.5rem)',
          paddingBottom: '1.5rem',
          minHeight: '100vh',
        }}
      >
        {/* ── Back link ── */}
        <Link
          href="/messages"
          className="font-serif"
          style={{
            display: 'inline-block',
            marginBottom: '1.6rem',
            fontSize: '0.68rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            fontStyle: 'italic',
            color: 'var(--color-stone)',
            textDecoration: 'none',
            alignSelf: 'flex-start',
          }}
        >
          ← All messages
        </Link>

        {/* ── Thread header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.2rem',
            paddingBottom: '1.4rem',
            borderBottom: '1px solid var(--color-border-strong)',
            flexShrink: 0,
          }}
        >
          <Avatar
            avatarUrl={otherUser.avatar_url}
            name={otherUser.full_name || '?'}
            size={52}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                marginBottom: '0.3rem',
              }}
            >
              In correspondence with
            </p>
            <p
              className="font-serif"
              style={{
                fontSize: '1.3rem',
                color: 'var(--color-ink)',
                fontWeight: 400,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {otherUser.full_name || 'Unknown'}
            </p>
            {artwork && (
              <Link
                href={`/artwork/${artwork.id}`}
                className="font-serif"
                style={{
                  display: 'inline-block',
                  marginTop: '0.25rem',
                  fontSize: '0.82rem',
                  color: 'var(--color-stone-dark)',
                  fontStyle: 'italic',
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                Re · {artwork.title}
              </Link>
            )}
          </div>

          {artwork && artwork.images?.[0] && (
            <Link
              href={`/artwork/${artwork.id}`}
              style={{
                width: 52,
                height: 52,
                background: 'var(--color-cream)',
                flexShrink: 0,
                overflow: 'hidden',
                display: 'block',
              }}
            >
              <Image
                src={artwork.images[0]}
                alt={artwork.title}
                width={52}
                height={52}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Link>
          )}
        </div>

        {/* ── Messages stream ── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '2rem 0 1rem',
            minHeight: 0,
          }}
        >
          {messages.length === 0 && (
            <div style={{ padding: '4rem 0', textAlign: 'left' }}>
              <p
                style={{
                  fontSize: '0.62rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--color-stone)',
                  marginBottom: '0.8rem',
                }}
              >
                — A fresh page —
              </p>
              <p
                className="font-serif"
                style={{
                  fontSize: 'clamp(1.4rem, 2.6vw, 1.8rem)',
                  fontStyle: 'italic',
                  color: 'var(--color-ink)',
                  fontWeight: 400,
                  lineHeight: 1.2,
                  maxWidth: '36ch',
                }}
              >
                Open with a line. A greeting is enough to begin.
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
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1.8rem 0 1.2rem',
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        height: 1,
                        background: 'var(--color-border)',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.6rem',
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        color: 'var(--color-stone)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatDateSeparator(msg.created_at)}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        height: 1,
                        background: 'var(--color-border)',
                      }}
                    />
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: isOwn ? 'flex-end' : 'flex-start',
                    marginBottom: '0.9rem',
                  }}
                >
                  <div style={{ maxWidth: '78%' }}>
                    <p
                      style={{
                        fontSize: '0.6rem',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: 'var(--color-stone)',
                        marginBottom: '0.35rem',
                        textAlign: isOwn ? 'right' : 'left',
                      }}
                    >
                      {isOwn ? 'You' : otherUser.full_name?.split(' ')[0] || '—'}
                      {' · '}
                      <span style={{ fontStyle: 'italic', textTransform: 'none', letterSpacing: 'normal' }}>
                        {formatTime(msg.created_at)}
                      </span>
                      {isOwn && msg.is_read && (
                        <>
                          {' · '}
                          <span
                            style={{
                              fontStyle: 'italic',
                              textTransform: 'none',
                              letterSpacing: 'normal',
                              color: 'var(--color-stone-dark)',
                            }}
                          >
                            read
                          </span>
                        </>
                      )}
                    </p>
                    <div
                      style={{
                        padding: '0.9rem 1.1rem',
                        background: isOwn
                          ? 'var(--color-ink)'
                          : 'var(--color-cream)',
                        color: isOwn
                          ? 'var(--color-warm-white)'
                          : 'var(--color-ink)',
                      }}
                    >
                      <p
                        style={{
                          fontSize: '0.95rem',
                          lineHeight: 1.55,
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontWeight: 300,
                        }}
                      >
                        {msg.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Composer ── */}
        <div
          style={{
            flexShrink: 0,
            borderTop: '1px solid var(--color-border-strong)',
            paddingTop: '1.2rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '1rem',
            }}
          >
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Write a line…"
                rows={1}
                maxLength={2000}
                className="commission-field"
                style={{
                  resize: 'none',
                  maxHeight: 140,
                  minHeight: 48,
                  fontSize: '0.95rem',
                }}
              />
              {showCharCount && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 6,
                    right: 10,
                    fontSize: '0.65rem',
                    color:
                      charCount > 1950
                        ? 'var(--color-terracotta, #c45d3e)'
                        : 'var(--color-stone)',
                    fontStyle: 'italic',
                  }}
                  className="font-serif"
                >
                  {charCount} / 2000
                </span>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending || sendCooldown}
              className="artwork-primary-cta artwork-primary-cta--compact"
              style={{
                minWidth: '8rem',
                opacity:
                  !newMessage.trim() || sending || sendCooldown ? 0.4 : 1,
              }}
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
