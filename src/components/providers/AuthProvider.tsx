'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@/types/database';
import { getCurrentUser, onAuthStateChange } from '@/lib/supabase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    const profile = await getCurrentUser();
    setUser(profile);
  }

  useEffect(() => {
    getCurrentUser().then((profile) => {
      setUser(profile);
      setLoading(false);
    });

    const { data: { subscription } } = onAuthStateChange((profile) => {
      setUser(profile);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
