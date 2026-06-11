'use client'
// Gère le flow implicite (magic link → #access_token=...)
// Appelé quand redirect_to pointe sur /{locale}/auth/callback
// setSession côté client = pose cookies + localStorage → toutes les requêtes Supabase authentifiées
import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LocaleAuthCallbackPage() {
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()

  useEffect(() => {
    const hash = window.location.hash
    if (!hash) { router.replace(`/${locale}/login?error=no_token`); return }

    const params = new URLSearchParams(hash.slice(1))
    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (!accessToken || !refreshToken) {
      router.replace(`/${locale}/login?error=invalid_token`)
      return
    }

    const supabase = createClient()
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(async ({ error }) => {
        if (error) { router.replace(`/${locale}/login?error=session_error`); return }
        // Vérifie si l'onboarding est complété
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace(`/${locale}/login?error=no_user`); return }
        const { data: prefs } = await supabase
          .from('matching_prefs').select('profile_id')
          .eq('profile_id', user.id).maybeSingle()
        router.replace(`/${locale}/${prefs ? 'duo' : 'onboarding/1'}`)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0a0c14' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#00e0ff', letterSpacing: '0.24em' }}>
        ◢ CONNEXION EN COURS…
      </div>
    </div>
  )
}
