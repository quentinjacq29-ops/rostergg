import type { ReactNode } from 'react'

// Onboarding has no app shell — full-screen wizard
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {children}
    </div>
  )
}
