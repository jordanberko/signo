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

  async function refreshUser() {
    try {
      const profile = await getCurrentUser();
      setUser(profile);
    } catch {
      // Auth may not be ready yet — ignore
    }
  }

  function clearUser() {
    setUser(null);
  }

  useEffect(() => {
    getCurrentUser()
      .then((profile) => {
        setUser(profile);
      })
      .catch(() => {
        // Ignore — user simply isn't logged in
      })
      .finally(() => {
        setLoading(false);
      });

    const { data: { subscription } } = onAuthStateChange((profile) => {
      setUser(profile);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
