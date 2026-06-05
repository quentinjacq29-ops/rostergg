'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import OnbShell from './OnbShell'

const STYLES: Array<{ label: string; color: string }> = [
  { label: 'Tryhard',    color: 'var(--rose)' },
  { label: 'Roaming',    color: 'var(--cyan)' },
  { label: 'Vocal',      color: 'var(--cyan)' },
  { label: 'Scaling',    color: 'var(--cyan)' },
  { label: 'Aggro',      color: 'var(--cyan)' },
  { label: 'Chill',      color: 'var(--cyan)' },
  { label: 'Macro',      color: 'var(--cyan)' },
  { label: 'Teamfight',  color: 'var(--cyan)' },
]

const GOALS: Array<{ label: string }> = [
  { label: 'Climb' },
  { label: 'Clash' },
  { label: 'Flex' },
  { label: 'Semi-pro' },
]

type Props = { locale: string; step: number }

export default function OnbStep6Style({ locale, step }: Props) {
  const [styles, setStyles] = useState<string[]>(['Tryhard', 'Roaming', 'Vocal'])
  const [goals, setGoals] = useState<string[]>(['Climb', 'Clash'])
  const router = useRouter()

  function toggleStyle(s: string) {
    setStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function toggleGoal(g: string) {
    setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
  }

  async function handleContinue() {
    if (typeof window !== 'undefined') localStorage.setItem('onb_styles', JSON.stringify({ playstyles: styles.map(s => s.toLowerCase()), goals: goals.map(g => g.toLowerCase()) }))
    fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 7, data: { playstyles: styles.map(s => s.toLowerCase()), goals: goals.map(g => g.toLowerCase()) } }),
    }).catch(() => {})
    router.push(`/onboarding/${step + 1}`)
  }

  return (
    <OnbShell
      step={step}
      title="TON STYLE DE JEU"
      sub="Ce qui définit ta façon de jouer — pour matcher des profils compatibles."
      onContinue={handleContinue}
      continueDisabled={styles.length === 0 && goals.length === 0}
      locale={locale}
    >
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em' }}>STYLE</label>
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

      <label style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)',
        letterSpacing: '0.18em', display: 'block', marginTop: 24,
      }}>
        OBJECTIF
      </label>
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 13 }}>
        {GOALS.map(({ label }) => {
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
