import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Simple in-memory rate limiter (per IP, 10 per hour)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return false;
  }

  if (entry.count >= 10) {
    return true;
  }

  entry.count += 1;
  return false;
}

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    );
  }

  let body: { artworkId?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { artworkId, email } = body;

  if (!artworkId || !email) {
    return NextResponse.json(
      { error: 'artworkId and email are required' },
      { status: 400 },
    );
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insertData: { artwork_id: string; email: string; user_id?: string } = {
    artwork_id: artworkId,
    email,
  };

  if (user) {
    insertData.user_id = user.id;
  }

  const { error } = await supabase
    .from('artwork_notifications')
    .insert(insertData);

  // Handle duplicate gracefully (unique constraint violation = 23505)
  if (error) {
    if (error.code === '23505') {
      // Already subscribed — return success
      return NextResponse.json({ success: true, alreadySubscribed: true });
    }
    console.error('[notify] Insert error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
