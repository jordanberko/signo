import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // `next` is carried on the confirmation link and is therefore
  // user-visible and tamperable. Only accept a same-site absolute path so a
  // crafted `next=//evil.com` (or a full URL) can't turn this into an open
  // redirect after a valid session exchange.
  const rawNext = searchParams.get('next') ?? '/';
  const next =
    rawNext.startsWith('/') &&
    !rawNext.startsWith('//') &&
    !rawNext.startsWith('/\\')
      ? rawNext
      : '/';
  const selectedRole = searchParams.get('role'); // from register page OAuth

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
            // If the user signed up via Google with a role selection, apply it
            if (selectedRole === 'artist' && role !== 'artist') {
              await supabase
                .from('profiles')
                .update({ role: 'artist' })
                .eq('id', user.id);
              role = 'artist';
            }
            break;
          }
          // Short delay before retry
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // If the user just registered as an artist via Google, send to onboarding
        const redirectPath = role === 'artist' && selectedRole === 'artist' ? '/artist/onboarding' : next;
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If something went wrong, redirect to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
