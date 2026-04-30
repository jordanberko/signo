import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { sendOpsAlert } from '@/lib/ops-alert';
import { sendContactFormNotification } from '@/lib/email';

// Tightened from `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (P1-2 in the forms
// audit). The previous form accepted strings like `a@b.c` because it
// only required ONE non-whitespace character after the dot. Requiring a
// 2+ character alphabetic TLD blocks the most common malformed-address
// patterns. Defined inline (no shared regex util) per the PR's
// scope-discipline rule; the matching client-side regex lives in the
// contact page component.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

/**
 * POST /api/contact
 *
 * Saves a contact form submission to the contact_messages table.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 requests per 15 minutes per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { success } = rateLimit(`contact:${ip}`, { max: 5, windowMs: 15 * 60_000 });
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Field-level validation. Returns 400 with both `error` (top-level
    // summary for the banner) and `errors` (field map for inline UI),
    // matching the response shape used by the artworks route.
    const errors: Record<string, string> = {};
    if (!name || (typeof name === 'string' && !name.trim())) {
      errors.name = 'Your name is required.';
    }
    if (!email || (typeof email === 'string' && !email.trim())) {
      errors.email = 'Email is required.';
    } else if (typeof email === 'string' && !EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!subject || (typeof subject === 'string' && !subject.trim())) {
      errors.subject = 'Please choose a topic.';
    }
    if (!message || (typeof message === 'string' && !message.trim())) {
      errors.message = 'Message is required.';
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          error: 'Please check the highlighted fields below.',
          errors,
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    // Table created via SQL migration — not in generated types yet
    const { error } = await (supabase as unknown as { from: (table: string) => { insert: (row: Record<string, string>) => Promise<{ error: { message: string } | null }> } }).from('contact_messages').insert({
      name,
      email,
      subject,
      message,
    });

    if (error) {
      console.error('[API /contact] Insert error:', error.message);
      return NextResponse.json(
        { error: 'Failed to send message. Please try again.' },
        { status: 500 },
      );
    }

    // Fire Discord ping + email notification in parallel. Both helpers
    // swallow their own errors and never throw, so allSettled is
    // belt-and-braces — neither path can fail the request.
    const submittedAt = new Date();
    await Promise.allSettled([
      sendOpsAlert({
        title: 'New contact form submission',
        description:
          'A new contact message has arrived. The full record is in the contact_messages table.',
        context: {
          name,
          email,
          subject,
          message: typeof message === 'string' ? message.slice(0, 500) : '',
        },
        level: 'warn',
      }),
      sendContactFormNotification({
        name,
        email,
        subject,
        message,
        submittedAt,
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API /contact] Exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
