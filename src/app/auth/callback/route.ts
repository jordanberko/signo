import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // After OAuth, check if the user has a profile row.
      // The handle_new_user trigger should have created one,
      // but for Google sign-in the role defaults to 'buyer'.
      // Fetch profile to decide redirect.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const redirectPath = profile?.role === 'artist' ? '/artist/dashboard' : next;
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If something went wrong, redirect to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
