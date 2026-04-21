-- Migration 018: processed_stripe_events
--
-- Context: Group 2 H3 webhook reliability fix. The payment webhook
-- must be able to distinguish "already processed" events from "new"
-- ones so that Stripe's retries (exponential backoff, up to 3 days)
-- don't cause duplicate order creation.
--
-- The idempotency strategy is:
--   1. On every webhook delivery, look up event.id in this table.
--      - Found → return 200 immediately (already processed).
--      - Not found → dispatch business logic.
--   2. After business logic completes successfully, insert the event
--      here (event_id, event_type). If that insert fails, return 500
--      so Stripe retries; on retry the business logic's own soft
--      idempotency (existingOrder check in orders table, status filter
--      on artworks) keeps side effects single-shot.
--
-- event_id is the PRIMARY KEY so a second insert of the same event
-- during a race produces a unique-constraint violation we can detect
-- and treat as "already processed."
--
-- The processed_at index exists so a future cleanup cron can trim
-- rows older than Stripe's 3-day retry window (events older than
-- that can never be retried, so the row is dead weight).

create table if not exists public.processed_stripe_events (
  event_id     text        primary key,
  event_type   text        not null,
  processed_at timestamptz not null default now()
);

create index if not exists idx_processed_stripe_events_processed_at
  on public.processed_stripe_events (processed_at);

-- RLS: webhook writes as service role (bypasses RLS), but enable RLS
-- anyway so no anon/authenticated user can peek at the audit log.
alter table public.processed_stripe_events enable row level security;
