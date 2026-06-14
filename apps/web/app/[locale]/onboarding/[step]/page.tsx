import { redirect } from 'next/navigation'
import OnbStep1Riot from '@/components/onboarding/OnbStep1Riot'
import OnbStep2Intent from '@/components/onboarding/OnbStep1Intent'
import OnbStep3Langs from '@/components/onboarding/OnbStep2Langs'
import OnbStep4Role from '@/components/onboarding/OnbStep3Role'
import OnbStep5Looking from '@/components/onboarding/OnbStep4Looking'
import OnbStep6Champs from '@/components/onboarding/OnbStep5Champs'
import OnbStep7Availability from '@/components/onboarding/OnbStep7Availability'

type Props = { params: { locale: string; step: string } }

export default function OnboardingStepPage({ params: { locale, step } }: Props) {
  const n = parseInt(step, 10)
  if (isNaN(n) || n < 1 || n > 7) redirect(`/${locale}/onboarding/1`)

  const props = { locale, step: n }
  switch (n) {
    case 1: return <OnbStep1Riot {...props} />
    case 2: return <OnbStep2Intent {...props} />
    case 3: return <OnbStep3Langs {...props} />
    case 4: return <OnbStep4Role {...props} />
    case 5: return <OnbStep5Looking {...props} />
    case 6: return <OnbStep6Champs {...props} />
    case 7: return <OnbStep7Availability {...props} />
    default: redirect(`/${locale}/onboarding/1`)
  }
}
