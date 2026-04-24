import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendArtworkApproved, sendArtworkRejected } from '@/lib/email';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── PUT: Admin approves or rejects artwork ──

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

    // Verify admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, review_notes } = body;

    // Validate action
    if (!action || !['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ error: 'Action must be approved or rejected' }, { status: 400 });
    }

    // Update artwork
    const { data: artwork, error: updateError } = await supabase
      .from('artworks')
      .update({
        status: action,
        review_notes: action === 'approved' ? null : review_notes || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    if (!artwork) {
      return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
    }

    // ── Send email to artist (fire-and-forget) ──
    const { data: artistProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', artwork.artist_id)
      .single();

    if (artistProfile?.email) {
      if (action === 'approved') {
        try {
          await sendArtworkApproved({
            artistEmail: artistProfile.email,
            artistName: artistProfile.full_name || '',
            artworkId: id,
            artworkTitle: artwork.title,
          });
        } catch (err) {
          console.warn('[EMAIL_FAILED]', {
            type: 'artwork_approved',
            artworkId: id,
            recipient: artistProfile.email,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      } else {
        try {
          await sendArtworkRejected({
            artistEmail: artistProfile.email,
            artistName: artistProfile.full_name || '',
            artworkTitle: artwork.title,
            reviewNotes: review_notes || undefined,
          });
        } catch (err) {
          console.warn('[EMAIL_FAILED]', {
            type: 'artwork_rejected',
            artworkId: id,
            recipient: artistProfile.email,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    return NextResponse.json({ data: artwork });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
