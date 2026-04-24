import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email';

/**
 * POST /api/email/welcome
 *
 * Sends the welcome email after registration.
 * Called from the client-side register page after successful signUp.
 * Failures are logged and swallowed; they don't surface to the user
 * (the client treats this endpoint as fire-and-forget via its own .catch).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, role } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    try {
      await sendWelcomeEmail({
        email,
        name: name || '',
        role: role === 'artist' ? 'artist' : 'buyer',
      });
    } catch (err) {
      console.warn('[EMAIL_FAILED]', {
        type: 'welcome',
        recipient: email,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return NextResponse.json({ sent: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
