import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  return profile?.role === 'admin' ? session.user : null;
}

/**
 * POST /api/admin/collections/[id]/artworks
 * Add artwork to collection.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const admin = await verifyAdmin(supabase);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { artworkId, position } = body;

    if (!artworkId) {
      return NextResponse.json({ error: 'artworkId is required' }, { status: 400 });
    }

    // Determine position: use provided or max + 1
    let finalPosition = position;
    if (finalPosition === undefined || finalPosition === null) {
      const { data: existing } = await supabase
        .from('collection_artworks')
        .select('position')
        .eq('collection_id', id)
        .order('position', { ascending: false })
        .limit(1);

      finalPosition = existing && existing.length > 0
        ? (existing[0] as { position: number }).position + 1
        : 0;
    }

    const { data, error } = await supabase
      .from('collection_artworks')
      .insert({
        collection_id: id,
        artwork_id: artworkId,
        position: finalPosition,
      })
      .select()
      .single();

    if (error) {
      console.error('[API /admin/collections/[id]/artworks] Insert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API /admin/collections/[id]/artworks] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/collections/[id]/artworks
 * Remove artwork from collection.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const admin = await verifyAdmin(supabase);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Accept artworkId from query or body
    let artworkId = request.nextUrl.searchParams.get('artworkId');
    if (!artworkId) {
      try {
        const body = await request.json();
        artworkId = body.artworkId;
      } catch {
        // no body
      }
    }

    if (!artworkId) {
      return NextResponse.json({ error: 'artworkId is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('collection_artworks')
      .delete()
      .eq('collection_id', id)
      .eq('artwork_id', artworkId);

    if (error) {
      console.error('[API /admin/collections/[id]/artworks] Delete error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API /admin/collections/[id]/artworks] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/collections/[id]/artworks
 * Reorder artworks. Body: { artworkIds: string[] }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const admin = await verifyAdmin(supabase);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { artworkIds } = body;

    if (!Array.isArray(artworkIds)) {
      return NextResponse.json({ error: 'artworkIds array is required' }, { status: 400 });
    }

    // Update positions in parallel
    const updates = artworkIds.map((artworkId: string, index: number) =>
      supabase
        .from('collection_artworks')
        .update({ position: index })
        .eq('collection_id', id)
        .eq('artwork_id', artworkId)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API /admin/collections/[id]/artworks] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
