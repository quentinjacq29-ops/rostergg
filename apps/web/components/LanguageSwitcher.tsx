'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  function switchLocale() {
    const next = routing.locales.find(l => l !== locale) ?? 'fr'
    router.replace(pathname, { locale: next })
  }

  return (
    <button
      onClick={switchLocale}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--text-dim)', letterSpacing: '0.1em',
        cursor: 'pointer', background: 'none', border: 'none', padding: 0,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
      </svg>
      {locale.toUpperCase()}
    </button>
  )
}
