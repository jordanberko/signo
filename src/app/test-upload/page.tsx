'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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

    const supabase = createClient()

    // Check auth
    addLog('Checking auth...')
    const { data: { session }, error: authErr } = await supabase.auth.getSession()
    const user = session?.user
    if (authErr) {
      addLog(`Auth ERROR: ${authErr.message}`)
      return
    }
    if (!user) {
      addLog('NOT LOGGED IN — go to /login first')
      return
    }
    addLog(`Logged in as: ${user.email}`)
    addLog('')

    // Try raw upload — no compression
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const path = `test/${Date.now()}_${safeName}`
    addLog(`Uploading to: artwork-images/${path}`)
    addLog('Starting upload...')

    const startTime = Date.now()

    try {
      const { data, error } = await supabase.storage
        .from('artwork-images')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true
        })

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

      if (error) {
        addLog(`UPLOAD FAILED after ${elapsed}s`)
        addLog(`Error: ${JSON.stringify(error)}`)
        addLog(`Message: ${error.message}`)
        addLog(`Status: ${(error as unknown as Record<string, unknown>).statusCode || 'unknown'}`)
      } else {
        addLog(`UPLOAD SUCCESS in ${elapsed}s`)
        const { data: urlData } = supabase.storage
          .from('artwork-images')
          .getPublicUrl(data.path)
        addLog(`URL: ${urlData.publicUrl}`)
      }
    } catch (err) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      addLog(`UPLOAD EXCEPTION after ${elapsed}s`)
      addLog(`Error: ${(err as Error).message || JSON.stringify(err)}`)
    }
  }

  return (
    <div style={{ padding: 40, maxWidth: 700, margin: '0 auto', fontFamily: 'monospace' }}>
      <h1 style={{ fontFamily: 'sans-serif' }}>Upload Test</h1>
      <p style={{ color: '#888', fontFamily: 'sans-serif' }}>Select any image to test raw upload to Supabase Storage</p>
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
