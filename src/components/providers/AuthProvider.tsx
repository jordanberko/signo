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

/** Check if any Supabase auth cookies exist (quick boolean). */
function hasAuthCookies(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((c) => c.trim().startsWith('sb-'));
}

/** Fetch profile using the Supabase JS client (for post-init events). */
async function fetchProfile(userId: string): Promise<Profile | null> {
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
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (mountedRef.current) setUser(data.user ?? null);
    } catch {
      // ignore
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
      // Still initialise the Supabase client (it's a singleton, so cheap)
      // but resolve immediately since there's no session.
      const supabase = createClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mountedRef.current) return;
        if (event === 'INITIAL_SESSION') return; // no-op for anon
        if (event === 'SIGNED_IN' && session?.user) {
          let profile: Profile | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            profile = await fetchProfile(session.user.id);
            if (profile) break;
            if (attempt < 2) {
              await new Promise((r) =>
                setTimeout(r, attempt === 0 ? 200 : 500),
              );
            }
          }
          if (mountedRef.current) {
            setUser(profile);
            setLoading(false);
          }
        }
        if (event === 'SIGNED_OUT' && mountedRef.current) {
          setUser(null);
        }
      });

      resolve(null);

      return () => {
        mountedRef.current = false;
        subscription.unsubscribe();
      };
    }

    // ── SERVER-FIRST AUTH: resolve as soon as server returns profile ──
    // The server API is reliable (no navigator.locks) and fast (~300ms).
    // We resolve loading=false immediately when it returns, so the page
    // shell renders instantly. Each page's getReadyClient() handles
    // waiting for the browser client to be ready before data queries.

    // Primary: Server-side session check — resolves auth state
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (mountedRef.current && !resolved) {
          resolve(data.user ?? null);
        }
      })
      .catch(() => {
        // If API fails, fall through to onAuthStateChange
      });

    // Secondary: Browser client events for sign-in/out/refresh
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      if (event === 'INITIAL_SESSION') {
        // Fallback: if API hasn't resolved yet, use INITIAL_SESSION
        if (!resolved && session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (mountedRef.current) resolve(profile);
        } else if (!resolved) {
          resolve(null);
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        if (mountedRef.current) {
          resolved = true;
          setUser(null);
          setLoading(false);
        }
        return;
      }

      if (session?.user) {
        if (event === 'SIGNED_IN') {
          let profile: Profile | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            profile = await fetchProfile(session.user.id);
            if (profile) break;
            if (attempt < 2) {
              await new Promise((r) =>
                setTimeout(r, attempt === 0 ? 200 : 500),
              );
            }
          }
          if (mountedRef.current) {
            resolved = true;
            setUser(profile);
            setLoading(false);
          }
        } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          const profile = await fetchProfile(session.user.id);
          if (mountedRef.current) {
            setUser(profile);
          }
        }
      }
    });

    // Safety timeout: 3 seconds. The server API should return in ~300ms.
    // If both API and INITIAL_SESSION fail, resolve as anonymous.
    const timeout = setTimeout(() => {
      if (!resolved && mountedRef.current) {
        resolve(null);
      }
    }, 3000);

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
