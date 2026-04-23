/**
 * Canonical base URL for the current deployment, with no trailing slash.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_APP_URL — explicit override. Set in Vercel Production
 *      to `https://signoart.com.au`. Leave UNSET on Vercel Preview so the
 *      VERCEL_URL fallback resolves per-deployment.
 *   2. VERCEL_URL (server) / NEXT_PUBLIC_VERCEL_URL (client) — Vercel
 *      auto-populates VERCEL_URL on every deploy. Client bundles cannot
 *      read it without the NEXT_PUBLIC_ alias, which must be set in the
 *      Vercel project env to `${VERCEL_URL}`.
 *   3. `http://localhost:3000` — local dev fallback.
 *
 * Safe to call from server components, route handlers, edge runtime,
 * and (via the NEXT_PUBLIC_* branch) client components. See
 * `.env.example` for per-environment configuration.
 */
export function appUrl(): string {
  const override = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (override) return stripTrailingSlash(override);
  const vercel =
    process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
