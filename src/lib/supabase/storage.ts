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
 * Compress an image using Canvas API with a hard timeout.
 * If compression fails or takes too long, returns the original file.
 */
async function compressImage(
  file: File,
  maxWidth = 1600,
  quality = 0.82,
): Promise<Blob> {
  const startTime = Date.now();
  const sizeKB = (file.size / 1024).toFixed(0);
  console.log(`[Upload] Starting compression for: ${file.name} (${sizeKB}KB)`);

  return new Promise((resolve) => {
    // Hard 5-second timeout — if compression hangs, use original
    const timeout = setTimeout(() => {
      console.warn(`[Upload] Compression timed out after 5s, using original (${sizeKB}KB)`);
      resolve(file);
    }, 5000);

    const img = new window.Image();

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale down if wider than maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        // Also cap height
        if (height > maxWidth) {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.warn('[Upload] Canvas context unavailable, using original');
          resolve(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(img.src);
            if (blob) {
              const elapsed = Date.now() - startTime;
              console.log(
                `[Upload] Compression complete: ${sizeKB}KB → ${(blob.size / 1024).toFixed(0)}KB in ${elapsed}ms`,
              );
              resolve(blob);
            } else {
              console.warn('[Upload] Canvas toBlob returned null, using original');
              resolve(file);
            }
          },
          'image/jpeg',
          quality,
        );
      } catch (err) {
        console.warn('[Upload] Compression error, using original:', err);
        URL.revokeObjectURL(img.src);
        resolve(file);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      console.warn('[Upload] Image load failed, using original');
      URL.revokeObjectURL(img.src);
      resolve(file);
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload a blob to Supabase storage using XMLHttpRequest with a hard timeout.
 * Returns the response or throws on failure/timeout.
 */
async function uploadToSupabase(
  bucket: string,
  path: string,
  blob: Blob,
  contentType: string,
  timeoutMs: number,
): Promise<void> {
  const supabase = createClient();

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
        reject(new Error(`Upload timed out after ${timeoutMs / 1000}s`));
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
 *
 * Pipeline:
 * 1. Validate file (type, size)
 * 2. Compress client-side: max 1600px, JPEG @ 82% quality (5s timeout)
 * 3. Upload to Supabase with 15s timeout
 * 4. If upload fails, retry once with aggressive compression (800px, 60% quality)
 * 5. Generate thumbnail (400px) as a non-critical background upload
 *
 * Total max wait: ~20 seconds. Never hangs indefinitely.
 */
export async function uploadArtworkImage(
  file: File,
  userId: string,
  artworkId: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  // Validate input
  const error = validateFile(file, MAX_INPUT_SIZE_MB);
  if (error) throw new Error(error);

  const fileId = crypto.randomUUID();
  const startTime = Date.now();

  console.log(`[Upload] Selected file: ${file.name} (${(file.size / 1024).toFixed(0)}KB)`);

  // Step 1: Compress (0% → 40%)
  onProgress?.(5);
  const compressed = await compressImage(file, 1600, 0.82);
  onProgress?.(40);

  // Step 2: Upload full image with 15s timeout (40% → 90%)
  const fullPath = `${userId}/${artworkId}/${fileId}.jpg`;
  const sizeKB = (compressed.size / 1024).toFixed(0);
  console.log(`[Upload] Starting upload to Supabase: ${fullPath} (${sizeKB}KB)`);
  onProgress?.(45);

  try {
    await uploadToSupabase('artwork-images', fullPath, compressed, 'image/jpeg', 15000);
  } catch (firstErr) {
    // First attempt failed — retry with aggressive compression
    console.warn('[Upload] First upload attempt failed:', firstErr);
    console.log('[Upload] Retrying with aggressive compression (800px, 60% quality)...');
    onProgress?.(50);

    const aggressiveCompressed = await compressImage(file, 800, 0.6);
    const retrySizeKB = (aggressiveCompressed.size / 1024).toFixed(0);
    console.log(`[Upload] Aggressive compression: ${retrySizeKB}KB. Retrying upload...`);
    onProgress?.(55);

    try {
      await uploadToSupabase('artwork-images', fullPath, aggressiveCompressed, 'image/jpeg', 15000);
    } catch (retryErr) {
      console.error('[Upload] Second upload attempt also failed:', retryErr);
      throw new Error(
        'Image upload is taking too long. Please try a smaller image or check your internet connection.',
      );
    }
  }

  onProgress?.(90);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Upload] Full image upload complete in ${elapsed}s`);

  // Step 3: Upload thumbnail (non-critical, fire and forget)
  const thumbBlob = await compressImage(file, 400, 0.7);
  const thumbPath = `${userId}/${artworkId}/${fileId}_thumb.jpg`;
  uploadToSupabase('artwork-images', thumbPath, thumbBlob, 'image/jpeg', 10000).catch((err) =>
    console.warn('[Upload] Thumbnail upload failed (non-critical):', err),
  );

  onProgress?.(95);

  const publicUrl = getPublicUrl(fullPath, 'artwork-images');
  console.log(`[Upload] Upload complete: ${publicUrl}`);
  onProgress?.(100);

  return publicUrl;
}

/**
 * Upload an avatar image to the `avatars` bucket.
 */
export async function uploadAvatar(
  file: File,
  userId: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const error = validateFile(file, 5);
  if (error) throw new Error(error);

  const supabase = createClient();
  const ext = getFileExtension(file);
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const path = `${userId}/${fileName}`;

  onProgress?.(10);

  // Remove any existing avatars first
  const { data: existing } = await supabase.storage.from('avatars').list(userId);

  if (existing && existing.length > 0) {
    const filesToRemove = existing.map((f) => `${userId}/${f.name}`);
    await supabase.storage.from('avatars').remove(filesToRemove);
  }

  onProgress?.(30);

  // Compress avatar before upload
  const compressed = await compressImage(file, 400, 0.82);

  try {
    await uploadToSupabase('avatars', path, compressed, 'image/jpeg', 15000);
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
