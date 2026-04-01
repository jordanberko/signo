import { createClient } from './client';
import type { Profile } from '@/lib/types/database';

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

export async function signInWithGoogle() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser(): Promise<Profile | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return profile ?? null;
  } catch {
    return null;
  }
}

export function onAuthStateChange(
  callback: (user: Profile | null, event: string) => void
) {
  const supabase = createClient();
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      // The profile trigger may not have completed yet (race condition),
      // so retry a few times with a short delay.
      let profile: Profile | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (data && !error) {
          profile = data;
          break;
        }

        // Wait before retrying (200ms, 500ms)
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 200 : 500));
        }
      }
      callback(profile, event);
    } else {
      callback(null, event);
    }
  });
}
