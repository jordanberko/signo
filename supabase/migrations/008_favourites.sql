-- ============================================================
-- Favourites table
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.favourites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artwork_id  uuid        NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, artwork_id)
);

ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;

-- Users can see their own favourites
CREATE POLICY "favourites: users can view own"
  ON public.favourites FOR SELECT
  USING (auth.uid() = user_id);

-- Users can favourite artworks
CREATE POLICY "favourites: users can insert own"
  ON public.favourites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unfavourite
CREATE POLICY "favourites: users can delete own"
  ON public.favourites FOR DELETE
  USING (auth.uid() = user_id);

-- Anyone can count favourites (for display)
CREATE POLICY "favourites: anyone can count"
  ON public.favourites FOR SELECT
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_favourites_user_id ON public.favourites(user_id);
CREATE INDEX IF NOT EXISTS idx_favourites_artwork_id ON public.favourites(artwork_id);
