import type { ReactNode } from 'react'
import type { Metadata } from 'next'

// Onboarding est post-login / transitoire → jamais indexé (cf. handoff fin onboarding §4.4)
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

// Onboarding has no app shell — full-screen wizard
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {children}
    </div>
  )
}
