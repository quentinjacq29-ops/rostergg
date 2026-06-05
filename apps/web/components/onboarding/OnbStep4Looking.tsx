'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import OnbShell from './OnbShell'
import { ROLES } from '@/lib/constants'
import { RoleGrid, ROLE_PATHS } from './OnbStep3Role'

const COMBO_HINTS: Partial<Record<string, Partial<Record<string, string>>>> = {
  MID: { JNG: 'MID + Jungle — synergie de roam très demandée.', SUP: 'MID + Support — contrôle de vision et TP sync.' },
  ADC: { SUP: 'ADC + Support — le duo Bot classique.', JNG: 'ADC + Jungle — pression early botside.' },
  JNG: { MID: 'Jungle + MID — duo skirmish dominant.', TOP: 'Jungle + TOP — pression toplane et Rift.' },
  TOP: { JNG: 'TOP + Jungle — snowball island strategy.', MID: 'TOP + MID — TP flanks et présence.' },
  SUP: { ADC: 'Support + ADC — peel ou poke en duo Bot.', MID: 'Support + MID — roam agressif early.' },
}

type Props = { locale: string; step: number }

export default function OnbStep4Looking({ locale, step }: Props) {
  const [looking, setLooking] = useState('JNG')
  const [mainRole, setMainRole] = useState('MID')
  const router = useRouter()

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('onb_main_role') : null
    if (stored) setMainRole(stored)
  }, [])

  async function handleContinue() {
    fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 5, data: { looking_for_roles: [looking] } }),
    }).catch(() => {})
    router.push(`/onboarding/${step + 1}`)
  }

  const hint = COMBO_HINTS[mainRole]?.[looking]
  const myColor = ROLES[mainRole as keyof typeof ROLES]?.c ?? 'var(--cyan)'
  const theirColor = ROLES[looking as keyof typeof ROLES]?.c ?? 'var(--violet)'

  return (
    <OnbShell
      step={step}
      title="TU CHERCHES QUEL RÔLE ?"
      sub="Le rôle de ton futur duo — complémentaire au tien."
      onContinue={handleContinue}
      continueAccent="var(--violet)"
      locale={locale}
    >
      <RoleGrid selected={looking} onSelect={setLooking} accent="var(--violet)" />

      <div style={{
        marginTop: 18, padding: '14px 16px', borderRadius: 12,
        background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)',
        display: 'flex', alignItems: 'center', gap: 11,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" style={{ color: myColor, flexShrink: 0 }}>
          {ROLE_PATHS[mainRole]}
        </svg>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-mute)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
        <svg width="18" height="18" viewBox="0 0 24 24" style={{ color: theirColor, flexShrink: 0 }}>
          {ROLE_PATHS[looking]}
        </svg>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-dim)' }}>
          {hint ?? (
            <>Combo <b style={{ color: 'var(--text)' }}>{mainRole} + {looking}</b></>
          )}
        </span>
      </div>
    </OnbShell>
  )
}
