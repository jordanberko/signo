'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
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
  const resolved = useRef(false);

  function markResolved() {
    if (!resolved.current) {
      resolved.current = true;
      setLoading(false);
    }
  }

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
    // Fetch current user profile
    getCurrentUser()
      .then((profile) => {
        setUser(profile);
      })
      .catch(() => {
        // Session expired or user not logged in — clear state
        setUser(null);
      })
      .finally(() => {
        markResolved();
      });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = onAuthStateChange((profile) => {
      setUser(profile);
      markResolved();
    });

    // Safety timeout: if auth takes longer than 3 seconds, stop loading
    // so the header always renders sign-in buttons rather than nothing
    const timeout = setTimeout(() => {
      markResolved();
    }, 3000);

    return () => {
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
