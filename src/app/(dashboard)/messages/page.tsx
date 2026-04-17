'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import Avatar from '@/components/ui/Avatar';
import EditorialSpinner from '@/components/ui/EditorialSpinner';

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
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// ── Shell ──

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      <div
        className="px-6 sm:px-10"
        style={{
          maxWidth: '62rem',
          margin: '0 auto',
          paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
        }}
      >
        {children}
      </div>
    </div>
  );
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

  if (authLoading) return <EditorialSpinner />;
  if (loading) return <EditorialSpinner headline="Retrieving your correspondence…" />;

  // Editorial header fragment reused across states
  const header = (
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
        The Studio · Messages
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
        Your <em style={{ fontStyle: 'italic' }}>correspondence.</em>
      </h1>
      <p
        style={{
          fontSize: '0.92rem',
          fontWeight: 300,
          color: 'var(--color-stone-dark)',
          lineHeight: 1.6,
        }}
      >
        {conversations.length > 0
          ? `${conversations.length} thread${conversations.length === 1 ? '' : 's'} with artists and collectors.`
          : 'A quiet ledger of direct exchanges between you and the artists you follow.'}
      </p>
    </header>
  );

  if (error) {
    return (
      <PageShell>
        {header}
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
              setError(null);
              loadConversations();
            }}
            className="editorial-link"
          >
            Try again
          </button>
        </div>
      </PageShell>
    );
  }

  if (conversations.length === 0) {
    return (
      <PageShell>
        {header}
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
            No messages yet.
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
            When you reach out to an artist about a work — for a commission, a
            studio visit, or simply a question — the thread will settle here.
          </p>
          <Link
            href="/artists"
            className="editorial-link"
            style={{ marginTop: '1.6rem', display: 'inline-block' }}
          >
            Visit the artist directory →
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {header}
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          borderTop: '1px solid var(--color-border-strong)',
        }}
      >
        {conversations.map((convo) => {
          const unread = convo.unreadCount > 0;
          return (
            <li
              key={convo.id}
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <Link
                href={`/messages/${convo.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.4rem',
                  padding: '1.4rem 0',
                  textDecoration: 'none',
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar
                    avatarUrl={convo.otherUser.avatar_url}
                    name={convo.otherUser.full_name || '?'}
                    size={56}
                  />
                  {unread && (
                    <span
                      aria-label={`${convo.unreadCount} unread`}
                      style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--color-terracotta, #c45d3e)',
                        border: '1.5px solid var(--color-warm-white)',
                      }}
                    />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <p
                      className="font-serif"
                      style={{
                        fontSize: '1.1rem',
                        color: 'var(--color-ink)',
                        fontWeight: 400,
                        fontStyle: unread ? 'italic' : 'normal',
                        margin: 0,
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {convo.otherUser.full_name || 'Unknown'}
                    </p>
                    <span
                      className="font-serif"
                      style={{
                        fontSize: '0.7rem',
                        fontStyle: 'italic',
                        color: 'var(--color-stone)',
                        letterSpacing: '0.08em',
                        flexShrink: 0,
                      }}
                    >
                      {timeAgo(convo.lastMessageAt)}
                    </span>
                  </div>
                  {convo.artwork && (
                    <p
                      style={{
                        marginTop: '0.25rem',
                        fontSize: '0.7rem',
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: 'var(--color-stone)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Re · {convo.artwork.title}
                    </p>
                  )}
                  <p
                    style={{
                      marginTop: '0.35rem',
                      fontSize: '0.88rem',
                      color: unread
                        ? 'var(--color-ink)'
                        : 'var(--color-stone-dark)',
                      fontWeight: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.4,
                    }}
                  >
                    {convo.lastMessage || 'No messages yet'}
                  </p>
                </div>

                {convo.artwork && convo.artwork.images?.[0] && (
                  <div
                    className="hidden sm:block"
                    style={{
                      width: 56,
                      height: 56,
                      background: 'var(--color-cream)',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}
                  >
                    <Image
                      src={convo.artwork.images[0]}
                      alt={convo.artwork.title}
                      width={56}
                      height={56}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
