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
 * Read the Supabase session from cookies WITHOUT using the Supabase client
 * (avoids navigator.locks entirely).
 *
 * @supabase/ssr chunks large cookies into sb-<ref>-auth-token.0, .1, .2 etc.
 * (max 3180 bytes per chunk). We need to find all chunks, concatenate them,
 * then decode the result (which may be raw JSON or prefixed with "base64-").
 */
function getSessionFromCookies(): { userId: string; accessToken: string } | null {
  if (typeof document === 'undefined') return null;
  try {
    const cookieMap: Record<string, string> = {};
    for (const c of document.cookie.split(';')) {
      const eqIdx = c.indexOf('=');
      if (eqIdx === -1) continue;
      const name = c.slice(0, eqIdx).trim();
      const value = c.slice(eqIdx + 1).trim();
      cookieMap[name] = value;
    }

    // Find the auth-token base key (e.g. "sb-leppiftwjreqqvfiartt-auth-token")
    let baseKey: string | null = null;
    for (const name of Object.keys(cookieMap)) {
      if (name.startsWith('sb-') && name.includes('auth-token') && !name.match(/\.\d+$/)) {
        baseKey = name;
        break;
      }
    }

    // If no non-chunked key found, derive it from a chunked key (.0)
    if (!baseKey) {
      for (const name of Object.keys(cookieMap)) {
        if (name.startsWith('sb-') && name.endsWith('-auth-token.0')) {
          baseKey = name.replace(/\.0$/, '');
          break;
        }
      }
    }
    if (!baseKey) return null;

    // Combine chunks: try the base key first, then .0, .1, .2, ...
    let combined = '';
    if (cookieMap[baseKey] !== undefined && !cookieMap[`${baseKey}.0`]) {
      // Non-chunked: single cookie
      combined = decodeURIComponent(cookieMap[baseKey]);
    } else {
      // Chunked: concatenate .0, .1, .2, ...
      for (let i = 0; ; i++) {
        const chunk = cookieMap[`${baseKey}.${i}`];
        if (chunk === undefined) break;
        combined += decodeURIComponent(chunk);
      }
    }

    if (!combined) return null;

    // Decode: handle "base64-" prefix or raw JSON
    let jsonStr = combined;
    if (combined.startsWith('base64-')) {
      const b64 = combined.slice(7); // strip "base64-" prefix
      jsonStr = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
    }

    const parsed = JSON.parse(jsonStr) as { access_token?: string };
    if (!parsed?.access_token) return null;

    // Decode JWT payload to get user ID (sub claim)
    const parts = parsed.access_token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.sub) return null;

    return { userId: payload.sub, accessToken: parsed.access_token };
  } catch {
    return null;
  }
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
      'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
    };

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
    const session = getSessionFromCookies();

    if (!session) {
      // No auth cookies → user is anonymous. Resolve immediately.
      setUser(null);
      setLoading(false);
      resolved = true;
    } else {
      // We have a user ID from cookies — fetch their profile via REST API
      // (completely bypasses the Supabase JS client and navigator.locks).
      fetchProfileREST(session.userId, session.accessToken).then((profile) => {
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
