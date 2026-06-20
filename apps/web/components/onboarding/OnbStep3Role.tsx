'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import OnbShell from './OnbShell'
import OnbPrefill from './OnbPrefill'
import { ROLES } from '@/lib/constants'

export const ROLE_PATHS: Record<string, React.ReactNode> = {
  TOP: <><path d="M3 21h7v-7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M3 21L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
  JNG: <><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 4v3M12 17v3M4 12h3M17 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
  MID: <><path d="M3 21L21 3M3 14l7 7M10 3l11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /></>,
  ADC: <><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" /><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
  SUP: <path d="M12 3l3 6 6 1-4.5 4.5L18 21l-6-3-6 3 1.5-6.5L3 10l6-1z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />,
}

export function RoleGrid({ selected, onSelect, accent = 'var(--cyan)' }: { selected: string; onSelect: (r: string) => void; accent?: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
      {(Object.keys(ROLES) as Array<keyof typeof ROLES>).map(r => {
        const on = selected === r
        const c = ROLES[r].c
        return (
          <div key={r} onClick={() => onSelect(r)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, padding: '20px 0', borderRadius: 14, cursor: 'pointer', background: on ? `${c}1a` : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? c + '66' : 'var(--line)'}`, boxShadow: on ? `0 0 16px ${c}33` : 'none', transition: 'all 0.15s ease' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" style={{ color: on ? c : 'var(--text-dim)', flexShrink: 0 }}>{ROLE_PATHS[r]}</svg>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: on ? c : 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.06em' }}>{ROLES[r].name}</span>
          </div>
        )
      })}
    </div>
  )
}

// Style de jeu + Objectif — fusionnés ici depuis l'ex-étape « Style de jeu » (v2)
const STYLES: Array<{ label: string; color: string }> = [
  { label: 'Tryhard',   color: 'var(--rose)' },
  { label: 'Roaming',   color: 'var(--cyan)' },
  { label: 'Vocal',     color: 'var(--cyan)' },
  { label: 'Scaling',   color: 'var(--cyan)' },
  { label: 'Aggro',     color: 'var(--cyan)' },
  { label: 'Chill',     color: 'var(--cyan)' },
  { label: 'Macro',     color: 'var(--cyan)' },
  { label: 'Teamfight', color: 'var(--cyan)' },
]
const GOALS = ['Climb', 'Clash', 'Flex', 'Semi-pro']

type Props = { locale: string; step: number; steps?: readonly string[]; onDone?: () => void }

export default function OnbStep3Role({ locale, step, steps, onDone }: Props) {
  const [mainRole, setMainRole] = useState('MID')
  const [flexOn, setFlexOn] = useState(false)
  const [secondary, setSecondary] = useState<string | null>(null)
  const [styles, setStyles] = useState<string[]>(['Tryhard', 'Roaming', 'Vocal'])
  const [goals, setGoals] = useState<string[]>(['Climb', 'Clash'])
  const [hasPrefill, setHasPrefill] = useState(false)
  const router = useRouter()

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('onb_riot') ?? '{}')
      if (data?.gameName) setHasPrefill(true)
    } catch { /* ignore */ }
  }, [])

  function selectMain(r: string) {
    setMainRole(r)
    // clear secondary if it was the same role
    if (secondary === r) setSecondary(null)
  }

  function pickSecondary(r: string) {
    if (r === mainRole) return // can't pick main as secondary
    setSecondary(prev => prev === r ? null : r)
  }

  function toggleStyle(s: string) {
    setStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  function toggleGoal(g: string) {
    setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
  }

  async function handleContinue() {
    const playstyles = styles.map(s => s.toLowerCase())
    const goalsLc = goals.map(g => g.toLowerCase())
    if (typeof window !== 'undefined') {
      localStorage.setItem('onb_main_role', mainRole)
      localStorage.setItem('onb_secondary_role', secondary ?? '')
      localStorage.setItem('onb_styles', JSON.stringify({ playstyles, goals: goalsLc }))
    }
    fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 4, data: { main_role: mainRole, secondary_role: secondary ?? null, playstyles, goals: goalsLc } }),
    }).catch(() => {})
    if (onDone) onDone(); else router.push(`/onboarding/${step + 1}`)
  }

  const ALL = Object.keys(ROLES) as Array<keyof typeof ROLES>

  return (
    <OnbShell step={step} steps={steps} title="TON RÔLE & TON STYLE" sub="Le rôle que tu joues le plus, et ce qui définit ta façon de jouer — pour matcher des profils compatibles." onContinue={handleContinue} locale={locale}>
      {hasPrefill && <OnbPrefill>Ton compte Riot est lié — corrige ton rôle principal si besoin.</OnbPrefill>}

      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em' }}>RÔLE PRINCIPAL</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginTop: 12 }}>
        {ALL.map(r => {
          const on = mainRole === r
          const c = ROLES[r].c
          return (
            <div key={r} onClick={() => selectMain(r)} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, padding: '20px 0', borderRadius: 14, cursor: 'pointer', background: on ? `${c}1a` : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? c + '66' : 'var(--line)'}`, boxShadow: on ? `0 0 16px ${c}33` : 'none', transition: 'all 0.15s ease' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" style={{ color: on ? c : 'var(--text-dim)' }}>{ROLE_PATHS[r]}</svg>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: on ? c : 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.06em' }}>{ROLES[r].name}</span>
              {on && <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: c, boxShadow: `0 0 8px ${c}` }} />}
            </div>
          )
        })}
      </div>

      {/* Flex toggle */}
      <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: `1px solid ${flexOn ? 'rgba(0,224,255,0.23)' : 'var(--line)'}` }}>
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>Je peux aussi flex</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-mute)', letterSpacing: '0.06em', marginTop: 3 }}>Choisis ton rôle secondaire</div>
        </div>
        <div onClick={() => setFlexOn(v => !v)} style={{ width: 44, height: 26, borderRadius: 999, padding: 3, background: flexOn ? 'var(--cyan)' : 'rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', boxShadow: flexOn ? '0 0 12px rgba(0,224,255,0.4)' : 'none', transition: 'all 0.2s ease' }}>
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: flexOn ? '#001018' : 'rgba(255,255,255,0.4)', marginLeft: flexOn ? 18 : 0, transition: 'margin 0.2s ease', flexShrink: 0 }} />
        </div>
      </div>

      {/* Secondary role grid — revealed when flex is ON */}
      {flexOn && (
        <div style={{ marginTop: 14 }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em' }}>
            RÔLE SECONDAIRE <span style={{ color: 'var(--text-mute)' }}>· UN SEUL</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginTop: 12 }}>
            {ALL.map(r => {
              const isMain = r === mainRole
              const on = secondary === r
              const c = ROLES[r].c
              return (
                <div key={r} onClick={() => !isMain && pickSecondary(r)} title={isMain ? 'Ton rôle principal' : ''} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '14px 0', borderRadius: 12, cursor: isMain ? 'not-allowed' : 'pointer', opacity: isMain ? 0.32 : 1, background: on ? `${c}14` : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? c + '55' : 'var(--line)'}`, transition: 'all 0.15s ease' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" style={{ color: on ? c : isMain ? 'var(--text-mute)' : 'var(--text-dim)' }}>{ROLE_PATHS[r]}</svg>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: on ? c : isMain ? 'var(--text-mute)' : 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.04em' }}>
                    {isMain ? 'MAIN' : ROLES[r].name}
                  </span>
                  {on && (
                    <span style={{ position: 'absolute', top: -5, right: -5, width: 16, height: 16, borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 8px ${c}` }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#06070b" strokeWidth="4" strokeLinecap="round"><path d="M5 12l5 5L20 6" /></svg>
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {!secondary && <div style={{ marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-mute)' }}>Choisis le rôle que tu peux dépanner (un seul).</div>}
        </div>
      )}

      {/* ── STYLE DE JEU (fusionné depuis l'ex-étape « Style de jeu ») ── */}
      <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em', marginTop: 24 }}>STYLE DE JEU</label>
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 13 }}>
        {STYLES.map(({ label, color }) => {
          const on = styles.includes(label)
          return (
            <span
              key={label}
              onClick={() => toggleStyle(label)}
              style={{
                padding: '10px 16px', borderRadius: 999, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
                background: on ? `color-mix(in srgb, ${color} 12%, transparent)` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${on ? color + '66' : 'var(--line)'}`,
                color: on ? color : 'var(--text-dim)',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </span>
          )
        })}
      </div>

      {/* ── OBJECTIF ── */}
      <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em', marginTop: 24 }}>OBJECTIF</label>
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 13 }}>
        {GOALS.map(label => {
          const on = goals.includes(label)
          return (
            <span
              key={label}
              onClick={() => toggleGoal(label)}
              style={{
                padding: '10px 16px', borderRadius: 999, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
                background: on ? 'rgba(255,209,102,0.11)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${on ? 'rgba(255,209,102,0.33)' : 'var(--line)'}`,
                color: on ? 'var(--gold)' : 'var(--text-dim)',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </span>
          )
        })}
      </div>
    </OnbShell>
  )
}
