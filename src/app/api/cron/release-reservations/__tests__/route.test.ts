/**
 * Integration tests for the release-reservations cron.
 *
 * Covers:
 *   1. Auth: 401 on missing / bad CRON_SECRET
 *   2. No-op: 0 released when nothing is stale
 *   3. Threshold is 10 minutes (product decision 2026-04-22),
 *      not 30 minutes
 *   4. For each released artwork, proactively expires any open
 *      Stripe checkout session matched by `metadata.signo_artwork_id`
 *   5. Stripe list failure does NOT block the artwork status flip
 *   6. Stripe expire failure does NOT block the artwork status flip
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (hoisted — must be before any import of the route) ──

// `list()` must return an object that's async-iterable. Each test
// sets `__pages` to the array of sessions it wants yielded.
const mockList = vi.fn(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pages = (mockList as any).__pages ?? [];
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of pages) yield item;
    },
  };
});
const mockSessionsExpire = vi.fn();
vi.mock('@/lib/stripe/config', () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        list: mockList,
        expire: mockSessionsExpire,
      },
    },
  }),
}));

const mockCreateClient = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

// Import AFTER the mocks are defined so the route picks them up
import { GET, POST } from '../route';

// ── Helpers ──────────────────────────────────────────────────────────

type ChainResult = { data: unknown; error: unknown };

type TableConfig = {
  select?: ChainResult | ChainResult[];
  update?: ChainResult | ChainResult[];
};

function makeSupabase(config: Record<string, TableConfig>) {
  const counters: Record<string, { select: number; update: number }> = {};
  const calls: {
    table: string;
    mode: 'select' | 'update';
    filters: Record<string, unknown>;
  }[] = [];

  const fromSpy = vi.fn((table: string) => {
    counters[table] = counters[table] || { select: 0, update: 0 };
    let mode: 'select' | 'update' | null = null;
    const filters: Record<string, unknown> = {};

    const getResult = (): ChainResult => {
      const m = mode ?? 'select';
      const cfg = config[table]?.[m];
      if (!cfg) return { data: null, error: null };
      if (Array.isArray(cfg)) {
        const idx = counters[table][m];
        const r = cfg[idx] ?? cfg[cfg.length - 1];
        counters[table][m] = idx + 1;
        return r;
      }
      return cfg;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: vi.fn(() => {
        if (!mode) mode = 'select';
        return chain;
      }),
      update: vi.fn(() => {
        mode = 'update';
        return chain;
      }),
      eq: vi.fn((col: string, val: unknown) => {
        filters[`eq:${col}`] = val;
        return chain;
      }),
      lt: vi.fn((col: string, val: unknown) => {
        filters[`lt:${col}`] = val;
        return chain;
      }),
      in: vi.fn((col: string, val: unknown) => {
        filters[`in:${col}`] = val;
        return chain;
      }),
      then: (
        resolve: (v: ChainResult) => unknown,
        reject: (e: unknown) => unknown
      ) => {
        calls.push({ table, mode: mode ?? 'select', filters: { ...filters } });
        return Promise.resolve(getResult()).then(resolve, reject);
      },
    };
    return chain;
  });

  return { from: fromSpy, _calls: calls };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setListPages(pages: Array<Record<string, any>>): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockList as any).__pages = pages;
}

function makeRequest({
  authHeader = 'Bearer test-cron-secret',
}: { authHeader?: string | null } = {}) {
  const headers = new Headers();
  if (authHeader !== null) headers.set('authorization', authHeader);
  return new Request('http://localhost/api/cron/release-reservations', {
    method: 'POST',
    headers,
  });
}

// ── Tests ────────────────────────────────────────────────────────────

describe('POST /api/cron/release-reservations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClient.mockReset();
    mockList.mockClear();
    setListPages([]);
    mockSessionsExpire.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-key';
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  it('returns 401 when authorization header is missing', async () => {
    const res = await POST(makeRequest({ authHeader: null }));
    expect(res.status).toBe(401);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('returns 401 when CRON_SECRET does not match', async () => {
    const res = await POST(makeRequest({ authHeader: 'Bearer wrong' }));
    expect(res.status).toBe(401);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('GET is a method-parity alias for POST — same handler, same 401', async () => {
    // Vercel Cron hits GET; POST stays for manual curl-during-incident.
    // Both must route to the same handler body. Checked via the auth-
    // fail path since it exercises the handler without needing Supabase
    // or Stripe mocks.
    const res = await GET(makeRequest({ authHeader: 'Bearer wrong' }));
    expect(res.status).toBe(401);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('returns 200 with released: 0 when nothing is stale', async () => {
    const supabase = makeSupabase({
      artworks: { select: { data: [], error: null } },
    });
    mockCreateClient.mockReturnValue(supabase);

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ released: 0 });
    // Stripe must not be called when there's nothing to release
    expect(mockList).not.toHaveBeenCalled();
    expect(mockSessionsExpire).not.toHaveBeenCalled();
  });

  it('uses a 10-minute threshold (not 30)', async () => {
    const supabase = makeSupabase({
      artworks: { select: { data: [], error: null } },
    });
    mockCreateClient.mockReturnValue(supabase);

    const before = Date.now();
    await POST(makeRequest());
    const after = Date.now();

    // Grab the timestamp passed to .lt('updated_at', <ts>)
    const selectCall = supabase._calls.find(
      (c) => c.table === 'artworks' && c.mode === 'select'
    );
    expect(selectCall).toBeDefined();
    const ts = selectCall!.filters['lt:updated_at'] as string;
    const tsMs = new Date(ts).getTime();

    // The threshold timestamp should be ~10 minutes before NOW,
    // not ~30 minutes. Allow a generous jitter band (±2s).
    const tenMinAgoMin = before - 10 * 60 * 1000 - 2000;
    const tenMinAgoMax = after - 10 * 60 * 1000 + 2000;
    expect(tsMs).toBeGreaterThanOrEqual(tenMinAgoMin);
    expect(tsMs).toBeLessThanOrEqual(tenMinAgoMax);

    // Regression guard: definitely not 30 minutes.
    const thirtyMinAgoMax = before - 30 * 60 * 1000 + 2000;
    expect(tsMs).toBeGreaterThan(thirtyMinAgoMax);
  });

  it('expires open Stripe sessions matched by metadata for each released artwork', async () => {
    const supabase = makeSupabase({
      artworks: {
        select: { data: [{ id: 'art-1' }, { id: 'art-2' }], error: null },
        update: { data: null, error: null },
      },
    });
    mockCreateClient.mockReturnValue(supabase);

    // Pages yielded by the Stripe list iterator
    setListPages([
      {
        id: 'cs_test_art1_open',
        metadata: { signo_artwork_id: 'art-1' },
      },
      {
        // A session for a different artwork — must be ignored
        id: 'cs_test_unrelated',
        metadata: { signo_artwork_id: 'art-99' },
      },
      // art-2 has no session in flight
    ]);
    mockSessionsExpire.mockResolvedValue({
      id: 'cs_test_art1_open',
      status: 'expired',
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ released: 2 });

    // `list` called once with status: 'open'
    expect(mockList).toHaveBeenCalledTimes(1);
    const listArg = (
      mockList.mock.calls as unknown as Array<[Record<string, unknown>]>
    )[0]?.[0];
    expect(listArg?.status).toBe('open');

    // Expire called once (only art-1 had a matching open session)
    expect(mockSessionsExpire).toHaveBeenCalledTimes(1);
    expect(mockSessionsExpire).toHaveBeenCalledWith('cs_test_art1_open');

    // Artwork status flip still happened with both ids
    const updateCall = supabase._calls.find(
      (c) => c.table === 'artworks' && c.mode === 'update'
    );
    expect(updateCall).toBeDefined();
    expect(updateCall!.filters['in:id']).toEqual(['art-1', 'art-2']);
  });

  it('does NOT block artwork flip when Stripe list throws', async () => {
    const supabase = makeSupabase({
      artworks: {
        select: { data: [{ id: 'art-1' }], error: null },
        update: { data: null, error: null },
      },
    });
    mockCreateClient.mockReturnValue(supabase);

    // Make `list()` throw by overriding the implementation for this test
    mockList.mockImplementationOnce(() => {
      throw new Error('Stripe API temporarily unavailable');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ released: 1 });

    // Logged the failure but didn't propagate
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Stripe session cleanup failed')
    );

    // Artwork flip still executed
    const updateCall = supabase._calls.find(
      (c) => c.table === 'artworks' && c.mode === 'update'
    );
    expect(updateCall).toBeDefined();
    expect(updateCall!.filters['in:id']).toEqual(['art-1']);

    warnSpy.mockRestore();
  });

  it('does NOT block artwork flip when Stripe expire throws', async () => {
    const supabase = makeSupabase({
      artworks: {
        select: { data: [{ id: 'art-1' }], error: null },
        update: { data: null, error: null },
      },
    });
    mockCreateClient.mockReturnValue(supabase);

    setListPages([
      {
        id: 'cs_test_already_complete',
        metadata: { signo_artwork_id: 'art-1' },
      },
    ]);
    mockSessionsExpire.mockRejectedValue(
      new Error('This checkout session has already been completed')
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ released: 1 });

    // Logged the failure but didn't propagate
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Stripe expire failed')
    );

    // Artwork flip still executed
    const updateCall = supabase._calls.find(
      (c) => c.table === 'artworks' && c.mode === 'update'
    );
    expect(updateCall).toBeDefined();
    expect(updateCall!.filters['in:id']).toEqual(['art-1']);

    warnSpy.mockRestore();
  });
});
