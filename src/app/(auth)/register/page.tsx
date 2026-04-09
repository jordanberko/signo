'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, Check, ShoppingBag, Palette } from 'lucide-react';
import { signUp, signInWithGoogle } from '@/lib/supabase/auth';
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

/** Returns a 0–4 score for password strength. */
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-error' };
  if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
  if (score === 3) return { score: 3, label: 'Good', color: 'bg-accent' };
  return { score: 4, label: 'Strong', color: 'bg-success' };
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get('role') === 'artist' ? 'artist' : 'buyer';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'buyer' | 'artist'>(defaultRole);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const passwordStrength = useMemo(() => {
    if (!password) return null;
    return getPasswordStrength(password);
  }, [password]);

  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions to continue.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await signUp(email, password, fullName, role);

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('An account with this email already exists. Try signing in instead.');
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      // Supabase returns a user but no session when email confirmation is required.
      // Also detect fake "success" for existing emails (empty identities array).
      const needsConfirmation = data?.user && !data.session;
      const isExistingEmail =
        data?.user?.identities && data.user.identities.length === 0;

      if (isExistingEmail) {
        setError('An account with this email already exists. Try signing in instead.');
        setLoading(false);
        return;
      }

      if (needsConfirmation) {
        // User created but they need to verify their email first
        // Send welcome email in background (fire-and-forget)
        fetch('/api/email/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name: fullName, role }),
        }).catch(() => {});
        setConfirmationSent(true);
        setLoading(false);
        return;
      }

      // Session exists — user is signed in immediately (email confirmation disabled)
      // Send welcome email in background (fire-and-forget)
      fetch('/api/email/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: fullName, role }),
      }).catch(() => {});
      // Small delay to let the profile trigger complete in the database
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Use window.location.href for full page reload — clears all cached state
      window.location.href = role === 'artist' ? '/artist/onboarding' : '/dashboard';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      setLoading(false);
      // Safety net: force redirect after 3 seconds
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 3000);
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

  // ── Email confirmation screen ──
  if (confirmationSent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <Link href="/" className="font-editorial text-3xl font-medium text-primary hover:text-accent-dark transition-colors">
            SIGNO
          </Link>

          <div className="mt-10 mb-6">
            <div className="w-16 h-16 bg-accent-subtle rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="h-7 w-7 text-accent-dark" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <h1 className="font-editorial text-2xl font-medium">Check your email</h1>
            <p className="mt-3 text-sm text-muted leading-relaxed max-w-sm mx-auto">
              We&apos;ve sent a confirmation link to <span className="font-medium text-foreground">{email}</span>.
              Click the link in the email to activate your account.
            </p>
          </div>

          <div className="space-y-3 text-sm text-muted">
            <p>Didn&apos;t receive the email? Check your spam folder.</p>
            <button
              type="button"
              onClick={() => setConfirmationSent(false)}
              className="text-accent-dark font-medium link-underline"
            >
              Try a different email
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm text-muted">
              Already confirmed?{' '}
              <Link href="/login" className="text-accent-dark font-medium link-underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="font-editorial text-3xl font-medium text-primary hover:text-accent-dark transition-colors">
            SIGNO
          </Link>
          <h1 className="font-editorial text-2xl font-medium mt-6">Join the community</h1>
          <p className="mt-2 text-sm text-muted">Create your account to start buying and selling</p>
        </div>

        {/* Google Sign Up */}
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
          {googleLoading ? 'Redirecting...' : 'Sign up with Google'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-warm-gray uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 bg-error/5 border border-error/20 text-error text-sm rounded-xl animate-fade-in">
              {error}
            </div>
          )}

          {/* Role Selection */}
          <div>
            <p className="text-xs font-medium tracking-wide uppercase text-muted mb-3">I&apos;m primarily here to</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('buyer')}
                className={`relative p-5 border-2 rounded-xl text-center transition-all duration-300 ${
                  role === 'buyer'
                    ? 'border-accent bg-accent-subtle'
                    : 'border-border hover:border-warm-gray bg-white'
                }`}
              >
                {role === 'buyer' && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
                <ShoppingBag className={`h-6 w-6 mx-auto mb-2 ${role === 'buyer' ? 'text-accent' : 'text-muted'}`} />
                <p className="font-medium text-sm">Buy Art</p>
                <p className="text-xs text-muted mt-1">Discover & collect</p>
              </button>
              <button
                type="button"
                onClick={() => setRole('artist')}
                className={`relative p-5 border-2 rounded-xl text-center transition-all duration-300 ${
                  role === 'artist'
                    ? 'border-accent bg-accent-subtle'
                    : 'border-border hover:border-warm-gray bg-white'
                }`}
              >
                {role === 'artist' && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
                <Palette className={`h-6 w-6 mx-auto mb-2 ${role === 'artist' ? 'text-accent' : 'text-muted'}`} />
                <p className="font-medium text-sm">Sell Art</p>
                <p className="text-xs text-muted mt-1">Upload & earn</p>
              </button>
            </div>
            <p className="text-xs text-warm-gray mt-2.5 text-center">Everyone on Signo can buy and sell</p>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors"
              placeholder="Your name"
              autoComplete="name"
            />
          </div>

          {/* Email */}
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

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray transition-colors"
                placeholder="At least 8 characters"
                autoComplete="new-password"
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
            {/* Password strength indicator */}
            {passwordStrength && (
              <div className="mt-2.5 space-y-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                        level <= passwordStrength.score ? passwordStrength.color : 'bg-border'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted">
                  Password strength: <span className="font-medium">{passwordStrength.label}</span>
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-4 py-3 bg-white border rounded-xl text-sm placeholder:text-warm-gray transition-colors ${
                !passwordsMatch ? 'border-error' : 'border-border'
              }`}
              placeholder="Re-enter your password"
              autoComplete="new-password"
            />
            {!passwordsMatch && (
              <p className="text-xs text-error mt-1.5">Passwords do not match</p>
            )}
          </div>

          {/* Terms Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 border-2 border-border rounded transition-colors peer-checked:border-accent peer-checked:bg-accent group-hover:border-warm-gray flex items-center justify-center">
                {agreedToTerms && <Check className="h-3 w-3 text-white" />}
              </div>
            </div>
            <span className="text-sm text-muted leading-tight">
              I agree to the{' '}
              <Link href="/terms" className="text-accent-dark link-underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-accent-dark link-underline">Privacy Policy</Link>
            </span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || googleLoading || !agreedToTerms}
            className="w-full py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-accent-light transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer link */}
        <p className="text-center text-sm text-muted mt-8">
          Already have an account?{' '}
          <Link href="/login" className="text-accent-dark font-medium link-underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function RegisterFallback() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <span className="font-editorial text-3xl font-medium text-primary">SIGNO</span>
          <h1 className="font-editorial text-2xl font-medium mt-6">Join the community</h1>
          <p className="mt-2 text-sm text-muted">Create your account to start buying and selling</p>
        </div>
        <div className="space-y-5">
          <div className="w-full h-12 bg-muted-bg rounded-full animate-pulse" />
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-warm-gray uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="h-5 w-32 bg-muted-bg rounded animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 bg-muted-bg rounded-xl animate-pulse" />
            <div className="h-24 bg-muted-bg rounded-xl animate-pulse" />
          </div>
          <div className="w-full h-12 bg-muted-bg rounded-xl animate-pulse" />
          <div className="w-full h-12 bg-muted-bg rounded-xl animate-pulse" />
          <div className="w-full h-12 bg-muted-bg rounded-xl animate-pulse" />
          <div className="w-full h-12 bg-primary/30 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterForm />
    </Suspense>
  );
}
