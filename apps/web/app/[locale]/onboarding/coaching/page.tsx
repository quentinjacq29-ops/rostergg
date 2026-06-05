import { Suspense } from 'react'
import CoachingWizard from '@/components/onboarding/CoachingWizard'

export default function CoachingOnboardingPage() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Suspense>
        <CoachingWizard />
      </Suspense>
    </div>
  )
}
