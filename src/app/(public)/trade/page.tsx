'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

export default function TradePage() {
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
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
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormState('submitting');
    setErrorMsg('');

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
    <div>
      {/* Hero */}
      <section className="bg-cream border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <p className="text-accent-dark text-sm font-medium tracking-[0.2em] uppercase mb-4">Business</p>
          <h1 className="font-editorial text-4xl md:text-5xl lg:text-6xl font-medium leading-tight">
            Art for your business
          </h1>
          <p className="mt-6 text-lg text-muted max-w-xl mx-auto leading-relaxed">
            Hotels, restaurants, offices, and architects &mdash; we can help you find the perfect pieces for your space.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {formState === 'success' ? (
            <div className="bg-accent/5 border border-accent/20 rounded-2xl p-10 text-center">
              <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Send className="w-6 h-6 text-accent-dark" />
              </div>
              <h2 className="font-editorial text-2xl font-medium mb-3">Enquiry received!</h2>
              <p className="text-muted leading-relaxed max-w-sm mx-auto">
                Thanks for getting in touch. Our team will review your enquiry and respond within 48 hours.
              </p>
              <button
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
                className="mt-6 text-sm text-accent-dark hover:underline"
              >
                Submit another enquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="business_name" className="block text-sm font-medium mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    id="business_name"
                    name="business_name"
                    required
                    value={form.business_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-muted-bg border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                    placeholder="Your business name"
                  />
                </div>
                <div>
                  <label htmlFor="contact_name" className="block text-sm font-medium mb-2">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    id="contact_name"
                    name="contact_name"
                    required
                    value={form.contact_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-muted-bg border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-muted-bg border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                    placeholder="you@business.com"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-2">
                    Phone <span className="text-muted font-normal">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-muted-bg border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                    placeholder="+61 400 000 000"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="business_type" className="block text-sm font-medium mb-2">
                  Type of Business
                </label>
                <select
                  id="business_type"
                  name="business_type"
                  required
                  value={form.business_type}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-muted-bg border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors appearance-none"
                >
                  <option value="" disabled>Select your industry</option>
                  <option value="Hotel / Hospitality">Hotel / Hospitality</option>
                  <option value="Restaurant / Caf&eacute;">Restaurant / Caf&eacute;</option>
                  <option value="Office / Corporate">Office / Corporate</option>
                  <option value="Architecture / Interior Design">Architecture / Interior Design</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Retail">Retail</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  What are you looking for?
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={6}
                  value={form.description}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-muted-bg border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-none"
                  placeholder="Tell us about your space, the style you're after, number of pieces, any size requirements..."
                />
              </div>

              <div>
                <label htmlFor="budget_range" className="block text-sm font-medium mb-2">
                  Budget Range
                </label>
                <select
                  id="budget_range"
                  name="budget_range"
                  required
                  value={form.budget_range}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-muted-bg border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors appearance-none"
                >
                  <option value="" disabled>Select a range</option>
                  <option value="Under $1,000">Under $1,000</option>
                  <option value="$1,000–$5,000">$1,000–$5,000</option>
                  <option value="$5,000–$20,000">$5,000–$20,000</option>
                  <option value="$20,000–$50,000">$20,000–$50,000</option>
                  <option value="$50,000+">$50,000+</option>
                </select>
              </div>

              {formState === 'error' && errorMsg && (
                <p className="text-error text-sm">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={formState === 'submitting'}
                className="group inline-flex items-center justify-center gap-3 px-7 py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formState === 'submitting' ? 'Sending...' : 'Submit Enquiry'}
                <Send className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
