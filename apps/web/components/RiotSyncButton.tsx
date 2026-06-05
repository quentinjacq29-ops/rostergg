'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'

export default function RiotSyncButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSync() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/riot/sync', { method: 'POST' })
    const data = await res.json() as { error?: string }
    if (!res.ok) {
      setError(data.error ?? 'Erreur')
    } else {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleSync}
        disabled={loading}
        className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Synchronisation…' : '↻ Sync'}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
