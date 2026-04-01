'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Client-side auth gate hook. Call at the top of any protected page.
 *
 * - If user is not authenticated → redirects to /login
 * - If requiredRole is set and user doesn't have it → redirects to /dashboard
 * - While checking → returns loading=true (show a spinner)
 * - When authorised → returns user profile + loading=false
 */
export function useRequireAuth(requiredRole?: string) {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const check = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          window.location.href =
            '/login?redirect=' + encodeURIComponent(window.location.pathname);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (!profile) {
          window.location.href = '/login';
          return;
        }

        if (
          requiredRole &&
          profile.role !== requiredRole &&
          profile.role !== 'admin'
        ) {
          window.location.href = '/dashboard';
          return;
        }

        setUser(profile);
        setLoading(false);
      } catch {
        // On any error, redirect to login
        window.location.href =
          '/login?redirect=' + encodeURIComponent(window.location.pathname);
      }
    };

    check();
  }, [requiredRole]);

  return { user, loading };
}
