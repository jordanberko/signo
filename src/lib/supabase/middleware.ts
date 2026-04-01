import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/types/database';

/**
 * Middleware: ONLY refreshes the Supabase session.
 *
 * No redirects happen here. All auth-gating is done in page components
 * using client-side checks. This prevents redirect loops caused by
 * getUser() failing intermittently on Vercel edge.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session token. Wrapped in try-catch because this makes
  // a network call to Supabase which can fail on cold starts.
  try {
    await supabase.auth.getUser();
  } catch {
    // If token refresh fails, just continue — the page component will handle it
  }

  return supabaseResponse;
}
