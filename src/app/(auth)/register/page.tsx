'use client';

import Link from 'next/link';
import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signUp, signInWithGoogle } from '@/lib/supabase/auth';

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

/** Returns a 0–4 score for password strength. */
function getPasswordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: 'Weak' };
  if (score === 2) return { score: 2, label: 'Fair' };
  if (score === 3) return { score: 3, label: 'Good' };
  return { score: 4, label: 'Strong' };
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

      const needsConfirmation = data?.user && !data.session;
      const isExistingEmail =
        data?.user?.identities && data.user.identities.length === 0;

      if (isExistingEmail) {
        setError('An account with this email already exists. Try signing in instead.');
        setLoading(false);
        return;
      }

      if (needsConfirmation) {
        fetch('/api/email/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name: fullName, role }),
        }).catch(() => {});
        setConfirmationSent(true);
        setLoading(false);
        return;
      }

      fetch('/api/email/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: fullName, role }),
      }).catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 500));
      const rawRedirect = searchParams.get('redirect');
      if (rawRedirect) {
        const decoded = decodeURIComponent(rawRedirect);
        // Validate: must start with / but not // or protocol
        const isSafe = decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.startsWith('/http');
        window.location.href = isSafe ? decoded : (role === 'artist' ? '/artist/onboarding' : '/browse?welcome=1');
      } else {
        window.location.href = role === 'artist' ? '/artist/onboarding' : '/browse?welcome=1';
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setGoogleLoading(true);
    const { error } = await signInWithGoogle(role);
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  // ── Confirmation screen ── 6/6 split
  if (confirmationSent) {
    return (
      <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
        <div
          className="grid grid-cols-1 lg:grid-cols-12 px-6 sm:px-10"
          style={{
            gap: 'clamp(2.5rem, 5vw, 5rem)',
            paddingTop: 'clamp(5rem, 10vw, 9rem)',
            paddingBottom: 'clamp(4rem, 8vw, 7rem)',
            minHeight: '100vh',
            alignItems: 'start',
          }}
        >
          <div className="lg:col-span-6">
            <Link
              href="/"
              style={{
                fontSize: '0.68rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                textDecoration: 'none',
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
              Almost in
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
              Check your <em style={{ fontStyle: 'italic' }}>inbox.</em>
            </h1>
          </div>
          <div className="lg:col-span-6" style={{ maxWidth: '34rem', paddingTop: '3.5rem' }}>
            <p
              style={{
                fontSize: '1rem',
                lineHeight: 1.7,
                color: 'var(--color-stone-dark)',
                fontWeight: 300,
                maxWidth: '44ch',
              }}
            >
              We&apos;ve sent a confirmation link to{' '}
              <span
                className="font-serif"
                style={{ fontStyle: 'italic', color: 'var(--color-ink)' }}
              >
                {email}
              </span>
              . Click the link in the email to activate your account.
            </p>
            <p
              style={{
                marginTop: '1.6rem',
                fontSize: '0.88rem',
                color: 'var(--color-stone)',
                fontWeight: 300,
                lineHeight: 1.6,
              }}
            >
              Didn&apos;t receive the email? Check your spam folder.
            </p>

            <div
              style={{
                marginTop: 'clamp(2.5rem, 5vw, 3.5rem)',
                borderTop: '1px solid var(--color-border)',
                paddingTop: '2rem',
                display: 'flex',
                gap: '2.2rem',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => setConfirmationSent(false)}
                className="editorial-link"
                style={{ background: 'transparent', cursor: 'pointer' }}
              >
                ← Try a different email
              </button>
              <Link
                href="/login"
                className="font-serif"
                style={{
                  color: 'var(--color-ink)',
                  fontStyle: 'italic',
                  fontSize: '0.95rem',
                  borderBottom: '1px solid var(--color-stone)',
                  textDecoration: 'none',
                  paddingBottom: '0.15rem',
                }}
              >
                Already confirmed? Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      {/* ── Full-width editorial header ── */}
      <header
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(4rem, 9vw, 7rem)',
          paddingBottom: 'clamp(2.5rem, 5vw, 4rem)',
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: '0.68rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            textDecoration: 'none',
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
          Join
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(2.6rem, 6vw, 4.8rem)',
            lineHeight: 1.02,
            letterSpacing: '-0.015em',
            color: 'var(--color-ink)',
            fontWeight: 400,
            maxWidth: '16ch',
          }}
        >
          Create your <em style={{ fontStyle: 'italic' }}>account.</em>
        </h1>
        <p
          style={{
            marginTop: '1.8rem',
            fontSize: '1rem',
            fontWeight: 300,
            lineHeight: 1.7,
            color: 'var(--color-stone-dark)',
            maxWidth: '48ch',
          }}
        >
          Everyone on Signo can both buy and sell. Pick the side you&apos;re most here for —
          you can always do the other later. Already registered?{' '}
          <Link
            href="/login"
            style={{
              color: 'var(--color-ink)',
              borderBottom: '1px solid var(--color-stone)',
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
          .
        </p>
      </header>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── Form body ── */}
      <section
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(3.5rem, 6vw, 5.5rem)',
          paddingBottom: 'clamp(5rem, 9vw, 8rem)',
          maxWidth: '46rem',
        }}
      >
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
          }}
        >
          <GoogleGlyph />
          {googleLoading ? 'Redirecting…' : 'Sign up with Google'}
        </button>

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

        <form onSubmit={handleSubmit}>
          {/* ── Role selection: hairline split, typographic ── */}
          <p className="commission-label" style={{ marginBottom: '1rem' }}>
            I&apos;m primarily here to
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              borderTop: '1px solid var(--color-border)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            {(
              [
                { value: 'buyer', label: 'Collect', note: 'Discover & acquire' },
                { value: 'artist', label: 'Sell', note: 'Free until first sale' },
              ] as const
            ).map((opt, i) => {
              const selected = role === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderLeft: i === 1 ? '1px solid var(--color-border)' : 'none',
                    padding: '1.6rem 1.2rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    className="font-serif"
                    style={{
                      display: 'block',
                      fontSize: 'clamp(1.3rem, 2.2vw, 1.8rem)',
                      color: 'var(--color-ink)',
                      fontStyle: selected ? 'italic' : 'normal',
                      fontWeight: 400,
                      letterSpacing: '-0.005em',
                      marginBottom: '0.4rem',
                    }}
                  >
                    {opt.label}
                    {selected && (
                      <span
                        style={{
                          display: 'inline-block',
                          marginLeft: '0.6rem',
                          fontSize: '0.62rem',
                          letterSpacing: '0.22em',
                          textTransform: 'uppercase',
                          color: 'var(--color-stone)',
                          verticalAlign: 'middle',
                          fontStyle: 'normal',
                        }}
                      >
                        Selected
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--color-stone)',
                      fontWeight: 300,
                    }}
                  >
                    {opt.note}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Full Name */}
          <div style={{ marginTop: 'clamp(2rem, 4vw, 2.8rem)' }}>
            <label htmlFor="fullName" className="commission-label">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="commission-field"
              placeholder="Your name"
              autoComplete="name"
            />
          </div>

          {/* Email */}
          <div style={{ marginTop: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
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

          {/* Password */}
          <div style={{ marginTop: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
            <label htmlFor="password" className="commission-label">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="commission-field"
                style={{ paddingRight: '4.5rem' }}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="font-serif"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '1.05rem',
                  background: 'transparent',
                  border: 'none',
                  padding: '0.4rem 0.3rem',
                  fontSize: '0.78rem',
                  fontStyle: 'italic',
                  color: 'var(--color-stone)',
                  cursor: 'pointer',
                }}
              >
                {showPassword ? 'hide' : 'show'}
              </button>
            </div>

            {/* Password strength: hairline bars */}
            {passwordStrength && (
              <div style={{ marginTop: '0.9rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      style={{
                        height: '2px',
                        flex: 1,
                        background:
                          level <= passwordStrength.score
                            ? 'var(--color-ink)'
                            : 'var(--color-border)',
                        transition: 'background 200ms',
                      }}
                    />
                  ))}
                </div>
                <p
                  style={{
                    marginTop: '0.6rem',
                    fontSize: '0.72rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--color-stone)',
                    fontWeight: 300,
                  }}
                >
                  Strength ·{' '}
                  <span
                    className="font-serif"
                    style={{
                      fontStyle: 'italic',
                      color: 'var(--color-ink)',
                      textTransform: 'none',
                      letterSpacing: 0,
                      fontSize: '0.85rem',
                    }}
                  >
                    {passwordStrength.label}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Confirm */}
          <div style={{ marginTop: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
            <label htmlFor="confirmPassword" className="commission-label">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="commission-field"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              style={!passwordsMatch ? { borderBottomColor: 'var(--color-terracotta, #c45d3e)' } : undefined}
            />
            {!passwordsMatch && (
              <p
                className="font-serif error-animate"
                style={{
                  marginTop: '0.6rem',
                  fontSize: '0.82rem',
                  color: 'var(--color-terracotta, #c45d3e)',
                  fontStyle: 'italic',
                }}
              >
                Passwords do not match
              </p>
            )}
          </div>

          {/* Terms */}
          <label
            style={{
              marginTop: 'clamp(2rem, 4vw, 2.8rem)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.9rem',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="signo-checkbox-input"
              style={{
                position: 'absolute',
                opacity: 0,
                width: '1px',
                height: '1px',
                /* pointerEvents kept out so the input can still be
                   focused via keyboard — focus ring lights up the span */
              }}
            />
            <span
              aria-hidden="true"
              className="signo-checkbox-mark"
              style={{
                width: '1.05rem',
                height: '1.05rem',
                flexShrink: 0,
                border: '1px solid var(--color-border-strong)',
                background: agreedToTerms ? 'var(--color-ink)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '0.15rem',
                transition: 'background 200ms',
              }}
            >
              {agreedToTerms && (
                <svg
                  viewBox="0 0 10 8"
                  style={{ width: '0.65rem', height: '0.5rem' }}
                  fill="none"
                  stroke="var(--color-warm-white)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 4 L4 7 L9 1" />
                </svg>
              )}
            </span>
            <span
              style={{
                fontSize: '0.88rem',
                color: 'var(--color-stone-dark)',
                fontWeight: 300,
                lineHeight: 1.55,
              }}
            >
              I agree to the{' '}
              <Link
                href="/terms"
                className="font-serif"
                style={{
                  color: 'var(--color-ink)',
                  fontStyle: 'italic',
                  borderBottom: '1px solid var(--color-stone)',
                  textDecoration: 'none',
                }}
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy"
                className="font-serif"
                style={{
                  color: 'var(--color-ink)',
                  fontStyle: 'italic',
                  borderBottom: '1px solid var(--color-stone)',
                  textDecoration: 'none',
                }}
              >
                Privacy Policy
              </Link>
            </span>
          </label>

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
              disabled={loading || googleLoading || !agreedToTerms}
              className="artwork-primary-cta artwork-primary-cta--compact"
              style={{ minWidth: '14rem' }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
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
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-serif"
              style={{
                color: 'var(--color-ink)',
                fontStyle: 'italic',
                borderBottom: '1px solid var(--color-stone)',
                textDecoration: 'none',
              }}
            >
              Sign in
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}

function RegisterFallback() {
  return (
    <div style={{ background: 'var(--color-warm-white)', minHeight: '100vh' }}>
      <div className="px-6 sm:px-10" style={{ paddingTop: 'clamp(4rem, 9vw, 7rem)' }}>
        <p
          style={{
            fontSize: '0.62rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            marginBottom: '1.2rem',
          }}
        >
          Join
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
          Create your <em style={{ fontStyle: 'italic' }}>account.</em>
        </h1>
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
