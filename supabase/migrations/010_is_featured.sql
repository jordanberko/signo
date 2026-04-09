-- Add is_featured flag to artworks for homepage curation
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_artworks_featured ON public.artworks(is_featured) WHERE is_featured = true;
