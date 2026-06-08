'use client'
// Gère le flow implicite (magic link → hash #access_token=...)
// Le route.ts gère le flow PKCE (?code=...), cette page gère le reste.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash
    if (!hash) { router.replace('/fr/login?error=no_token'); return }

    const params = new URLSearchParams(hash.slice(1))
    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (!accessToken || !refreshToken) {
      router.replace('/fr/login?error=invalid_token')
      return
    }

    const supabase = createClient()
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) { router.replace('/fr/login?error=session_error'); return }
        // Récupérer next depuis l'URL (avant le hash)
        const next = new URLSearchParams(window.location.search).get('next') ?? '/duo'
        router.replace(`/fr${next}`)
      })
  }, [router])

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0a0c14' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#00e0ff', letterSpacing: '0.24em' }}>
        ◢ CONNEXION EN COURS…
      </div>
    </div>
  )
}
