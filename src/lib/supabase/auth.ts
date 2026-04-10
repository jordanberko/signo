import { createClient } from './client';

export async function signUp(email: string, password: string, fullName: string, role: 'buyer' | 'artist') {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
      },
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
