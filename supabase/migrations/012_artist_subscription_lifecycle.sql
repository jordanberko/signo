-- Add subscription lifecycle fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS grace_period_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_sale_completed_at TIMESTAMPTZ;

-- Add check constraint for valid statuses
ALTER TABLE profiles
  ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status IN ('trial', 'pending_activation', 'active', 'past_due', 'paused', 'cancelled'));

-- Index for browse query filtering
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);

-- Set existing artists to trial
UPDATE profiles SET subscription_status = 'trial' WHERE role = 'artist' AND subscription_status = 'trial';
