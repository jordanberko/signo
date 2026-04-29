import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { sendOpsAlert } from '@/lib/ops-alert';
import { sendContactFormNotification } from '@/lib/email';

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

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 },
      );
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
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
