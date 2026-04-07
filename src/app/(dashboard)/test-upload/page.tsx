'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestUpload() {
  const [result, setResult] = useState('')

  const handleTest = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setResult(`Selected: ${file.name} (${(file.size/1024).toFixed(0)}KB, type: ${file.type})\n`)

    const supabase = createClient()

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    setResult(prev => prev + `Auth: ${user ? user.email : 'NOT LOGGED IN'} ${authError ? authError.message : ''}\n`)

    if (!user) return

    // Try raw upload — no compression, no processing
    const path = `test/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    setResult(prev => prev + `Uploading to artwork-images/${path}...\n`)

    const { data, error } = await supabase.storage
      .from('artwork-images')
      .upload(path, file, { cacheControl: '3600', upsert: true })

    if (error) {
      setResult(prev => prev + `UPLOAD ERROR: ${JSON.stringify(error)}\n`)
    } else {
      const { data: urlData } = supabase.storage.from('artwork-images').getPublicUrl(data.path)
      setResult(prev => prev + `SUCCESS: ${urlData.publicUrl}\n`)
    }
  }

  return (
    <div style={{ padding: 40, maxWidth: 600, margin: '0 auto' }}>
      <h1>Upload Test</h1>
      <input type="file" accept="image/*" onChange={handleTest} />
      <pre style={{ marginTop: 20, padding: 16, background: '#f5f5f5', borderRadius: 8, whiteSpace: 'pre-wrap', fontSize: 13 }}>
        {result || 'Select a file to test upload...'}
      </pre>
    </div>
  )
}
