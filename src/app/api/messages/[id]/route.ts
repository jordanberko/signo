import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{
              data: Record<string, unknown> | null;
              error: { message: string } | null;
            }>;
            order: (col: string, opts: { ascending: boolean }) => Promise<{
              data: Record<string, unknown>[] | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };

    // Fetch conversation
    const { data: convo, error: convoError } = await db
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convoError || !convo) {
      console.error('[API conversation] error:', convoError?.message);
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify user is a participant
    if (convo.participant_1 !== user.id && convo.participant_2 !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch other user's profile
    const otherId =
      convo.participant_1 === user.id
        ? convo.participant_2
        : convo.participant_1;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', otherId as string)
      .single();

    // Fetch artwork if linked
    let artwork = null;
    if (convo.artwork_id) {
      const { data: art } = await supabase
        .from('artworks')
        .select('id, title, images')
        .eq('id', convo.artwork_id as string)
        .single();
      artwork = art;
    }

    // Fetch messages
    const { data: messages, error: msgError } = await db
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('[API conversation] messages error:', msgError.message);
    }

    return NextResponse.json({
      conversation: convo,
      otherUser: profile || { id: otherId, full_name: 'Unknown', avatar_url: null },
      artwork,
      messages: messages || [],
    });
  } catch (err) {
    console.error('[API conversation] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
