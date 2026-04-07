import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ArtworkCategory } from '@/lib/types/database';

/**
 * GET /api/artworks/browse
 *
 * Public endpoint — no auth required.
 * Returns approved artworks with filters, sort, and pagination.
 * Uses server-side Supabase client to avoid browser client
 * navigator.locks issues that can cause queries to hang.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const supabase = await createClient();

    let query = supabase
      .from('artworks')
      .select(
        'id, title, price_aud, images, medium, style, category, artist_id, width_cm, height_cm, profiles!artworks_artist_id_fkey(id, full_name)',
        { count: 'exact' },
      )
      .eq('status', 'approved');

    // Category filter
    const category = params.get('category');
    if (category && category !== 'all') {
      query = query.eq('category', category as ArtworkCategory);
    }

    // Search
    const search = params.get('q');
    if (search && search.trim()) {
      const term = search.trim();
      query = query.or(
        `title.ilike.%${term}%,description.ilike.%${term}%,medium.ilike.%${term}%,style.ilike.%${term}%`,
      );
    }

    // Medium filter (comma-separated)
    const mediums = params.get('mediums');
    if (mediums) {
      query = query.in('medium', mediums.split(','));
    }

    // Style filter (comma-separated)
    const styles = params.get('styles');
    if (styles) {
      query = query.in('style', styles.split(','));
    }

    // Price range
    const priceMin = parseFloat(params.get('priceMin') || '');
    const priceMax = parseFloat(params.get('priceMax') || '');
    if (!isNaN(priceMin) && priceMin > 0) {
      query = query.gte('price_aud', priceMin);
    }
    if (!isNaN(priceMax) && priceMax > 0) {
      query = query.lte('price_aud', priceMax);
    }

    // Size filter
    const size = params.get('size');
    if (size === 'small') {
      query = query.lte('width_cm', 40).lte('height_cm', 40);
    } else if (size === 'medium') {
      query = query.or('width_cm.gte.40,height_cm.gte.40');
      query = query.or('width_cm.lte.100,height_cm.lte.100');
    } else if (size === 'large') {
      query = query.or('width_cm.gte.100,height_cm.gte.100');
    }

    // Sort
    const sort = params.get('sort');
    if (sort === 'price-low') {
      query = query.order('price_aud', { ascending: true });
    } else if (sort === 'price-high') {
      query = query.order('price_aud', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Pagination
    const offset = parseInt(params.get('offset') || '0', 10);
    const limit = parseInt(params.get('limit') || '24', 10);
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[API /artworks/browse] Query error:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: data || [],
      count: count ?? 0,
    });
  } catch (err) {
    console.error('[API /artworks/browse] Exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
