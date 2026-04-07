import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ArtworkStatus } from '@/lib/types/database';

/**
 * GET /api/admin/artworks?status=pending_review
 *
 * Returns artworks filtered by status, with artist profile joined.
 * Uses server-side Supabase client so auth is always reliable
 * (no browser client timing/navigator.locks issues).
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

    // Get status filter from query params
    const status = request.nextUrl.searchParams.get('status') || 'pending_review';
    const validStatuses = [
      'draft',
      'pending_review',
      'approved',
      'rejected',
      'sold',
      'paused',
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status filter' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('artworks')
      .select('*, profiles!artworks_artist_id_fkey(*)')
      .eq('status', status as ArtworkStatus)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[API /admin/artworks] Query error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Reshape to include artist field for frontend compatibility
    const artworks = (data || []).map(
      (a: Record<string, unknown>) => ({
        ...a,
        artist: a.profiles,
      }),
    );

    return NextResponse.json({ data: artworks });
  } catch (err) {
    console.error('[API /admin/artworks] Exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
