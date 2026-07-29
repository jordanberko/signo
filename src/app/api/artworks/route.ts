import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateArtworkBody, VALID_STATUSES } from '@/lib/validation/artworks';
import { getAccountStatus } from '@/lib/stripe/connect';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_completed, stripe_account_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['artist', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only artists can create artworks' },
        { status: 403 }
      );
    }

    // Onboarding gate — artists must complete Stripe Connect setup before uploading
    if (
      profile.role === 'artist' &&
      (!profile.onboarding_completed || !profile.stripe_account_id)
    ) {
      return NextResponse.json(
        {
          error:
            'Please complete your seller onboarding before uploading artworks.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    // ── Field-level validation ──
    // Validation failures return 400 with both `errors` (field map for
    // inline UI) and `error` (top-level summary for older callers /
    // accessibility). Non-validation failures below return only `error`.
    const errors = validateArtworkBody(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          error: 'Please check the highlighted fields below.',
          errors,
        },
        { status: 400 }
      );
    }

    const {
      id,
      title,
      description,
      category,
      medium,
      style,
      colors,
      width_cm,
      height_cm,
      depth_cm,
      surface,
      price_aud,
      is_framed,
      ready_to_hang,
      shipping_weight_kg,
      images,
      tags,
      status,
      availability,
      available_from,
    } = body;

    const artworkStatus = (VALID_STATUSES as readonly string[]).includes(status)
      ? (status as typeof VALID_STATUSES[number])
      : 'draft';

    // ── Live payouts gate (submit-for-review only) ──
    // `onboarding_completed` + a `stripe_account_id` is not the same as
    // "can actually receive money" — an artist can get an account id and be
    // marked onboarded while identity verification or bank details are still
    // outstanding, so payouts_enabled is false. Listing anyway means every
    // buyer hits the checkout payouts-block. Verify with Stripe when the
    // artist submits for review (not on every draft save, to avoid the round
    // trip). Non-fatal: if the Stripe call fails we let the submission
    // through rather than block listing on a transient Stripe error — only a
    // definitive payouts_enabled=false stops it.
    if (
      artworkStatus === 'pending_review' &&
      profile.role === 'artist' &&
      profile.stripe_account_id
    ) {
      try {
        const acct = await getAccountStatus(profile.stripe_account_id);
        if (!acct.payoutsEnabled) {
          return NextResponse.json(
            {
              error:
                'Your payouts aren’t active yet, so buyers wouldn’t be able to complete a purchase. ' +
                'Finish your payout setup (identity and bank details) in Payout settings, then submit for review. ' +
                'You can keep saving this as a draft in the meantime.',
              payoutsInactive: true,
            },
            { status: 409 }
          );
        }
      } catch (err) {
        console.warn(
          '[Artworks] payouts status check failed, allowing submission:',
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    const { data: artwork, error: insertError } = await supabase
      .from('artworks')
      .insert({
        ...(id ? { id } : {}),
        artist_id: user.id,
        title: title?.trim() ?? '',
        description: description?.trim() ?? null,
        category: category ?? 'original',
        medium: medium || null,
        style: style || null,
        width_cm: width_cm ? parseFloat(width_cm) : null,
        height_cm: height_cm ? parseFloat(height_cm) : null,
        depth_cm: depth_cm ? parseFloat(depth_cm) : null,
        price_aud: parseFloat(price_aud) || 0,
        is_framed: is_framed ?? false,
        ready_to_hang: ready_to_hang ?? false,
        surface: surface || null,
        colors: colors ?? [],
        availability: availability ?? 'available',
        available_from: available_from || null,
        shipping_weight_kg: shipping_weight_kg
          ? parseFloat(shipping_weight_kg)
          : null,
        images: images ?? [],
        tags: tags ?? [],
        status: artworkStatus,
      })
      .select()
      .single();

    if (insertError) {
      // Server-side failure (DB write error). Log the raw cause for
      // debugging; return a friendly message and a 500 — this is a
      // server fault, not a user input problem.
      console.error('[Artworks] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save your artwork. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: artwork }, { status: 201 });
  } catch (err) {
    console.error('[Artworks] Exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
