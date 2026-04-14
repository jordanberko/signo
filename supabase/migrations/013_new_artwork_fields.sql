-- Migration 013: New artwork fields
-- Adds colors, surface, ready_to_hang, availability, and available_from columns

ALTER TABLE artworks ADD COLUMN IF NOT EXISTS colors text[] DEFAULT '{}';
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS surface text;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS ready_to_hang boolean DEFAULT false;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS availability text DEFAULT 'available';
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS available_from timestamptz;

CREATE INDEX IF NOT EXISTS idx_artworks_colors ON artworks USING GIN (colors);
CREATE INDEX IF NOT EXISTS idx_artworks_availability ON artworks(availability);
