import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/types/database';

/** Role hierarchy for route protection. */
const ROLE_ACCESS: Record<string, string[]> = {
  '/admin': ['admin'],
  '/artist': ['artist', 'admin'],
  '/dashboard': ['buyer', 'artist', 'admin'],
  '/checkout': ['buyer', 'artist', 'admin'],
  '/orders': ['buyer', 'artist', 'admin'],
  '/messages': ['buyer', 'artist', 'admin'],
  '/settings': ['buyer', 'artist', 'admin'],
};

/** Routes that authenticated users should NOT see (redirect to dashboard). */
const AUTH_ROUTES = ['/login', '/register'];

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

  // Refresh the session — IMPORTANT: must call getUser() not getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ── Redirect authenticated users away from login/register ──
  if (user && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.searchParams.delete('redirect');
    return NextResponse.redirect(url);
  }

  // ── Check if route is protected ──
  const matchedRoute = Object.keys(ROLE_ACCESS).find((route) =>
    pathname.startsWith(route)
  );

  if (matchedRoute) {
    // Not authenticated → redirect to login with return URL
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Authenticated → check role
    const allowedRoles = ROLE_ACCESS[matchedRoute];
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_completed')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role ?? 'buyer';

    if (!allowedRoles.includes(userRole)) {
      // Wrong role → redirect to their dashboard with an error
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(url);
    }

    // ── Artist onboarding gate ──
    // Artists who haven't completed onboarding get redirected,
    // unless they're already on the onboarding page.
    if (
      pathname.startsWith('/artist') &&
      !pathname.startsWith('/artist/onboarding') &&
      (userRole === 'artist') &&
      !profile?.onboarding_completed
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/artist/onboarding';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
