-- Migration 017: allow 'reserved' status on artworks
--
-- Context: the atomic-reservation pattern in
--   src/app/api/checkout/create-session/route.ts
--   src/app/api/stripe/payment-webhook/route.ts
--   src/app/api/cron/release-reservations/route.ts
--   src/app/api/artist/analytics/route.ts
-- writes `status = 'reserved'` during buyer checkout, but the original
-- `artworks_status_check` constraint (from 001_initial_schema.sql) only
-- permits 6 values. Every real checkout was failing with Postgres 23514.
--
-- This migration drops the existing CHECK constraint and re-adds it with
-- 'reserved' included. No data changes — all existing rows remain valid
-- because 'reserved' is additive.

alter table public.artworks drop constraint artworks_status_check;

alter table public.artworks add constraint artworks_status_check
  check (status in (
    'draft',
    'pending_review',
    'approved',
    'rejected',
    'sold',
    'paused',
    'reserved'
  ));
