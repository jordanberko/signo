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

/**
 * Fetch a user's profile row from the profiles table.
 * Returns null if not found or on error.
 */
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

/** Check if Supabase auth cookies exist (without any network call). */
function hasAuthCookies(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((c) => c.trim().startsWith('sb-'));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const resolvedRef = useRef(false);

  async function refreshUser() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
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
    resolvedRef.current = false;
    const supabase = createClient();

    // Fast path: if no auth cookies exist, the user is definitely anonymous.
    // Resolve immediately without waiting for the Supabase client to initialize.
    if (!hasAuthCookies()) {
      setUser(null);
      setLoading(false);
      resolvedRef.current = true;
    }

    // Subscribe to all auth state changes including INITIAL_SESSION.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
          resolvedRef.current = true;
          return;
        }

        if (session?.user) {
          if (event === 'SIGNED_IN') {
            // Retry for new signups where the database trigger may not
            // have created the profile row yet
            let profile: Profile | null = null;
            for (let attempt = 0; attempt < 3; attempt++) {
              profile = await fetchProfile(session.user.id);
              if (profile) break;
              if (attempt < 2) {
                await new Promise((r) => setTimeout(r, attempt === 0 ? 200 : 500));
              }
            }
            if (mountedRef.current) {
              setUser(profile);
              setLoading(false);
              resolvedRef.current = true;
            }
          } else if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            const profile = await fetchProfile(session.user.id);
            if (mountedRef.current) {
              setUser(profile);
              setLoading(false);
              resolvedRef.current = true;
            }
          }
        } else if (event === 'INITIAL_SESSION') {
          // No session at all — user is not logged in
          setUser(null);
          setLoading(false);
          resolvedRef.current = true;
        }
      }
    );

    // Safety timeout — only fires if auth hasn't resolved yet.
    // 8 seconds is generous enough for lock acquisition + token refresh +
    // profile fetch, even on cold Vercel functions.
    const timeout = setTimeout(() => {
      if (mountedRef.current && !resolvedRef.current) {
        setLoading(false);
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
