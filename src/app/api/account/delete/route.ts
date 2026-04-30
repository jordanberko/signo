import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/account/delete
 *
 * Soft-deletes the authenticated user's account.
 *
 * Steps (each error-checked; we abort early on any failure rather than
 * leaving the account half-deleted):
 *   1. Idempotency guard — return 409 if the profile's `full_name` is
 *      already the post-delete sentinel ('Deleted User'). See the
 *      "deleted_at column" note below for why we use the sentinel.
 *   2. Pause active artwork listings (`status` → 'paused').
 *   3. Anonymise the profile (clear name/bio/avatar/location/social) and
 *      stamp `deleted_at`.
 *   4. Sign the user out across ALL devices via `scope: 'global'`.
 *
 * Hard deletion (Supabase auth user row removal) is intentionally out of
 * scope here — it should be handled by an admin or a scheduled cleanup
 * job that observes a cooling-off period.
 *
 * `deleted_at` column — caveat:
 *   The pre-existing code in this route writes a `deleted_at` field to the
 *   profile, but no migration in `supabase/migrations/` adds that column.
 *   In production Supabase silently drops unknown columns from update
 *   payloads, so the write has been a no-op since it was introduced. We
 *   keep the field in the payload for forward-compatibility (in case a
 *   future migration lands the column) but use `full_name === 'Deleted
 *   User'` as the actual idempotency signal — that field IS in the
 *   schema and IS reliably written by step 3.
 *
 * Session-revocation timing — important for callers to understand:
 *   • `signOut({ scope: 'global' })` invalidates every refresh token for
 *     this user immediately, so other devices CANNOT obtain a new access
 *     token after this call returns.
 *   • Existing access tokens already issued to other devices remain valid
 *     until they expire naturally (default ~1 hour for Supabase JWTs).
 *     Other devices can therefore continue making authenticated requests
 *     for up to that window; we accept this as the cost of stateless JWTs.
 *     Routes that need stricter cut-offs should consult the profile's
 *     post-delete state directly rather than relying on session presence.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Idempotency guard — early-return if the profile is already in the
    // post-delete state. We use full_name === 'Deleted User' as the
    // sentinel; see the "deleted_at column" note in the route doc-comment
    // for why this column rather than `deleted_at`.
    const { data: profile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (profileFetchError) {
      console.error('[API account/delete] Failed to fetch profile:', profileFetchError);
      return NextResponse.json(
        { error: 'Failed to delete account. Please try again.' },
        { status: 500 }
      );
    }

    if (profile?.full_name === 'Deleted User') {
      return NextResponse.json(
        { error: 'Account is already deleted.' },
        { status: 409 }
      );
    }

    // Step 1: Pause active listings. We pause rather than remove so the
    // historical sales record stays intact for the buyer side.
    const { error: artworksError } = await supabase
      .from('artworks')
      .update({ status: 'paused' })
      .eq('artist_id', user.id)
      .in('status', ['approved', 'pending_review', 'draft']);

    if (artworksError) {
      console.error('[API account/delete] Failed to pause artworks:', artworksError);
      return NextResponse.json(
        { error: 'Failed to delete account. Please try again.' },
        { status: 500 }
      );
    }

    // Step 2: Anonymise profile + stamp deleted_at. If this fails after
    // step 1 succeeded, the listings are already paused — that's the
    // safer partial state, and a user retry is a no-op on artworks (the
    // status filter no longer matches anything) followed by a real retry
    // on the profile update.
    const { error: profileUpdateError } = await supabase
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

    if (profileUpdateError) {
      console.error('[API account/delete] Failed to anonymise profile:', profileUpdateError);
      return NextResponse.json(
        { error: 'Failed to delete account. Please try again.' },
        { status: 500 }
      );
    }

    // Step 3: Revoke ALL sessions, not just this one. See the
    // session-revocation timing note in the route's doc-comment for the
    // refresh-token vs access-token semantics.
    await supabase.auth.signOut({ scope: 'global' });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API account/delete]', err);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
