import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET — fetch studio posts for an artist (public)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get('artistId');

    if (!artistId) {
      return NextResponse.json({ error: 'artistId required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('studio_posts')
      .select('*')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API studio-posts GET]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ posts: data ?? [] });
  } catch (err) {
    console.error('[API studio-posts GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — create a new studio post (auth required, artist only)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify user is an artist
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'artist') {
      return NextResponse.json({ error: 'Only artists can create studio posts' }, { status: 403 });
    }

    const { imageUrl, caption } = await request.json();

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    if (caption && typeof caption === 'string' && caption.length > 500) {
      return NextResponse.json({ error: 'Caption must be 500 characters or less' }, { status: 400 });
    }

    // Enforce max 20 posts per artist
    const { count } = await supabase
      .from('studio_posts')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', user.id);

    if ((count ?? 0) >= 20) {
      return NextResponse.json(
        { error: 'Maximum 20 studio posts allowed. Delete an existing post to add a new one.' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('studio_posts')
      .insert({
        artist_id: user.id,
        image_url: imageUrl,
        caption: caption?.trim() || null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[API studio-posts POST]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ post: data }, { status: 201 });
  } catch (err) {
    console.error('[API studio-posts POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — delete a studio post (auth required, must own post)
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Support both query param and body
    let postId: string | null = null;
    const { searchParams } = new URL(request.url);
    postId = searchParams.get('postId');

    if (!postId) {
      try {
        const body = await request.json();
        postId = body.postId;
      } catch {
        // No body provided
      }
    }

    if (!postId) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 });
    }

    // Verify ownership
    const { data: post } = await supabase
      .from('studio_posts')
      .select('artist_id')
      .eq('id', postId)
      .single();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.artist_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this post' }, { status: 403 });
    }

    const { error } = await supabase
      .from('studio_posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('[API studio-posts DELETE]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('[API studio-posts DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
