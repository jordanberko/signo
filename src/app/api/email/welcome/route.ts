import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email';

/**
 * POST /api/email/welcome
 *
 * Sends the welcome email after registration.
 * Called from the client-side register page after successful signUp.
 * Fire-and-forget — failures are logged but never surface to the user.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, role } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Fire and forget — don't block registration
    sendWelcomeEmail({
      email,
      name: name || '',
      role: role === 'artist' ? 'artist' : 'buyer',
    }).catch((err) => {
      console.error('[Welcome Email] Background send failed:', err);
    });

    return NextResponse.json({ sent: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
