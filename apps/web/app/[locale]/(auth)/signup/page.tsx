'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding/1`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 mb-4 inline-block">
            ← RosterGG
          </Link>
          <h1 className="text-2xl font-bold text-white">{t('signup.title')}</h1>
          <p className="text-zinc-400 text-sm">{t('signup.subtitle')}</p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-emerald-800 bg-emerald-950/50 p-4">
            <p className="text-emerald-400 text-sm">{t('login.sent', { email })}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm text-zinc-400">
                {t('login.emailLabel')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
                required
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-duo focus:outline-none transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-duo px-4 py-3 font-semibold text-zinc-950 hover:bg-duo/90 disabled:opacity-50 transition-colors"
            >
              {loading ? t('common.loading') : t('signup.submit')}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-zinc-500">
          {t('signup.hasAccount')}{' '}
          <Link href="/login" className="text-duo hover:underline">
            {t('signup.loginLink')}
          </Link>
        </p>
      </div>
    </main>
  )
}
