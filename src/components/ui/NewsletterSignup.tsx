'use client';

import { useState, useEffect } from 'react';

/**
 * NewsletterSignup — editorial, minimal, Huxley-aligned.
 *
 * A single hairline-underlined email field and a small uppercase submit link.
 * No cards, no gradients, no rounded buttons.
 */
export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [visualState, setVisualState] = useState<'form' | 'fading' | 'success'>('form');

  useEffect(() => {
    if (state === 'success') {
      setVisualState('fading');
      const t = setTimeout(() => setVisualState('success'), 200);
      return () => clearTimeout(t);
    }
  }, [state]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setState('submitting');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        setState('success');
      } else {
        setState('error');
      }
    } catch {
      setState('error');
    }
  }

  if (visualState === 'success') {
    return (
      <p
        className="animate-fade-in"
        style={{
          fontSize: '0.78rem',
          letterSpacing: '0.08em',
          color: 'var(--color-ink)',
          margin: 0,
          fontWeight: 400,
        }}
      >
        Thank you — you&apos;re on the list.
      </p>
    );
  }

  return (
    <div style={{
      opacity: visualState === 'fading' ? 0 : 1,
      transition: 'opacity var(--dur-fast) var(--ease-in)',
    }}>
    <form onSubmit={handleSubmit} className="flex items-end gap-4">
      <label className="flex-1 min-w-0 block">
        <span
          style={{
            display: 'block',
            fontSize: '0.62rem',
            fontWeight: 400,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            marginBottom: '0.4rem',
          }}
        >
          Stay in touch
        </span>
        <input
          type="email"
          required
          aria-label="Email address"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--color-border-strong)',
            padding: '0.4rem 0',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            fontSize: '0.82rem',
            color: 'var(--color-ink)',
            outline: 'none',
          }}
        />
      </label>
      <button
        type="submit"
        disabled={state === 'submitting'}
        className="bg-transparent border-0 cursor-pointer p-0 pb-1"
        style={{
          fontSize: '0.68rem',
          fontWeight: 400,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--color-ink)',
          borderBottom: '1px solid var(--color-ink)',
          transition: 'opacity var(--dur-base) var(--ease-out)',
          opacity: state === 'submitting' ? 0.5 : 1,
        }}
      >
        {state === 'submitting' ? 'Sending' : 'Subscribe'}
      </button>
      {state === 'error' && (
        <span
          role="alert"
          className="error-animate"
          style={{
            fontSize: '0.7rem',
            color: 'var(--color-terracotta)',
            fontWeight: 400,
          }}
        >
          Try again
        </span>
      )}
    </form>
    </div>
  );
}
