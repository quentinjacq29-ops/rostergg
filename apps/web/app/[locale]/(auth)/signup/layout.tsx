import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// Porte SEO : page publique indexable, pas de formulaire — entrée via Riot
export const metadata: Metadata = {
  title: 'Inscription',
  description: "Crée ton compte RosterGG avec Riot — pas de mot de passe, pas de formulaire. Trouve ton duo, ton équipe ou ton coach sur League of Legends.",
  robots: { index: true, follow: true },
}

export default function SignupLayout({ children }: { children: ReactNode }) {
  return children
}
