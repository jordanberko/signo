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

    // ── DUAL-GATE: wait for BOTH server profile AND browser client ready ──
    // Gate 1: Server API returns the profile (reliable, no navigator.locks)
    // Gate 2: onAuthStateChange INITIAL_SESSION fires (browser client is ready)
    // We only resolve loading=false when BOTH gates have passed, so that
    // page components can safely query with the browser Supabase client.
    let profileLoaded = false;
    let clientReady = false;
    let loadedProfile: Profile | null = null;

    function tryResolve() {
      if (profileLoaded && clientReady && !resolved && mountedRef.current) {
        resolve(loadedProfile);
      }
    }

    // Gate 1: Server-side session check
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        loadedProfile = data.user ?? null;
        profileLoaded = true;
        tryResolve();
      })
      .catch(() => {
        // If API fails, still mark as loaded (null profile)
        loadedProfile = null;
        profileLoaded = true;
        tryResolve();
      });

    // Gate 2: Browser client initialization + subsequent events
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      if (event === 'INITIAL_SESSION') {
        // Browser client is now initialized and has its auth token.
        // This means subsequent queries via createClient() will include
        // the Authorization header.
        clientReady = true;
        tryResolve();
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

    // Safety timeout: 8 seconds. Covers both the API call (~300-500ms)
    // and INITIAL_SESSION (~500-2000ms with navigator.locks).
    const timeout = setTimeout(() => {
      if (!resolved && mountedRef.current) {
        // If the API loaded a profile but client isn't ready yet,
        // force-resolve anyway — better than infinite loading.
        if (profileLoaded) {
          resolve(loadedProfile);
        } else {
          resolve(null);
        }
      }
    }, 8000);

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
