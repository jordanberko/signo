'use client'
import { useState } from 'react'

export default function TestUpload() {
  const [log, setLog] = useState('')

  const addLog = (msg: string) => {
    console.log(msg)
    setLog(prev => prev + msg + '\n')
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLog('')
    addLog(`File: ${file.name}`)
    addLog(`Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`)
    addLog(`Type: ${file.type}`)
    addLog('')

    // Get session token from cookie directly
    const cookies = document.cookie.split(';').map(c => c.trim())
    const sbCookie = cookies.find(c => c.startsWith('sb-') && c.includes('auth-token'))

    if (!sbCookie) {
      addLog('No auth cookie found. Trying Supabase getSession...')
      // Fallback: try getting session from Supabase client
      const { createBrowserClient } = await import('@supabase/ssr')
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        addLog('NO SESSION FOUND. Please log in at /login first.')
        return
      }
      addLog(`Session found: ${session.user.email}`)
      addLog('')
      await doUpload(file, session.access_token)
      return
    }

    addLog('Auth cookie found')
    // Parse the JWT from the cookie
    try {
      const cookieValue = sbCookie.split('=').slice(1).join('=')
      const parsed = JSON.parse(decodeURIComponent(cookieValue))
      const token = parsed?.access_token || parsed?.[0]?.access_token
      if (token) {
        addLog(`Token found: ${token.substring(0, 20)}...`)
        addLog('')
        await doUpload(file, token)
      } else {
        addLog('Could not extract token from cookie')
        addLog(`Cookie value: ${cookieValue.substring(0, 100)}...`)
      }
    } catch (err) {
      addLog(`Cookie parse error: ${(err as Error).message}`)
      addLog('Trying Supabase getSession fallback...')
      const { createBrowserClient } = await import('@supabase/ssr')
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        addLog(`Session found via fallback: ${session.user.email}`)
        await doUpload(file, session.access_token)
      } else {
        addLog('No session. Please log in.')
      }
    }
  }

  const doUpload = async (file: File, accessToken: string) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const path = `test/${Date.now()}_${safeName}`

    addLog(`Uploading via direct fetch...`)
    addLog(`Path: artwork-images/${path}`)
    addLog('')

    const startTime = Date.now()

    try {
      const res = await fetch(
        `${url}/storage/v1/object/artwork-images/${path}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': anonKey!,
            'x-upsert': 'true',
            'cache-control': 'max-age=31536000',
          },
          body: file,
        }
      )

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

      if (!res.ok) {
        const errText = await res.text()
        addLog(`UPLOAD FAILED after ${elapsed}s`)
        addLog(`Status: ${res.status} ${res.statusText}`)
        addLog(`Response: ${errText}`)
      } else {
        const data = await res.json()
        addLog(`UPLOAD SUCCESS in ${elapsed}s`)
        addLog(`Response: ${JSON.stringify(data)}`)
        const publicUrl = `${url}/storage/v1/object/public/artwork-images/${path}`
        addLog(`Public URL: ${publicUrl}`)
      }
    } catch (err) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      addLog(`UPLOAD EXCEPTION after ${elapsed}s`)
      addLog(`Error: ${(err as Error).message}`)
    }
  }

  return (
    <div style={{ padding: 40, maxWidth: 700, margin: '0 auto', fontFamily: 'monospace' }}>
      <h1 style={{ fontFamily: 'sans-serif' }}>Upload Test (Direct Fetch)</h1>
      <p style={{ color: '#888', fontFamily: 'sans-serif' }}>
        Bypasses Supabase JS client — uses direct fetch to Storage REST API
      </p>
      <input
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ marginTop: 16 }}
      />
      <pre style={{
        marginTop: 20,
        padding: 16,
        background: '#111',
        color: '#0f0',
        borderRadius: 8,
        whiteSpace: 'pre-wrap',
        fontSize: 13,
        minHeight: 200
      }}>
        {log || 'Waiting for file selection...'}
      </pre>
    </div>
  )
}
