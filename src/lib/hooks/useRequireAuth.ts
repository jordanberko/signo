'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

/**
 * Client-side auth gate hook. Call at the top of any protected page.
 *
 * Uses the AuthProvider context (which already manages session state)
 * instead of creating a separate Supabase client. This avoids lock
 * contention with navigator.locks that can cause pages to hang.
 *
 * - If user is not authenticated → redirects to /login
 * - If requiredRole is set and user doesn't have it → redirects to /dashboard
 * - While checking → returns loading=true (show a spinner)
 * - When authorised → returns user profile + loading=false
 */
export function useRequireAuth(requiredRole?: string) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // Still checking auth state

    if (!user) {
      window.location.href =
        '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    if (
      requiredRole &&
      (user as Record<string, unknown>).role !== requiredRole &&
      (user as Record<string, unknown>).role !== 'admin'
    ) {
      window.location.href = '/dashboard';
      return;
    }
  }, [user, loading, requiredRole]);

  return { user, loading };
}
