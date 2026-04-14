import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ── PUT: Update current user's profile ──

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      full_name,
      bio,
      location,
      avatar_url,
      social_links,
      onboarding_completed,
      role,
      street_address,
      city,
      state,
      postcode,
      country,
      accepts_commissions,
    } = body;

    // Validate full_name if provided
    if (full_name !== undefined && (!full_name || !full_name.trim())) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }

    // Validate bio length
    if (bio !== undefined && bio && bio.length > 500) {
      return NextResponse.json({ error: 'Bio must be 500 characters or less' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (full_name !== undefined) updateData.full_name = full_name.trim();
    if (bio !== undefined) updateData.bio = bio?.trim() || null;
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url || null;
    if (social_links !== undefined) updateData.social_links = social_links;
    if (onboarding_completed !== undefined) updateData.onboarding_completed = !!onboarding_completed;
    if (street_address !== undefined) updateData.street_address = street_address?.trim() || null;
    if (city !== undefined) updateData.city = city?.trim() || null;
    if (state !== undefined) updateData.state = state?.trim() || null;
    if (postcode !== undefined) updateData.postcode = postcode?.trim() || null;
    if (country !== undefined) updateData.country = country?.trim() || null;
    if (accepts_commissions !== undefined) updateData.accepts_commissions = !!accepts_commissions;

    // Role upgrade: only allow buyer → artist (never downgrade or escalate to admin)
    if (role === 'artist') {
      // Verify current role is 'buyer' before allowing upgrade
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (currentProfile?.role === 'buyer') {
        updateData.role = 'artist';
      }
      // If already artist, silently ignore. If admin, don't downgrade.
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Attempt the update
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      // If the error is about `onboarding_completed` column not existing,
      // retry without it so the rest of the profile still saves.
      const msg = updateError.message || '';
      if (
        msg.includes('onboarding_completed') ||
        msg.includes('column') ||
        msg.includes('does not exist')
      ) {
        const fallbackData = { ...updateData };
        delete fallbackData.onboarding_completed;

        if (Object.keys(fallbackData).length === 0) {
          return NextResponse.json(
            { error: 'The onboarding_completed column is missing from your profiles table. Run the SQL migration to add it.' },
            { status: 400 },
          );
        }

        const { data: fallbackProfile, error: fallbackError } = await supabase
          .from('profiles')
          .update(fallbackData)
          .eq('id', user.id)
          .select()
          .single();

        if (fallbackError) {
          return NextResponse.json({ error: fallbackError.message }, { status: 400 });
        }

        // Saved the rest — warn about the missing column
        return NextResponse.json({
          data: fallbackProfile,
          warning: 'Profile saved, but the onboarding_completed column does not exist yet. Run the migration SQL in your Supabase SQL Editor to add it.',
        });
      }

      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ data: profile });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
