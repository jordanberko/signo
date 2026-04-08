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
    addLog(`Found ${cookies.length} cookies`)

    // Find the Supabase auth token cookie
    let accessToken: string | null = null
    for (const cookie of cookies) {
      if (cookie.includes('auth-token')) {
        addLog(`Found auth cookie: ${cookie.substring(0, 50)}...`)
        const value = cookie.split('=').slice(1).join('=')

        try {
          // Handle base64-encoded cookies
          let decoded = value
          if (decoded.startsWith('base64-')) {
            decoded = atob(decoded.replace('base64-', ''))
            addLog('Decoded base64 cookie')
          }

          const parsed = JSON.parse(decoded)
          addLog(`Parsed JSON: keys = ${Object.keys(parsed).join(', ')}`)

          // The token could be in different structures
          accessToken = parsed.access_token
            || parsed?.currentSession?.access_token
            || parsed?.[0]?.access_token
            || null

          if (accessToken) {
            addLog(`Access token found: ${accessToken.substring(0, 30)}...`)
            break
          } else {
            addLog(`No access_token in parsed data. Structure: ${JSON.stringify(parsed).substring(0, 200)}`)
          }
        } catch (err) {
          addLog(`Parse error: ${(err as Error).message}`)
          addLog(`Raw value (first 200 chars): ${value.substring(0, 200)}`)
        }
      }
    }

    if (!accessToken) {
      addLog('')
      addLog('Could not extract access token from cookies.')
      addLog('Listing all cookie names:')
      cookies.forEach(c => addLog('  ' + c.split('=')[0]))
      return
    }

    addLog('')
    await doUpload(file, accessToken)
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
        Bypasses Supabase JS client — reads token from cookie, uploads via direct fetch
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
