-- ============================================================
-- Return-then-refund flow: schema changes
--
-- Adds return-flow columns to disputes and expands the status
-- enums on both orders and disputes to support the multi-step
-- return lifecycle.
-- ============================================================

-- ---------- Expand order statuses ----------
-- Add return_pending and return_in_transit to the orders status check.
alter table public.orders
  drop constraint orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in (
    'pending_payment', 'paid', 'shipped', 'delivered',
    'completed', 'disputed', 'refunded', 'cancelled',
    'return_pending', 'return_in_transit'
  ));

-- ---------- Expand dispute statuses ----------
-- Add return_pending and return_in_transit as intermediate states.
alter table public.disputes
  drop constraint disputes_status_check;

alter table public.disputes
  add constraint disputes_status_check
  check (status in (
    'open', 'under_review',
    'resolved_refund', 'resolved_no_refund', 'resolved_return',
    'return_pending', 'return_in_transit'
  ));

-- ---------- Return-flow columns on disputes ----------
alter table public.disputes add column return_address text;
alter table public.disputes add column return_shipping_payer text
  check (return_shipping_payer in ('buyer', 'seller', 'split'));
alter table public.disputes add column return_window_days integer default 14;
alter table public.disputes add column return_approved_at timestamptz;
alter table public.disputes add column return_tracking_number text;
alter table public.disputes add column return_carrier text;
alter table public.disputes add column return_tracking_submitted_at timestamptz;
alter table public.disputes add column return_photo_url text;
alter table public.disputes add column return_received_at timestamptz;
alter table public.disputes add column return_received_condition_notes text;
