'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'

const T = {
  bg: '#0a0c14', surface: '#0f121c',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6', live: '#00ff9d', danger: '#ff3d6e',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

const PLATFORMS = ['euw1', 'na1', 'kr', 'eun1', 'br1', 'la1', 'la2', 'oc1', 'tr1', 'jp1']

type Resolved = { gameName: string; tagLine: string; puuid: string; rank: string }
type State = 'idle' | 'loading' | 'success' | 'error'

export default function UatLoginForm() {
  const { locale } = useParams<{ locale: string }>()
  const [email,    setEmail]    = useState('')
  const [riotId,   setRiotId]   = useState('')
  const [platform, setPlatform] = useState('euw1')
  const [state,    setState]    = useState<State>('idle')
  const [resolved, setResolved] = useState<Resolved | null>(null)
  const [magicLink, setMagicLink] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setErrorMsg(null)

    const res = await fetch('/api/auth/uat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, riotId, platform }),
    })
    const data = await res.json()

    if (!res.ok) {
      setState('error')
      setErrorMsg(data.error ?? 'Erreur inconnue')
      return
    }

    setResolved(data.resolved)
    setMagicLink(data.magicLink)
    setState('success')
  }

  function followLink() {
    if (magicLink) window.location.href = magicLink
  }

  const input = (value: string, onChange: (v: string) => void, placeholder: string, type = 'text') => (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '12px 14px', borderRadius: 11,
        background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.lineStrong}`,
        color: T.text, fontFamily: T.body, fontSize: 14, outline: 'none',
      }}
    />
  )

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: T.body, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.danger, letterSpacing: '0.2em', marginBottom: 10 }}>
            ◢ UAT · DEV ONLY · JAMAIS EN PROD
          </div>
          <div style={{ fontFamily: T.display, fontSize: 32, color: T.text, letterSpacing: '0.02em' }}>LOGIN TEST</div>
          <p style={{ margin: '10px 0 0', fontFamily: T.body, fontSize: 13.5, color: T.textDim, lineHeight: 1.5 }}>
            Résout le Riot ID via l&apos;API, crée ou trouve le user Supabase, génère un magic link.
            Aucune fenêtre RSO.
          </p>
        </div>

        {state === 'success' && resolved && magicLink ? (
          <div style={{ borderRadius: 16, padding: 22, background: `${T.live}0e`, border: `1px solid ${T.live}3a` }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.live, letterSpacing: '0.2em', marginBottom: 14 }}>◢ COMPTE RÉSOLU</div>
            <div style={{ fontFamily: T.display, fontSize: 22, color: T.text, marginBottom: 4 }}>
              {resolved.gameName}<span style={{ color: T.textDim, fontSize: 14, fontFamily: T.body }}> #{resolved.tagLine}</span>
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim, letterSpacing: '0.08em', marginBottom: 6 }}>{resolved.rank}</div>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.06em', marginBottom: 20, wordBreak: 'break-all' }}>
              PUUID : {resolved.puuid}
            </div>
            <button
              onClick={followLink}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: '#001018', fontFamily: T.display, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}
            >
              Ouvrir la session → /{locale}/duo
            </button>
            <button
              onClick={() => { setState('idle'); setResolved(null); setMagicLink(null) }}
              style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 11, border: `1px solid ${T.line}`, cursor: 'pointer', background: 'transparent', color: T.textDim, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.1em' }}
            >
              Nouveau compte
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.16em', marginBottom: 7 }}>EMAIL DE TEST</label>
              {input(email, setEmail, 'kaynz@test.rostergg', 'email')}
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.16em', marginBottom: 7 }}>RIOT ID</label>
              {input(riotId, setRiotId, 'gameName#EUW')}
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.16em', marginBottom: 7 }}>PLATEFORME</label>
              <select
                value={platform}
                onChange={e => setPlatform(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.lineStrong}`, color: T.text, fontFamily: T.mono, fontSize: 12, outline: 'none' }}
              >
                {PLATFORMS.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>

            {errorMsg && (
              <div style={{ padding: '12px 14px', borderRadius: 10, background: `${T.danger}14`, border: `1px solid ${T.danger}44`, fontFamily: T.mono, fontSize: 11, color: T.danger, letterSpacing: '0.04em' }}>
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={state === 'loading'}
              style={{ padding: '14px', borderRadius: 12, border: 'none', cursor: state === 'loading' ? 'not-allowed' : 'pointer', background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: '#001018', fontFamily: T.display, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, opacity: state === 'loading' ? 0.7 : 1 }}
            >
              {state === 'loading' ? 'Résolution Riot…' : 'Connexion UAT'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
