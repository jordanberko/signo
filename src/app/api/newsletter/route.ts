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

    // Table created via SQL migration — not in generated types yet
    // Upsert to prevent duplicate errors — if email exists, do nothing
    const { error } = await (supabase as unknown as { from: (table: string) => { upsert: (row: Record<string, string>, opts: { onConflict: string }) => Promise<{ error: { message: string } | null }> } }).from('newsletter_subscribers').upsert({ email: email.toLowerCase() }, { onConflict: 'email' });

    if (error) {
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
