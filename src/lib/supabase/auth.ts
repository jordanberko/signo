import { createClient } from './client';

export async function signUp(email: string, password: string, fullName: string, role: 'buyer' | 'artist') {
  const supabase = createClient();

  // Where the confirmation email link should land. Without emailRedirectTo,
  // Supabase uses the project's Site URL, which in past incidents pointed at
  // the wrong environment and dropped users on a blank page. Route it through
  // our /auth/callback (which exchanges the code for a session) and carry a
  // role-appropriate `next` so a confirmed artist reaches onboarding instead
  // of the site root.
  let emailRedirectTo: string | undefined;
  if (typeof window !== 'undefined') {
    const next = role === 'artist' ? '/artist/onboarding' : '/browse?welcome=1';
    const url = new URL('/auth/callback', window.location.origin);
    url.searchParams.set('next', next);
    emailRedirectTo = url.toString();
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
      },
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
    },
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signInWithGoogle(role?: 'buyer' | 'artist') {
  const supabase = createClient();
  const redirectUrl = new URL('/auth/callback', window.location.origin);
  if (role) {
    redirectUrl.searchParams.set('role', role);
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl.toString(),
    },
  });
  return { data, error };
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}
