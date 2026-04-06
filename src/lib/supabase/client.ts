import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Returns the singleton Supabase browser client after ensuring it has
 * finished initialization (i.e. the auth token is available in headers).
 *
 * Use this in any page / component that needs to make authenticated
 * queries. `getSession()` is a no-op if the client is already
 * initialized, so calling this repeatedly is cheap.
 */
export async function getReadyClient() {
  const supabase = createClient();
  // getSession() resolves once _initialize() completes. If the client
  // is already initialized, this returns immediately with the cached session.
  await supabase.auth.getSession();
  return supabase;
}
