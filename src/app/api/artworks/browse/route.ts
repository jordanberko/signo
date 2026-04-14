import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
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
    // Rate limit: 60 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { success } = rateLimit(`browse:${ip}`, { max: 60, windowMs: 60_000 });
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }
    const params = request.nextUrl.searchParams;
    const supabase = await createClient();

    // Hide artworks from paused/cancelled artists
    const { data: hiddenArtists } = await supabase
      .from('profiles')
      .select('id')
      .in('subscription_status', ['paused', 'cancelled']);

    const hiddenIds = (hiddenArtists || []).map((a: { id: string }) => a.id);

    let query = supabase
      .from('artworks')
      .select(
        'id, title, price_aud, images, medium, style, category, artist_id, width_cm, height_cm, availability, available_from, profiles!artworks_artist_id_fkey(id, full_name)',
        { count: 'exact' },
      )
      .eq('status', 'approved');

    // Exclude artworks from paused/cancelled subscription artists
    if (hiddenIds.length > 0) {
      query = query.not('artist_id', 'in', `(${hiddenIds.join(',')})`);
    }

    // Category filter
    const category = params.get('category');
    if (category && category !== 'all') {
      query = query.eq('category', category as ArtworkCategory);
    }

    // Search — match artwork fields + artist name
    const search = params.get('q');
    if (search && search.trim()) {
      // Sanitize for PostgREST: escape special pattern characters and limit length
      const term = search
        .trim()
        .slice(0, 200)
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')
        .replace(/,/g, '')
        .replace(/[()]/g, '');

      // First search artwork fields directly
      // Also find artist IDs matching the name so we can include their works
      const { data: matchingArtists } = await supabase
        .from('profiles')
        .select('id')
        .ilike('full_name', `%${term}%`);

      const artistIds = (matchingArtists || []).map((a) => a.id);

      if (artistIds.length > 0) {
        // Match artwork fields OR artist name
        query = query.or(
          `title.ilike.%${term}%,description.ilike.%${term}%,medium.ilike.%${term}%,style.ilike.%${term}%,artist_id.in.(${artistIds.join(',')})`,
        );
      } else {
        query = query.or(
          `title.ilike.%${term}%,description.ilike.%${term}%,medium.ilike.%${term}%,style.ilike.%${term}%`,
        );
      }
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

    // Colour filter (comma-separated, array overlap)
    const colors = params.get('colors');
    if (colors) {
      const colorArray = colors.split(',').filter(Boolean);
      if (colorArray.length > 0) {
        query = query.overlaps('colors', colorArray);
      }
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
      // Both dimensions < 40cm
      query = query.lt('width_cm', 40).lt('height_cm', 40);
    } else if (size === 'medium') {
      // At least one dimension >= 40cm AND both dimensions <= 100cm
      // .or() produces (width >= 40 OR height >= 40), chained .lte() calls
      // add AND conditions, so the full filter is:
      // (width >= 40 OR height >= 40) AND width <= 100 AND height <= 100
      query = query
        .or('width_cm.gte.40,height_cm.gte.40')
        .lte('width_cm', 100)
        .lte('height_cm', 100);
    } else if (size === 'large') {
      // At least one dimension > 100cm
      query = query.or('width_cm.gt.100,height_cm.gt.100');
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
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    console.error('[API /artworks/browse] Exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
