import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

export interface SessionResult {
  /** The response with any refreshed cookies applied. */
  response: NextResponse;
  /** The authenticated Supabase user, or null if none. */
  user: User | null;
}

/**
 * Refreshes the Supabase session and returns both the response (with updated
 * cookies) and the current user, if any. The proxy uses the user value to
 * gate protected routes server-side before the client ever renders.
 *
 * Optimisation: skips the getUser() network call entirely when no Supabase
 * auth cookies are present (i.e. anonymous visitors). Saves a 200-500ms
 * round-trip on every anonymous request.
 */
export async function updateSession(request: NextRequest): Promise<SessionResult> {
  const hasAuthCookies = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-')
  );

  if (!hasAuthCookies) {
    return {
      response: NextResponse.next({ request: { headers: request.headers } }),
      user: null,
    };
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
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
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session token — MUST use getUser() not getSession()
  let user: User | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  } catch {
    // If refresh fails, treat as anonymous and let the page handle it.
  }

  return { response, user };
}
