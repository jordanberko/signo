'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn, signInWithGoogle } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/AuthProvider';

function GoogleGlyph() {
  return (
    <svg style={{ width: '1.1rem', height: '1.1rem' }} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853" />
      <path d="M5.84 14.09a7.18 7.18 0 0 1 0-4.17V7.07H2.18A11.97 11.97 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.56-2.77v-.54Z" fill="#FBBC05" />
      <path d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16Z" fill="#EA4335" />
    </svg>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');
  const { user: authUser, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(
    authError === 'auth'
      ? 'Something went wrong with sign in. Please try again.'
      : authError === 'no-profile'
        ? 'Your account profile could not be found. Please try signing up again or contact support.'
        : ''
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (authError === 'no-profile') {
      const supabase = createClient();
      supabase.auth.signOut();
      return;
    }

    if (authUser) {
      const redirect = searchParams.get('redirect');
      if (redirect) {
        window.location.href = decodeURIComponent(redirect);
      } else {
        const role = authUser.role;
        window.location.href = role === 'artist' || role === 'admin' ? '/artist/dashboard' : '/browse';
      }
    }
  }, [authUser, authLoading, searchParams, authError]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const safetyTimeout = setTimeout(() => {
      window.location.href = '/browse';
    }, 8000);

    try {
      const { error } = await Promise.race([
        signIn(email, password),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Sign in timed out. Please try again.')), 10000)
        ),
      ]);

      if (error) {
        clearTimeout(safetyTimeout);
        if (error.message.includes('Invalid login credentials')) {
          setError('Incorrect email or password. Please try again.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and confirm your account before signing in.');
        } else {
          setError(error.message);
        }
        setLoading(false);
        return;
      }

      clearTimeout(safetyTimeout);
      const rawRedirect = searchParams.get('redirect');
      if (rawRedirect) {
        window.location.href = decodeURIComponent(rawRedirect);
      } else {
        // Fetch session to determine role for redirect
        try {
          const sessionRes = await fetch('/api/auth/session');
          const sessionData = sessionRes.ok ? await sessionRes.json() : null;
          const role = sessionData?.user?.role;
          window.location.href = role === 'artist' || role === 'admin' ? '/artist/dashboard' : '/browse';
        } catch {
          window.location.href = '/browse';
        }
      }
    } catch (err) {
      clearTimeout(safetyTimeout);
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  return (
    <div
      style={{
        background: 'var(--color-warm-white)',
        minHeight: '100vh',
      }}
    >
      <div
        className="grid grid-cols-1 lg:grid-cols-12 px-6 sm:px-10"
        style={{
          gap: 'clamp(2.5rem, 5vw, 5rem)',
          paddingTop: 'clamp(4rem, 9vw, 7rem)',
          paddingBottom: 'clamp(4rem, 8vw, 7rem)',
          minHeight: '100vh',
          alignItems: 'start',
        }}
      >
        {/* ── Editorial column (5/12) ── */}
        <div className="lg:col-span-5" style={{ position: 'sticky', top: 'clamp(4rem, 9vw, 7rem)' }}>
          <Link
            href="/"
            className="font-serif"
            style={{
              fontSize: '0.68rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--color-stone)',
              textDecoration: 'none',
              fontStyle: 'normal',
              fontFamily: 'inherit',
            }}
          >
            ← Signo
          </Link>
          <p
            style={{
              fontSize: '0.62rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--color-stone)',
              marginTop: '2.2rem',
              marginBottom: '1.2rem',
            }}
          >
            Sign in
          </p>
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(2.6rem, 6vw, 4.8rem)',
              lineHeight: 1.02,
              letterSpacing: '-0.015em',
              color: 'var(--color-ink)',
              fontWeight: 400,
              maxWidth: '12ch',
            }}
          >
            Welcome <em style={{ fontStyle: 'italic' }}>back.</em>
          </h1>
          <p
            style={{
              marginTop: '1.8rem',
              fontSize: '1rem',
              fontWeight: 300,
              lineHeight: 1.7,
              color: 'var(--color-stone-dark)',
              maxWidth: '38ch',
            }}
          >
            Access the studio, the ledger, and the works you&apos;ve saved. New to Signo?{' '}
            <Link
              href="/register"
              style={{
                color: 'var(--color-ink)',
                borderBottom: '1px solid var(--color-stone)',
                textDecoration: 'none',
              }}
            >
              Create an account
            </Link>
            .
          </p>
        </div>

        {/* ── Form column (7/12) ── */}
        <div className="lg:col-span-7" style={{ maxWidth: '34rem' }}>
          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.8rem',
              padding: '1rem 1.4rem',
              background: 'transparent',
              border: '1px solid var(--color-border-strong)',
              fontSize: '0.78rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-ink)',
              fontWeight: 400,
              cursor: googleLoading || loading ? 'not-allowed' : 'pointer',
              opacity: googleLoading || loading ? 0.5 : 1,
              transition: 'background 200ms',
            }}
          >
            <GoogleGlyph />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Hairline divider with italic "or" */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.4rem',
              margin: 'clamp(2rem, 4vw, 2.8rem) 0',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            <span
              className="font-serif"
              style={{
                fontSize: '0.85rem',
                fontStyle: 'italic',
                color: 'var(--color-stone)',
              }}
            >
              or
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
          </div>

          {/* Email / Password */}
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="commission-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="commission-field"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div style={{ marginTop: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
              <label htmlFor="password" className="commission-label">
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="commission-field"
                  style={{ paddingRight: '4.5rem' }}
                  placeholder="Your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="font-serif"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    padding: '0.4rem 0',
                    fontSize: '0.78rem',
                    fontStyle: 'italic',
                    color: 'var(--color-stone)',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? 'hide' : 'show'}
                </button>
              </div>
            </div>

            {error && (
              <p
                className="font-serif error-animate"
                style={{
                  marginTop: '1.6rem',
                  fontSize: '0.92rem',
                  color: 'var(--color-terracotta, #c45d3e)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  lineHeight: 1.5,
                  maxWidth: '44ch',
                }}
              >
                {error}
              </p>
            )}

            <div style={{ marginTop: 'clamp(2rem, 4vw, 2.8rem)' }}>
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="artwork-primary-cta artwork-primary-cta--compact"
                style={{ minWidth: '14rem' }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </div>

            <p
              style={{
                marginTop: 'clamp(2rem, 3vw, 2.4rem)',
                fontSize: '0.85rem',
                color: 'var(--color-stone)',
                fontWeight: 300,
              }}
            >
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="font-serif"
                style={{
                  color: 'var(--color-ink)',
                  fontStyle: 'italic',
                  borderBottom: '1px solid var(--color-stone)',
                  textDecoration: 'none',
                }}
              >
                Create one
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      <div
        className="px-6 sm:px-10"
        style={{ paddingTop: 'clamp(4rem, 9vw, 7rem)' }}
      >
        <p
          style={{
            fontSize: '0.62rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            marginBottom: '1.2rem',
          }}
        >
          Sign in
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(2.6rem, 6vw, 4.8rem)',
            lineHeight: 1.02,
            letterSpacing: '-0.015em',
            color: 'var(--color-ink)',
            fontWeight: 400,
          }}
        >
          Welcome <em style={{ fontStyle: 'italic' }}>back.</em>
        </h1>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
