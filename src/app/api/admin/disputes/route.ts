import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { DisputeStatus } from '@/lib/types/database';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

    const statusFilter = request.nextUrl.searchParams.get('status') || 'open';

    const serviceClient = getServiceClient();
    let query = serviceClient
      .from('disputes')
      .select(
        '*, orders(id, total_amount_aud, artworks(title), buyer:profiles!orders_buyer_id_fkey(full_name, email), artist:profiles!orders_artist_id_fkey(full_name, email, street_address, city, postcode, country))',
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

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('[API /admin/disputes] Exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
