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

// ── Client-side image compression via Canvas API ──

/**
 * Load a File into an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Check if a PNG has transparency by sampling its pixels.
 * Returns true if any pixel has alpha < 255.
 */
function hasTransparency(img: HTMLImageElement): boolean {
  const canvas = document.createElement('canvas');
  // Sample at a smaller size for performance
  const sampleSize = Math.min(img.width, img.height, 256);
  const scale = sampleSize / Math.max(img.width, img.height);
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

/**
 * Resize an image using the Canvas API and return a compressed Blob.
 *
 * - Scales down to fit within maxWidth × maxHeight (maintains aspect ratio).
 * - Converts to JPEG at the given quality unless the source is a transparent PNG.
 * - Skips processing if the image is already smaller than the target dimensions.
 */
function resizeImage(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
  quality: number,
  outputType: 'image/jpeg' | 'image/png',
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let { width, height } = img;

    // Scale down if needed, maintaining aspect ratio
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    // Use high-quality interpolation
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to compress image'));
        }
      },
      outputType,
      outputType === 'image/jpeg' ? quality : undefined,
    );
  });
}

/**
 * Compress and resize an image file before upload.
 * Returns { full, thumbnail } blobs.
 *
 * Full: max 2000×2000, JPEG 80% quality (PNG with transparency stays PNG)
 * Thumbnail: max 400×400, JPEG 75% quality
 */
async function compressImage(file: File): Promise<{
  full: Blob;
  thumbnail: Blob;
  outputExt: string;
}> {
  const img = await loadImage(file);

  // Determine output format: keep PNG only if it has transparency
  const isPngTransparent = file.type === 'image/png' && hasTransparency(img);
  const outputType: 'image/jpeg' | 'image/png' = isPngTransparent ? 'image/png' : 'image/jpeg';
  const outputExt = isPngTransparent ? 'png' : 'jpg';

  // Generate full-size compressed image (max 2000px)
  const full = await resizeImage(img, 2000, 2000, 0.8, outputType);

  // Generate thumbnail (max 400px wide)
  const thumbnail = await resizeImage(img, 400, 400, 0.75, 'image/jpeg');

  // Revoke the object URL from loadImage
  URL.revokeObjectURL(img.src);

  return { full, thumbnail, outputExt };
}

/**
 * Upload an artwork image to the `artwork-images` bucket.
 * Images are stored under `{userId}/{artworkId}/{uuid}.{ext}`.
 *
 * Before uploading, the image is compressed client-side:
 * - Full image: resized to max 2000×2000, JPEG @ 80% quality
 * - Thumbnail: resized to max 400×400, JPEG @ 75% quality
 * - Transparent PNGs are preserved as PNG for the full image
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
  const fileId = crypto.randomUUID();

  // Step 1: Compress (0% → 30%)
  onProgress?.(5);
  const { full, thumbnail, outputExt } = await compressImage(file);
  onProgress?.(30);

  // Step 2: Upload full image (30% → 80%)
  const fullPath = `${userId}/${artworkId}/${fileId}.${outputExt}`;
  onProgress?.(35);

  const { error: fullUploadError } = await supabase.storage
    .from('artwork-images')
    .upload(fullPath, full, {
      cacheControl: '31536000',
      upsert: false,
      contentType: outputExt === 'png' ? 'image/png' : 'image/jpeg',
    });

  if (fullUploadError) {
    throw new Error(`Upload failed: ${fullUploadError.message}`);
  }
  onProgress?.(80);

  // Step 3: Upload thumbnail (80% → 95%)
  const thumbPath = `${userId}/${artworkId}/${fileId}_thumb.jpg`;
  const { error: thumbUploadError } = await supabase.storage
    .from('artwork-images')
    .upload(thumbPath, thumbnail, {
      cacheControl: '31536000',
      upsert: false,
      contentType: 'image/jpeg',
    });

  // Thumbnail upload failure is non-critical — log but don't throw
  if (thumbUploadError) {
    console.warn(`Thumbnail upload failed: ${thumbUploadError.message}`);
  }
  onProgress?.(95);

  onProgress?.(100);

  return getPublicUrl(fullPath, 'artwork-images');
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
