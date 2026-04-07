import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { conversation_id } = body;

    if (!conversation_id) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      );
    }

    // Mark all unread messages in this conversation as read
    // where the sender is NOT the current user
    // Original schema uses `is_read` column (not `read`)
    const { error } = await (supabase as unknown as {
      from: (table: string) => {
        update: (row: Record<string, unknown>) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: boolean) => {
              neq: (col: string, val: string) => Promise<{
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
    })
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversation_id)
      .eq('is_read', false)
      .neq('sender_id', user.id);

    if (error) {
      console.error('[API read] mark read failed:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API read] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
