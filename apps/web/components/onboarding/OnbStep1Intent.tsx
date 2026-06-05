'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import OnbShell from './OnbShell'

const INTENTS = [
  { id: 'duo',      accent: 'var(--cyan)',   title: 'Trouver un duo',     desc: 'Un partenaire compatible pour ranked solo/duo',          icon: <path d="M7 12l-3 3 3 3M17 12l3 3-3 3M14 4l-4 16" /> },
  { id: 'team',     accent: 'var(--violet)', title: 'Rejoindre une équipe', desc: 'Intégrer un roster à 5 pour la Clash / Flex',          icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /></> },
  { id: 'coaching', accent: 'var(--rose)',   title: 'Coaching 1v1',        desc: 'Progresser avec un spécialiste — parcours dédié',      icon: <><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6M16 16l4 4" /></> },
]

type Props = { locale: string; step: number }

export default function OnbStep1Intent({ locale, step }: Props) {
  const [selected, setSelected] = useState<string>('duo')
  const router = useRouter()

  async function handleContinue() {
    if (typeof window !== 'undefined') localStorage.setItem('onb_intent', selected)
    fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 2, data: { intent: selected } }) }).catch(() => {})
    if (selected === 'coaching') {
      router.push('/onboarding/coaching?step=3')
    } else if (selected === 'team') {
      router.push('/onboarding/team?step=3')
    } else {
      router.push(`/onboarding/${step + 1}`)
    }
  }

  return (
    <OnbShell step={step} title="TU CHERCHES QUOI ?" sub="Une seule intention pour cadrer ton parcours — soit progresser en coaching, soit trouver des coéquipiers. Tu pourras explorer le reste à tout moment depuis l'app." onContinue={handleContinue} locale={locale}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {INTENTS.map(({ id, accent, title, desc, icon }) => {
          const on = selected === id
          return (
            <div key={id} onClick={() => setSelected(id)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 16, cursor: 'pointer', background: on ? `color-mix(in srgb, ${accent} 11%, transparent)` : 'rgba(255,255,255,0.025)', border: `1px solid ${on ? accent + '66' : 'var(--line)'}`, boxShadow: on ? `0 8px 22px -12px ${accent}` : 'none', transition: 'all 0.15s ease' }}>
              <div style={{ width: 50, height: 50, borderRadius: 13, flexShrink: 0, background: on ? `${accent}1f` : 'rgba(255,255,255,0.04)', border: `1px solid ${on ? accent + '55' : 'var(--line)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={on ? accent : 'var(--text-dim)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, color: 'var(--text)', letterSpacing: '0.02em' }}>{title}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-dim)', marginTop: 3 }}>{desc}</div>
              </div>
              {/* Radio indicator */}
              <span style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, border: `2px solid ${on ? accent : 'var(--line-strong)'}`, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {on && <span style={{ width: 11, height: 11, borderRadius: '50%', background: accent, display: 'block' }} />}
              </span>
            </div>
          )
        })}
      </div>

      {/* Info note */}
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 9, padding: '12px 15px', borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid var(--line)' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
        </svg>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-mute)' }}>
          Coaching et Duo/Flex ont des questions différentes — on ne te fait <b style={{ color: 'var(--text-dim)' }}>qu'un seul parcours</b>. Le reste s'ouvre depuis l'app, sans tout refaire.
        </span>
      </div>
    </OnbShell>
  )
}
