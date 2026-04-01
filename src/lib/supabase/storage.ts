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
 *    - File size limit: 15 MB
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
const MAX_INPUT_SIZE_MB = 15;
const COMPRESSION_TIMEOUT_MS = 10_000;
const UPLOAD_TIMEOUT_MS = 30_000;

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
 * Load a File into an ImageBitmap (faster than HTMLImageElement, doesn't block main thread).
 */
async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

/**
 * Check if a PNG has transparency by sampling its pixels.
 */
function hasTransparency(bitmap: ImageBitmap): boolean {
  const canvas = document.createElement('canvas');
  const sampleSize = Math.min(bitmap.width, bitmap.height, 256);
  const scale = sampleSize / Math.max(bitmap.width, bitmap.height);
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

/**
 * Resize an image using the Canvas API and return a compressed Blob.
 */
function resizeImage(
  bitmap: ImageBitmap,
  maxWidth: number,
  maxHeight: number,
  quality: number,
  outputType: 'image/jpeg' | 'image/png',
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let { width, height } = bitmap;

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

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);

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
 * Run a promise with a timeout. Returns the result or null if it times out.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms / 1000}s`));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Compress and resize an image file before upload.
 * Returns { full, thumbnail } blobs.
 *
 * Full: max 1800×1800, JPEG 85% quality (PNG with transparency stays PNG)
 * Thumbnail: max 400×400, JPEG 80% quality
 *
 * If compression fails or times out (10s), returns the original file as-is.
 */
async function compressImage(file: File): Promise<{
  full: Blob;
  thumbnail: Blob | null;
  outputExt: string;
}> {
  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  console.log(`[Upload] Starting compression for: ${file.name} (${sizeMB}MB)`);

  try {
    const bitmap = await withTimeout(
      loadImageBitmap(file),
      COMPRESSION_TIMEOUT_MS,
      'Image loading',
    );

    // Determine output format: keep PNG only if it has transparency
    const isPngTransparent = file.type === 'image/png' && hasTransparency(bitmap);
    const outputType: 'image/jpeg' | 'image/png' = isPngTransparent ? 'image/png' : 'image/jpeg';
    const outputExt = isPngTransparent ? 'png' : 'jpg';

    // Generate full-size compressed image (max 1800px, 85% quality)
    const full = await withTimeout(
      resizeImage(bitmap, 1800, 1800, 0.85, outputType),
      COMPRESSION_TIMEOUT_MS,
      'Full image resize',
    );

    // Generate thumbnail (max 400px wide, 80% quality)
    let thumbnail: Blob | null = null;
    try {
      thumbnail = await withTimeout(
        resizeImage(bitmap, 400, 400, 0.8, 'image/jpeg'),
        5000,
        'Thumbnail resize',
      );
    } catch (thumbErr) {
      console.warn('[Upload] Thumbnail compression failed, skipping:', thumbErr);
    }

    bitmap.close();

    const fullSizeMB = (full.size / 1024 / 1024).toFixed(2);
    console.log(`[Upload] Compression complete: ${sizeMB}MB → ${fullSizeMB}MB`);

    return { full, thumbnail, outputExt };
  } catch (err) {
    console.warn('[Upload] Compression failed or timed out, uploading original:', err);
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    return { full: file, thumbnail: null, outputExt: ext };
  }
}

/**
 * Upload a blob to Supabase storage with a timeout.
 * Uses XMLHttpRequest for reliable progress tracking.
 */
async function uploadToSupabase(
  bucket: string,
  path: string,
  blob: Blob,
  contentType: string,
  timeoutMs: number = UPLOAD_TIMEOUT_MS,
): Promise<void> {
  const supabase = createClient();

  // Get the Supabase session for the auth header
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated. Please sign in and try again.');
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let completed = false;

    const timer = setTimeout(() => {
      if (!completed) {
        completed = true;
        xhr.abort();
        reject(new Error('Upload timed out. Please try a smaller image or check your connection.'));
      }
    }, timeoutMs);

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('Cache-Control', 'max-age=31536000');
    xhr.setRequestHeader('x-upsert', 'false');

    xhr.onload = () => {
      if (completed) return;
      completed = true;
      clearTimeout(timer);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        let message = `Upload failed (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body.message) message = body.message;
          if (body.error) message = body.error;
        } catch {
          // ignore parse error
        }
        reject(new Error(message));
      }
    };

    xhr.onerror = () => {
      if (completed) return;
      completed = true;
      clearTimeout(timer);
      reject(new Error('Upload failed. Please check your connection and try again.'));
    };

    xhr.onabort = () => {
      if (completed) return;
      completed = true;
      clearTimeout(timer);
      reject(new Error('Upload was cancelled.'));
    };

    xhr.send(blob);
  });
}

/**
 * Upload an artwork image to the `artwork-images` bucket.
 * Images are stored under `{userId}/{artworkId}/{uuid}.{ext}`.
 *
 * Before uploading, the image is compressed client-side:
 * - Full image: resized to max 1800×1800, JPEG @ 85% quality
 * - Thumbnail: resized to max 400×400, JPEG @ 80% quality
 * - Transparent PNGs are preserved as PNG for the full image
 * - If compression fails/times out (10s), uploads the original
 * - Upload has a 30s timeout — never hangs indefinitely
 */
export async function uploadArtworkImage(
  file: File,
  userId: string,
  artworkId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Validate input
  const error = validateFile(file, MAX_INPUT_SIZE_MB);
  if (error) throw new Error(error);

  const fileId = crypto.randomUUID();

  // Step 1: Compress (0% → 40%)
  onProgress?.(5);
  const { full, thumbnail, outputExt } = await compressImage(file);
  onProgress?.(40);

  // Step 2: Upload full image (40% → 85%)
  const fullPath = `${userId}/${artworkId}/${fileId}.${outputExt}`;
  const fullContentType = outputExt === 'png' ? 'image/png' : 'image/jpeg';

  console.log(`[Upload] Starting upload to Supabase: ${fullPath}`);
  onProgress?.(45);

  try {
    await uploadToSupabase('artwork-images', fullPath, full, fullContentType);
  } catch (err) {
    console.error('[Upload] Full image upload error:', err);
    throw err;
  }

  onProgress?.(85);
  console.log('[Upload] Full image upload complete');

  // Step 3: Upload thumbnail (85% → 95%) — non-critical
  if (thumbnail) {
    const thumbPath = `${userId}/${artworkId}/${fileId}_thumb.jpg`;
    try {
      await uploadToSupabase('artwork-images', thumbPath, thumbnail, 'image/jpeg');
      console.log('[Upload] Thumbnail upload complete');
    } catch (thumbErr) {
      console.warn('[Upload] Thumbnail upload failed (non-critical):', thumbErr);
    }
  }
  onProgress?.(95);

  const publicUrl = getPublicUrl(fullPath, 'artwork-images');
  console.log('[Upload] Upload complete:', publicUrl);
  onProgress?.(100);

  return publicUrl;
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

  try {
    await uploadToSupabase('avatars', path, file, file.type || 'image/jpeg');
  } catch (err) {
    console.error('[Upload] Avatar upload error:', err);
    throw err;
  }

  onProgress?.(90);
  onProgress?.(100);

  return getPublicUrl(path, 'avatars');
}

/**
 * Delete an image from a storage bucket.
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
 */
export function getPathFromUrl(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
}
