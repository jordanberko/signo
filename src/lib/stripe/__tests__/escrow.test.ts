/**
 * Unit tests for the escrow money-movement guards added in B2/B3.
 *
 * Focus:
 *   - autoMarkStaleShipmentsDelivered: the shipped→delivered backstop that
 *     guarantees an artist is paid even when the buyer never confirms
 *     delivery.
 *   - refundBuyer: refuses once the payout has been released (would refund
 *     out of Signo's own balance).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (hoisted) ──
const mockSendOpsAlert = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/ops-alert', () => ({
  sendOpsAlert: (...args: unknown[]) => mockSendOpsAlert(...args),
}));

vi.mock('@/lib/email', () => ({
  sendPayoutReleased: vi.fn().mockResolvedValue(undefined),
  sendOrderCancelled: vi.fn().mockResolvedValue(undefined),
  sendFirstSaleActivation: vi.fn().mockResolvedValue(undefined),
}));

const mockRefundsCreate = vi.fn();
vi.mock('../config', () => ({
  getStripe: () => ({ refunds: { create: mockRefundsCreate } }),
}));
vi.mock('../connect', () => ({ createTransfer: vi.fn() }));

const mockCreateClient = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import { autoMarkStaleShipmentsDelivered, refundBuyer } from '../escrow';

// ── A tiny chainable Supabase stub ──
// Every filter/select method returns the chain; the chain is awaitable and
// resolves to a per-(table, mode) configured result. `update().…select()`
// resolves too. Records update payloads for assertions.
type Result = { data: unknown; error: unknown };

function makeSupabase(config: Record<string, { select?: Result | Result[]; update?: Result }>) {
  const counters: Record<string, number> = {};
  const updatePayloads: Record<string, unknown>[] = [];

  const from = vi.fn((table: string) => {
    let mode: 'select' | 'update' = 'select';

    const resolve = (): Result => {
      const cfg = config[table]?.[mode];
      if (!cfg) return { data: null, error: null };
      if (Array.isArray(cfg)) {
        const i = counters[table] ?? 0;
        counters[table] = i + 1;
        return cfg[i] ?? cfg[cfg.length - 1];
      }
      return cfg;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: vi.fn(() => chain),
      update: vi.fn((payload: Record<string, unknown>) => {
        mode = 'update';
        updatePayloads.push(payload);
        return chain;
      }),
      eq: vi.fn(() => chain),
      lt: vi.fn(() => chain),
      in: vi.fn(() => chain),
      is: vi.fn(() => chain),
      single: vi.fn(() => Promise.resolve(resolve())),
      maybeSingle: vi.fn(() => Promise.resolve(resolve())),
      then: (res: (v: Result) => unknown, rej: (e: unknown) => unknown) =>
        Promise.resolve(resolve()).then(res, rej),
    };
    return chain;
  });

  return { client: { from }, updatePayloads };
}

describe('autoMarkStaleShipmentsDelivered', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
  });

  it('marks stale shipped orders delivered with a fresh inspection window', async () => {
    const { client, updatePayloads } = makeSupabase({
      orders: {
        select: {
          data: [
            { id: 'o1', artist_id: 'a1', artwork_id: 'art1', buyer_id: 'b1' },
            { id: 'o2', artist_id: 'a2', artwork_id: 'art2', buyer_id: 'b2' },
          ],
          error: null,
        },
        update: { data: [{ id: 'o1' }], error: null },
      },
    });
    mockCreateClient.mockReturnValue(client);

    const result = await autoMarkStaleShipmentsDelivered();

    expect(result.delivered).toBe(2);
    expect(result.errors).toEqual([]);
    // Each update sets delivered + a future inspection_deadline
    for (const payload of updatePayloads) {
      expect(payload.status).toBe('delivered');
      expect(typeof payload.delivered_at).toBe('string');
      expect(new Date(payload.inspection_deadline as string).getTime()).toBeGreaterThan(
        Date.now()
      );
    }
  });

  it('no-ops cleanly when nothing is stale', async () => {
    const { client } = makeSupabase({
      orders: { select: { data: [], error: null } },
    });
    mockCreateClient.mockReturnValue(client);

    const result = await autoMarkStaleShipmentsDelivered();
    expect(result).toEqual({ delivered: 0, errors: [] });
  });

  it('collects per-order errors without throwing', async () => {
    const { client } = makeSupabase({
      orders: {
        select: {
          data: [{ id: 'o1', artist_id: 'a1', artwork_id: 'art1', buyer_id: 'b1' }],
          error: null,
        },
        update: { data: null, error: { message: 'row locked' } },
      },
    });
    mockCreateClient.mockReturnValue(client);

    const result = await autoMarkStaleShipmentsDelivered();
    expect(result.delivered).toBe(0);
    expect(result.errors[0]).toContain('row locked');
  });
});

describe('refundBuyer payout guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
  });

  it('refuses to refund once the payout has been released', async () => {
    const { client } = makeSupabase({
      orders: {
        select: {
          data: {
            id: 'o1',
            stripe_payment_intent_id: 'pi_1',
            status: 'disputed',
            payout_released_at: '2026-07-01T00:00:00.000Z',
            artist_id: 'a1',
            total_amount_aud: 500,
          },
          error: null,
        },
      },
    });
    mockCreateClient.mockReturnValue(client);

    const result = await refundBuyer('o1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('reverse the transfer');
    // Stripe refund never attempted
    expect(mockRefundsCreate).not.toHaveBeenCalled();
    // Ops alerted
    expect(mockSendOpsAlert).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'error' })
    );
  });

  it('refuses when the order status is outside the allowed from-set', async () => {
    const { client } = makeSupabase({
      orders: {
        select: {
          data: {
            id: 'o2',
            stripe_payment_intent_id: 'pi_2',
            status: 'paid',
            payout_released_at: null,
            artist_id: 'a2',
            total_amount_aud: 300,
          },
          error: null,
        },
      },
    });
    mockCreateClient.mockReturnValue(client);

    // Only allow refunds from 'delivered' — a 'paid' order must be skipped.
    const result = await refundBuyer('o2', { fromStatuses: ['delivered'] });

    expect(result.success).toBe(false);
    expect(mockRefundsCreate).not.toHaveBeenCalled();
  });
});
