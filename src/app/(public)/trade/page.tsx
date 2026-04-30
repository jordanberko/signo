'use client';

import { useState } from 'react';

// Mirrors the server regex in `src/app/api/trade/route.ts`. Defined
// inline (no shared util) per scope discipline; keep them in sync.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

// Inline-duplicated; see the same component in the contact page for
// the rationale.
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

export default function TradePage() {
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    business_name: '',
    contact_name: '',
    email: '',
    phone: '',
    business_type: '',
    description: '',
    budget_range: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const fieldName = e.target.name;
    setForm((prev) => ({ ...prev, [fieldName]: e.target.value }));
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  }

  function clientValidate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!form.business_name.trim()) errors.business_name = 'Business name is required.';
    if (!form.contact_name.trim()) errors.contact_name = 'Contact name is required.';
    if (!form.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!form.business_type.trim()) errors.business_type = 'Please select an industry.';
    if (!form.description.trim()) errors.description = 'Brief description is required.';
    if (!form.budget_range.trim()) errors.budget_range = 'Please select a budget range.';
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

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

      const res = await fetch('/api/trade', {
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
          Trade &amp; Hospitality
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(2.6rem, 6vw, 4.8rem)',
            lineHeight: 1.02,
            letterSpacing: '-0.015em',
            color: 'var(--color-ink)',
            fontWeight: 400,
            maxWidth: '22ch',
          }}
        >
          Art for hotels, restaurants &amp; <em style={{ fontStyle: 'italic' }}>considered spaces.</em>
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
          Commercial interiors, architectural projects, boutique hospitality — tell us about the space and we&apos;ll
          quietly put a short list of original works in front of you, selected from the Signo roster.
        </p>
      </header>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      <section
        className="px-6 sm:px-10"
        style={{
          paddingTop: 'clamp(4rem, 7vw, 6rem)',
          paddingBottom: 'clamp(5rem, 9vw, 8rem)',
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 'clamp(2.5rem, 5vw, 5rem)' }}>
          <div className="lg:col-span-4">
            <p
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-stone)',
                marginBottom: '1.2rem',
              }}
            >
              How it works
            </p>
            <ol className="list-none p-0 m-0">
              {[
                'Submit your brief — space, style, budget.',
                'We assemble a shortlist from the roster within 48 hours.',
                'We facilitate studio visits, framing &amp; logistics.',
                'You buy directly from the artist, through Signo.',
              ].map((step, i) => (
                <li
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2.4rem 1fr',
                    gap: '1rem',
                    padding: '1.1rem 0',
                    borderTop: '1px solid var(--color-border)',
                    borderBottom: i === 3 ? '1px solid var(--color-border)' : 'none',
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    className="font-serif"
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--color-stone)',
                      fontStyle: 'italic',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    style={{
                      fontSize: '0.92rem',
                      color: 'var(--color-ink)',
                      fontWeight: 300,
                      lineHeight: 1.55,
                    }}
                    dangerouslySetInnerHTML={{ __html: step }}
                  />
                </li>
              ))}
            </ol>
          </div>

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
                  Enquiry received
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
                  Thank you. <em style={{ fontStyle: 'italic' }}>We&apos;ll be in touch within 48 hours.</em>
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
                  A member of the trade desk is already reviewing your brief.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFormState('idle');
                    setForm({
                      business_name: '',
                      contact_name: '',
                      email: '',
                      phone: '',
                      business_type: '',
                      description: '',
                      budget_range: '',
                    });
                  }}
                  className="editorial-link"
                  style={{ background: 'transparent', cursor: 'pointer' }}
                >
                  Submit another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
                  <div>
                    <label htmlFor="business_name" className="commission-label">
                      Business
                    </label>
                    <input
                      type="text"
                      id="business_name"
                      name="business_name"
                      required
                      value={form.business_name}
                      onChange={handleChange}
                      className="commission-field"
                      placeholder="Business name"
                      aria-invalid={!!fieldErrors.business_name}
                    />
                    <FieldErrorMessage message={fieldErrors.business_name} />
                  </div>
                  <div>
                    <label htmlFor="contact_name" className="commission-label">
                      Contact
                    </label>
                    <input
                      type="text"
                      id="contact_name"
                      name="contact_name"
                      required
                      value={form.contact_name}
                      onChange={handleChange}
                      className="commission-field"
                      placeholder="Your name"
                      aria-invalid={!!fieldErrors.contact_name}
                    />
                    <FieldErrorMessage message={fieldErrors.contact_name} />
                  </div>
                </div>

                <div
                  className="grid grid-cols-1 sm:grid-cols-2"
                  style={{ marginTop: 'clamp(1.5rem, 3vw, 2.5rem)', gap: 'clamp(1.5rem, 3vw, 2.5rem)' }}
                >
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
                      placeholder="you@business.com"
                      aria-invalid={!!fieldErrors.email}
                    />
                    <FieldErrorMessage message={fieldErrors.email} />
                  </div>
                  <div>
                    <label htmlFor="phone" className="commission-label">
                      Phone <span style={{ textTransform: 'none', fontStyle: 'italic' }}>(optional)</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      className="commission-field"
                      placeholder="+61 400 000 000"
                    />
                  </div>
                </div>

                <div style={{ marginTop: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
                  <label htmlFor="business_type" className="commission-label">
                    Industry
                  </label>
                  <select
                    id="business_type"
                    name="business_type"
                    required
                    value={form.business_type}
                    onChange={handleChange}
                    className="commission-field"
                    aria-invalid={!!fieldErrors.business_type}
                  >
                    <option value="" disabled>
                      Select your industry
                    </option>
                    <option value="Hotel / Hospitality">Hotel / Hospitality</option>
                    <option value="Restaurant / Café">Restaurant / Café</option>
                    <option value="Office / Corporate">Office / Corporate</option>
                    <option value="Architecture / Interior Design">Architecture / Interior Design</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Education">Education</option>
                    <option value="Retail">Retail</option>
                    <option value="Other">Other</option>
                  </select>
                  <FieldErrorMessage message={fieldErrors.business_type} />
                </div>

                <div style={{ marginTop: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
                  <label htmlFor="description" className="commission-label">
                    The brief
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    required
                    rows={6}
                    value={form.description}
                    onChange={handleChange}
                    className="commission-field"
                    placeholder="Tell us about the space, the style, scale, quantity, timing…"
                    aria-invalid={!!fieldErrors.description}
                  />
                  <FieldErrorMessage message={fieldErrors.description} />
                </div>

                <div style={{ marginTop: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
                  <label htmlFor="budget_range" className="commission-label">
                    Budget
                  </label>
                  <select
                    id="budget_range"
                    name="budget_range"
                    required
                    value={form.budget_range}
                    onChange={handleChange}
                    className="commission-field"
                    aria-invalid={!!fieldErrors.budget_range}
                  >
                    <option value="" disabled>
                      Select a range
                    </option>
                    <option value="Under $1,000">Under $1,000</option>
                    <option value="$1,000–$5,000">$1,000 – $5,000</option>
                    <option value="$5,000–$20,000">$5,000 – $20,000</option>
                    <option value="$20,000–$50,000">$20,000 – $50,000</option>
                    <option value="$50,000+">$50,000 +</option>
                  </select>
                  <FieldErrorMessage message={fieldErrors.budget_range} />
                </div>

                {formState === 'error' && errorMsg && (
                  <p
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
                    {formState === 'submitting' ? 'Sending…' : 'Submit Enquiry'}
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
