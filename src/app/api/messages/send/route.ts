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
    const { conversation_id, content } = body;

    if (!conversation_id || !content) {
      return NextResponse.json(
        { error: 'conversation_id and content are required' },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: 'Message too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    const db = supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          or: (filter: string) => {
            eq: (col: string, val: string) => {
              single: () => Promise<{
                data: Record<string, unknown> | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
        insert: (row: Record<string, unknown>) => {
          select: (cols: string) => {
            single: () => Promise<{
              data: Record<string, unknown> | null;
              error: { message: string } | null;
            }>;
          };
        };
        update: (row: Record<string, unknown>) => {
          eq: (col: string, val: string) => Promise<{
            error: { message: string } | null;
          }>;
        };
      };
    };

    // Verify user is a participant and get the conversation details
    const { data: conversation, error: convError } = await db
      .from('conversations')
      .select('*')
      .or(
        `participant_1.eq.${user.id},participant_2.eq.${user.id}`
      )
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      console.error('[API send] conversation lookup failed:', convError?.message);
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 403 }
      );
    }

    // Determine the receiver (the OTHER participant)
    const receiverId =
      conversation.participant_1 === user.id
        ? conversation.participant_2
        : conversation.participant_1;

    // Insert message — using the ORIGINAL messages table schema:
    // columns: conversation_id, sender_id, receiver_id (NOT NULL), artwork_id, content, is_read
    const { data: message, error: msgError } = await db
      .from('messages')
      .insert({
        conversation_id,
        sender_id: user.id,
        receiver_id: receiverId,
        artwork_id: (conversation.artwork_id as string) || null,
        content: content.trim(),
        is_read: false,
      })
      .select('*')
      .single();

    if (msgError) {
      // Log full error object for debugging; user-facing message is
      // generic so schema constraint names don't leak.
      console.error('[API send] insert message failed:', msgError);
      return NextResponse.json(
        { error: 'Failed to send your message. Please try again.' },
        { status: 500 }
      );
    }

    console.log('[API send] message created:', (message as Record<string, unknown>)?.id);

    // Update last_message_at on conversation
    await db
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation_id);

    return NextResponse.json({ data: message });
  } catch (err) {
    console.error('[API send] unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
