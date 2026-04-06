'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Profile } from '@/lib/types/database';
import { createClient } from '@/lib/supabase/client';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  clearUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
  clearUser: () => {},
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Extract the user ID from Supabase auth cookies WITHOUT using the Supabase
 * client (avoids navigator.locks entirely). The cookie value is a base64url-
 * encoded JSON blob containing an access_token JWT. We decode just the JWT
 * payload to read the `sub` claim.
 */
function getUserIdFromCookies(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const cookies = document.cookie.split(';');
    // Look for the auth token cookie: sb-<ref>-auth-token or the base64 variant
    for (const c of cookies) {
      const trimmed = c.trim();
      if (!trimmed.startsWith('sb-')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const name = trimmed.slice(0, eqIdx);
      if (!name.includes('auth-token')) continue;
      const value = decodeURIComponent(trimmed.slice(eqIdx + 1));

      // The cookie might be base64url-encoded JSON like: base64url({"access_token":"...","refresh_token":"...",...})
      // Or it could be the raw JSON. Try both.
      let parsed: { access_token?: string } | null = null;
      try {
        parsed = JSON.parse(value);
      } catch {
        // Try base64url decode
        try {
          const decoded = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
          parsed = JSON.parse(decoded);
        } catch {
          // Not valid
        }
      }

      if (parsed?.access_token) {
        // Decode JWT payload (second segment)
        const parts = parsed.access_token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          if (payload.sub) return payload.sub;
        }
      }
    }
  } catch {
    // Cookie parsing failed — fall through
  }
  return null;
}

/**
 * Fetch a profile using the Supabase REST API directly (no JS client needed).
 * This completely bypasses navigator.locks.
 */
async function fetchProfileREST(userId: string, accessToken?: string): Promise<Profile | null> {
  try {
    const headers: Record<string, string> = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    } else {
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
      { headers, cache: 'no-store' }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Get the access token from cookies (for use in REST API calls).
 */
function getAccessTokenFromCookies(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const trimmed = c.trim();
      if (!trimmed.startsWith('sb-')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const name = trimmed.slice(0, eqIdx);
      if (!name.includes('auth-token')) continue;
      const value = decodeURIComponent(trimmed.slice(eqIdx + 1));

      let parsed: { access_token?: string } | null = null;
      try {
        parsed = JSON.parse(value);
      } catch {
        try {
          const decoded = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
          parsed = JSON.parse(decoded);
        } catch {
          // skip
        }
      }
      if (parsed?.access_token) return parsed.access_token;
    }
  } catch {
    // skip
  }
  return null;
}

/** Fetch profile using the Supabase JS client (for events after init). */
async function fetchProfileClient(userId: string): Promise<Profile | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  async function refreshUser() {
    // Use the Supabase client for explicit refresh (user already authenticated,
    // lock contention is minimal after initialization).
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await fetchProfileClient(session.user.id);
      if (mountedRef.current) setUser(profile);
    } else {
      if (mountedRef.current) setUser(null);
    }
  }

  function clearUser() {
    setUser(null);
  }

  useEffect(() => {
    mountedRef.current = true;
    let resolved = false;

    // ── FAST PATH: read cookies directly (no Supabase client, no locks) ──
    const userId = getUserIdFromCookies();

    if (!userId) {
      // No auth cookies → user is anonymous. Resolve immediately.
      setUser(null);
      setLoading(false);
      resolved = true;
    } else {
      // We have a user ID from cookies — fetch their profile via REST API
      // (completely bypasses the Supabase JS client and navigator.locks).
      const accessToken = getAccessTokenFromCookies();
      fetchProfileREST(userId, accessToken ?? undefined).then((profile) => {
        if (!mountedRef.current) return;
        if (profile) {
          setUser(profile);
          setLoading(false);
          resolved = true;
        } else {
          // Profile not found — could be deleted or RLS issue.
          // Still resolve so the page doesn't hang.
          setUser(null);
          setLoading(false);
          resolved = true;
        }
      });
    }

    // ── SUBSCRIBE to auth changes for login/logout/token refresh ──
    // This handles events AFTER the initial load (SIGNED_IN, SIGNED_OUT, etc.)
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;

        // Skip INITIAL_SESSION — we already handled it above via cookies.
        if (event === 'INITIAL_SESSION') {
          // If our cookie fast-path hasn't resolved yet (rare edge case),
          // use the session from this event as a fallback.
          if (!resolved && session?.user) {
            const profile = await fetchProfileClient(session.user.id);
            if (mountedRef.current) {
              setUser(profile);
              setLoading(false);
              resolved = true;
            }
          } else if (!resolved) {
            setUser(null);
            setLoading(false);
            resolved = true;
          }
          return;
        }

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
          resolved = true;
          return;
        }

        if (session?.user) {
          if (event === 'SIGNED_IN') {
            // For new signups, the profile trigger may not have fired yet — retry.
            let profile: Profile | null = null;
            for (let attempt = 0; attempt < 3; attempt++) {
              profile = await fetchProfileClient(session.user.id);
              if (profile) break;
              if (attempt < 2) {
                await new Promise((r) => setTimeout(r, attempt === 0 ? 200 : 500));
              }
            }
            if (mountedRef.current) {
              setUser(profile);
              setLoading(false);
              resolved = true;
            }
          } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            const profile = await fetchProfileClient(session.user.id);
            if (mountedRef.current) {
              setUser(profile);
              setLoading(false);
              resolved = true;
            }
          }
        }
      }
    );

    // Safety timeout — 5 seconds max wait. Should never be needed now
    // since cookie parsing is synchronous, but just in case.
    const timeout = setTimeout(() => {
      if (mountedRef.current && !resolved) {
        setLoading(false);
        resolved = true;
      }
    }, 5000);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, clearUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
