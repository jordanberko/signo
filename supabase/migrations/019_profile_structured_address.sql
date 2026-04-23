-- Codify four structured-address columns that exist on profiles in prod
-- but were hand-added via Supabase Dashboard with no matching migration
-- file. Surfaced 2026-04-23 by scripts/verify/migrations-applied.mjs as
-- reverse drift (see MIGRATIONS.md § "Reverse drift").
--
-- These columns are read/written by src/app/api/profile/route.ts and
-- already carry real user data on prod (one profile row has a full
-- address; all rows have country populated via the 'Australia' default).
--
-- Shape mirrored exactly from the service-role OpenAPI spec at
-- /rest/v1/: all text, nullable, country defaults to 'Australia', the
-- other three have no default.
--
-- Applying to prod is a no-op because every column already exists.
-- Applying to a fresh dev or preview Supabase creates the columns
-- correctly so subsequent migrations and app code see the same schema.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS city           TEXT,
  ADD COLUMN IF NOT EXISTS postcode       TEXT,
  ADD COLUMN IF NOT EXISTS country        TEXT DEFAULT 'Australia';
