import { notFound } from 'next/navigation'
import UatLoginForm from './UatLoginForm'

// Gate serveur — jamais rendu en prod
export default function UatLoginPage() {
  if (
    process.env.ENABLE_UAT_LOGIN !== 'true' ||
    process.env.NODE_ENV === 'production'
  ) {
    notFound()
  }
  return <UatLoginForm />
}
