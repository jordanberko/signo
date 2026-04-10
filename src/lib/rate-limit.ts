/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Suitable for single-server / Vercel serverless deployments where
 * warm function instances share memory. Not a hard guarantee under
 * heavy horizontal scaling, but good enough for abuse prevention.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Periodically purge expired entries to prevent memory leaks.
// Runs at most once per 60 seconds.
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    // Remove timestamps older than the largest possible window
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

/**
 * Check whether a request should be allowed.
 *
 * @param key   Unique identifier (e.g. IP address or user ID)
 * @param opts  { max: number, windowMs: number }
 * @returns     { success, remaining }
 */
export function rateLimit(
  key: string,
  opts: { max: number; windowMs: number },
): { success: boolean; remaining: number } {
  const now = Date.now();
  const { max, windowMs } = opts;

  cleanup(windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the current window
  const windowStart = now - windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= max) {
    return { success: false, remaining: 0 };
  }

  entry.timestamps.push(now);
  return { success: true, remaining: max - entry.timestamps.length };
}
