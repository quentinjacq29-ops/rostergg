import { redirect } from 'next/navigation'

type Props = { params: { locale: string } }

export default function OnboardingIndex({ params: { locale } }: Props) {
  redirect(`/${locale}/onboarding/1`)
}
