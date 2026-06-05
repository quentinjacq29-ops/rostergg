'use client'

import type { ReactNode } from 'react'

const COACH_STEPS = ['Compte Riot', 'Tu cherches quoi', 'Langues', 'Rôle à coacher', 'Niveau & objectif', 'À travailler', 'Matchup difficile', 'Format']
const ROSE = '#ff3d6e'
const ROSE2 = '#c98bff'

function RailDot({ n, label, state, onClick }: { n: number; label: string; state: 'done' | 'active' | 'todo'; onClick?: () => void }) {
  const done = state === 'done', active = state === 'active'
  const ring = done ? 'var(--live)' : active ? ROSE : 'var(--line-strong)'
  const txt = done ? 'var(--live)' : active ? 'var(--text)' : 'var(--text-mute)'
  return (
    <button onClick={onClick} disabled={state === 'todo'} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', padding: 0, cursor: state === 'todo' ? 'default' : 'pointer', textAlign: 'left' }}>
      <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, border: `2px solid ${ring}`, background: done ? 'rgba(0,255,157,0.12)' : active ? `${ROSE}1a` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: txt, boxShadow: active ? `0 0 14px ${ROSE}66` : 'none' }}>
        {done
          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--live)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6" /></svg>
          : n}
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, letterSpacing: '0.05em', color: txt }}>{label}</span>
    </button>
  )
}

type Props = {
  step: number
  title: string
  sub?: string
  children: ReactNode
  onBack: () => void
  onNext: () => void
  onJump?: (n: number) => void
  nextLabel?: string
  canNext?: boolean
}

export default function CoachShell({ step, title, sub, children, onBack, onNext, onJump, nextLabel = 'Continuer', canNext = true }: Props) {
  return (
    <div className="onb-shell" style={{ width: '100%', height: '100%', display: 'flex', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>
      {/* Rail */}
      <aside className="onb-rail" style={{ width: 340, flexShrink: 0, height: '100%', boxSizing: 'border-box', position: 'relative', overflow: 'hidden', background: 'linear-gradient(165deg, var(--surface), var(--void))', borderRight: '1px solid var(--line)', padding: '38px 32px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', top: -80, left: -60, width: 340, height: 340, background: `radial-gradient(circle, ${ROSE}22, transparent 65%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, right: -80, width: 320, height: 320, background: `radial-gradient(circle, ${ROSE2}1e, transparent 65%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />
        {/* Logo */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(150deg, var(--surface), var(--void))', boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.1), 0 0 20px ${ROSE}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
              <path d="M9 9 L20 24 L9 39" stroke="var(--cyan)" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M39 9 L28 24 L39 39" stroke="var(--violet)" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="24" cy="24" r="4.6" fill="var(--cyan)" />
            </svg>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '0.04em', color: 'var(--text)' }}>ROSTER<span style={{ color: 'var(--cyan)' }}>GG</span></div>
        </div>
        {/* Coaching badge */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 11px', borderRadius: 999, alignSelf: 'flex-start', background: `${ROSE}16`, border: `1px solid ${ROSE}44`, marginBottom: 20 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ROSE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6M16 16l4 4" /></svg>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: ROSE, letterSpacing: '0.18em' }}>PARCOURS COACHING 1V1</span>
        </div>
        {/* Steps */}
        <div className="onb-steplist" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 13 }}>
          {COACH_STEPS.map((label, i) => (
            <RailDot key={i} n={i + 1} label={label} state={i + 1 < step ? 'done' : i + 1 === step ? 'active' : 'todo'} onClick={() => i + 1 <= step && onJump?.(i + 1)} />
          ))}
        </div>
        <div className="onb-railspace" style={{ flex: 1 }} />
        {/* Progress */}
        <div style={{ position: 'relative', height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ width: `${(step / 8) * 100}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${ROSE}, ${ROSE2})`, boxShadow: `0 0 10px ${ROSE}`, transition: 'width 0.35s ease' }} />
        </div>
        <div style={{ position: 'relative', fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-mute)', letterSpacing: '0.14em', marginTop: 10 }}>{step} / 8 · ~2 MIN</div>
      </aside>

      {/* Content */}
      <main className="onb-main" style={{ flex: 1, minWidth: 0, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 60px' }}>
        <div className="onb-content" style={{ width: '100%', maxWidth: 640 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: ROSE, letterSpacing: '0.2em', marginBottom: 12 }}>ÉTAPE {String(step).padStart(2, '0')} / 08</div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 42, lineHeight: 0.98, letterSpacing: '0.01em', color: 'var(--text)' }}>{title}</h1>
          {sub && <p style={{ marginTop: 14, fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.6, maxWidth: 560 }}>{sub}</p>}
          <div style={{ marginTop: 30 }}>{children}</div>
          <div className="onb-footer" style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 36 }}>
            <button onClick={onBack} disabled={step === 1} style={{ padding: '15px 24px', borderRadius: 12, background: 'transparent', border: '1px solid var(--line-strong)', color: step === 1 ? 'var(--text-mute)' : 'var(--text-dim)', fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: step === 1 ? 'default' : 'pointer', opacity: step === 1 ? 0.4 : 1 }}>
              Retour
            </button>
            <button
              onClick={canNext ? onNext : undefined}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '16px 22px', borderRadius: 12, border: 'none', cursor: canNext ? 'pointer' : 'default', background: canNext ? `linear-gradient(135deg, ${ROSE}, ${ROSE2})` : 'rgba(255,255,255,0.08)', color: canNext ? '#1a0408' : 'var(--text-mute)', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: canNext ? 1 : 0.45, boxShadow: canNext ? `0 0 0 1px ${ROSE}55, 0 12px 30px -10px ${ROSE}` : 'none' }}
            >
              {nextLabel}
              {canNext && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a0408" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              )}
            </button>
            <span onClick={onNext} style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-mute)', letterSpacing: '0.08em', cursor: 'pointer' }}>
              {step === 1 ? 'Déjà connecté ✓' : 'Passer'}
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}

export { ROSE, ROSE2, COACH_STEPS }
