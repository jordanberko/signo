import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/session
 *
 * Returns the current user's full profile if authenticated.
 * Used by AuthProvider as the primary auth check — runs server-side
 * so there are no navigator.locks or browser client issues.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ user: null });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return NextResponse.json({ user: profile ?? null });
  } catch {
    return NextResponse.json({ user: null });
  }
}

/**
 * POST /api/auth/session (legacy — kept for backward compatibility)
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ authenticated: false, role: null }, { status: 200 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      authenticated: true,
      role: profile?.role ?? 'buyer',
    });
  } catch {
    return NextResponse.json({ authenticated: false, role: null }, { status: 200 });
  }
}
