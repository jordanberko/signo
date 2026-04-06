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

/** Check if any Supabase auth cookies exist (quick boolean, no parsing). */
function hasAuthCookies(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((c) => c.trim().startsWith('sb-'));
}

/** Fetch a profile row from the profiles table using the Supabase client. */
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
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
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
    // This avoids waiting for the Supabase client to initialize when
    // we already know the user is not logged in.
    if (!hasAuthCookies()) {
      resolve(null);
    }

    // ── SINGLE SOURCE OF TRUTH: onAuthStateChange ──
    // The Supabase client handles cookie reading, token refresh, and
    // session restoration internally. We just listen for the result.
    //
    // Lock contention is no longer an issue because:
    // - Login page uses useAuth() instead of getUser()
    // - useRequireAuth uses useAuth() instead of its own client
    // - AuthGate uses useAuth() instead of getSession()
    // So the only lock consumer is this single onAuthStateChange subscription.
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
            profile = await fetchProfile(session.user.id);
            if (profile) break;
            if (attempt < 2) {
              await new Promise((r) =>
                setTimeout(r, attempt === 0 ? 200 : 500),
              );
            }
          }
          if (mountedRef.current) resolve(profile);
        } else if (
          event === 'INITIAL_SESSION' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          const profile = await fetchProfile(session.user.id);
          if (mountedRef.current) resolve(profile);
        }
      } else if (event === 'INITIAL_SESSION') {
        // No session — user is anonymous
        resolve(null);
      }
    });

    // Safety timeout: 4 seconds. Should rarely be needed now that
    // lock contention is eliminated, but prevents infinite loading.
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
