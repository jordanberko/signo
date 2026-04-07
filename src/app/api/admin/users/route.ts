import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/types/database';

/**
 * GET /api/admin/users?role=all
 *
 * Returns all users, optionally filtered by role.
 * Uses server-side Supabase client for reliable auth.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    const roleFilter = request.nextUrl.searchParams.get('role') || 'all';

    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (roleFilter !== 'all' && ['artist', 'buyer', 'admin'].includes(roleFilter)) {
      query = query.eq('role', roleFilter as UserRole);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[API /admin/users] Query error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('[API /admin/users] Exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/users
 *
 * Updates a user's role. Body: { userId, role }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role || !['buyer', 'artist', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid userId or role' },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      console.error('[API /admin/users] Update error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API /admin/users] Exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
