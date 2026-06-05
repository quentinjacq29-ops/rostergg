'use client'

import { useRouter } from '@/i18n/navigation'
import { ONB_STEPS } from '@/lib/constants'
import type { ReactNode } from 'react'

type Props = {
  step: number
  steps?: readonly string[]   // override ONB_STEPS for non-duo flows
  title: string
  sub?: string
  children: ReactNode
  onContinue?: () => void | Promise<void>
  continueLabel?: string
  continueDisabled?: boolean
  continueAccent?: string
  loading?: boolean
  locale: string
}

// Step dot in left rail
function RailDot({ n, label, state }: { n: number; label: string; state: 'done' | 'active' | 'todo' }) {
  const done = state === 'done'
  const active = state === 'active'
  const ring = done ? 'var(--live)' : active ? 'var(--cyan)' : 'var(--line-strong)'
  const txt = done ? 'var(--live)' : active ? 'var(--text)' : 'var(--text-mute)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, border: `2px solid ${ring}`, background: done ? 'rgba(0,255,157,0.12)' : active ? 'rgba(0,224,255,0.1)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: txt, boxShadow: active ? '0 0 14px rgba(0,224,255,0.33)' : 'none' }}>
        {done
          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--live)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6" /></svg>
          : n}
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, letterSpacing: '0.05em', color: txt }}>{label}</span>
    </div>
  )
}

export default function OnbShell({ step, steps: stepsOverride, title, sub, children, onContinue, continueLabel = 'Continuer', continueDisabled, continueAccent = 'var(--cyan)', loading, locale }: Props) {
  const router = useRouter()
  const displaySteps = stepsOverride ?? ONB_STEPS
  const total = displaySteps.length

  function handleBack() {
    if (step > 2) router.push(`/onboarding/${step - 1}` as `/onboarding/${number}`)
    else if (step === 2) router.push('/onboarding/1')
    else router.push('/')
  }

  async function handleContinue() {
    if (onContinue) await onContinue()
    else {
      if (step < 8) router.push(`/onboarding/${step + 1}` as `/onboarding/${number}`)
      else router.push('/duo')
    }
  }

  function handleSkip() {
    if (step < 8) router.push(`/onboarding/${step + 1}` as `/onboarding/${number}`)
    else router.push('/duo')
  }

  return (
    <div className="onb-shell" style={{ width: '100%', height: '100%', display: 'flex', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>
      {/* ── Left rail ── */}
      <aside className="onb-rail" style={{ width: 340, flexShrink: 0, height: '100%', boxSizing: 'border-box', position: 'relative', overflow: 'hidden', background: 'linear-gradient(165deg, var(--surface), var(--void))', borderRight: '1px solid var(--line)', padding: '38px 32px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', top: -80, left: -60, width: 340, height: 340, background: 'radial-gradient(circle, rgba(0,224,255,0.11), transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, right: -80, width: 320, height: 320, background: 'radial-gradient(circle, rgba(139,92,246,0.11), transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        {/* Logo */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(150deg, var(--surface), var(--void))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1), 0 0 20px rgba(0,224,255,0.27)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
              <path d="M9 9 L20 24 L9 39" stroke="var(--cyan)" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M39 9 L28 24 L39 39" stroke="var(--violet)" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="24" cy="24" r="4.6" fill="var(--cyan)" />
            </svg>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '0.04em', color: 'var(--text)' }}>
            ROSTER<span style={{ color: 'var(--cyan)' }}>GG</span>
          </div>
        </div>
        {/* Steps */}
        <div style={{ position: 'relative', fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-dim)', letterSpacing: '0.24em', marginBottom: 18 }}>◢ CRÉATION DU PROFIL</div>
        <div className="onb-steplist" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 13 }}>
          {displaySteps.map((label, i) => (
            <RailDot key={i} n={i + 1} label={label} state={i + 1 < step ? 'done' : i + 1 === step ? 'active' : 'todo'} />
          ))}
        </div>
        <div className="onb-railspace" style={{ flex: 1 }} />
        {/* Progress bar */}
        <div style={{ position: 'relative', height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ width: `${(step / total) * 100}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, var(--cyan), var(--violet))', boxShadow: '0 0 10px var(--cyan)', transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ position: 'relative', fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-mute)', letterSpacing: '0.14em', marginTop: 10 }}>{step} / {total} · ~2 MIN</div>
      </aside>

      {/* ── Right content ── */}
      <main className="onb-main" style={{ flex: 1, minWidth: 0, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 60px' }}>
        <div className="onb-content" style={{ width: '100%', maxWidth: 640 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', letterSpacing: '0.2em', marginBottom: 12 }}>
            ÉTAPE {String(step).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 42, lineHeight: 0.98, letterSpacing: '0.01em', color: 'var(--text)' }}>{title}</h1>
          {sub && <p style={{ marginTop: 14, fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.6, maxWidth: 560 }}>{sub}</p>}
          <div style={{ marginTop: 30 }}>{children}</div>
          {/* Footer CTA */}
          <div className="onb-footer" style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 34 }}>
            <button onClick={handleBack} disabled={step === 1} style={{ padding: '15px 24px', borderRadius: 12, background: 'transparent', border: '1px solid var(--line-strong)', color: step === 1 ? 'var(--text-mute)' : 'var(--text-dim)', fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: step === 1 ? 'default' : 'pointer', opacity: step === 1 ? 0.4 : 1 }}>
              Retour
            </button>
            <button
              onClick={handleContinue}
              disabled={continueDisabled || loading}
              style={{ padding: '15px 28px', borderRadius: 12, border: 'none', background: continueDisabled ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${continueAccent}, var(--violet))`, color: continueDisabled ? 'var(--text-mute)' : '#001018', fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, cursor: continueDisabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: continueDisabled ? 'none' : `0 8px 24px -10px ${continueAccent}` }}
            >
              {loading ? 'Chargement…' : continueLabel}
              {!loading && !continueDisabled && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              )}
            </button>
            <span onClick={handleSkip} style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-mute)', letterSpacing: '0.08em', cursor: 'pointer' }}>
              {step === 1 ? 'Déjà connecté ✓' : 'Passer'}
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
