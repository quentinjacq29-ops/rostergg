import { Suspense } from 'react'
import TeamWizard from '@/components/onboarding/TeamWizard'

type Props = { params: { locale: string } }

export default function TeamOnboardingPage({ params: { locale } }: Props) {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Suspense>
        <TeamWizard locale={locale} />
      </Suspense>
    </div>
  )
}
