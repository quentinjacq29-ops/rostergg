'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SavingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dest = searchParams.get('dest') ?? '/duo'
  const [status, setStatus] = useState<'saving' | 'error'>('saving')

  useEffect(() => {
    async function saveAll() {
      try {
        // 1. Link Riot account (now authenticated)
        const riotRaw = localStorage.getItem('onb_riot')
        if (riotRaw) {
          const riot = JSON.parse(riotRaw) as {
            gameName: string; tagLine: string; platform: string;
            puuid?: string; tier?: string; rank?: string; lp?: number; level?: number
          }
          if (riot.gameName && riot.tagLine) {
            await fetch('/api/riot/link', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ gameName: riot.gameName, tagLine: riot.tagLine, platform: riot.platform ?? 'euw1' }),
            })
          }
        }

        // 2. Save matching prefs: languages
        const langs = localStorage.getItem('onb_langs')
        if (langs) {
          await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 3, data: { languages: JSON.parse(langs) } }) })
        }

        // 3. Save roles
        const mainRole = localStorage.getItem('onb_main_role')
        const secondaryRole = localStorage.getItem('onb_secondary_role') || null
        if (mainRole) {
          await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 4, data: { main_role: mainRole, secondary_role: secondaryRole || null } }) })
        }

        // 4. Save availability
        const availRaw = localStorage.getItem('onb_availability')
        if (availRaw) {
          await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 8, data: { availability: JSON.parse(availRaw) } }) })
        }

        // 5. Save intent-specific prefs (style or team_prefs)
        const intent = localStorage.getItem('onb_intent')
        const stylesRaw = localStorage.getItem('onb_styles')
        const teamPrefsRaw = localStorage.getItem('onb_team_prefs')
        if (intent !== 'team' && stylesRaw) {
          const { playstyles, goals } = JSON.parse(stylesRaw)
          await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 7, data: { playstyles, goals } }) })
        }
        if (intent === 'team' && teamPrefsRaw) {
          await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 'team', data: { team_prefs: JSON.parse(teamPrefsRaw) } }) })
        }

        // 6. Clear onboarding data
        const keys = ['onb_riot', 'onb_intent', 'onb_main_role', 'onb_secondary_role', 'onb_champion_pool', 'onb_langs', 'onb_styles', 'onb_team_prefs', 'onb_availability']
        keys.forEach(k => localStorage.removeItem(k))

        router.push(dest as '/')
      } catch {
        setStatus('error')
      }
    }

    saveAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        {status === 'saving' ? (
          <>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(0,224,255,0.1)', border: '1px solid rgba(0,224,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.16em' }}>SAUVEGARDE DE TON PROFIL…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--rose)', marginBottom: 16 }}>Une erreur est survenue. Réessaie.</p>
            <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, var(--cyan), var(--violet))', color: '#001018', fontFamily: 'var(--font-display)', fontSize: 13, cursor: 'pointer', letterSpacing: '0.1em' }}>
              Réessayer
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function SavingPage() {
  return <Suspense><SavingContent /></Suspense>
}
