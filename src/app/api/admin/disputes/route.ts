import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { DisputeStatus } from '@/lib/types/database';

/**
 * GET /api/admin/disputes?status=open
 *
 * Returns disputes, optionally filtered by status.
 * Uses server-side Supabase client for reliable auth.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

    const statusFilter = request.nextUrl.searchParams.get('status') || 'open';

    let query = supabase
      .from('disputes')
      .select(
        '*, orders(id, total_amount_aud, artworks(title), profiles!orders_buyer_id_fkey(full_name, email), profiles!orders_artist_id_fkey(full_name, email))',
      )
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as DisputeStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[API /admin/disputes] Query error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Reshape orders join for frontend compatibility
    const disputes = (data || []).map((d: Record<string, unknown>) => {
      const order = d.orders as Record<string, unknown> | null;
      if (!order) return d;
      return {
        ...d,
        orders: {
          ...order,
          buyer:
            (order as Record<string, unknown[]>).profiles?.[0] || {
              full_name: 'Unknown',
              email: '',
            },
          artist:
            (order as Record<string, unknown[]>).profiles?.[1] || {
              full_name: 'Unknown',
              email: '',
            },
        },
      };
    });

    return NextResponse.json({ data: disputes });
  } catch (err) {
    console.error('[API /admin/disputes] Exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
