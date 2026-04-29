'use client';

import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import EditorialSpinner from '@/components/ui/EditorialSpinner';
import type { User } from '@/types/database';

const KICKER: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
  fontWeight: 400,
  margin: 0,
};

const COLUMN_HEAD: React.CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
  fontWeight: 400,
  textAlign: 'left',
  padding: '1rem 1rem 1rem 0',
  borderBottom: '1px solid var(--color-border-strong)',
};

type RoleFilter = 'all' | 'artist' | 'buyer' | 'admin';
type RoleValue = 'buyer' | 'artist' | 'admin';

const FILTERS: Array<{ value: RoleFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'artist', label: 'Artists' },
  { value: 'buyer', label: 'Buyers' },
  { value: 'admin', label: 'Admins' },
];

export default function AdminUsersPage() {
  const { loading: authLoading } = useRequireAuth('admin');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    fetchUsers();
  }, [roleFilter, authLoading]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?role=${roleFilter}`);
      const json = await res.json();
      if (!res.ok) {
        console.error('[AdminUsers] API error:', json.error);
        return;
      }
      setUsers((json.data || []) as User[]);
    } catch (err) {
      console.error('[AdminUsers] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(userId: string, newRole: RoleValue) {
    setActionError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const message =
          json.error ||
          `Couldn't update this user's role (${res.status}). Please try again.`;
        console.error('[AdminUsers] Update error:', message);
        setActionError(message);
        return;
      }
    } catch (err) {
      console.error('[AdminUsers] Update exception:', err);
      setActionError('Network error. Please check your connection and try again.');
      return;
    }
    fetchUsers();
  }

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.full_name ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q)
    );
  });

  if (authLoading) {
    return <EditorialSpinner label="Users" headline="One moment…" />;
  }

  return (
    <div
      className="px-6 sm:px-10"
      style={{
        maxWidth: '84rem',
        margin: '0 auto',
        paddingTop: 'clamp(3rem, 5vw, 4.5rem)',
        paddingBottom: 'clamp(5rem, 8vw, 7rem)',
      }}
    >
      {/* ── Heading ── */}
      <div style={{ marginBottom: 'clamp(2.4rem, 4vw, 3.4rem)' }}>
        <p style={KICKER}>— Users —</p>
        <h1
          className="font-serif"
          style={{
            marginTop: '1.2rem',
            fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.015em',
            color: 'var(--color-ink)',
            fontWeight: 400,
          }}
        >
          Everyone on the <em style={{ fontStyle: 'italic' }}>platform.</em>
        </h1>
      </div>

      {/* ── Filters ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.8rem',
          marginBottom: '2.4rem',
        }}
      >
        <div>
          <label htmlFor="user-search" className="commission-label">
            Search
          </label>
          <input
            id="user-search"
            type="text"
            placeholder="Name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="commission-field"
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.2rem',
            flexWrap: 'wrap',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {FILTERS.map((f) => {
            const active = roleFilter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setRoleFilter(f.value);
                  setActionError(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '0.8rem 1.2rem 0.8rem 0',
                  marginRight: '1.8rem',
                  fontSize: '0.72rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  fontWeight: 400,
                  color: active ? 'var(--color-ink)' : 'var(--color-stone)',
                  borderBottom: active
                    ? '1px solid var(--color-ink)'
                    : '1px solid transparent',
                  marginBottom: '-1px',
                  cursor: 'pointer',
                  transition: 'color var(--dur-fast) var(--ease-out)',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Action error ── */}
      {actionError && (
        <p
          className="font-serif"
          role="alert"
          style={{
            fontStyle: 'italic',
            color: 'var(--color-terracotta)',
            fontSize: '0.88rem',
            margin: 0,
            marginBottom: '1.6rem',
            lineHeight: 1.5,
          }}
        >
          {actionError}
        </p>
      )}

      {/* ── Table ── */}
      {loading ? (
        <EditorialSpinner label="Users" headline="Fetching the register…" />
      ) : filteredUsers.length === 0 ? (
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
            padding: '4rem 0',
            textAlign: 'center',
          }}
        >
          <p
            className="font-serif"
            style={{
              fontStyle: 'italic',
              color: 'var(--color-stone)',
              fontSize: '1rem',
            }}
          >
            No users match.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={COLUMN_HEAD}>Person</th>
                <th style={COLUMN_HEAD}>Role</th>
                <th style={COLUMN_HEAD}>Location</th>
                <th style={COLUMN_HEAD}>Joined</th>
                <th style={{ ...COLUMN_HEAD, textAlign: 'right', paddingRight: 0 }}>
                  Change role
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr
                  key={u.id}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td
                    style={{
                      padding: '1.2rem 1rem 1.2rem 0',
                      verticalAlign: 'middle',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div
                        style={{
                          width: '2.6rem',
                          height: '2.6rem',
                          background: 'var(--color-cream)',
                          border: '1px solid var(--color-border)',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        {u.avatar_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.avatar_url}
                            alt=""
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <p
                          className="font-serif"
                          style={{
                            fontSize: '1rem',
                            color: 'var(--color-ink)',
                            margin: 0,
                          }}
                        >
                          {u.full_name || 'Unnamed'}
                        </p>
                        <p
                          style={{
                            marginTop: '0.2rem',
                            fontSize: '0.78rem',
                            color: 'var(--color-stone-dark)',
                            fontWeight: 300,
                          }}
                        >
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1.2rem 1rem 1.2rem 0', verticalAlign: 'middle' }}>
                    <span className={`status-pill ${roleToPill(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '1.2rem 1rem 1.2rem 0',
                      verticalAlign: 'middle',
                      fontSize: '0.85rem',
                      color: 'var(--color-stone-dark)',
                      fontWeight: 300,
                    }}
                  >
                    {u.location || '—'}
                  </td>
                  <td
                    style={{
                      padding: '1.2rem 1rem 1.2rem 0',
                      verticalAlign: 'middle',
                      fontSize: '0.85rem',
                      color: 'var(--color-stone-dark)',
                      fontWeight: 300,
                      fontStyle: 'italic',
                    }}
                    className="font-serif"
                  >
                    {new Date(u.created_at).toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td
                    style={{
                      padding: '1.2rem 0 1.2rem 0',
                      verticalAlign: 'middle',
                      textAlign: 'right',
                    }}
                  >
                    <select
                      value={u.role}
                      onChange={(e) => updateRole(u.id, e.target.value as RoleValue)}
                      className="commission-field"
                      style={{
                        width: 'auto',
                        minWidth: '9rem',
                        fontSize: '0.8rem',
                        textAlign: 'right',
                      }}
                    >
                      <option value="buyer">Buyer</option>
                      <option value="artist">Artist</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function roleToPill(role: string): string {
  switch (role) {
    case 'admin':
      return 'status-pill--attention';
    case 'artist':
      return 'status-pill--success';
    case 'buyer':
      return 'status-pill--progress';
    default:
      return 'status-pill--neutral';
  }
}
