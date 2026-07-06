import { notFound } from 'next/navigation'
import UatLoginForm from './UatLoginForm'

// Gate serveur — piloté UNIQUEMENT par ENABLE_UAT_LOGIN (backdoor bêta,
// protégé en plus par le Basic Auth du middleware en prod).
// ⚠️ Mettre ENABLE_UAT_LOGIN=false (ou retirer la var) avant lancement public.
export default function UatLoginPage() {
  if (process.env.ENABLE_UAT_LOGIN !== 'true') {
    notFound()
  }
  return <UatLoginForm />
}
