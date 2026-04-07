/**
 * Supabase Storage Utilities for Signo
 *
 * SETUP: Create these storage buckets in Supabase Dashboard → Storage:
 *
 * 1. "artwork-images" — Public: ON, File size limit: 25 MB, MIME: image/jpeg, image/png, image/webp
 * 2. "avatars" — Public: ON, File size limit: 5 MB, MIME: image/jpeg, image/png, image/webp
 *
 * RLS policies — run in SQL Editor:
 *
 *   CREATE POLICY "Public read access" ON storage.objects FOR SELECT
 *     USING (bucket_id IN ('artwork-images', 'avatars'));
 *
 *   CREATE POLICY "Authenticated users can upload artwork images" ON storage.objects FOR INSERT
 *     TO authenticated WITH CHECK (bucket_id = 'artwork-images');
 *
 *   CREATE POLICY "Users can manage their own artwork images" ON storage.objects FOR DELETE
 *     TO authenticated USING (bucket_id = 'artwork-images' AND (storage.foldername(name))[1] = auth.uid()::text);
 *
 *   CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT
 *     TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
 *
 *   CREATE POLICY "Users can manage their own avatar" ON storage.objects FOR DELETE
 *     TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
 */

import { createClient } from './client';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ── Compression ──

/**
 * Compress an image using Canvas API.
 * - Files under 500KB skip compression entirely.
 * - 8-second hard timeout — if it hangs, use the original file.
 * - Always resolves (never rejects) — worst case returns the original.
 */
async function compressImage(
  file: File,
  maxWidth = 2400,
  quality = 0.9,
): Promise<File> {
  // Skip small files
  if (file.size < 500_000) {
    console.log(`[Upload] File under 500KB (${(file.size / 1024).toFixed(0)}KB), skipping compression`);
    return file;
  }

  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  console.log(`[Upload] Compressing ${file.name} (${sizeMB}MB), max ${maxWidth}px, quality ${quality}`);

  return new Promise<File>((resolve) => {
    const timeout = setTimeout(() => {
      console.log('[Upload] Compression timed out after 8s, using original');
      resolve(file);
    }, 8000);

    const img = new window.Image();

    img.onload = () => {
      try {
        clearTimeout(timeout);
        let width = img.width;
        let height = img.height;

        // Only resize if larger than maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxWidth) {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          console.log('[Upload] No canvas context, using original');
          URL.revokeObjectURL(img.src);
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(img.src);
            if (blob) {
              const outMB = (blob.size / 1024 / 1024).toFixed(1);
              console.log(`[Upload] Compressed: ${sizeMB}MB → ${outMB}MB (${width}x${height})`);
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
            } else {
              console.log('[Upload] toBlob returned null, using original');
              resolve(file);
            }
          },
          'image/jpeg',
          quality,
        );
      } catch (err) {
        clearTimeout(timeout);
        console.log('[Upload] Compression error, using original:', err);
        URL.revokeObjectURL(img.src);
        resolve(file);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      console.log('[Upload] Image load failed, using original');
      URL.revokeObjectURL(img.src);
      resolve(file);
    };

    img.src = URL.createObjectURL(file);
  });
}

// ── Upload ──

/**
 * Upload a file to Supabase Storage using the JS client.
 * Uses upsert:true so retries work without "already exists" errors.
 * Timeout scales with file size: 30s base, 60s for >5MB.
 */
async function uploadToStorage(
  bucket: string,
  path: string,
  file: File | Blob,
): Promise<{ url: string }> {
  const supabase = createClient();
  const sizeMB = file.size / 1024 / 1024;
  const timeoutMs = sizeMB > 5 ? 60_000 : 30_000;

  console.log(`[Upload] Uploading to ${bucket}/${path} (${sizeMB.toFixed(1)}MB, timeout ${timeoutMs / 1000}s)`);

  // Race between upload and timeout
  const result = await Promise.race([
    supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '31536000',
      upsert: true,
    }),
    new Promise<{ data: null; error: { message: string } }>((resolve) =>
      setTimeout(
        () => resolve({ data: null, error: { message: `Upload timed out after ${timeoutMs / 1000}s` } }),
        timeoutMs,
      ),
    ),
  ]);

  if (result.error) {
    console.error('[Upload] Storage error:', result.error.message);
    throw new Error(result.error.message);
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  console.log('[Upload] Upload complete:', urlData.publicUrl);
  return { url: urlData.publicUrl };
}

// ── Public API ──

/**
 * Upload an artwork image.
 *
 * 1. Validate file type/size
 * 2. Compress (2400px, 90% JPEG, 8s timeout, skip if <500KB)
 * 3. Upload to Supabase (30s/60s timeout)
 * 4. On failure: retry with aggressive compression (1200px, 70%)
 * 5. Return public URL
 */
export async function uploadArtworkImage(
  file: File,
  userId: string,
  artworkId: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  // Validate
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error(`"${file.name}" is not supported. Use JPG, PNG, or WebP.`);
  }
  if (file.size > 25 * 1024 * 1024) {
    throw new Error(`"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 25MB.`);
  }

  const fileId = crypto.randomUUID();
  const path = `${userId}/${artworkId}/${fileId}.jpg`;

  console.log(`[Upload] Processing ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);

  // Step 1: Compress
  onProgress?.(5);
  const compressed = await compressImage(file, 2400, 0.9);
  onProgress?.(40);

  console.log(`[Upload] Ready to upload: ${(compressed.size / 1024 / 1024).toFixed(1)}MB`);

  // Step 2: Upload
  onProgress?.(45);
  try {
    const { url } = await uploadToStorage('artwork-images', path, compressed);
    onProgress?.(100);
    return url;
  } catch (firstErr) {
    // Retry with aggressive compression
    console.warn('[Upload] First attempt failed:', (firstErr as Error).message);
    console.log('[Upload] Retrying with aggressive compression (1200px, 70%)...');
    onProgress?.(50);

    const aggressive = await compressImage(file, 1200, 0.7);
    onProgress?.(60);

    try {
      const { url } = await uploadToStorage('artwork-images', path, aggressive);
      onProgress?.(100);
      return url;
    } catch (retryErr) {
      console.error('[Upload] Retry also failed:', (retryErr as Error).message);
      throw new Error(
        'Upload failed. Please try a smaller image or check your internet connection.',
      );
    }
  }
}

/**
 * Upload an avatar image.
 */
export async function uploadAvatar(
  file: File,
  userId: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Please use JPG, PNG, or WebP.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Avatar must be under 5MB.');
  }

  onProgress?.(10);

  const supabase = createClient();

  // Remove existing avatars
  const { data: existing } = await supabase.storage.from('avatars').list(userId);
  if (existing && existing.length > 0) {
    await supabase.storage.from('avatars').remove(existing.map((f) => `${userId}/${f.name}`));
  }

  onProgress?.(30);

  // Compress to 400px
  const compressed = await compressImage(file, 400, 0.82);
  onProgress?.(50);

  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { url } = await uploadToStorage('avatars', path, compressed);

  onProgress?.(100);
  return url;
}

/**
 * Delete an image from storage.
 */
export async function deleteImage(path: string, bucket: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
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
