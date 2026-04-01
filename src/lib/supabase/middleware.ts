import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/types/database';

/** Protected routes and their allowed roles. */
const ROLE_ACCESS: Record<string, string[]> = {
  '/admin': ['admin'],
  '/artist/onboarding': ['buyer', 'artist', 'admin'],
  '/artist': ['artist', 'admin'],
  '/dashboard': ['buyer', 'artist', 'admin'],
  '/checkout': ['buyer', 'artist', 'admin'],
  '/orders': ['buyer', 'artist', 'admin'],
  '/messages': ['buyer', 'artist', 'admin'],
  '/settings': ['buyer', 'artist', 'admin'],
};

const AUTH_ROUTES = ['/login', '/register'];

/**
 * Helper: create a redirect response that preserves the session cookies
 * from supabaseResponse. Without this, redirects lose the refreshed tokens
 * and the browser can't maintain the session.
 */
function redirectWithCookies(
  url: URL,
  supabaseResponse: NextResponse
): NextResponse {
  const redirect = NextResponse.redirect(url);
  // Copy all cookies (especially the refreshed Supabase session tokens)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value, {
      // Preserve the cookie options that Supabase SSR sets
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
  });
  return redirect;
}

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

  // IMPORTANT: getUser() validates the JWT and refreshes the token if needed.
  // getSession() only reads from cookies without validation — never use it here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ── Redirect authenticated users away from login/register ──
  if (user && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.searchParams.delete('redirect');
    return redirectWithCookies(url, supabaseResponse);
  }

  // ── Check if route is protected ──
  const matchedRoute = Object.keys(ROLE_ACCESS).find((route) =>
    pathname.startsWith(route)
  );

  if (matchedRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return redirectWithCookies(url, supabaseResponse);
    }

    // Check role
    const allowedRoles = ROLE_ACCESS[matchedRoute];

    let userRole = 'buyer';
    let onboardingCompleted = true;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_completed')
      .eq('id', user.id)
      .single();

    if (profile) {
      userRole = profile.role ?? 'buyer';
      onboardingCompleted = profile.onboarding_completed ?? true;
    }

    if (!allowedRoles.includes(userRole)) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.searchParams.set('error', 'unauthorized');
      return redirectWithCookies(url, supabaseResponse);
    }

    // Artist onboarding gate
    if (
      pathname.startsWith('/artist') &&
      !pathname.startsWith('/artist/onboarding') &&
      userRole === 'artist' &&
      !onboardingCompleted
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/artist/onboarding';
      return redirectWithCookies(url, supabaseResponse);
    }
  }

  return supabaseResponse;
}
