import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_CATEGORIES = ['original', 'print', 'digital'];
const VALID_STATUSES = ['draft', 'pending_review'];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['artist', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Only artists can create artworks' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
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

    // Validate status
    const artworkStatus = VALID_STATUSES.includes(status) ? status : 'draft';

    // Validate required fields for submission
    if (artworkStatus === 'pending_review') {
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

    // Validate price if provided
    if (price_aud !== undefined && price_aud !== null && price_aud < 0) {
      return NextResponse.json({ error: 'Price must be positive' }, { status: 400 });
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
        shipping_weight_kg: shipping_weight_kg ? parseFloat(shipping_weight_kg) : null,
        images: images ?? [],
        tags: tags ?? [],
        status: artworkStatus,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ data: artwork }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
