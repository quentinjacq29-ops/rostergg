'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import OnbStep1Riot from './OnbStep1Riot'
import OnbStep1Intent from './OnbStep1Intent'
import OnbStep2Langs from './OnbStep2Langs'
import OnbStep3Role from './OnbStep3Role'
import OnbStep5Champs from './OnbStep5Champs'
import OnbStep7Availability from './OnbStep7Availability'
import TeamFitStep, { TEAM_STEPS, type TeamFitData } from './TeamFitStep'

// Team wizard — 7 steps, distinct from duo (no "Rôle recherché", no "Style de jeu")
// 1 Riot · 2 Intent · 3 Langues · 4 Rôles · 5 Champions · 6 Ce que tu cherches · 7 Dispo → /teams

type Props = { locale: string }

export default function TeamWizard({ locale }: Props) {
  const searchParams = useSearchParams()
  const initialStep = (() => {
    const s = parseInt(searchParams.get('step') ?? '1', 10)
    return isNaN(s) || s < 1 || s > 7 ? 1 : s
  })()

  const [step, setStep] = useState(initialStep)
  const [teamFit, setTeamFit] = useState<TeamFitData>({ formats: ['clash', 'flex'], commitment: 'regular', goal: 'progresser' })
  const router = useRouter()

  const next = () => setStep(s => Math.min(7, s + 1))
  const back = () => setStep(s => Math.max(1, s - 1))

  function finish() {
    if (typeof window !== 'undefined') localStorage.setItem('onb_team_prefs', JSON.stringify(teamFit))
    router.push('/onboarding/finish?dest=/teams')
  }

  switch (step) {
    case 1: return <OnbStep1Riot locale={locale} step={1} />
    case 2: return <OnbStep1Intent locale={locale} step={2} />
    case 3: return <OnbStep2Langs locale={locale} step={3} steps={TEAM_STEPS} onDone={next} />
    case 4: return <OnbStep3Role  locale={locale} step={4} steps={TEAM_STEPS} onDone={next} />
    case 5: return <OnbStep5Champs locale={locale} step={5} steps={TEAM_STEPS} onDone={next} />
    case 6: return <TeamFitStep step={6} locale={locale} data={teamFit} onChange={setTeamFit} onContinue={next} onBack={back} />
    case 7: return <OnbStep7Availability locale={locale} step={7} steps={TEAM_STEPS} onDone={finish} />
    default: return null
  }
}
