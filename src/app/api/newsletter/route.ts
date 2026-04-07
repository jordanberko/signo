import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/newsletter
 *
 * Subscribes an email to the newsletter. Prevents duplicates.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
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
