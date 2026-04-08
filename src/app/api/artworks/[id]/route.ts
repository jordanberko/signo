import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_CATEGORIES = ['original', 'print', 'digital'];

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── GET: Fetch single artwork (owner only) ──

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('artworks')
      .select('*')
      .eq('id', id)
      .eq('artist_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
    }

    return NextResponse.json({ artwork: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PUT: Update artwork ──

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Auth check
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Ownership check
    const { data: existing } = await supabase
      .from('artworks')
      .select('artist_id, status')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
    }
    if (existing.artist_id !== user.id) {
      return NextResponse.json({ error: 'You do not own this artwork' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      medium,
      style,
      width_cm,
      height_cm,
      depth_cm,
      price_aud,
      is_framed,
      shipping_weight_kg,
      images,
      tags,
      status,
    } = body;

    // Determine new status
    let newStatus = status ?? existing.status;
    // If was rejected, saving auto-resubmits
    if (existing.status === 'rejected' && !status) {
      newStatus = 'pending_review';
    }

    // Validate required fields for submission
    if (newStatus === 'pending_review') {
      if (!title?.trim()) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
      }
      if (!description?.trim()) {
        return NextResponse.json({ error: 'Description is required' }, { status: 400 });
      }
      if (!images || !Array.isArray(images) || images.length === 0) {
        return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
      }
      if (!price_aud || price_aud < 1) {
        return NextResponse.json({ error: 'Price must be at least $1' }, { status: 400 });
      }
    }

    // Validate category
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Validate price
    if (price_aud !== undefined && price_aud !== null && price_aud < 0) {
      return NextResponse.json({ error: 'Price must be positive' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      title: title?.trim(),
      description: description?.trim() ?? null,
      category: category ?? undefined,
      medium: medium || null,
      style: style || null,
      width_cm: width_cm ? parseFloat(width_cm) : null,
      height_cm: height_cm ? parseFloat(height_cm) : null,
      depth_cm: depth_cm ? parseFloat(depth_cm) : null,
      price_aud: price_aud !== undefined ? parseFloat(price_aud) : undefined,
      is_framed: is_framed ?? undefined,
      shipping_weight_kg: shipping_weight_kg ? parseFloat(shipping_weight_kg) : null,
      images: images ?? undefined,
      tags: tags ?? undefined,
      status: newStatus,
    };

    // Clear review notes if resubmitting
    if (newStatus === 'pending_review') {
      updateData.review_notes = null;
    }

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    const { data: artwork, error: updateError } = await supabase
      .from('artworks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ data: artwork });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE: Delete artwork + clean up storage images ──

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Auth check
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch artwork with ownership check
    const { data: artwork } = await supabase
      .from('artworks')
      .select('artist_id, status, images')
      .eq('id', id)
      .single();

    if (!artwork) {
      return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
    }
    if (artwork.artist_id !== user.id) {
      return NextResponse.json({ error: 'You do not own this artwork' }, { status: 403 });
    }
    if (artwork.status === 'sold') {
      return NextResponse.json({ error: 'Cannot delete a sold artwork' }, { status: 400 });
    }

    // Clean up images from storage
    const images = (artwork.images as string[]) ?? [];
    if (images.length > 0) {
      const paths = images
        .map((url) => {
          const marker = '/storage/v1/object/public/artwork-images/';
          const index = url.indexOf(marker);
          return index !== -1 ? url.slice(index + marker.length) : null;
        })
        .filter((p): p is string => p !== null);

      if (paths.length > 0) {
        await supabase.storage.from('artwork-images').remove(paths);
      }
    }

    // Delete the artwork record
    const { error: deleteError } = await supabase
      .from('artworks')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
