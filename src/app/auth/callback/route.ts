import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // After OAuth, check if the user has a profile row.
      // The handle_new_user trigger creates one, but there may be a brief
      // delay — retry a few times if the profile isn't found yet.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let role: string | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profile) {
            role = profile.role;
            break;
          }
          // Short delay before retry
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        const redirectPath = next;
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If something went wrong, redirect to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
