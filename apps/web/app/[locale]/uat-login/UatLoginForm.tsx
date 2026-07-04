'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'

const T = {
  bg: '#0a0c14', surface: '#0f121c', void: '#06070b',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6', live: '#00ff9d',
  queue: '#ffb547', danger: '#ff3d6e',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

type TestUser = {
  initials: string
  name: string
  riotId: string
  email: string
  role: string
  tag: string
  tagColor: string
  tagBg: string
  destination: string
}

// Couleurs de rôle (tokens rgg)
const ROLE_C: Record<string, string> = { TOP: '#ff6a4d', JNG: '#3ddc97', MID: '#00e0ff' }

// Vrais comptes seedés (email @test.rostergg + Riot ID résolu via Riot).
const TEST_USERS: TestUser[] = [
  { initials: 'DU', name: 'Durix',    riotId: 'Durix#EUW',    email: 'quentin.jacq29@gmail.com', role: 'MID · Gold II · ton compte',      tag: 'MOI', tagColor: ROLE_C.MID, tagBg: `${ROLE_C.MID}1f`, destination: 'duo' },
  { initials: 'GR', name: 'GRASPR',   riotId: 'GRASPR#EUW',   email: 'graspr@test.rostergg',     role: 'TOP · Diamond I · cherche JNG',   tag: 'TOP', tagColor: ROLE_C.TOP, tagBg: `${ROLE_C.TOP}1f`, destination: 'duo' },
  { initials: 'SH', name: 'SHYVIX',   riotId: 'SHYVIX#EUW',   email: 'shyvix@test.rostergg',     role: 'TOP · Emerald III · cherche MID', tag: 'TOP', tagColor: ROLE_C.TOP, tagBg: `${ROLE_C.TOP}1f`, destination: 'duo' },
  { initials: 'KZ', name: 'KAYNZ',    riotId: 'KAYNZ#EUW',    email: 'kaynz@test.rostergg',      role: 'JNG · Diamond II · cherche TOP',  tag: 'JNG', tagColor: ROLE_C.JNG, tagBg: `${ROLE_C.JNG}1f`, destination: 'duo' },
  { initials: 'VX', name: 'VEXORIA',  riotId: 'VEXORIA#EUW',  email: 'vexoria@test.rostergg',    role: 'JNG · Diamond IV',                tag: 'JNG', tagColor: ROLE_C.JNG, tagBg: `${ROLE_C.JNG}1f`, destination: 'duo' },
  { initials: 'EL', name: 'ELISEGEE', riotId: 'ELISEGEE#EUW', email: 'elisegee@test.rostergg',   role: 'JNG · Diamond III',               tag: 'JNG', tagColor: ROLE_C.JNG, tagBg: `${ROLE_C.JNG}1f`, destination: 'duo' },
  { initials: 'HE', name: 'HECARIMX', riotId: 'HECARIMX#EUW', email: 'hecarimx@test.rostergg',   role: 'JNG · Emerald I',                 tag: 'JNG', tagColor: ROLE_C.JNG, tagBg: `${ROLE_C.JNG}1f`, destination: 'duo' },
  { initials: 'LE', name: 'LEEFLOW',  riotId: 'LEEFLOW#EUW',  email: 'leeflow@test.rostergg',    role: 'JNG · Emerald II',                tag: 'JNG', tagColor: ROLE_C.JNG, tagBg: `${ROLE_C.JNG}1f`, destination: 'duo' },
  { initials: 'NO', name: 'NOCTURNO', riotId: 'NOCTURNO#EUW', email: 'nocturno@test.rostergg',   role: 'JNG · Platinum I',                tag: 'JNG', tagColor: ROLE_C.JNG, tagBg: `${ROLE_C.JNG}1f`, destination: 'duo' },
  { initials: 'JA', name: 'JARVINJG', riotId: 'JARVINJG#EUW', email: 'jarvinjg@test.rostergg',   role: 'JNG · Gold I',                    tag: 'JNG', tagColor: ROLE_C.JNG, tagBg: `${ROLE_C.JNG}1f`, destination: 'duo' },
]

type State = 'idle' | 'loading' | 'success' | 'error'

export default function UatLoginForm() {
  const { locale } = useParams<{ locale: string }>()
  const [impersonate, setImpersonate] = useState('')
  const [state, setState] = useState<State>('idle')
  const [magicLink, setMagicLink] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function loginAsUser(email: string, riotId: string, destination: string) {
    setState('loading')
    setErrorMsg(null)
    const res = await fetch('/api/auth/uat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, riotId, platform: 'euw1' }),
    })
    const data = await res.json()
    if (!res.ok) {
      setState('error')
      setErrorMsg(data.error ?? 'Erreur inconnue')
      return
    }
    if (data.magicLink) {
      window.location.href = data.magicLink
    } else {
      window.location.href = `/${locale}/${destination}`
    }
  }

  async function handleImpersonate(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setErrorMsg(null)
    // Saisie = Riot ID (GameName#Tag). Email dérivé du compte de test.
    const riotId = impersonate.trim().includes('#') ? impersonate.trim() : `${impersonate.trim()}#EUW`
    const email = `${riotId.split('#')[0].toLowerCase()}@test.rostergg`
    const res = await fetch('/api/auth/uat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, riotId, platform: 'euw1' }),
    })
    const data = await res.json()
    if (!res.ok) {
      setState('error')
      setErrorMsg(data.error ?? 'Erreur inconnue')
      return
    }
    if (data.magicLink) {
      setMagicLink(data.magicLink)
      setState('success')
    }
  }

  if (state === 'success' && magicLink) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: T.body, backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 18px, ${T.queue}05 18px, ${T.queue}05 19px)` }}>
        <div style={{ width: '100%', maxWidth: 460, borderRadius: 20, padding: 32, background: `linear-gradient(180deg, ${T.surface}, ${T.bg})`, border: `1px solid ${T.lineStrong}` }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.live, letterSpacing: '0.2em', marginBottom: 14 }}>◢ SESSION PRÊTE</div>
          <button
            onClick={() => { window.location.href = magicLink! }}
            style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: '#001018', fontFamily: T.display, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}
          >
            Ouvrir la session
          </button>
          <button
            onClick={() => { setState('idle'); setMagicLink(null) }}
            style={{ marginTop: 12, width: '100%', padding: 10, borderRadius: 11, border: `1px solid ${T.line}`, cursor: 'pointer', background: 'transparent', color: T.textDim, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.1em' }}
          >
            Nouveau compte
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, color: T.text, fontFamily: T.body,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 18px, ${T.queue}05 18px, ${T.queue}05 19px)`,
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>

        {/* Dev bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 11, marginBottom: 18, background: `${T.queue}1f`, border: `1px solid ${T.queue}66` }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.queue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4M12 17h.01" />
          </svg>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.queue, letterSpacing: '0.12em' }}>ENVIRONNEMENT DE TEST — bypass OAuth Riot</span>
          <span style={{ marginLeft: 'auto', fontFamily: T.mono, fontSize: 10, color: T.queue, padding: '3px 8px', borderRadius: 6, border: `1px solid ${T.queue}66` }}>UAT</span>
        </div>

        {/* Card */}
        <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', padding: 32, background: `linear-gradient(180deg, ${T.surface}, ${T.bg})`, border: `1px solid ${T.lineStrong}` }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${T.queue}, ${T.cyan}, transparent)` }} />

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 6 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, overflow: 'hidden', background: `linear-gradient(150deg, ${T.surface}, ${T.void})`, boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.12)`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="21" height="21" viewBox="0 0 48 48" fill="none">
                <path d="M9 9 L20 24 L9 39" stroke={T.cyan} strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M39 9 L28 24 L39 39" stroke={T.violet} strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="24" cy="24" r="4.6" fill={T.cyan} />
              </svg>
            </span>
            <span style={{ fontFamily: T.display, letterSpacing: '0.04em', fontSize: 20, color: T.text }}>ROSTER<span style={{ color: T.cyan }}>GG</span></span>
          </div>

          <h2 style={{ margin: '18px 0 4px', fontFamily: T.display, fontSize: 26, letterSpacing: '0.02em', color: T.text }}>UAT LOGIN</h2>
          <p style={{ margin: '0 0 22px', fontFamily: T.body, fontSize: 13.5, color: T.textDim, lineHeight: 1.5 }}>
            Connexion dev sans passer par Riot. Choisis un compte de test ou impersonate par ID.
          </p>

          {/* Test users */}
          <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.textMute, letterSpacing: '0.2em', margin: '18px 0 10px', display: 'flex', justifyContent: 'space-between' }}>
            <span>COMPTES DE TEST</span><span style={{ color: T.textMute }}>{TEST_USERS.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
            {TEST_USERS.map(u => (
              <button
                key={u.name}
                onClick={() => loginAsUser(u.email, u.riotId, u.destination)}
                disabled={state === 'loading'}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.line}`, cursor: 'pointer', textAlign: 'left', color: T.text, transition: 'border-color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = T.lineStrong)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = T.line)}
              >
                <span style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg, #2a3350, #171c2e)`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.display, fontSize: 13, color: T.text, flexShrink: 0 }}>
                  {u.initials}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: T.text }}>{u.name}</span>
                  <span style={{ display: 'block', fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.06em', marginTop: 1 }}>{u.role}</span>
                </span>
                <span style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 6, color: u.tagColor, background: u.tagBg, border: `1px solid ${u.tagColor}55` }}>
                  {u.tag}
                </span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '20px 0' }}>
            <span style={{ flex: 1, height: 1, background: T.line }} />
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.12em' }}>OU</span>
            <span style={{ flex: 1, height: 1, background: T.line }} />
          </div>

          {/* Impersonate */}
          <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.textMute, letterSpacing: '0.2em', marginBottom: 10 }}>AUTRE COMPTE DE TEST · PAR RIOT ID</div>
          <form onSubmit={handleImpersonate} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={impersonate}
              onChange={e => setImpersonate(e.target.value)}
              placeholder="GameName#Tag (ex : GRASPR#EUW)"
              required
              style={{ flex: 1, padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.lineStrong}`, color: T.text, fontFamily: T.body, fontSize: 14, outline: 'none' }}
            />
            <button
              type="submit"
              disabled={state === 'loading'}
              style={{ padding: '0 18px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: '#001018', fontFamily: T.display, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              GO
            </button>
          </form>

          {errorMsg && (
            <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: `${T.danger}14`, border: `1px solid ${T.danger}44`, fontFamily: T.mono, fontSize: 11, color: T.danger, letterSpacing: '0.04em' }}>
              {errorMsg}
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/login" style={{ fontFamily: T.mono, fontSize: 11, color: T.textMute, letterSpacing: '0.06em', textDecoration: 'none' }}>← Login prod</Link>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.queue }}>staging</span>
          </div>
        </div>
      </div>
    </div>
  )
}
