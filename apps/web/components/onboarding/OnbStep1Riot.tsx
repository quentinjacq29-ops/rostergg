'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import OnbShell from './OnbShell'
import { PLATFORM_LABELS } from '@/lib/riot/assets'

const TIER_COLORS_HEX: Record<string, string> = {
  IRON: '#9ca3af',
  BRONZE: '#a16207',
  SILVER: '#d1d5db',
  GOLD: '#facc15',
  PLATINUM: '#2dd4bf',
  EMERALD: '#34d399',
  DIAMOND: '#60a5fa',
  MASTER: '#a78bfa',
  GRANDMASTER: '#f87171',
  CHALLENGER: '#fde047',
}

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

type PseudoState = 'idle' | 'checking' | 'valid' | 'error'

type Props = { locale: string; step: number }

const PLATFORMS = Object.entries(PLATFORM_LABELS).slice(0, 5) // EUW EUNE NA KR BR

export default function OnbStep1Riot({ locale, step }: Props) {
  const [mode,     setMode]     = useState<'rso' | 'manual'>('rso')
  const [platform, setPlatform] = useState('euw1')
  const [gameName, setGameName] = useState('')
  const [tagLine,  setTagLine]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [verified, setVerified] = useState<VerifiedAccount | null>(null)

  // Pseudo public
  const [displayName,  setDisplayName]  = useState('')
  const [pseudoState,  setPseudoState]  = useState<PseudoState>('idle')
  const [pseudoMsg,    setPseudoMsg]    = useState<string | null>(null)
  const [suggestions,  setSuggestions]  = useState<string[]>([])
  const [rerolling,    setRerolling]    = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const router = useRouter()

  // Fetch suggestion initiale dès qu'un compte est vérifié
  useEffect(() => {
    if (!verified) return
    fetchSuggestion(verified.gameName)
  }, [verified?.gameName]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSuggestion(seed: string) {
    setRerolling(true)
    const res = await fetch(`/api/auth/pseudo-suggestion?seed=${encodeURIComponent(seed)}`)
    const { suggestion } = await res.json() as { suggestion: string }
    setDisplayName(suggestion)
    // Valider la suggestion automatiquement
    await checkPseudo(suggestion, seed)
    setRerolling(false)
  }

  async function checkPseudo(value: string, gn?: string) {
    const gameNameToUse = gn ?? verified?.gameName
    if (!value.trim()) { setPseudoState('idle'); setPseudoMsg(null); return }
    setPseudoState('checking')
    const res = await fetch('/api/auth/check-pseudo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: value.trim(), gameName: gameNameToUse }),
    })
    const data = await res.json() as { ok: boolean; reason?: string; message?: string; suggestions?: string[] }
    if (data.ok) {
      setPseudoState('valid')
      setPseudoMsg(null)
      setSuggestions([])
    } else {
      setPseudoState('error')
      setPseudoMsg(data.message ?? 'Pseudo invalide.')
      setSuggestions(data.suggestions ?? [])
    }
  }

  function onDisplayNameChange(val: string) {
    setDisplayName(val)
    setPseudoState('idle')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => checkPseudo(val), 350)
  }

  async function handleVerify() {
    if (!gameName.trim() || !tagLine.trim()) return
    setLoading(true)
    setError(null)
    setVerified(null)
    setDisplayName('')
    setPseudoState('idle')

    const res = await fetch('/api/riot/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameName: gameName.trim(), tagLine: tagLine.trim(), platform }),
    })
    const data = await res.json() as { error?: string; tier?: string; rank?: string; lp?: number; level?: number; topChamps?: string[]; puuid?: string }

    if (!res.ok) {
      // En mode test (pas de clé Riot), simuler un compte vérifié avec les données saisies
      if (res.status === 503 || data.error?.includes('RIOT_API_KEY')) {
        const mockAccount: VerifiedAccount = {
          gameName: gameName.trim(), tagLine: tagLine.trim(), platform,
          tier: 'GOLD', rank: 'II', lp: 45, level: 145, topChamps: [],
        }
        setVerified(mockAccount)
        if (typeof window !== 'undefined') localStorage.setItem('onb_riot', JSON.stringify(mockAccount))
      } else {
        setError(data.error ?? 'Compte introuvable. Vérifie le Riot ID et le serveur.')
      }
    } else {
      const account: VerifiedAccount = { gameName, tagLine, platform, ...data }
      setVerified(account)
      if (typeof window !== 'undefined') localStorage.setItem('onb_riot', JSON.stringify(account))
    }
    setLoading(false)
  }

  async function handleContinue() {
    if (mode === 'rso') {
      router.push('/onboarding/2')
      return
    }
    if (!displayName.trim() || pseudoState !== 'valid') return
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 1, data: { displayName: displayName.trim() } }),
    })
    if (typeof window !== 'undefined') localStorage.setItem('onb_displayName', displayName.trim())
    router.push('/onboarding/2')
  }

  // Auto-verify dès que les deux champs sont remplis (mode manual)
  const autoVerifyRef = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    if (mode !== 'manual') return
    if (!gameName.trim() || !tagLine.trim()) return
    clearTimeout(autoVerifyRef.current)
    autoVerifyRef.current = setTimeout(handleVerify, 600)
    return () => clearTimeout(autoVerifyRef.current)
  }, [gameName, tagLine, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const platformLabel = PLATFORM_LABELS[platform] ?? 'TAG'
  const continueDisabled = mode === 'rso'
    ? false
    : !verified || pseudoState !== 'valid'

  return (
    <OnbShell
      step={step}
      title="TON COMPTE & TON PSEUDO"
      sub="On lie ton compte Riot (rang, historique, maîtrise importés) puis tu choisis le pseudo public sous lequel les autres te verront. Ton Riot ID reste privé."
      onContinue={handleContinue}
      continueDisabled={continueDisabled}
      continueLabel="Continuer"
      locale={locale}
    >
      {/* ── Mode toggle ── */}
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
              onClick={() => { setMode(id); setVerified(null); setError(null); setDisplayName(''); setPseudoState('idle') }}
              style={{ flex: 1, textAlign: 'left', padding: '14px 16px', borderRadius: 13, cursor: 'pointer', background: on ? 'rgba(0,224,255,0.09)' : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? 'rgba(0,224,255,0.4)' : 'var(--line)'}`, boxShadow: on ? '0 0 16px rgba(0,224,255,0.13)' : 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, border: `2px solid ${on ? 'var(--cyan)' : 'var(--line-strong)'}`, background: on ? 'var(--cyan)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {on && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#06070b', display: 'block' }} />}
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: on ? 'var(--text)' : 'var(--text-dim)', letterSpacing: '0.02em' }}>{label}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-mute)', letterSpacing: '0.04em', marginTop: 6, paddingLeft: 24 }}>{hint}</div>
            </button>
          )
        })}
      </div>

      {/* ── RSO mode ── */}
      {mode === 'rso' && (
        <div style={{ marginTop: 20 }}>
          <div style={{ borderRadius: 16, padding: 20, background: 'linear-gradient(135deg, rgba(0,224,255,0.07), transparent)', border: '1px solid rgba(0,224,255,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'rgba(0,224,255,0.1)', border: '1px solid rgba(0,224,255,0.33)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /></svg>
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--text)', letterSpacing: '0.02em' }}>Connexion sécurisée via Riot</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.45 }}>Tu te connectes sur la page de Riot. RosterGG ne voit jamais ton mot de passe.</div>
              </div>
            </div>
            <button onClick={handleContinue} style={{ width: '100%', marginTop: 16, padding: 15, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--cyan), var(--violet))', color: '#001018', fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
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

      {/* ── Manual mode ── */}
      {mode === 'manual' && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 11px', borderRadius: 999, background: 'rgba(255,209,102,0.09)', border: '1px solid rgba(255,209,102,0.27)', marginBottom: 16 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /><path d="M12 9v4M12 17h.01" />
            </svg>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--gold)', letterSpacing: '0.12em' }}>MODE TEST — EN ATTENDANT LA CLÉ API</span>
          </div>

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

          {error && (
            <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,61,110,0.08)', border: '1px solid rgba(255,61,110,0.25)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--rose)' }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* ── Carte compte Riot lié (PRIVÉE) — apparaît après vérification ── */}
      {verified && (
        <div style={{ marginTop: 22, borderRadius: 16, padding: 20, background: 'linear-gradient(135deg, rgba(0,255,157,0.06), transparent)', border: '1px solid rgba(0,255,157,0.23)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span className="rgg-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--live)', letterSpacing: '0.16em' }}>
              {mode === 'rso' ? 'APERÇU · IMPORTÉ APRÈS CONNEXION' : 'COMPTE LIÉ · VÉRIFIÉ'}
            </span>
            {/* Badge PRIVÉ */}
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>PRIVÉ · VISIBLE DE TOI SEUL</span>
            </span>
          </div>

          {/* Compte */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 58, height: 58, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--surface), var(--elevated))', border: '2px solid var(--live)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--live)', boxShadow: '0 0 0 3px var(--bg), 0 0 14px rgba(0,255,157,0.3)' }}>
              {verified.gameName.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', letterSpacing: '0.02em' }}>
                {verified.gameName.toUpperCase()} <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>#{verified.tagLine.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {verified.tier && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.2)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: TIER_COLORS_HEX[verified.tier] ?? 'var(--live)', letterSpacing: '0.08em' }}>
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

      {/* ── Champ pseudo public (apparaît après vérification) ── */}
      {verified && (
        <div style={{ marginTop: 22 }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em', display: 'block' }}>
            TON PSEUDO ROSTERGG · CE QUE LES AUTRES VERRONT
          </label>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            {/* Input */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', height: 56, borderRadius: 13,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${pseudoState === 'error' ? 'rgba(255,61,110,0.4)' : pseudoState === 'valid' ? 'rgba(0,224,255,0.4)' : 'var(--line)'}`,
              boxShadow: pseudoState === 'error' ? '0 0 0 3px rgba(255,61,110,0.08)' : pseudoState === 'valid' ? '0 0 0 3px rgba(0,224,255,0.08)' : 'none',
              transition: 'all 0.15s',
            }}>
              <input
                type="text"
                value={displayName}
                onChange={e => onDisplayNameChange(e.target.value)}
                placeholder="TonPseudo"
                maxLength={20}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-display)', fontSize: 19, color: 'var(--text)', letterSpacing: '0.02em' }}
              />
              {/* Icône état */}
              {pseudoState === 'valid' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--live)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              )}
              {pseudoState === 'error' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              )}
              {pseudoState === 'checking' && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-mute)' }}>…</span>
              )}
            </div>

            {/* Re-roll */}
            <button
              onClick={() => fetchSuggestion(verified.gameName)}
              disabled={rerolling}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px', height: 56, borderRadius: 13, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-strong)', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: rerolling ? 0.5 : 1 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15" />
              </svg>
              Re-roll
            </button>
          </div>

          {/* Message d'aide / d'erreur */}
          {pseudoState === 'error' && pseudoMsg && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 12, padding: '12px 15px', borderRadius: 12, background: 'rgba(255,61,110,0.07)', border: '1px solid rgba(255,61,110,0.28)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
              </svg>
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', lineHeight: 1.45 }}>{pseudoMsg}</span>
                {suggestions.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
                    {suggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => { setDisplayName(s); checkPseudo(s) }}
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(0,224,255,0.33)', background: 'rgba(0,224,255,0.07)', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 10.5, cursor: 'pointer', letterSpacing: '0.04em' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {pseudoState === 'valid' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 12 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--live)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.45 }}>
                Les autres te verront comme <b style={{ color: 'var(--text)' }}>« {displayName} »</b>. Ton vrai Riot ID reste <b style={{ color: 'var(--text)' }}>privé</b> — révélé uniquement quand tu acceptes un duo.
              </span>
            </div>
          )}

          {/* Message si Continuer bloqué */}
          {pseudoState === 'error' && (
            <div style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,61,110,0.8)', letterSpacing: '0.06em' }}>
              CHOISIS UN PSEUDO DISTINCT POUR CONTINUER
            </div>
          )}
        </div>
      )}
    </OnbShell>
  )
}
