-- ============================================================
-- Sale-integrity constraints
--
-- Two guards the application code assumed existed but did not:
--
-- 1. orders: one live order per artwork. Signo sells one-off
--    originals, so two concurrent buyers must never both end up with
--    a live order for the same piece. The webhook's idempotency key is
--    the payment intent, which does NOT catch two different buyers.
--    Partial index so refunded/cancelled orders don't block a relist.
--
-- 2. disputes: one dispute per order. The dispute route already
--    handles error code 23505 ("rely on unique constraint on
--    (order_id)") — the constraint was never created, so duplicate
--    disputes were possible and broke the return flow's .single()
--    lookups.
-- ============================================================

-- 1. One live order per artwork ------------------------------------

-- Clean up first: if historical data already violates this, the index
-- creation would fail. Report rather than silently mangling data —
-- run the SELECT below first and resolve by hand if it returns rows.
--
--   select artwork_id, count(*) from public.orders
--   where status in ('pending_payment','paid','shipped','delivered',
--                    'completed','disputed','return_pending',
--                    'return_in_transit')
--   group by artwork_id having count(*) > 1;

create unique index if not exists orders_one_live_per_artwork
  on public.orders (artwork_id)
  where status in (
    'pending_payment', 'paid', 'shipped', 'delivered',
    'completed', 'disputed', 'return_pending', 'return_in_transit'
  );

-- 2. One dispute per order ----------------------------------------

--   select order_id, count(*) from public.disputes
--   group by order_id having count(*) > 1;

create unique index if not exists disputes_one_per_order
  on public.disputes (order_id);

-- 3. Reservation ownership ----------------------------------------
--
-- Reservations were anonymous: the artwork went to `reserved` with no
-- record of who holds it or which Stripe session it belongs to. Three
-- consequences this fixes:
--
--   a) A buyer who cancelled at Stripe could not resume — re-reserving
--      requires status='approved', so they hit "no longer available"
--      on a piece they still held.
--   b) The release cron had to reverse-scan Stripe by metadata to find
--      the session to expire, and released the artwork regardless of
--      whether that succeeded — leaving a live session that could pay
--      for an artwork someone else had since bought (double sale).
--   c) No way to tell an ordinary "reserved" (someone else is buying)
--      from "your own checkout in progress" in the UI.

alter table public.artworks
  add column if not exists reserved_by uuid references public.profiles(id) on delete set null;

alter table public.artworks
  add column if not exists reserved_at timestamptz;

alter table public.artworks
  add column if not exists reserved_session_id text;

create index if not exists idx_artworks_reserved_session
  on public.artworks (reserved_session_id)
  where reserved_session_id is not null;
