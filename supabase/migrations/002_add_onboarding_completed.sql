-- Add onboarding_completed flag to profiles table
-- Artists must complete onboarding before accessing artist features

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Existing admin users should be considered onboarded
UPDATE profiles SET onboarding_completed = true WHERE role = 'admin';
