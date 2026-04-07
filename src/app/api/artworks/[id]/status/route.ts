import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending_review'],
  approved: ['paused'],
  paused: ['approved'],
  rejected: ['pending_review'],
};

// ── PATCH: Change artwork status ──

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Auth check
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch artwork
    const { data: artwork } = await supabase
      .from('artworks')
      .select('artist_id, status, title, description, images, price_aud')
      .eq('id', id)
      .single();

    if (!artwork) {
      return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
    }
    if (artwork.artist_id !== user.id) {
      return NextResponse.json({ error: 'You do not own this artwork' }, { status: 403 });
    }

    const { status: newStatus } = await request.json();

    // Validate transition
    const allowed = ALLOWED_TRANSITIONS[artwork.status];
    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot change status from "${artwork.status}" to "${newStatus}"` },
        { status: 400 },
      );
    }

    // Validate required fields when submitting for review
    if (newStatus === 'pending_review') {
      if (!artwork.title?.trim()) {
        return NextResponse.json({ error: 'Title is required to submit for review' }, { status: 400 });
      }
      if (!artwork.description?.trim()) {
        return NextResponse.json({ error: 'Description is required to submit for review' }, { status: 400 });
      }
      const images = (artwork.images as string[]) ?? [];
      if (images.length === 0) {
        return NextResponse.json({ error: 'At least one image is required to submit for review' }, { status: 400 });
      }
      if (!artwork.price_aud || artwork.price_aud < 1) {
        return NextResponse.json({ error: 'Price must be at least $1 to submit for review' }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = { status: newStatus };

    // Clear review notes if resubmitting
    if (newStatus === 'pending_review') {
      updateData.review_notes = null;
    }

    const { data: updated, error: updateError } = await supabase
      .from('artworks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
