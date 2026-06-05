'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function FinishForm() {
  const searchParams = useSearchParams()
  const dest = searchParams.get('dest') ?? '/duo'

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
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding/saving&dest=${encodeURIComponent(dest)}`,
      },
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 40 }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(150deg, var(--surface), var(--void))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1), 0 0 16px rgba(0,224,255,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
              <path d="M9 9 L20 24 L9 39" stroke="var(--cyan)" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M39 9 L28 24 L39 39" stroke="var(--violet)" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="24" cy="24" r="4.6" fill="var(--cyan)" />
            </svg>
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '0.04em' }}>ROSTER<span style={{ color: 'var(--cyan)' }}>GG</span></span>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--live)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" /></svg>
            </div>
            <h1 style={{ margin: '0 0 12px', fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--text)', letterSpacing: '0.02em' }}>EMAIL ENVOYÉ !</h1>
            <p style={{ margin: 0, color: 'var(--text-dim)', lineHeight: 1.6, fontSize: 15 }}>
              Vérifie <b style={{ color: 'var(--text)' }}>{email}</b>.<br />Clique sur le lien pour activer ton compte et accéder à l'app.
            </p>
            <p style={{ marginTop: 20, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-mute)', letterSpacing: '0.08em' }}>
              PAS REÇU ? VÉRIFIE TES SPAMS OU RENVOIE CI-DESSOUS.
            </p>
            <button onClick={() => setSent(false)} style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', letterSpacing: '0.1em' }}>
              Renvoyer →
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', letterSpacing: '0.2em', marginBottom: 12 }}>DERNIÈRE ÉTAPE</div>
              <h1 style={{ margin: '0 0 14px', fontFamily: 'var(--font-display)', fontSize: 38, lineHeight: 0.96, color: 'var(--text)', letterSpacing: '0.01em' }}>CRÉE TON COMPTE</h1>
              <p style={{ margin: 0, color: 'var(--text-dim)', lineHeight: 1.6, fontSize: 15 }}>
                Entre ton email pour recevoir un lien de connexion. Pas de mot de passe — c'est tout.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', height: 54, padding: '0 18px', borderRadius: 13, background: 'rgba(255,255,255,0.04)', border: `1px solid ${email ? 'rgba(0,224,255,0.33)' : 'var(--line)'}`, transition: 'border-color 0.15s' }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  required
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text)' }}
                />
              </div>

              {error && (
                <div style={{ padding: '11px 15px', borderRadius: 11, background: 'rgba(255,61,110,0.08)', border: '1px solid rgba(255,61,110,0.25)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--rose)' }}>{error}</div>
              )}

              <button type="submit" disabled={loading || !email} style={{ height: 54, borderRadius: 13, border: 'none', cursor: loading || !email ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, var(--cyan), var(--violet))', color: '#001018', fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, opacity: loading || !email ? 0.5 : 1, boxShadow: loading || !email ? 'none' : '0 0 0 1px rgba(0,224,255,0.4), 0 12px 30px -10px rgba(0,224,255,0.5)' }}>
                {loading ? 'Envoi…' : 'Recevoir mon lien de connexion'}
              </button>
            </form>

            <p style={{ marginTop: 20, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-mute)', letterSpacing: '0.06em', lineHeight: 1.5 }}>
              Un lien sécurisé est envoyé à ton email. Pas de mot de passe, pas d'inscription longue.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function FinishPage() {
  return (
    <Suspense>
      <FinishForm />
    </Suspense>
  )
}
