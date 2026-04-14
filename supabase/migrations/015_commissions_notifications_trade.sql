-- Migration 015: Commissions, notifications, and trade enquiries
-- Adds accepts_commissions to profiles, artwork_notifications table, and trade_enquiries table

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accepts_commissions boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS artwork_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  email text NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(artwork_id, email)
);

ALTER TABLE artwork_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe to notifications" ON artwork_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read own notifications" ON artwork_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON artwork_notifications FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS trade_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  business_type text,
  description text,
  budget_range text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trade_enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit trade enquiry" ON trade_enquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read trade enquiries" ON trade_enquiries FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
