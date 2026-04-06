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

/** Check if any Supabase auth cookies exist (quick boolean, no parsing). */
function hasAuthCookies(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((c) => c.trim().startsWith('sb-'));
}

/**
 * Fetch a profile using the Supabase REST API directly (no JS client needed).
 * Bypasses navigator.locks entirely.
 */
async function fetchProfileREST(
  userId: string,
  accessToken: string,
): Promise<Profile | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Try to read the session from Supabase auth cookies.
 *
 * Supabase SSR stores the session either as a single cookie
 * (sb-<ref>-auth-token) or chunked across multiple cookies
 * (sb-<ref>-auth-token.0, .1, .2, ...).
 *
 * Each chunk value is URL-encoded by cookie.serialize(). We decode each
 * chunk, concatenate, then optionally strip the "base64-" prefix.
 */
function getSessionFromCookies(): {
  userId: string;
  accessToken: string;
} | null {
  if (typeof document === 'undefined') return null;
  try {
    // Build a map of cookie name → raw value
    const cookieMap: Record<string, string> = {};
    for (const c of document.cookie.split(';')) {
      const eqIdx = c.indexOf('=');
      if (eqIdx === -1) continue;
      cookieMap[c.slice(0, eqIdx).trim()] = c.slice(eqIdx + 1).trim();
    }

    // Find the base key: "sb-<ref>-auth-token"
    // First check for a non-chunked cookie, then derive from .0
    let baseKey: string | null = null;
    for (const name of Object.keys(cookieMap)) {
      if (
        name.startsWith('sb-') &&
        name.includes('auth-token') &&
        !name.match(/\.\d+$/)
      ) {
        baseKey = name;
        break;
      }
    }
    if (!baseKey) {
      for (const name of Object.keys(cookieMap)) {
        if (name.startsWith('sb-') && name.endsWith('-auth-token.0')) {
          baseKey = name.replace(/\.0$/, '');
          break;
        }
      }
    }
    if (!baseKey) return null;

    // Reassemble: non-chunked or chunked
    let combined = '';
    if (cookieMap[baseKey] != null && cookieMap[`${baseKey}.0`] == null) {
      combined = decodeURIComponent(cookieMap[baseKey]);
    } else {
      for (let i = 0; ; i++) {
        const raw = cookieMap[`${baseKey}.${i}`];
        if (raw == null) break;
        combined += decodeURIComponent(raw);
      }
    }
    if (!combined) return null;

    // Handle optional "base64-" prefix (cookieEncoding: "base64url")
    let jsonStr = combined;
    if (combined.startsWith('base64-')) {
      const b64 = combined.slice(7);
      jsonStr = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
    }

    const parsed = JSON.parse(jsonStr);
    const accessToken: string | undefined = parsed?.access_token;
    if (!accessToken) return null;

    // Decode JWT payload (second segment) for the user ID
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
    );
    if (!payload.sub) return null;

    return { userId: payload.sub, accessToken };
  } catch {
    return null;
  }
}

/** Fetch profile using the Supabase JS client. */
async function fetchProfileClient(
  userId: string,
): Promise<Profile | null> {
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
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
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

    function resolve(profile: Profile | null) {
      if (!mountedRef.current || resolved) return;
      resolved = true;
      setUser(profile);
      setLoading(false);
    }

    // ── FAST PATH: no auth cookies → anonymous immediately ──
    if (!hasAuthCookies()) {
      resolve(null);
      // Still subscribe to onAuthStateChange for future sign-ins
    } else {
      // ── TRY COOKIE PARSING for instant auth ──
      const session = getSessionFromCookies();
      if (session) {
        // We got a user ID from cookies — fetch profile via REST (no locks)
        fetchProfileREST(session.userId, session.accessToken).then(
          (profile) => {
            // Only resolve if onAuthStateChange hasn't beaten us
            if (!resolved && mountedRef.current) {
              resolve(profile);
            }
          },
        );
      }
      // If cookie parsing failed (session === null), DON'T resolve as anonymous.
      // Fall through to onAuthStateChange below.
    }

    // ── RELIABLE PATH: onAuthStateChange handles all auth events ──
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      if (event === 'SIGNED_OUT') {
        resolve(null);
        return;
      }

      if (session?.user) {
        if (event === 'SIGNED_IN') {
          // New sign-in: profile trigger may not have fired yet — retry
          let profile: Profile | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            profile = await fetchProfileClient(session.user.id);
            if (profile) break;
            if (attempt < 2) {
              await new Promise((r) =>
                setTimeout(r, attempt === 0 ? 200 : 500),
              );
            }
          }
          if (mountedRef.current) {
            resolve(profile);
          }
        } else if (
          event === 'INITIAL_SESSION' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          const profile = await fetchProfileClient(session.user.id);
          if (mountedRef.current) {
            resolve(profile);
          }
        }
      } else if (event === 'INITIAL_SESSION') {
        // No session at all — user is anonymous
        resolve(null);
      }
    });

    // Safety timeout: 4 seconds. Should never be needed but prevents
    // infinite loading in edge cases.
    const timeout = setTimeout(() => {
      if (!resolved && mountedRef.current) {
        resolve(null);
      }
    }, 4000);

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
