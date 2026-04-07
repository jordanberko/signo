import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ count: 0 });
    }

    // Get conversation IDs where user is a participant
    const { data: convos } = await (supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          or: (filter: string) => Promise<{
            data: { id: string }[] | null;
            error: unknown;
          }>;
        };
      };
    })
      .from('conversations')
      .select('id')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);

    if (!convos || convos.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    const convoIds = convos.map((c) => c.id);

    // Count unread messages using `is_read` column (original schema)
    const { count, error } = await (supabase as unknown as {
      from: (table: string) => {
        select: (cols: string, opts: { count: string; head: boolean }) => {
          in: (col: string, vals: string[]) => {
            eq: (col: string, val: boolean) => {
              neq: (col: string, val: string) => Promise<{
                count: number | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
    })
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convoIds)
      .eq('is_read', false)
      .neq('sender_id', user.id);

    if (error) {
      console.error('[API unread] count error:', error.message);
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (err) {
    console.error('[API unread] error:', err);
    return NextResponse.json({ count: 0 });
  }
}
