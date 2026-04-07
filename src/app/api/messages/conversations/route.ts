import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { participant_2, artwork_id } = body;

    if (!participant_2) {
      return NextResponse.json(
        { error: 'participant_2 is required' },
        { status: 400 }
      );
    }

    if (participant_2 === user.id) {
      return NextResponse.json(
        { error: 'Cannot create a conversation with yourself' },
        { status: 400 }
      );
    }

    const db = supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          or: (filter: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
            };
            maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
          };
        };
        insert: (row: Record<string, unknown>) => {
          select: (cols: string) => {
            single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
          };
        };
      };
    };

    // Check if conversation already exists (either direction of participants)
    const artworkFilter = artwork_id || null;

    // Try both participant orderings
    let existing = null;

    if (artworkFilter) {
      const { data: conv1 } = await db
        .from('conversations')
        .select('*')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${participant_2}),and(participant_1.eq.${participant_2},participant_2.eq.${user.id})`)
        .eq('artwork_id', artworkFilter)
        .maybeSingle();
      existing = conv1;
    } else {
      // For conversations without artwork, check both orderings with null artwork
      const { data: conv1 } = await (supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            or: (filter: string) => {
              is: (col: string, val: null) => {
                maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
              };
            };
          };
        };
      })
        .from('conversations')
        .select('*')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${participant_2}),and(participant_1.eq.${participant_2},participant_2.eq.${user.id})`)
        .is('artwork_id', null)
        .maybeSingle();
      existing = conv1;
    }

    if (existing) {
      return NextResponse.json({ data: existing });
    }

    // Create new conversation
    const insertData: Record<string, unknown> = {
      participant_1: user.id,
      participant_2,
    };
    if (artworkFilter) {
      insertData.artwork_id = artworkFilter;
    }

    const { data: conversation, error } = await db
      .from('conversations')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: conversation });
  } catch (err) {
    console.error('[API] conversations error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
