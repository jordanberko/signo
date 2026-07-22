import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Server-side auth gating.
 *
 * In Next.js 16 this file is called `proxy.ts` (formerly `middleware.ts`).
 * See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 *
 * Responsibilities:
 *   1. Refresh the Supabase session (cookie rotation)
 *   2. Redirect signed-out users away from protected routes BEFORE the
 *      client renders, eliminating the protected-shell flash
 *
 * Role checks stay in page layouts (AuthGate, admin layout). The proxy
 * only answers "is there a session" — which is cheap enough to do on
 * every protected request via cookie + getUser().
 */

/**
 * Route prefixes that require an authenticated session.
 * Any request whose pathname starts with one of these strings redirects
 * to /login?redirect=<original-path> when no session is present.
 */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/favourites',
  '/following',
  '/orders',
  '/messages',
  '/settings',
  '/checkout',
  '/artist',
  '/admin',
] as const;

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const { pathname, search } = request.nextUrl;

  if (!user && isProtected(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = `?redirect=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run ONLY on protected routes. The proxy exists to (a) refresh the
     * session cookie and (b) redirect signed-out users — both only
     * matter on routes that require auth. Running it sitewide meant
     * every public-page navigation for a signed-in user paid a
     * 200-500ms Supabase getUser() round-trip; public pages and API
     * routes authenticate themselves via their own Supabase clients,
     * and the browser SDK auto-refreshes tokens client-side.
     *
     * (`/:path*` also matches the bare prefix, e.g. `/dashboard`.)
     */
    '/dashboard/:path*',
    '/favourites/:path*',
    '/following/:path*',
    '/orders/:path*',
    '/messages/:path*',
    '/settings/:path*',
    '/checkout/:path*',
    '/artist/:path*',
    '/admin/:path*',
  ],
};
