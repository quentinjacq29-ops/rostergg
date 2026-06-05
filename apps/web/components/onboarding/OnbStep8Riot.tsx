'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import OnbShell from './OnbShell'
import { PLATFORM_LABELS, TIER_COLORS } from '@/lib/riot/assets'

const PLATFORMS = Object.entries(PLATFORM_LABELS).slice(0, 5) // EUW, EUNE, NA, KR, BR

type VerifiedAccount = {
  gameName: string
  tagLine: string
  platform: string
  tier?: string
  rank?: string
  lp?: number
  level?: number
  iconId?: number
  topChamps?: string[]
}

type Props = { locale: string }

export default function OnbStep8Riot({ locale }: Props) {
  const [platform, setPlatform] = useState('euw1')
  const [gameName, setGameName] = useState('')
  const [tagLine, setTagLine] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verified, setVerified] = useState<VerifiedAccount | null>(null)
  const router = useRouter()

  async function handleVerify() {
    if (!gameName.trim() || !tagLine.trim()) return
    setLoading(true)
    setError(null)
    setVerified(null)

    const res = await fetch('/api/riot/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameName: gameName.trim(), tagLine: tagLine.trim(), platform }),
    })
    const data = await res.json() as { error?: string; tier?: string; rank?: string; lp?: number; level?: number }

    if (!res.ok) {
      setError(data.error ?? 'Compte introuvable. Vérifie le Riot ID et le serveur.')
    } else {
      setVerified({ gameName, tagLine, platform, ...data })
    }
    setLoading(false)
  }

  async function handleFinish() {
    router.push('/duo')
  }

  const continueDisabled = !verified
  const continueLabel = 'Terminer'
  const continueAccent = 'var(--live)'

  return (
    <OnbShell
      step={8}
      title="LIE TON COMPTE RIOT"
      sub="Saisis ton Riot ID pour importer ton rang, ton historique et ta maîtrise. C'est ce qui alimente ton score de compatibilité."
      onContinue={handleFinish}
      continueDisabled={continueDisabled}
      continueLabel={continueLabel}
      continueAccent={continueAccent}
      locale={locale}
    >
      {/* Platform selector */}
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em' }}>SERVEUR</label>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {PLATFORMS.map(([value, label]) => {
          const on = platform === value
          return (
            <span
              key={value}
              onClick={() => { setPlatform(value); setVerified(null); setError(null) }}
              style={{
                padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
                background: on ? 'rgba(0,224,255,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${on ? 'rgba(0,224,255,0.4)' : 'var(--line)'}`,
                fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.08em',
                color: on ? 'var(--cyan)' : 'var(--text-dim)',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </span>
          )
        })}
      </div>

      {/* Riot ID input */}
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em', display: 'block', marginTop: 24 }}>RIOT ID</label>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        {/* Game name */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', height: 56,
          borderRadius: 13, background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${gameName ? 'rgba(0,224,255,0.33)' : 'var(--line)'}`,
          boxShadow: gameName ? '0 0 0 3px rgba(0,224,255,0.08)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}>
          <input
            type="text"
            value={gameName}
            onChange={e => { setGameName(e.target.value); setVerified(null); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
            placeholder="NomInvocateur"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text)',
              letterSpacing: '0.02em',
            }}
          />
        </div>
        {/* Tag */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '0 18px', height: 56,
          borderRadius: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)',
          gap: 2,
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-dim)' }}>#</span>
          <input
            type="text"
            value={tagLine}
            onChange={e => { setTagLine(e.target.value); setVerified(null); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
            placeholder={PLATFORM_LABELS[platform] ?? 'TAG'}
            maxLength={5}
            style={{
              width: 64, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text)',
              letterSpacing: '0.02em',
            }}
          />
        </div>
        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={loading || !gameName.trim() || !tagLine.trim()}
          style={{
            height: 56, padding: '0 22px', borderRadius: 13, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--cyan), var(--violet))',
            color: '#001018', fontFamily: 'var(--font-display)', fontSize: 13,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
            opacity: loading || !gameName.trim() || !tagLine.trim() ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          {loading ? '…' : 'Vérifier'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,61,110,0.08)', border: '1px solid rgba(255,61,110,0.25)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--rose)' }}>
          {error}
        </div>
      )}

      {/* Verified card */}
      {verified && (
        <div style={{
          marginTop: 22, borderRadius: 16, padding: 20,
          background: 'linear-gradient(135deg, rgba(0,255,157,0.06), transparent)',
          border: '1px solid rgba(0,255,157,0.23)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span className="rgg-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--live)', letterSpacing: '0.16em' }}>COMPTE TROUVÉ · VÉRIFIÉ</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Avatar placeholder */}
            <div style={{
              width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--surface), var(--elevated))',
              border: '2px solid var(--live)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--live)',
              boxShadow: '0 0 0 3px var(--bg), 0 0 14px rgba(0,255,157,0.3)',
            }}>
              {verified.gameName.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', letterSpacing: '0.02em' }}>
                {verified.gameName.toUpperCase()}{' '}
                <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>#{verified.tagLine.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {verified.tier && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 999,
                    background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.2)',
                    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                    color: TIER_COLORS[verified.tier ?? ''] ?? 'var(--live)',
                    letterSpacing: '0.08em',
                  }}>
                    {verified.tier} {verified.rank} · {verified.lp ?? 0} LP
                  </span>
                )}
                {verified.level && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '4px 10px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)',
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: 'var(--text-dim)', letterSpacing: '0.08em',
                  }}>
                    LVL {verified.level}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </OnbShell>
  )
}
