/**
 * Supabase Storage Utilities for Signo
 *
 * ─── SETUP INSTRUCTIONS ───────────────────────────────────────────
 *
 * Before using these functions, create the following storage buckets
 * in your Supabase Dashboard → Storage:
 *
 * 1. Create bucket: "artwork-images"
 *    - Public: ON
 *    - File size limit: 10 MB
 *    - Allowed MIME types: image/jpeg, image/png, image/webp
 *
 * 2. Create bucket: "avatars"
 *    - Public: ON
 *    - File size limit: 5 MB
 *    - Allowed MIME types: image/jpeg, image/png, image/webp
 *
 * 3. Add the following RLS policies (SQL Editor → New Query):
 *
 *    -- Allow anyone to view images (public read)
 *    CREATE POLICY "Public read access"
 *      ON storage.objects FOR SELECT
 *      USING (bucket_id IN ('artwork-images', 'avatars'));
 *
 *    -- Allow authenticated users to upload to artwork-images
 *    CREATE POLICY "Authenticated users can upload artwork images"
 *      ON storage.objects FOR INSERT
 *      TO authenticated
 *      WITH CHECK (bucket_id = 'artwork-images');
 *
 *    -- Allow users to update/delete their own artwork images
 *    CREATE POLICY "Users can manage their own artwork images"
 *      ON storage.objects FOR DELETE
 *      TO authenticated
 *      USING (bucket_id = 'artwork-images' AND (storage.foldername(name))[1] = auth.uid()::text);
 *
 *    -- Allow authenticated users to upload their avatar
 *    CREATE POLICY "Users can upload their own avatar"
 *      ON storage.objects FOR INSERT
 *      TO authenticated
 *      WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
 *
 *    -- Allow users to update/delete their own avatar
 *    CREATE POLICY "Users can manage their own avatar"
 *      ON storage.objects FOR DELETE
 *      TO authenticated
 *      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
 *
 * ───────────────────────────────────────────────────────────────────
 */

import { createClient } from './client';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function getFileExtension(file: File): string {
  const parts = file.name.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : 'jpg';
}

function validateFile(file: File, maxSizeMB: number): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `"${file.name}" is not a supported format. Please use JPG, PNG, or WebP.`;
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is ${maxSizeMB} MB.`;
  }
  return null;
}

/**
 * Upload an artwork image to the `artwork-images` bucket.
 * Images are stored under `{userId}/{artworkId}/{uuid}.{ext}`.
 */
export async function uploadArtworkImage(
  file: File,
  userId: string,
  artworkId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const error = validateFile(file, 10);
  if (error) throw new Error(error);

  const supabase = createClient();
  const ext = getFileExtension(file);
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const path = `${userId}/${artworkId}/${fileName}`;

  // Start upload — Supabase JS v2 doesn't support progress natively,
  // so we simulate it for UX purposes.
  onProgress?.(10);

  const { error: uploadError } = await supabase.storage
    .from('artwork-images')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  onProgress?.(90);

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  onProgress?.(100);

  return getPublicUrl(path, 'artwork-images');
}

/**
 * Upload an avatar image to the `avatars` bucket.
 * Avatars are stored under `{userId}/{uuid}.{ext}`.
 * Previous avatars in the folder are replaced.
 */
export async function uploadAvatar(
  file: File,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const error = validateFile(file, 5);
  if (error) throw new Error(error);

  const supabase = createClient();
  const ext = getFileExtension(file);
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const path = `${userId}/${fileName}`;

  onProgress?.(10);

  // Remove any existing avatars first
  const { data: existing } = await supabase.storage
    .from('avatars')
    .list(userId);

  if (existing && existing.length > 0) {
    const filesToRemove = existing.map((f) => `${userId}/${f.name}`);
    await supabase.storage.from('avatars').remove(filesToRemove);
  }

  onProgress?.(30);

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  onProgress?.(90);

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  onProgress?.(100);

  return getPublicUrl(path, 'avatars');
}

/**
 * Delete an image from a storage bucket.
 * @param path — the file path within the bucket (e.g. "userId/artworkId/file.jpg")
 * @param bucket — the bucket name ("artwork-images" or "avatars")
 */
export async function deleteImage(path: string, bucket: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Get the public URL for a stored file.
 */
export function getPublicUrl(path: string, bucket: string): string {
  const supabase = createClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Extract the storage path from a full public URL.
 * Useful when you need to delete an image and only have the URL.
 */
export function getPathFromUrl(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
}
