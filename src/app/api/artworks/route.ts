import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_CATEGORIES = ['original', 'print', 'digital'] as const;
const VALID_STATUSES = ['draft', 'pending_review'] as const;
const TITLE_MAX = 100;
const DESCRIPTION_MAX = 2000;

type ValidationErrors = Record<string, string>;

/**
 * Field-level validator. Returns a map of fieldName → message.
 * Empty object = valid. Required-when-pending-review fields kick in
 * only when the client is asking to submit for review; drafts can
 * be saved with whatever the user has typed so far.
 */
function validateArtworkBody(body: unknown): ValidationErrors {
  const errors: ValidationErrors = {};
  const data =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>)
      : {};

  // ── Always-checked rules (apply to drafts too) ──

  if (
    data.category != null &&
    !(VALID_CATEGORIES as readonly string[]).includes(String(data.category))
  ) {
    errors.category = 'Invalid category.';
  }

  if (data.price_aud != null && data.price_aud !== '') {
    const n = Number(data.price_aud);
    if (!Number.isFinite(n)) {
      errors.price_aud = 'Price must be a number.';
    } else if (n < 0) {
      errors.price_aud = 'Price must be positive.';
    }
  }

  if (typeof data.title === 'string' && data.title.length > TITLE_MAX) {
    errors.title = `Title must be ${TITLE_MAX} characters or less.`;
  }

  if (
    typeof data.description === 'string' &&
    data.description.length > DESCRIPTION_MAX
  ) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or less.`;
  }

  // ── Required-for-pending_review rules ──

  const status = data.status === 'pending_review' ? 'pending_review' : 'draft';
  if (status === 'pending_review') {
    if (typeof data.title !== 'string' || !data.title.trim()) {
      errors.title = 'Title is required.';
    }
    if (typeof data.description !== 'string' || !data.description.trim()) {
      errors.description = 'Description is required.';
    }
    if (!Array.isArray(data.images) || data.images.length < 1) {
      errors.images = 'At least one image is required.';
    }
    const price = Number(data.price_aud);
    if (!Number.isFinite(price) || price < 1) {
      errors.price_aud = 'Price must be at least $1.';
    }
    // Mirror the client form's required fields so server and client
    // agree on what "ready for review" means.
    if (typeof data.medium !== 'string' || !data.medium.trim()) {
      errors.medium = 'Medium is required.';
    }
    if (typeof data.style !== 'string' || !data.style.trim()) {
      errors.style = 'Style is required.';
    }
  }

  return errors;
}

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
