import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/collections
 * List all collections (published and unpublished) with artwork count.
 */
export async function GET() {
  try {
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

    const { data: collections, error } = await supabase
      .from('collections')
      .select('*, collection_artworks(id)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API /admin/collections] Query error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = (collections || []).map((c: Record<string, unknown>) => ({
      ...c,
      artwork_count: Array.isArray(c.collection_artworks)
        ? (c.collection_artworks as unknown[]).length
        : 0,
      collection_artworks: undefined,
    }));

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('[API /admin/collections] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/collections
 * Create a new collection.
 */
export async function POST(request: NextRequest) {
  try {
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

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Auto-generate slug from title if not provided
    const finalSlug = slug || title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const { data, error } = await supabase
      .from('collections')
      .insert({
        title,
        description: description || null,
        slug: finalSlug,
        cover_image_url: cover_image_url || null,
        curator_note: curator_note || null,
        is_published: is_published ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error('[API /admin/collections] Insert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API /admin/collections] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
