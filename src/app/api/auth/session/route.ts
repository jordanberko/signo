import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/session
 *
 * Called by the login page after successful client-side authentication.
 * This endpoint exists to ensure the server-side Supabase client reads
 * and refreshes the session cookies. Without this server round-trip,
 * the middleware may not see the session on the next navigation.
 *
 * Returns the user's role so the client knows where to redirect.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ authenticated: false, role: null }, { status: 200 });
    }

    // Fetch role for redirect decision
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
