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
      const returnUrl = encodeURIComponent(window.location.pathname);
      window.location.href = `${loginUrl}?redirect=${returnUrl}`;
      return;
    }

    if (allowedRoles.length > 0) {
      const role = (user as Record<string, unknown>).role as string ?? 'buyer';
      if (!allowedRoles.includes(role) && role !== 'admin') {
        window.location.href = '/dashboard';
        return;
      }
    }

    setAuthorized(true);
  }, [user, loading, allowedRoles, loginUrl]);

  if (!authorized) {
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
