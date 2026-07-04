'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'

type State = 'loading' | 'success' | 'error'

const T = {
  bg: '#0a0c14', surface: '#0f121c',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6', live: '#00ff9d', danger: '#ff3d6e',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

function LogoMark({ size = 54 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), overflow: 'hidden', background: `linear-gradient(150deg, ${T.surface}, #06070b)`, boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.12)`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 48 48" fill="none">
        <path d="M9 9 L20 24 L9 39" stroke={T.cyan} strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M39 9 L28 24 L39 39" stroke={T.violet} strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="24" r="4.6" fill={T.cyan} />
      </svg>
    </span>
  )
}

function LoadingRing() {
  return (
    <div style={{ width: 96, height: 96, position: 'relative', borderRadius: '50%', margin: '0 auto 28px' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes cb-spin { to { transform: rotate(360deg); } }
        .cb-ring::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: conic-gradient(from 0deg, ${T.cyan}, ${T.violet}, transparent 75%);
          animation: cb-spin 1s linear infinite;
        }
        .cb-ring::after {
          content: '';
          position: absolute;
          inset: 7px;
          border-radius: 50%;
          background: ${T.surface};
        }
        @media (prefers-reduced-motion: reduce) { .cb-ring::before { animation: none; } }
      ` }} />
      <div className="cb-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <LogoMark size={54} />
      </div>
    </div>
  )
}

function IconCircle({ ok }: { ok: boolean }) {
  return (
    <div style={{
      width: 84, height: 84, borderRadius: '50%', margin: '0 auto 26px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: ok ? `${T.live}24` : `${T.danger}24`,
      border: `1px solid ${ok ? `${T.live}66` : `${T.danger}66`}`,
    }}>
      {ok
        ? <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        : <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={T.danger} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16h.01" /></svg>
      }
    </div>
  )
}

function StepLine({ steps }: { steps: { label: string; done: boolean }[] }) {
  return (
    <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', maxWidth: 300, margin: '26px auto 0' }}>
      {steps.map(s => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 11, fontFamily: T.mono, fontSize: 12, color: s.done ? T.text : T.textMute, letterSpacing: '0.04em' }}>
          <span style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${s.done ? `${T.live}80` : T.lineStrong}`,
            background: s.done ? `${T.live}2e` : 'transparent',
          }}>
            {s.done
              ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              : <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.cyan, display: 'block' }} />
            }
          </span>
          {s.label}
        </div>
      ))}
    </div>
  )
}

export default function LocaleAuthCallbackPage() {
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const [cbState, setCbState] = useState<State>('loading')
  const [steps, setSteps] = useState([
    { label: 'Lien magique vérifié', done: false },
    { label: 'Compte Riot authentifié', done: false },
    { label: 'Import du rang & du champ pool…', done: false },
  ])

  useEffect(() => {
    const hash = window.location.hash
    if (!hash) { setCbState('error'); return }

    const params = new URLSearchParams(hash.slice(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (!accessToken || !refreshToken) { setCbState('error'); return }

    setSteps(s => s.map((x, i) => i === 0 ? { ...x, done: true } : x))

    const supabase = createClient()
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(async ({ error }) => {
        if (error) { setCbState('error'); return }

        setSteps(s => s.map((x, i) => i <= 1 ? { ...x, done: true } : x))

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setCbState('error'); return }

        setSteps(s => s.map(x => ({ ...x, done: true })))

        const { data: prefs } = await supabase
          .from('matching_prefs').select('profile_id')
          .eq('profile_id', user.id).maybeSingle()

        setCbState('success')
        setTimeout(() => {
          router.replace(`/${locale}/${prefs ? 'duo' : 'onboarding/1'}`)
        }, 1200)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const cardStyle: React.CSSProperties = {
    position: 'relative', width: '100%', maxWidth: 440, textAlign: 'center',
    borderRadius: 24, padding: '48px 40px', overflow: 'hidden',
    background: `linear-gradient(180deg, ${T.surface}, ${T.bg})`,
    border: `1px solid ${T.lineStrong}`,
    boxShadow: '0 40px 90px -30px rgba(0,0,0,0.8)',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: 24, background: T.bg, fontFamily: T.body,
      backgroundImage: `radial-gradient(900px 560px at 50% -10%, ${T.violet}1f, transparent 60%), radial-gradient(800px 500px at 50% 120%, ${T.cyan}17, transparent 60%)`,
    }}>
      <div style={cardStyle}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${T.cyan}, ${T.violet}, transparent)` }} />

        {cbState === 'loading' && (
          <>
            <LoadingRing />
            <h2 style={{ margin: 0, fontFamily: T.display, fontSize: 30, letterSpacing: '0.01em', color: T.text }}>CONNEXION EN COURS</h2>
            <p style={{ margin: '12px auto 0', fontFamily: T.body, fontSize: 14.5, color: T.textDim, lineHeight: 1.6, maxWidth: 320 }}>
              On valide ton lien Riot et on récupère ton profil. Quelques secondes…
            </p>
            <StepLine steps={steps} />
          </>
        )}

        {cbState === 'success' && (
          <>
            <IconCircle ok />
            <h2 style={{ margin: 0, fontFamily: T.display, fontSize: 30, letterSpacing: '0.01em', color: T.text }}>TU ES CONNECTÉ</h2>
            <p style={{ margin: '12px auto 0', fontFamily: T.body, fontSize: 14.5, color: T.textDim, lineHeight: 1.6, maxWidth: 320 }}>
              Bon retour. On te redirige vers ton feed…
            </p>
          </>
        )}

        {cbState === 'error' && (
          <>
            <IconCircle ok={false} />
            <h2 style={{ margin: 0, fontFamily: T.display, fontSize: 30, letterSpacing: '0.01em', color: T.text }}>LIEN EXPIRÉ</h2>
            <p style={{ margin: '12px auto 0', fontFamily: T.body, fontSize: 14.5, color: T.textDim, lineHeight: 1.6, maxWidth: 320 }}>
              Ce lien de connexion n&apos;est plus valide. Les liens magiques expirent après 15 minutes pour ta sécurité.
            </p>
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link href="/login" style={{ display: 'block', padding: '16px', borderRadius: 13, background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: '#001018', fontFamily: T.display, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700, boxShadow: `0 16px 40px -14px ${T.cyan}` }}>
                Renvoyer un lien
              </Link>
              <Link href="/" style={{ fontFamily: T.mono, fontSize: 12, color: T.textMute, letterSpacing: '0.06em', textDecoration: 'none' }}>
                ← Retour à l&apos;accueil
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
