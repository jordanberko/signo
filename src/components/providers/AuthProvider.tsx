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
      resolve(null);
    } else {
      // ── PRIMARY PATH: server-side session check ──
      // Calls our own API endpoint which uses the server-side Supabase client.
      // This completely bypasses navigator.locks and the browser Supabase client.
      // The server reads session cookies, validates with Supabase, fetches profile.
      fetch('/api/auth/session')
        .then((res) => res.json())
        .then((data) => {
          if (mountedRef.current && !resolved) {
            resolve(data.user ?? null);
          }
        })
        .catch(() => {
          // If the API call fails, fall through to onAuthStateChange
        });
    }

    // ── SECONDARY PATH: onAuthStateChange for subsequent events ──
    // Handles SIGNED_IN (after login), SIGNED_OUT (after logout),
    // TOKEN_REFRESHED, and USER_UPDATED. Also serves as a fallback
    // if the API call above fails.
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      // Skip INITIAL_SESSION — the API call above handles it.
      if (event === 'INITIAL_SESSION') {
        // Only use as fallback if the API call hasn't resolved yet.
        if (!resolved && session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (mountedRef.current) resolve(profile);
        } else if (!resolved) {
          resolve(null);
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        // Force update even if already resolved (user logged out).
        if (mountedRef.current) {
          resolved = true; // prevent further updates
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

    // Safety timeout: 6 seconds. Generous because the API call
    // should resolve in ~300-500ms on a warm function.
    const timeout = setTimeout(() => {
      if (!resolved && mountedRef.current) {
        resolve(null);
      }
    }, 6000);

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
