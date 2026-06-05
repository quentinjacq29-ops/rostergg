'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import OnbShell from './OnbShell'
import { PLATFORM_LABELS, TIER_COLORS } from '@/lib/riot/assets'

type VerifiedAccount = {
  gameName: string
  tagLine: string
  platform: string
  tier?: string | null
  rank?: string | null
  lp?: number | null
  level?: number | null
  topChamps?: string[]
}

type Props = { locale: string; step: number }

const PLATFORMS = Object.entries(PLATFORM_LABELS).slice(0, 5) // EUW EUNE NA KR BR

export default function OnbStep1Riot({ locale, step }: Props) {
  const [mode, setMode] = useState<'rso' | 'manual'>('rso')
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

    const res = await fetch('/api/riot/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameName: gameName.trim(), tagLine: tagLine.trim(), platform }),
    })
    const data = await res.json() as { error?: string; tier?: string; rank?: string; lp?: number; level?: number; topChamps?: string[]; puuid?: string }

    if (!res.ok) {
      setError(data.error ?? 'Compte introuvable. Vérifie le Riot ID et le serveur.')
    } else {
      const account: VerifiedAccount = { gameName, tagLine, platform, ...data }
      setVerified(account)
      // Store for downstream steps (role prefill, champion pool prefill)
      if (typeof window !== 'undefined') {
        localStorage.setItem('onb_riot', JSON.stringify(account))
      }
    }
    setLoading(false)
  }

  async function handleContinue() {
    router.push('/onboarding/2')
  }

  const platformLabel = PLATFORM_LABELS[platform] ?? 'TAG'

  return (
    <OnbShell
      step={step}
      title="ON COMMENCE PAR TON RIOT ID"
      sub="On lie ton compte d'abord : ça importe ton rang, ton historique et ta maîtrise. Rôle, champion pool et niveau arrivent pré-remplis aux étapes suivantes."
      onContinue={handleContinue}
      continueDisabled={mode === 'manual' && !verified}
      continueLabel="Continuer"
      locale={locale}
    >
      {/* Mode toggle */}
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em' }}>MÉTHODE DE LIAISON</label>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        {([
          ['rso',    'Riot Sign-On',    'RECOMMANDÉ · PROD'],
          ['manual', 'Riot ID + vérif', 'MODE TEST · SANS CLÉ PROD'],
        ] as const).map(([id, label, hint]) => {
          const on = mode === id
          return (
            <button
              key={id}
              onClick={() => { setMode(id); setVerified(null); setError(null) }}
              style={{
                flex: 1, textAlign: 'left', padding: '14px 16px', borderRadius: 13, cursor: 'pointer',
                background: on ? 'rgba(0,224,255,0.09)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${on ? 'rgba(0,224,255,0.4)' : 'var(--line)'}`,
                boxShadow: on ? '0 0 16px rgba(0,224,255,0.13)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${on ? 'var(--cyan)' : 'var(--line-strong)'}`,
                  background: on ? 'var(--cyan)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {on && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#06070b', display: 'block' }} />}
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: on ? 'var(--text)' : 'var(--text-dim)', letterSpacing: '0.02em' }}>{label}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-mute)', letterSpacing: '0.04em', marginTop: 6, paddingLeft: 24 }}>{hint}</div>
            </button>
          )
        })}
      </div>

      {/* RSO mode */}
      {mode === 'rso' && (
        <div style={{ marginTop: 20 }}>
          <div style={{ borderRadius: 16, padding: 20, background: 'linear-gradient(135deg, rgba(0,224,255,0.07), transparent)', border: '1px solid rgba(0,224,255,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'rgba(0,224,255,0.1)', border: '1px solid rgba(0,224,255,0.33)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
                </svg>
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--text)', letterSpacing: '0.02em' }}>Connexion sécurisée via Riot</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.45 }}>Tu te connectes sur la page de Riot. RosterGG ne voit jamais ton mot de passe.</div>
              </div>
            </div>
            <button style={{ width: '100%', marginTop: 16, padding: 15, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--cyan), var(--violet))', color: '#001018', fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /></svg>
              Continuer avec Riot
            </button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-mute)', letterSpacing: '0.06em' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-mute)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
              redirection sécurisée vers auth.riotgames.com
            </div>
          </div>
          <p style={{ marginTop: 12, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-mute)', lineHeight: 1.5, margin: '12px 0 0' }}>
            C&apos;est cette méthode qui reste <b style={{ color: 'var(--text-dim)' }}>en production</b> : la preuve de propriété est garantie par Riot.
          </p>
        </div>
      )}

      {/* Manual mode */}
      {mode === 'manual' && (
        <div style={{ marginTop: 20 }}>
          {/* Warning badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 11px', borderRadius: 999, background: 'rgba(255,209,102,0.09)', border: '1px solid rgba(255,209,102,0.27)', marginBottom: 16 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /><path d="M12 9v4M12 17h.01" />
            </svg>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--gold)', letterSpacing: '0.12em' }}>MODE TEST — EN ATTENDANT LA CLÉ API</span>
          </div>

          {/* Platform */}
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em', display: 'block' }}>SERVEUR</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {PLATFORMS.map(([value, label]) => {
              const on = platform === value
              return (
                <span key={value} onClick={() => { setPlatform(value); setVerified(null); setError(null) }} style={{ padding: '10px 18px', borderRadius: 10, cursor: 'pointer', background: on ? 'rgba(0,224,255,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${on ? 'rgba(0,224,255,0.4)' : 'var(--line)'}`, fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.08em', color: on ? 'var(--cyan)' : 'var(--text-dim)', transition: 'all 0.15s' }}>
                  {label}
                </span>
              )
            })}
          </div>

          {/* Riot ID */}
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em', display: 'block', marginTop: 22 }}>RIOT ID</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', height: 56, borderRadius: 13, background: 'rgba(255,255,255,0.04)', border: `1px solid ${gameName ? 'rgba(0,224,255,0.33)' : 'var(--line)'}`, boxShadow: gameName ? '0 0 0 3px rgba(0,224,255,0.08)' : 'none', transition: 'all 0.15s' }}>
              <input type="text" value={gameName} onChange={e => { setGameName(e.target.value); setVerified(null); setError(null) }} onKeyDown={e => e.key === 'Enter' && handleVerify()} placeholder="NomInvocateur" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text)', letterSpacing: '0.02em' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 18px', height: 56, borderRadius: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', gap: 2 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-dim)' }}>#</span>
              <input type="text" value={tagLine} onChange={e => { setTagLine(e.target.value); setVerified(null); setError(null) }} onKeyDown={e => e.key === 'Enter' && handleVerify()} placeholder={platformLabel} maxLength={5} style={{ width: 64, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text)', letterSpacing: '0.02em' }} />
            </div>
            <button onClick={handleVerify} disabled={loading || !gameName.trim() || !tagLine.trim()} style={{ height: 56, padding: '0 22px', borderRadius: 13, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--cyan), var(--violet))', color: '#001018', fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, opacity: loading || !gameName.trim() || !tagLine.trim() ? 0.5 : 1, flexShrink: 0 }}>
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
            <div style={{ marginTop: 22, borderRadius: 16, padding: 20, background: 'linear-gradient(135deg, rgba(0,255,157,0.06), transparent)', border: '1px solid rgba(0,255,157,0.23)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span className="rgg-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--live)', letterSpacing: '0.16em' }}>COMPTE TROUVÉ · VÉRIFIÉ</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--surface), var(--elevated))', border: '2px solid var(--live)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--live)', boxShadow: '0 0 0 3px var(--bg), 0 0 14px rgba(0,255,157,0.3)' }}>
                  {verified.gameName.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', letterSpacing: '0.02em' }}>
                    {verified.gameName.toUpperCase()} <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>#{verified.tagLine.toUpperCase()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {verified.tier && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.2)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: TIER_COLORS[verified.tier] ?? 'var(--live)', letterSpacing: '0.08em' }}>
                        {verified.tier} {verified.rank} · {verified.lp ?? 0} LP
                      </span>
                    )}
                    {verified.level && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
                        LVL {verified.level}
                      </span>
                    )}
                  </div>
                </div>
                {/* Top champs */}
                {verified.topChamps && verified.topChamps.length > 0 && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {verified.topChamps.slice(0, 3).map((id, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={id} src={`/api/champions/icon/${id}`} alt={id} width={44} height={44} style={{ width: 44, height: 44, borderRadius: 8, border: `1.5px solid ${i === 0 ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'}`, objectFit: 'cover' }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </OnbShell>
  )
}
