import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/account/delete
 *
 * Soft-deletes the authenticated user's account:
 * - Cancels any active artwork listings (sets status to 'removed')
 * - Anonymises the profile (clears name, bio, avatar, etc.)
 * - Marks the profile as deleted via a `deleted_at` timestamp
 * - Signs the user out
 *
 * Hard deletion (Supabase auth user removal) should be handled by
 * an admin or a scheduled cleanup job to allow a cooling-off period.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Cancel all active artwork listings
    await supabase
      .from('artworks')
      .update({ status: 'paused' })
      .eq('artist_id', user.id)
      .in('status', ['approved', 'pending_review', 'draft']);

    // Anonymise profile
    await supabase
      .from('profiles')
      .update({
        full_name: 'Deleted User',
        bio: null,
        avatar_url: null,
        location: null,
        social_links: {} as Record<string, string>,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // Sign out
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API account/delete]', err);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
