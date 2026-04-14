-- Structured state on profiles (for location filter)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state text;

-- Studio posts (Part 13)
CREATE TABLE IF NOT EXISTS studio_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE studio_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view studio posts" ON studio_posts FOR SELECT USING (true);
CREATE POLICY "Artists manage own posts" ON studio_posts FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Artists delete own posts" ON studio_posts FOR DELETE USING (auth.uid() = artist_id);
CREATE INDEX IF NOT EXISTS idx_studio_posts_artist ON studio_posts(artist_id, created_at DESC);

-- Featured profile artworks (Part 14)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS featured_artworks text[] DEFAULT '{}';

-- Collections (Part 11)
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  slug text UNIQUE NOT NULL,
  cover_image_url text,
  curator_note text,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published collections" ON collections FOR SELECT USING (is_published = true OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins manage collections" ON collections FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE TABLE IF NOT EXISTS collection_artworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  artwork_id uuid NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  position integer DEFAULT 0,
  UNIQUE(collection_id, artwork_id)
);
ALTER TABLE collection_artworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view collection artworks" ON collection_artworks FOR SELECT USING (true);
CREATE POLICY "Admins manage collection artworks" ON collection_artworks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE INDEX IF NOT EXISTS idx_collection_artworks_collection ON collection_artworks(collection_id, position);

-- Profile views (Part 15 - low volume tracking)
CREATE TABLE IF NOT EXISTS profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert profile views" ON profile_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Artists can read own views" ON profile_views FOR SELECT USING (auth.uid() = profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_profile ON profile_views(profile_id, created_at DESC);

-- Artwork impressions table (created but not wired yet - Part 15 future)
CREATE TABLE IF NOT EXISTS artwork_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE artwork_impressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert impressions" ON artwork_impressions FOR INSERT WITH CHECK (true);
CREATE POLICY "Artists can read own impressions" ON artwork_impressions FOR SELECT USING (
  EXISTS (SELECT 1 FROM artworks WHERE id = artwork_id AND artist_id = auth.uid())
);
CREATE INDEX IF NOT EXISTS idx_artwork_impressions_artwork ON artwork_impressions(artwork_id, created_at DESC);
