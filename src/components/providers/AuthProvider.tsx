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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

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
    const supabase = createClient();

    // Subscribe to all auth state changes including INITIAL_SESSION.
    // This is the single source of truth for auth state — no separate
    // getSession() call needed, which avoids lock contention.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
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
            }
          } else if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            const profile = await fetchProfile(session.user.id);
            if (mountedRef.current) {
              setUser(profile);
              setLoading(false);
            }
          }
        } else if (event === 'INITIAL_SESSION') {
          // No session at all — user is not logged in
          setUser(null);
          setLoading(false);
        }
      }
    );

    // 3. Safety timeout — if nothing resolves within 2s, stop loading
    //    so the header always renders something.
    const timeout = setTimeout(() => {
      if (mountedRef.current) setLoading(false);
    }, 2000);

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
