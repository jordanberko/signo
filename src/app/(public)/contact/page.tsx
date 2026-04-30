'use client';

import { useState } from 'react';
import Link from 'next/link';

// Mirrors the server regex in `src/app/api/contact/route.ts`. Defined
// inline (no shared util) per the PR's scope-discipline rule. If you
// touch this regex, update the server one too — drift means the
// server will reject what the client allows or vice versa.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

// Inline-duplicated from the artwork forms (PR #16 / PR #18). A future
// PR can lift this into a shared `@/components/ui/` location once the
// pattern has stabilised across all forms; not done here to keep the
// scope tight.
function FieldErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="font-serif"
      role="alert"
      style={{
        marginTop: '0.4rem',
        fontStyle: 'italic',
        color: 'var(--color-terracotta)',
        fontSize: '0.85rem',
        lineHeight: 1.5,
      }}
    >
      {message}
    </p>
  );
}

export default function ContactPage() {
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const fieldName = e.target.name;
    setForm((prev) => ({ ...prev, [fieldName]: e.target.value }));
    // Clear the corresponding inline error as soon as the user edits
    // the field — same affordance as the artwork forms.
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  }

  // Pre-submit client validation that mirrors the server's field-level
  // rules. Returns a field map; empty = valid.
  function clientValidate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Your name is required.';
    if (!form.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!form.subject.trim()) errors.subject = 'Please choose a topic.';
    if (!form.message.trim()) errors.message = 'Message is required.';
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Pre-validate locally so users get inline errors without a network
    // round-trip on obvious mistakes.
    const preErrors = clientValidate();
    if (Object.keys(preErrors).length > 0) {
      setFieldErrors(preErrors);
      setErrorMsg('');
      setFormState('idle');
      return;
    }

    setFormState('submitting');
    setErrorMsg('');
    setFieldErrors({});

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        setFormState('success');
      } else {
        const json = await res.json().catch(() => ({}));
        // 400 with `errors` map → route to fields. Other failures
        // (rate limit, server error) → top-level banner.
        if (res.status === 400 && json.errors && typeof json.errors === 'object') {
          setFieldErrors(json.errors);
          setErrorMsg(typeof json.error === 'string' ? json.error : '');
        } else {
          setErrorMsg((json && typeof json.error === 'string' && json.error) || 'Something went wrong. Please try again.');
        }
        setFormState('error');
      }
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setFormState('error');
    }
  }

  return (
    <div style={{ background: 'var(--color-warm-white)' }}>
      {/* ── Editorial header ── */}
      <header
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(4rem, 9vw, 7rem)',
          paddingBottom: 'clamp(3rem, 6vw, 5rem)',
        }}
      >
        <p
          style={{
            fontSize: '0.68rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            marginBottom: '1.2rem',
          }}
        >
          Get in touch
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(2.6rem, 6vw, 4.8rem)',
            lineHeight: 1.02,
            letterSpacing: '-0.015em',
            color: 'var(--color-ink)',
            fontWeight: 400,
            maxWidth: '20ch',
          }}
        >
          Say hello, ask a <em style={{ fontStyle: 'italic' }}>question.</em>
        </h1>
        <p
          style={{
            marginTop: '1.8rem',
            fontSize: '1rem',
            fontWeight: 300,
            lineHeight: 1.7,
            color: 'var(--color-stone-dark)',
            maxWidth: '52ch',
          }}
        >
          Whether it&apos;s a question about a work, a partnership, a correction, or a simple hello — we read
          every message and reply ourselves.
        </p>
      </header>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── Body — split ── */}
      <section
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(4rem, 7vw, 6rem)',
          paddingBottom: 'clamp(5rem, 9vw, 8rem)',
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 'clamp(2.5rem, 5vw, 5rem)' }}>
          {/* ── Contact detail column ── */}
          <div className="lg:col-span-4">
            <div style={{ marginBottom: '2.4rem' }}>
              <p
                style={{
                  fontSize: '0.62rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--color-stone)',
                  marginBottom: '0.6rem',
                }}
              >
                By email
              </p>
              <a
                href="mailto:hello@signoart.com.au"
                className="font-serif"
                style={{
                  fontSize: '1.15rem',
                  color: 'var(--color-ink)',
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--color-border-strong)',
                  paddingBottom: '0.2rem',
                  fontStyle: 'italic',
                }}
              >
                hello@signoart.com.au
              </a>
            </div>

            <div style={{ marginBottom: '2.4rem' }}>
              <p
                style={{
                  fontSize: '0.62rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--color-stone)',
                  marginBottom: '0.6rem',
                }}
              >
                Response time
              </p>
              <p
                style={{
                  fontSize: '0.94rem',
                  color: 'var(--color-stone-dark)',
                  fontWeight: 300,
                  lineHeight: 1.6,
                  maxWidth: '32ch',
                }}
              >
                Typically within 24 hours on business days.
              </p>
            </div>

            <div
              style={{
                borderTop: '1px solid var(--color-border)',
                paddingTop: '2rem',
              }}
            >
              <p
                style={{
                  fontSize: '0.62rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--color-stone)',
                  marginBottom: '0.8rem',
                }}
              >
                Before reaching out
              </p>
              <p
                style={{
                  fontSize: '0.88rem',
                  color: 'var(--color-stone-dark)',
                  fontWeight: 300,
                  lineHeight: 1.65,
                  maxWidth: '34ch',
                }}
              >
                Your question may already be answered in our{' '}
                <Link
                  href="/seller-guide"
                  style={{
                    color: 'var(--color-ink)',
                    borderBottom: '1px solid var(--color-stone)',
                    textDecoration: 'none',
                  }}
                >
                  Seller Guide
                </Link>{' '}
                or{' '}
                <Link
                  href="/returns"
                  style={{
                    color: 'var(--color-ink)',
                    borderBottom: '1px solid var(--color-stone)',
                    textDecoration: 'none',
                  }}
                >
                  Returns Policy
                </Link>
                .
              </p>
            </div>
          </div>

          {/* ── Form column ── */}
          <div className="lg:col-span-8">
            {formState === 'success' ? (
              <div>
                <p
                  style={{
                    fontSize: '0.68rem',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'var(--color-stone)',
                    marginBottom: '1.2rem',
                  }}
                >
                  Received
                </p>
                <h2
                  className="font-serif"
                  style={{
                    fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
                    lineHeight: 1.1,
                    color: 'var(--color-ink)',
                    fontWeight: 400,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Message sent. <em style={{ fontStyle: 'italic' }}>We&apos;ll be in touch.</em>
                </h2>
                <p
                  style={{
                    marginTop: '1rem',
                    fontSize: '0.94rem',
                    color: 'var(--color-stone-dark)',
                    fontWeight: 300,
                    lineHeight: 1.65,
                    maxWidth: '46ch',
                    marginBottom: '2rem',
                  }}
                >
                  Thanks for reaching out. We&apos;ll reply within 24 hours on business days.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFormState('idle');
                    setForm({ name: '', email: '', subject: '', message: '' });
                  }}
                  className="editorial-link"
                  style={{ background: 'transparent', cursor: 'pointer' }}
                >
                  Send another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div
                  className="grid grid-cols-1 sm:grid-cols-2"
                  style={{ gap: 'clamp(1.5rem, 3vw, 2.5rem)' }}
                >
                  <div>
                    <label htmlFor="name" className="commission-label">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      className="commission-field"
                      placeholder="Your name"
                      aria-invalid={!!fieldErrors.name}
                    />
                    <FieldErrorMessage message={fieldErrors.name} />
                  </div>
                  <div>
                    <label htmlFor="email" className="commission-label">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      className="commission-field"
                      placeholder="you@example.com"
                      aria-invalid={!!fieldErrors.email}
                    />
                    <FieldErrorMessage message={fieldErrors.email} />
                  </div>
                </div>

                <div style={{ marginTop: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
                  <label htmlFor="subject" className="commission-label">
                    Topic
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    value={form.subject}
                    onChange={handleChange}
                    className="commission-field"
                    aria-invalid={!!fieldErrors.subject}
                  >
                    <option value="" disabled>
                      Select a topic
                    </option>
                    <option value="general">General enquiry</option>
                    <option value="selling">Selling on Signo</option>
                    <option value="buying">Buying artwork</option>
                    <option value="issue">Report an issue</option>
                    <option value="partnership">Partnership enquiry</option>
                  </select>
                  <FieldErrorMessage message={fieldErrors.subject} />
                </div>

                <div style={{ marginTop: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
                  <label htmlFor="message" className="commission-label">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={form.message}
                    onChange={handleChange}
                    className="commission-field"
                    placeholder="Tell us what&apos;s on your mind…"
                    aria-invalid={!!fieldErrors.message}
                  />
                  <FieldErrorMessage message={fieldErrors.message} />
                </div>

                {formState === 'error' && errorMsg && (
                  <p
                    className="error-animate"
                    style={{
                      marginTop: '1.4rem',
                      fontSize: '0.82rem',
                      color: 'var(--color-error, #b4452b)',
                      fontStyle: 'italic',
                      fontWeight: 300,
                    }}
                  >
                    {errorMsg}
                  </p>
                )}

                <div style={{ marginTop: 'clamp(2rem, 4vw, 3rem)' }}>
                  <button
                    type="submit"
                    disabled={formState === 'submitting'}
                    className="artwork-primary-cta artwork-primary-cta--compact"
                    style={{ minWidth: '14rem' }}
                  >
                    {formState === 'submitting' ? 'Sending…' : 'Send Message'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
