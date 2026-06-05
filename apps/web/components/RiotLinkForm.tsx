'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { PLATFORM_LABELS } from '@/lib/riot/assets'

export default function RiotLinkForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter()
  const [gameName, setGameName] = useState('')
  const [tagLine, setTagLine] = useState('')
  const [platform, setPlatform] = useState('euw1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/riot/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameName, tagLine, platform }),
    })

    const data = await res.json() as { error?: string }

    if (!res.ok) {
      setError(data.error ?? 'Erreur inconnue')
    } else {
      onSuccess?.()
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Server selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-zinc-400">Serveur</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPlatform(value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                platform === value
                  ? 'border-duo bg-duo/10 text-duo'
                  : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Riot ID */}
      <div className="flex gap-2">
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-sm text-zinc-400">Nom d&apos;invocateur</label>
          <input
            type="text"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder="NomInvocateur"
            required
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-duo focus:outline-none transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5 w-28">
          <label className="text-sm text-zinc-400">Tag</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">#</span>
            <input
              type="text"
              value={tagLine}
              onChange={(e) => setTagLine(e.target.value)}
              placeholder="EUW"
              required
              maxLength={5}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-7 pr-3 py-3 text-white placeholder:text-zinc-600 focus:border-duo focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 rounded-lg bg-red-950/30 border border-red-900 px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-duo px-4 py-3 font-semibold text-zinc-950 hover:bg-duo/90 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Vérification…' : 'Lier mon compte Riot'}
      </button>
    </form>
  )
}
