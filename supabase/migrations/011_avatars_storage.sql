-- ============================================================
-- 011: Avatars Storage Bucket & Policies
-- ============================================================
-- Creates the "avatars" storage bucket (public, 2MB limit)
-- and sets up RLS policies so users can manage their own folder.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================

-- 1. Create the bucket (idempotent — skips if exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Storage policies

-- Allow anyone to read avatars (public bucket)
CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Allow authenticated users to upload to their own folder
CREATE POLICY "avatars: owner can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to update/overwrite their own files
CREATE POLICY "avatars: owner can update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own files
CREATE POLICY "avatars: owner can delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
