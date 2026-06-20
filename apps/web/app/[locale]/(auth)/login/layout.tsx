import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// Page publique indexable (SEO) — auth sans mot de passe via Riot
export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connecte-toi à RosterGG avec ton compte Riot — sans mot de passe. Retrouve tes duos, tes équipes et tes demandes sur League of Legends.',
  robots: { index: true, follow: true },
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children
}
