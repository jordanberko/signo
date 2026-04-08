/**
 * Supabase Storage Utilities for Signo
 *
 * Uses direct fetch to Supabase Storage REST API — bypasses the JS SDK
 * which hangs on auth calls from high-latency regions (Australia → US).
 *
 * SETUP: Create these storage buckets in Supabase Dashboard → Storage:
 *
 * 1. "artwork-images" — Public: ON, File size limit: 50 MB, MIME: any
 * 2. "avatars" — Public: ON, File size limit: 5 MB, MIME: image/jpeg, image/png, image/webp
 */

import { getAuthToken } from './getAuthToken';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// ── Compression ──

/**
 * Compress an image using Canvas API.
 * - Files under 500KB skip compression entirely.
 * - 15-second hard timeout — if it hangs, use the original file.
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
      console.log('[Upload] Compression timed out after 15s, using original');
      resolve(file);
    }, 15000);

    const img = new window.Image();

    img.onload = () => {
      try {
        clearTimeout(timeout);
        let width = img.width;
        let height = img.height;

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

// ── Direct Upload (bypasses Supabase JS SDK) ──

/**
 * Upload a file directly to Supabase Storage REST API.
 * No SDK involvement — just fetch with the auth token from cookies.
 */
async function uploadToStorage(
  bucket: string,
  path: string,
  file: File | Blob,
): Promise<{ url: string }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not logged in. Please sign in and try again.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const sizeMB = file.size / 1024 / 1024;
  const timeoutMs = sizeMB > 5 ? 90_000 : 60_000;

  console.log(`[Upload] Uploading to ${bucket}/${path} (${sizeMB.toFixed(1)}MB, timeout ${timeoutMs / 1000}s)`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `${supabaseUrl}/storage/v1/object/${bucket}/${path}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey!,
          'x-upsert': 'true',
          'cache-control': 'max-age=31536000',
        },
        body: file,
        signal: controller.signal,
      }
    );

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Upload] Storage error:', response.status, errText);
      throw new Error(`Upload failed (${response.status}): ${errText}`);
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
    console.log('[Upload] Upload complete:', publicUrl);
    return { url: publicUrl };
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === 'AbortError') {
      throw new Error(`Upload timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  }
}

// ── Public API ──

/**
 * Upload an artwork image.
 *
 * 1. Validate file type/size
 * 2. Compress (2400px, 90% JPEG, 15s timeout, skip if <500KB)
 * 3. Upload via direct fetch (60s/90s timeout)
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
    throw new Error(`"${file.name}" is not supported. Use JPG, PNG, WebP, or HEIC.`);
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

  // Compress to 400px
  const compressed = await compressImage(file, 400, 0.82);
  onProgress?.(50);

  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { url } = await uploadToStorage('avatars', path, compressed);

  onProgress?.(100);
  return url;
}

/**
 * Get the public URL for a stored file.
 */
export function getPublicUrl(path: string, bucket: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
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
