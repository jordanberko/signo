/**
 * Integration tests for the payment webhook's H3 response-code semantics.
 *
 * Covers:
 *   1. Signature verification failure → 400
 *   2. Unhandled event type → 200 with log
 *   3. Duplicate event.id → 200 on both deliveries, processing once
 *   4. Supabase write failure → 500 (so Stripe retries)
 *   5. Happy-path checkout.session.completed → 200 + order + event logged
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (hoisted — must be before any import of the route) ──

vi.mock('@/lib/email', () => ({
  sendOrderConfirmation: vi.fn().mockResolvedValue(undefined),
  sendNewSaleNotification: vi.fn().mockResolvedValue(undefined),
}));

const mockConstructEvent = vi.fn();
vi.mock('@/lib/stripe/config', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mockConstructEvent },
  }),
}));

const mockCreateClient = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

// Import AFTER the mocks are defined so the route picks them up
import { POST } from '../route';

// ── Helpers ──────────────────────────────────────────────────────────

type ChainResult = { data: unknown; error: unknown };

type TableConfig = {
  /** Result(s) for .from(table).select()... terminal calls */
  select?: ChainResult | ChainResult[];
  /** Result(s) for .from(table).insert(...)... terminal or awaited */
  insert?: ChainResult | ChainResult[];
  /** Result(s) for .from(table).update(...).eq(...) awaited */
  update?: ChainResult | ChainResult[];
};

function makeSupabase(config: Record<string, TableConfig>) {
  const counters: Record<
    string,
    { select: number; insert: number; update: number }
  > = {};

  const fromSpy = vi.fn((table: string) => {
    counters[table] = counters[table] || { select: 0, insert: 0, update: 0 };
    let mode: 'select' | 'insert' | 'update' | null = null;

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
      insert: vi.fn(() => {
        mode = 'insert';
        return chain;
      }),
      update: vi.fn(() => {
        mode = 'update';
        return chain;
      }),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(() => Promise.resolve(getResult())),
      single: vi.fn(() => Promise.resolve(getResult())),
      then: (
        resolve: (v: ChainResult) => unknown,
        reject: (e: unknown) => unknown
      ) => Promise.resolve(getResult()).then(resolve, reject),
    };
    return chain;
  });

  return { from: fromSpy };
}

function makeRequest() {
  return new Request('http://localhost/api/stripe/payment-webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig_test' },
    body: 'irrelevant-opaque-body-constructEvent-is-mocked',
  });
}

