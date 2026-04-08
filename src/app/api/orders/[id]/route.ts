import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET — fetch a single order for the buyer
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Handle Stripe checkout session IDs (cs_*)
    if (id.startsWith('cs_')) {
      // The order may not exist yet (webhook race condition) — try a few times
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data } = await supabase
          .from('orders')
          .select(
            '*, artworks(id, title, images, category, medium), profiles!orders_artist_id_fkey(id, full_name)'
          )
          .eq('buyer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          return NextResponse.json({ order: data });
        }

        if (attempt < 4) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      return NextResponse.json({ error: 'Order not found yet — please refresh' }, { status: 404 });
    }

    // Regular order ID lookup
    const { data, error } = await supabase
      .from('orders')
      .select(
        '*, artworks(id, title, images, category, medium), profiles!orders_artist_id_fkey(id, full_name)'
      )
      .eq('id', id)
      .eq('buyer_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order: data });
  } catch (err) {
    console.error('[API orders/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
