import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── PUT: Admin toggles artwork featured status ──

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Auth check — getUser() revalidates the JWT (privileged admin action).
    const { data: { user } } = await supabase.auth.getUser();
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
    const { is_featured } = body;

    if (typeof is_featured !== 'boolean') {
      return NextResponse.json({ error: 'is_featured must be a boolean' }, { status: 400 });
    }

    const { data: artwork, error: updateError } = await supabase
      .from('artworks')
      .update({ is_featured })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    if (!artwork) {
      return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
    }

    await logAdminAction({
      actorId: user.id,
      action: 'artwork.feature',
      targetType: 'artwork',
      targetId: id,
      detail: { is_featured },
    });

    return NextResponse.json({ data: artwork });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
