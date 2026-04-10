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
      .select('artist_id, status, review_notes')
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

    // Add resubmission audit trail when transitioning from rejected to pending_review
    if (existing.status === 'rejected' && newStatus === 'pending_review') {
      const previousNotes = existing.review_notes || '';
      updateData.review_notes = previousNotes
        ? `[Resubmission] ${previousNotes}`
        : '[Resubmission]';
    } else if (newStatus === 'pending_review') {
      // Clear review notes for fresh submissions (not resubmissions)
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

    // Remove or nullify FK references in related tables so delete doesn't violate constraints
    const nullifyResults = await Promise.allSettled([
      supabase.from('favourites').delete().eq('artwork_id', id),
      supabase.from('orders').update({ artwork_id: null } as never).eq('artwork_id', id),
      supabase.from('reviews').update({ artwork_id: null } as never).eq('artwork_id', id),
      supabase.from('conversations').update({ artwork_id: null } as never).eq('artwork_id', id),
      supabase.from('messages').update({ artwork_id: null } as never).eq('artwork_id', id),
    ]);

    // Check if any nullification failed (likely NOT NULL constraint)
    const nullifyErrors = nullifyResults
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => r.reason);
    // Also check for Supabase error responses
    for (const result of nullifyResults) {
      if (result.status === 'fulfilled') {
        const val = result.value as { error?: { message?: string } };
        if (val.error?.message) {
          nullifyErrors.push(new Error(val.error.message));
        }
      }
    }

    if (nullifyErrors.length > 0) {
      console.error('[DELETE artwork] Nullify FK errors:', nullifyErrors);
      // Continue anyway — the delete below will fail with a clear FK error if columns are still NOT NULL
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
      // If still a FK constraint error, provide a clear message
      if (deleteError.message.includes('violates foreign key constraint')) {
        return NextResponse.json(
          { error: 'This artwork has associated records that prevent deletion. Please contact support.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
