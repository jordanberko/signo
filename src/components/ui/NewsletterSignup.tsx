'use client';

import { useState, useEffect } from 'react';

// Mirrors the server regex in `src/app/api/newsletter/route.ts`.
// Defined inline (no shared util) per scope discipline.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

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
  const [errorMsg, setErrorMsg] = useState<string>('Try again');

  useEffect(() => {
    if (state === 'success') {
      setVisualState('fading');
      const t = setTimeout(() => setVisualState('success'), 200);
      return () => clearTimeout(t);
    }
  }, [state]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Pre-submit validation — give the user an inline message instead
    // of a network round-trip on obvious bad input.
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMsg('Please enter your email.');
      setState('error');
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setErrorMsg('Please enter a valid email address.');
      setState('error');
      return;
    }

    setState('submitting');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        setState('success');
      } else {
        // Branch the user-visible copy on response status. 400 with a
        // field-level error map → use that message. 429 → already-tried
        // copy. 5xx → "couldn't subscribe right now". Everything else
        // → fall back to a generic short message.
        if (res.status === 400) {
          const json = await res.json().catch(() => ({}));
          const msg =
            (json.errors && typeof json.errors === 'object' && typeof json.errors.email === 'string' && json.errors.email) ||
            (typeof json.error === 'string' && json.error) ||
            'Please enter a valid email address.';
          setErrorMsg(msg);
        } else if (res.status === 429) {
          setErrorMsg("Looks like you've already subscribed — or please try again in a moment.");
        } else if (res.status >= 500) {
          setErrorMsg("Couldn't subscribe right now — please try again later.");
        } else {
          setErrorMsg('Try again');
        }
        setState('error');
      }
    } catch {
      setErrorMsg("Couldn't reach the network — please try again.");
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
          aria-invalid={state === 'error'}
          placeholder="your@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            // Reset error state as soon as the user edits — same
            // affordance as the artwork forms' fieldErrors clearing.
            if (state === 'error') setState('idle');
          }}
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
    </form>
    {state === 'error' && (
      <p
        role="alert"
        className="font-serif error-animate"
        style={{
          marginTop: '0.6rem',
          fontSize: '0.78rem',
          fontStyle: 'italic',
          color: 'var(--color-terracotta)',
          fontWeight: 400,
          lineHeight: 1.5,
        }}
      >
        {errorMsg}
      </p>
    )}
    </div>
  );
}
