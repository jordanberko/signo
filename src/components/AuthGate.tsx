'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AuthGateProps {
  children: React.ReactNode;
  /** Roles allowed to view this page. If empty, any authenticated user is allowed. */
  allowedRoles?: string[];
  /** Where to redirect if not authenticated. Defaults to /login. */
  loginUrl?: string;
}

/**
 * Client-side auth gate. Wraps protected page content.
 * If the user is not authenticated, redirects to login.
 * If the user doesn't have the right role, redirects to /dashboard.
 * Shows nothing while checking (prevents flash of content).
 */
export default function AuthGate({
  children,
  allowedRoles = [],
  loginUrl = '/login',
}: AuthGateProps) {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        // Not authenticated — redirect to login with return URL
        const returnUrl = encodeURIComponent(window.location.pathname);
        window.location.href = `${loginUrl}?redirect=${returnUrl}`;
        return;
      }

      // Check role if required
      if (allowedRoles.length > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const role = profile?.role ?? 'buyer';
        if (!allowedRoles.includes(role)) {
          window.location.href = '/dashboard';
          return;
        }
      }

      setAuthorized(true);
    });
  }, [allowedRoles, loginUrl]);

  if (!authorized) {
    // Show a minimal loading state while checking auth
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: '3px solid #E8E2D9',
            borderTopColor: '#2C2C2A',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <>{children}</>;
}
