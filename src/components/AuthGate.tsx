'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

interface AuthGateProps {
  children: React.ReactNode;
  /** Roles allowed to view this page. If empty, any authenticated user is allowed. */
  allowedRoles?: string[];
  /** Where to redirect if not authenticated. Defaults to /login. */
  loginUrl?: string;
}

/**
 * Client-side auth gate. Wraps protected page content.
 * Uses the shared AuthProvider context instead of making independent API calls.
 */
export default function AuthGate({
  children,
  allowedRoles = [],
  loginUrl = '/login',
}: AuthGateProps) {
  const { user, loading } = useAuth();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Server-side proxy normally catches this first. This is the fallback
      // when a signed-in session expires mid-session and the client renders
      // before the next request hits the proxy.
      const path = window.location.pathname + window.location.search;
      const returnUrl = encodeURIComponent(path);
      window.location.href = `${loginUrl}?redirect=${returnUrl}`;
      return;
    }

    if (allowedRoles.length > 0) {
      const role = (user as Record<string, unknown>).role as string ?? 'buyer';
      if (!allowedRoles.includes(role) && role !== 'admin') {
        // Send the user to their own home, not an unrelated role's dashboard.
        const home =
          role === 'artist'
            ? '/artist/dashboard'
            : role === 'admin'
              ? '/admin/dashboard'
              : '/dashboard';
        window.location.href = home;
        return;
      }
    }

    setAuthorized(true);
  }, [user, loading, allowedRoles, loginUrl]);

  if (!authorized) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <span className="editorial-spinner" aria-hidden="true" />
        <span className="sr-only">Checking your access — one moment.</span>
      </div>
    );
  }

  return <>{children}</>;
}
