import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/contact
 *
 * Saves a contact form submission to the contact_messages table.
 */
export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API /contact] Exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
