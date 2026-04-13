'use client';

import { useState } from 'react';
import { Mail, Clock, Send } from 'lucide-react';

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
    <div>
      {/* Hero */}
      <section className="bg-cream border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <p className="text-accent-dark text-sm font-medium tracking-[0.2em] uppercase mb-4">Get in Touch</p>
          <h1 className="font-editorial text-4xl md:text-5xl lg:text-6xl font-medium leading-tight">
            Contact Us
          </h1>
          <p className="mt-6 text-lg text-muted max-w-xl mx-auto leading-relaxed">
            Have a question, suggestion, or just want to say hello? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Contact Info */}
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-accent-dark" />
                </div>
                <div>
                  <h3 className="font-medium text-sm mb-1">Email</h3>
                  <a href="mailto:hello@signoart.com.au" className="text-sm text-accent-dark hover:underline">
                    hello@signoart.com.au
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-accent-dark" />
                </div>
                <div>
                  <h3 className="font-medium text-sm mb-1">Response Time</h3>
                  <p className="text-sm text-muted leading-relaxed">
                    We typically respond within 24 hours during business days.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-muted-bg rounded-xl border border-border mt-8">
                <h3 className="font-medium text-sm mb-2">Before you reach out</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Check our{' '}
                  <a href="/seller-guide" className="text-accent-dark hover:underline">Seller Guide</a>
                  {' '}and{' '}
                  <a href="/returns" className="text-accent-dark hover:underline">Returns Policy</a>
                  {' '}— your question may already be answered there.
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="md:col-span-2">
              {formState === 'success' ? (
                <div className="bg-accent/5 border border-accent/20 rounded-2xl p-10 text-center">
                  <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Send className="w-6 h-6 text-accent-dark" />
                  </div>
                  <h2 className="font-editorial text-2xl font-medium mb-3">Message sent!</h2>
                  <p className="text-muted leading-relaxed max-w-sm mx-auto">
                    Thanks for reaching out! We&apos;ll get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setFormState('idle');
                      setForm({ name: '', email: '', subject: '', message: '' });
                    }}
                    className="mt-6 text-sm text-accent-dark hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={form.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-muted-bg border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                        placeholder="Your name"
                      />
                    </div>
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
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium mb-2">
                      Subject
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      required
                      value={form.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-muted-bg border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors appearance-none"
                    >
                      <option value="" disabled>Select a topic</option>
                      <option value="general">General enquiry</option>
                      <option value="selling">Selling on Signo</option>
                      <option value="buying">Buying artwork</option>
                      <option value="issue">Report an issue</option>
                      <option value="partnership">Partnership enquiry</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={form.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-muted-bg border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-none"
                      placeholder="Tell us what's on your mind..."
                    />
                  </div>

                  {formState === 'error' && errorMsg && (
                    <p className="text-error text-sm">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={formState === 'submitting'}
                    className="group inline-flex items-center justify-center gap-3 px-7 py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {formState === 'submitting' ? 'Sending...' : 'Send Message'}
                    <Send className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
