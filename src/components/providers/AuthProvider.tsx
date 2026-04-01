'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@/types/database';
import { getCurrentUser, onAuthStateChange } from '@/lib/supabase/auth';

interface AuthContextType {
  user: User | null;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  async function refreshUser() {
    try {
      const profile = await getCurrentUser();
      setUser(profile);
    } catch {
      setUser(null);
    }
  }

  function clearUser() {
    setUser(null);
  }

  useEffect(() => {
    let mounted = true;

    // Primary auth check — getCurrentUser is authoritative for initial load
    getCurrentUser()
      .then((profile) => {
        if (mounted) {
          setUser(profile);
          setInitialCheckDone(true);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setUser(null);
          setInitialCheckDone(true);
          setLoading(false);
        }
      });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = onAuthStateChange((profile, event) => {
      if (!mounted) return;

      // For INITIAL_SESSION: only update if we haven't completed getCurrentUser yet,
      // AND the session actually has a user. Don't overwrite a valid user with null
      // from INITIAL_SESSION (which can fire before cookies are fully restored).
      if (event === 'INITIAL_SESSION') {
        if (!initialCheckDone && profile) {
          setUser(profile);
          setLoading(false);
        }
        return;
      }

      // For SIGNED_IN and TOKEN_REFRESHED: always update the user
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setUser(profile);
        setLoading(false);
        return;
      }

      // For SIGNED_OUT: clear the user
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
        return;
      }
    });

    // Safety timeout: if auth takes longer than 3 seconds, stop loading
    // so the header always renders something rather than nothing
    const timeout = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 3000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, clearUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
