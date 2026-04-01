'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { signIn, signInWithGoogle } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(authError === 'auth' ? 'Something went wrong with sign in. Please try again.' : '');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // If user is already logged in, redirect away from login page
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const redirect = searchParams.get('redirect');
        window.location.href = redirect ? decodeURIComponent(redirect) : '/dashboard';
      }
    });
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      // Friendlier error messages
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

    try {
      // Make a server round-trip to ensure the session cookies are properly set
      // on the server side. Without this, the middleware may not see the session.
      const rawRedirect = searchParams.get('redirect');
      const redirectPath = rawRedirect ? decodeURIComponent(rawRedirect) : null;

      const res = await fetch('/api/auth/session', {
        method: 'POST',
        credentials: 'include',
      });
      const session = await res.json().catch(() => ({ authenticated: false, role: 'buyer' }));

      let destination = redirectPath;
      if (!destination) {
        destination = session.role === 'artist' ? '/artist/dashboard' : '/dashboard';
      }

      window.location.href = destination;
    } catch {
      // Even if the session check fails, try to redirect — the cookies might still work
      window.location.href = '/dashboard';
    }

    // Safety net: if nothing has redirected after 5 seconds, force it
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 5000);
  }

  async function handleGoogleSignIn() {
    setError('');
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
    // Google OAuth redirects away — no need to setGoogleLoading(false) on success
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="font-editorial text-3xl font-medium text-primary hover:text-accent-dark transition-colors">
            SIGNO
          </Link>
          <h1 className="font-editorial text-2xl font-medium mt-6">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">Sign in to your account</p>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-3 bg-white border border-border rounded-full text-sm font-medium hover:bg-muted-bg transition-colors disabled:opacity-50"
        >
          {googleLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          ) : (
            <GoogleIcon />
          )}
          {googleLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-warm-gray uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 bg-error/5 border border-error/20 text-error text-sm rounded-xl animate-fade-in">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors"
                placeholder="Your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-gray hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-accent-light transition-colors duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer link */}
        <p className="text-center text-sm text-muted mt-8">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-accent-dark font-medium link-underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
