export function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';').map(c => c.trim())

  for (const cookie of cookies) {
    if (cookie.includes('auth-token')) {
      const value = cookie.split('=').slice(1).join('=')
      try {
        let decoded = value
        if (decoded.startsWith('base64-')) {
          decoded = atob(decoded.replace('base64-', ''))
        }
        const parsed = JSON.parse(decoded)
        return parsed.access_token || null
      } catch {
        return null
      }
    }
  }
  return null
}

export function getAuthUser(): { id: string; email: string } | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';').map(c => c.trim())

  for (const cookie of cookies) {
    if (cookie.includes('auth-token')) {
      const value = cookie.split('=').slice(1).join('=')
      try {
        let decoded = value
        if (decoded.startsWith('base64-')) {
          decoded = atob(decoded.replace('base64-', ''))
        }
        const parsed = JSON.parse(decoded)
        if (parsed.user) {
          return { id: parsed.user.id, email: parsed.user.email }
        }
      } catch {
        return null
      }
    }
  }
  return null
}
