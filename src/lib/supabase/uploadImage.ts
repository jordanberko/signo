import { getAuthToken } from './getAuthToken'

export async function uploadImage(
  file: File,
  bucket: string,
  path: string,
  onProgress?: (status: string) => void
): Promise<{ url: string | null; error: string | null }> {
  const token = getAuthToken()
  if (!token) {
    return { url: null, error: 'Not logged in. Please sign in and try again.' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  onProgress?.('Uploading...')

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)

    const response = await fetch(
      `${supabaseUrl}/storage/v1/object/${bucket}/${path}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey!,
          'x-upsert': 'true',
        },
        body: file,
        signal: controller.signal,
      }
    )

    clearTimeout(timeout)

    if (response.ok) {
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
      return { url: publicUrl, error: null }
    } else {
      const errorText = await response.text()
      return { url: null, error: `Upload failed: ${errorText}` }
    }
  } catch (err: unknown) {
    if ((err as Error).name === 'AbortError') {
      return { url: null, error: 'Upload timed out after 60 seconds. Please try a smaller image.' }
    }
    return { url: null, error: `Upload error: ${(err as Error).message}` }
  }
}
