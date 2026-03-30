'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { signOut as authSignOut } from '@/lib/supabase/auth';
import type { Profile } from '@/lib/types/database';

interface UseUserReturn {
  /** The current user's profile row, or null if not authenticated. */
  user: Profile | null;
  /** True while the initial fetch is in progress. */
  loading: boolean;
  /** Non-null when the last fetch failed. */
  error: string | null;
  /** Force-refresh the cached profile from the database. */
  refresh: () => Promise<void>;
  /** Sign out, clear the cache, and redirect to /. */
  signOut: () => Promise<void>;
}

/**
 * Custom hook that returns the current user's full *profile* row
 * (not just the Supabase auth user).  The profile is fetched once
 * on mount, cached in state, and refreshed whenever the auth
 * session changes.
 */
export function useUser(): UseUserReturn {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError) {
      setError(profileError.message);
    } else {
      setUser(profile);
      setError(null);
    }

    setLoading(false);
  }, []);

  // Initial fetch + subscribe to auth changes
  useEffect(() => {
    const supabase = createClient();

    const handleAuthChange = async (session: { user: { id: string } } | null) => {
      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (profileError) {
          setError(profileError.message);
        } else {
          setUser(profile);
          setError(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    // Initial fetch
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        handleAuthChange({ user: { id: authUser.id } });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await handleAuthChange(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = useCallback(async () => {
    await authSignOut();
    setUser(null);
    router.push('/');
    router.refresh();
  }, [router]);

  return {
    user,
    loading,
    error,
    refresh: fetchProfile,
    signOut: handleSignOut,
  };
}
