import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          or: (filter: string) => {
            order: (col: string, opts: { ascending: boolean }) => Promise<{
              data: Record<string, unknown>[] | null;
              error: { message: string } | null;
            }>;
          };
          eq: (col: string, val: unknown) => {
            order: (col: string, opts: { ascending: boolean }) => {
              limit: (n: number) => Promise<{
                data: Record<string, unknown>[] | null;
                error: { message: string } | null;
              }>;
            };
            eq: (col: string, val: unknown) => {
              neq: (col: string, val: string) => Promise<{
                count: number | null;
                error: { message: string } | null;
              }>;
            };
          };
          in: (col: string, vals: string[]) => Promise<{
            data: Record<string, unknown>[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };

    // 1. Fetch conversations
    const { data: convos, error: convoError } = await db
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (convoError) {
      console.error('[API inbox] conversations error:', convoError.message);
      return NextResponse.json({ error: convoError.message }, { status: 500 });
    }

    if (!convos || convos.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 2. Gather IDs for batch lookups
    const otherUserIds = new Set<string>();
    const artworkIds = new Set<string>();

    for (const c of convos) {
      const otherId =
        c.participant_1 === user.id ? c.participant_2 : c.participant_1;
      otherUserIds.add(otherId as string);
      if (c.artwork_id) artworkIds.add(c.artwork_id as string);
    }

    // 3. Batch fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', Array.from(otherUserIds));

    const profileMap = new Map<string, Record<string, unknown>>();
    (profiles || []).forEach((p) => profileMap.set(p.id, p));

    // 4. Batch fetch artworks
    const artworkMap = new Map<string, Record<string, unknown>>();
    if (artworkIds.size > 0) {
      const { data: artworks } = await supabase
        .from('artworks')
        .select('id, title, images')
        .in('id', Array.from(artworkIds));
      (artworks || []).forEach((a) => artworkMap.set(a.id, a));
    }

    // 5. For each conversation, get last message + unread count
    const results = [];

    for (const c of convos) {
      const otherId =
        c.participant_1 === user.id ? c.participant_2 : c.participant_1;

      // Last message
      const { data: lastMsgs } = await db
        .from('messages')
        .select('content, sender_id')
        .eq('conversation_id', c.id as string)
        .order('created_at', { ascending: false })
        .limit(1);

      // Unread count
      const { count: unread } = await (supabase as unknown as {
        from: (table: string) => {
          select: (cols: string, opts: { count: string; head: boolean }) => {
            eq: (col: string, val: unknown) => {
              eq: (col: string, val: boolean) => {
                neq: (col: string, val: string) => Promise<{
                  count: number | null;
                  error: unknown;
                }>;
              };
            };
          };
        };
      })
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', c.id as string)
        .eq('read', false)
        .neq('sender_id', user.id);

      const lastMsg = lastMsgs?.[0] || null;
      let preview = (lastMsg?.content as string) || null;
      if (preview && preview.length > 60) {
        preview = preview.substring(0, 57) + '...';
      }

      const otherProfile = profileMap.get(otherId as string);
      const art = c.artwork_id
        ? artworkMap.get(c.artwork_id as string)
        : null;

      results.push({
        id: c.id,
        otherUser: otherProfile || {
          id: otherId,
          full_name: 'Unknown',
          avatar_url: null,
        },
        artwork: art || null,
        lastMessage: preview,
        lastMessageAt: c.last_message_at,
        unreadCount: unread ?? 0,
      });
    }

    return NextResponse.json({ data: results });
  } catch (err) {
    console.error('[API inbox] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
