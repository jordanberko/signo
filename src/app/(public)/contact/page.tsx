'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormState('submitting');
    setErrorMsg('');

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
        const json = await res.json();
        setErrorMsg(json.error || 'Something went wrong. Please try again.');
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
                    />
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
                    />
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
                  />
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
