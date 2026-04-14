import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/collections/[id]
 * Get single collection with its artworks (joined with artwork data).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { data: collection, error } = await supabase
      .from('collections')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Fetch artworks in this collection, ordered by position
    const { data: collectionArtworks } = await supabase
      .from('collection_artworks')
      .select('*, artworks(*, profiles!artworks_artist_id_fkey(id, full_name, avatar_url))')
      .eq('collection_id', id)
      .order('position', { ascending: true });

    const artworks = (collectionArtworks || []).map((ca: Record<string, unknown>) => ({
      ...ca,
      artwork: ca.artworks,
      artworks: undefined,
    }));

    return NextResponse.json({ data: { ...collection, artworks } });
  } catch (err) {
    console.error('[API /admin/collections/[id]] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/collections/[id]
 * Update collection fields.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, slug, cover_image_url, curator_note, is_published } = body;

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (slug !== undefined) updates.slug = slug;
    if (cover_image_url !== undefined) updates.cover_image_url = cover_image_url;
    if (curator_note !== undefined) updates.curator_note = curator_note;
    if (is_published !== undefined) updates.is_published = is_published;

    const { data, error } = await supabase
      .from('collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[API /admin/collections/[id]] Update error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API /admin/collections/[id]] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/collections/[id]
 * Delete collection (cascades to collection_artworks).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Delete collection_artworks first, then the collection
    await supabase
      .from('collection_artworks')
      .delete()
      .eq('collection_id', id);

    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[API /admin/collections/[id]] Delete error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API /admin/collections/[id]] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
