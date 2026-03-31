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

    // First try selecting role + onboarding_completed.
    // If onboarding_completed column doesn't exist yet, fall back to just role.
    let userRole = 'buyer';
    let onboardingCompleted = true; // default: skip gate if unknown

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, onboarding_completed')
      .eq('id', user.id)
      .single();

    if (profileError && (profileError.message?.includes('onboarding_completed') || profileError.message?.includes('column'))) {
      // Column doesn't exist — retry with just role
      const { data: fallback } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      userRole = fallback?.role ?? 'buyer';
    } else if (profile) {
      userRole = profile.role ?? 'buyer';
      onboardingCompleted = profile.onboarding_completed ?? true;
    }

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
      !onboardingCompleted
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/artist/onboarding';
      return NextResponse.redirect(url);
    }

    // ── Artist subscription gate ──
    // When STRIPE_ENFORCE_SUBSCRIPTIONS=true, artists without an active
    // subscription are redirected to /artist/subscribe.
    // Exempt routes: dashboard, earnings, subscribe, onboarding (so they
    // can still see their stats and manage the subscription).
    const SUBSCRIPTION_EXEMPT = [
      '/artist/dashboard',
      '/artist/earnings',
      '/artist/subscribe',
      '/artist/onboarding',
    ];

    if (
      process.env.STRIPE_ENFORCE_SUBSCRIPTIONS === 'true' &&
      pathname.startsWith('/artist') &&
      userRole === 'artist' &&
      onboardingCompleted &&
      !SUBSCRIPTION_EXEMPT.some((exempt) => pathname.startsWith(exempt))
    ) {
      // Check subscription status
      // Note: 'subscriptions' table may not be in the generated Database types yet,
      // so we use a type assertion to avoid build errors.
      const { data: sub } = await (supabase as ReturnType<typeof createServerClient>)
        .from('subscriptions' as 'profiles')
        .select('status')
        .eq('artist_id' as 'id', user.id)
        .single();

      const subRow = sub as { status: string } | null;
      const isActive =
        subRow?.status === 'active' || subRow?.status === 'trialing';

      if (!isActive) {
        const url = request.nextUrl.clone();
        url.pathname = '/artist/subscribe';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
