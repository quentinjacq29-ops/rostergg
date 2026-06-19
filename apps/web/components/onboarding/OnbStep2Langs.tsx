'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import OnbShell from './OnbShell'
import { LANGS } from '@/lib/constants'

const LANG_COLORS: Record<string, string> = {
  fr: '#5b8def',
  en: '#e85a5a',
  es: '#ffb547',
  de: '#3ddc97',
  it: '#8b5cf6',
  pt: '#ff6a4d',
}

type Props = { locale: string; step: number; steps?: readonly string[]; onDone?: () => void }

export default function OnbStep2Langs({ locale, step, steps, onDone }: Props) {
  const [selected, setSelected] = useState<string[]>(['fr'])
  const router = useRouter()

  function toggle(code: string) {
    setSelected(prev =>
      prev.includes(code)
        ? prev.length > 1 ? prev.filter(x => x !== code) : prev
        : [...prev, code]
    )
  }

  async function handleContinue() {
    fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 3, data: { languages: selected } }),
    }).catch(() => {})
    if (typeof window !== 'undefined') localStorage.setItem('onb_langs', JSON.stringify(selected))
    if (onDone) onDone(); else router.push(`/onboarding/${step + 1}`)
  }

  return (
    <OnbShell
      step={step}
      steps={steps}
      title="QUELLES LANGUES ?"
      sub="On te matche en priorité avec des joueurs qui parlent tes langues."
      onContinue={handleContinue}
      continueDisabled={selected.length === 0}
      locale={locale}
    >
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em' }}>
        SÉLECTIONNE TES LANGUES
      </label>
      <div className="onb-lang-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 14 }}>
        {LANGS.map(({ code, name }) => {
          const on = selected.includes(code)
          const c = LANG_COLORS[code] ?? 'var(--cyan)'
          return (
            <div
              key={code}
              onClick={() => toggle(code)}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '14px 16px', borderRadius: 13, cursor: 'pointer',
                background: on ? `color-mix(in srgb, ${c} 9%, transparent)` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${on ? c + '55' : 'var(--line)'}`,
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 8px', borderRadius: 6,
                background: on ? `${c}22` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${on ? c + '66' : 'var(--line)'}`,
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                color: on ? c : 'var(--text)', letterSpacing: '0.1em',
                flexShrink: 0,
              }}>
                <span style={{
                  width: 4, height: 4, borderRadius: '50%', background: c,
                  boxShadow: on ? `0 0 4px ${c}` : 'none', display: 'inline-block', flexShrink: 0,
                }} />
                {code.toUpperCase()}
              </span>
              <span style={{
                flex: 1, fontFamily: 'var(--font-body)', fontSize: 14,
                color: on ? 'var(--text)' : 'var(--text-dim)', fontWeight: on ? 600 : 400,
              }}>
                {name}
              </span>
              {on && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5L20 6" />
                </svg>
              )}
            </div>
          )
        })}
      </div>
      {selected.length > 0 && (
        <div style={{
          marginTop: 20, padding: '13px 16px', borderRadius: 12,
          background: 'rgba(0,224,255,0.06)', border: '1px solid rgba(0,224,255,0.2)',
          fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-dim)',
        }}>
          <b style={{ color: 'var(--cyan)' }}>{LANGS.find(l => l.code === selected[0])?.name}</b> est ta langue principale — elle pèse le plus dans le matching.
        </div>
      )}
    </OnbShell>
  )
}