function checkoutSessionCompletedEvent(eventId = 'evt_test_1'): unknown {
  return {
    id: eventId,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1',
        mode: 'payment',
        payment_intent: 'pi_test_1',
        metadata: {
          signo_artwork_id: 'art-1',
          signo_buyer_id: 'buyer-1',
          signo_artist_id: 'artist-1',
          signo_total_aud: '500',
          signo_shipping_cost_aud: '0',
          signo_shipping_address: JSON.stringify({
            street: '1 Test St',
            city: 'Melbourne',
            state: 'VIC',
            postcode: '3000',
          }),
        },
      },
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('POST /api/stripe/payment-webhook — H3 reliability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClient.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-key';
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
    process.env.STRIPE_PAYMENT_WEBHOOK_SECRET = 'whsec_fake';
  });

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature');
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Webhook signature verification failed');
    // createClient must NOT be called — signature failure short-circuits
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('returns 200 on unhandled event type and logs the event', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_unhandled_1',
      type: 'customer.subscription.created',
      data: { object: {} },
    });
    const supabase = makeSupabase({
      processed_stripe_events: {
        select: { data: null, error: null },
        insert: { data: null, error: null },
      },
    });
    mockCreateClient.mockReturnValue(supabase);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unhandled event type: customer.subscription.created')
    );
    // Still logged to processed_stripe_events so Stripe stops retrying
    expect(supabase.from).toHaveBeenCalledWith('processed_stripe_events');
    logSpy.mockRestore();
  });

  it('returns 200 on duplicate event.id without re-processing', async () => {
    mockConstructEvent.mockReturnValue(checkoutSessionCompletedEvent('evt_dup_1'));

    // First delivery: not yet processed, runs full handler
    const supabase1 = makeSupabase({
      processed_stripe_events: {
        select: { data: null, error: null },
        insert: { data: null, error: null },
      },
      orders: {
        select: { data: null, error: null },
        insert: { data: { id: 'order-new-1' }, error: null },
      },
      artworks: {
        update: { data: null, error: null },
        select: { data: { title: 'Test Art', images: [] }, error: null },
      },
      profiles: {
        select: [
          { data: { email: 'buyer@t.co', full_name: 'Buyer' }, error: null },
          { data: { email: 'artist@t.co', full_name: 'Artist' }, error: null },
        ],
      },
    });
    mockCreateClient.mockReturnValueOnce(supabase1);

    const res1 = await POST(makeRequest());
    expect(res1.status).toBe(200);
    // First delivery touched orders and artworks
    expect(supabase1.from).toHaveBeenCalledWith('orders');
    expect(supabase1.from).toHaveBeenCalledWith('artworks');

    // Second delivery: processed_stripe_events already contains this event
    const supabase2 = makeSupabase({
      processed_stripe_events: {
        select: { data: { event_id: 'evt_dup_1' }, error: null },
      },
    });
    mockCreateClient.mockReturnValueOnce(supabase2);

    const res2 = await POST(makeRequest());
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.duplicate).toBe(true);
    // Second delivery must only touch processed_stripe_events
    expect(supabase2.from).toHaveBeenCalledWith('processed_stripe_events');
    expect(supabase2.from).not.toHaveBeenCalledWith('orders');
    expect(supabase2.from).not.toHaveBeenCalledWith('artworks');
  });

  it('returns 500 when the order insert fails', async () => {
    mockConstructEvent.mockReturnValue(checkoutSessionCompletedEvent('evt_err_1'));

    const supabase = makeSupabase({
      processed_stripe_events: {
        select: { data: null, error: null },
        // If we (incorrectly) got here, insert would succeed; but we
        // shouldn't — the outer try/catch must intercept the order-insert
        // error first.
        insert: { data: null, error: null },
      },
      orders: {
        select: { data: null, error: null },
        insert: {
          data: null,
          error: { message: 'duplicate key value violates unique constraint' },
        },
      },
    });
    mockCreateClient.mockReturnValue(supabase);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(makeRequest());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Webhook processing failed');
    // Critical: event was NOT marked processed, so Stripe will retry
    const insertedIntoEventLog = supabase.from.mock.calls.some(
      (c) => c[0] === 'processed_stripe_events'
    );
    // processed_stripe_events was called once (for the select), but
    // NOT for an insert. Count the select-only invocation.
    const eventLogCalls = supabase.from.mock.calls.filter(
      (c) => c[0] === 'processed_stripe_events'
    ).length;
    expect(insertedIntoEventLog).toBe(true);
    expect(eventLogCalls).toBe(1); // lookup only, no success-insert
    errSpy.mockRestore();
  });

  it('returns 200 on happy-path checkout.session.completed and logs event', async () => {
    mockConstructEvent.mockReturnValue(checkoutSessionCompletedEvent('evt_ok_1'));
    const supabase = makeSupabase({
      processed_stripe_events: {
        select: { data: null, error: null },
        insert: { data: null, error: null },
      },
      orders: {
        select: { data: null, error: null },
        insert: { data: { id: 'order-new-1' }, error: null },
      },
      artworks: {
        update: { data: null, error: null },
        select: { data: { title: 'Test Art', images: [] }, error: null },
      },
      profiles: {
        select: [
          { data: { email: 'buyer@t.co', full_name: 'Buyer' }, error: null },
          { data: { email: 'artist@t.co', full_name: 'Artist' }, error: null },
        ],
      },
    });
    mockCreateClient.mockReturnValue(supabase);

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);

    // Order was created exactly once
    const orderCalls = supabase.from.mock.calls.filter((c) => c[0] === 'orders');
    // Two orders calls: one for existingOrder check, one for the insert
    expect(orderCalls.length).toBe(2);

    // Event logged exactly once (select + insert on processed_stripe_events)
    const eventLogCalls = supabase.from.mock.calls.filter(
      (c) => c[0] === 'processed_stripe_events'
    );
    expect(eventLogCalls.length).toBe(2);

    // Artwork was flipped to sold (one update call + one select for email)
    const artworkCalls = supabase.from.mock.calls.filter(
      (c) => c[0] === 'artworks'
    );
    expect(artworkCalls.length).toBe(2);
  });
});
