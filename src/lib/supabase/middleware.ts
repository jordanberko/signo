import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware: ONLY refreshes the Supabase session.
 *
 * No redirects, no role checks, no auth gating.
 * Pages handle their own auth via useRequireAuth hook.
 * This prevents the middleware from breaking sessions.
 *
 * Optimisation: skips the getUser() network call entirely when
 * no Supabase auth cookies are present (i.e. anonymous visitors).
 */
export async function updateSession(request: NextRequest) {
  // Fast path: if no Supabase auth cookies exist, skip the network call.
  // This avoids a 200-500ms round-trip to Supabase on every anonymous request.
  const hasAuthCookies = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-')
  );

  if (!hasAuthCookies) {
    return NextResponse.next({
      request: { headers: request.headers },
    });
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
  try {
    await supabase.auth.getUser();
  } catch {
    // If refresh fails, just continue — page components will handle auth
  }

  return response;
}
