-- ============================================================
-- Migration 003: Subscriptions table for artist billing
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- One subscription per artist (enforced by UNIQUE)
  artist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,

  -- Stripe identifiers
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,

  -- Subscription lifecycle
  status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing', 'inactive')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by stripe_subscription_id (used by webhooks)
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id
  ON subscriptions(stripe_subscription_id);

-- ── Row Level Security ──

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Artists can read their own subscription
CREATE POLICY "Artists can view their own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = artist_id);

-- Only the service role (server-side) can insert/update/delete
-- No INSERT/UPDATE/DELETE policies for authenticated users = denied by default.

-- ── Updated-at trigger ──

CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();
