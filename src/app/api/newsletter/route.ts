import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

// See the same constant in `src/app/api/contact/route.ts` for rationale.
// Defined inline (no shared util) per scope discipline; mirror this in
// the NewsletterSignup component's client-side regex.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

/**
 * POST /api/newsletter
 *
 * Subscribes an email to the newsletter. Prevents duplicates.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 requests per 15 minutes per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { success } = rateLimit(`newsletter:${ip}`, { max: 5, windowMs: 15 * 60_000 });
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }
    const body = await request.json();
    const { email } = body;

    // Field-level validation. Returns 400 with both `error` (banner)
    // and `errors` (field map) so the client can render an inline
    // message under the email input.
    const errors: Record<string, string> = {};
    if (!email || (typeof email === 'string' && !email.trim())) {
      errors.email = 'Email is required.';
    } else if (typeof email === 'string' && !EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          error: 'Please check the highlighted field below.',
          errors,
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Plain insert (not upsert). Migration 006 grants anon INSERT only,
    // no UPDATE policy. Postgres rejects upsert with RLS error 42501
    // because ON CONFLICT DO UPDATE requires an UPDATE policy even for
    // non-conflicting rows. Plain insert + 23505 catch is the
    // equivalent behaviour without widening the security surface.
    // Table created via SQL migration, not in generated types yet.
    const { error } = await (supabase as unknown as { from: (table: string) => { insert: (row: Record<string, string>) => Promise<{ error: { message: string; code: string } | null }> } }).from('newsletter_subscribers').insert({ email: email.toLowerCase() });

    if (error) {
      // Postgres unique_violation: email already subscribed. Silently
      // treat as success so the user sees the same confirmation as a
      // fresh signup, matching the original upsert intent.
      if (error.code === '23505') {
        return NextResponse.json({ success: true });
      }
      console.error('[API /newsletter] Insert error:', error.message);
      return NextResponse.json(
        { error: 'Failed to subscribe' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API /newsletter] Exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
