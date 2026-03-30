'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signUp } from '@/lib/supabase/auth';
import { useAuth } from '@/components/providers/AuthProvider';
import { Suspense } from 'react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get('role') === 'artist' ? 'artist' : 'buyer';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'buyer' | 'artist'>(defaultRole);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signUp(email, password, fullName, role);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    await refreshUser();
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="font-editorial text-3xl font-medium text-primary hover:text-accent transition-colors">
            SIGNO
          </Link>
          <h1 className="font-editorial text-2xl font-medium mt-6">Join the community</h1>
          <p className="mt-2 text-sm text-muted">Create your account to start buying and selling</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 bg-error/5 border border-error/20 text-error text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* Role Selection */}
          <div>
            <p className="text-xs font-medium tracking-wide uppercase text-muted mb-3">I&apos;m primarily interested in</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('buyer')}
                className={`p-4 border-2 rounded-xl text-center transition-all duration-300 ${
                  role === 'buyer'
                    ? 'border-accent bg-accent-subtle'
                    : 'border-border hover:border-warm-gray bg-white'
                }`}
              >
                <p className="font-medium text-sm">Collecting Art</p>
                <p className="text-xs text-muted mt-1">Browse & buy</p>
              </button>
              <button
                type="button"
                onClick={() => setRole('artist')}
                className={`p-4 border-2 rounded-xl text-center transition-all duration-300 ${
                  role === 'artist'
                    ? 'border-accent bg-accent-subtle'
                    : 'border-border hover:border-warm-gray bg-white'
                }`}
              >
                <p className="font-medium text-sm">Selling Art</p>
                <p className="text-xs text-muted mt-1">Upload & sell</p>
              </button>
            </div>
            <p className="text-xs text-warm-gray mt-2 text-center">You can always do both on Signo</p>
          </div>

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
              className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray"
              placeholder="Your name"
            />
          </div>

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
              className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium tracking-wide uppercase text-muted mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm placeholder:text-warm-gray"
              placeholder="At least 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-accent transition-colors duration-300 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-8">
          Already have an account?{' '}
          <Link href="/login" className="text-accent font-medium link-underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
