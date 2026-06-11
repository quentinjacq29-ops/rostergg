'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DuoRequestModal, { type DuoRequestTarget, type DuoRequestMe } from '@/components/duo/DuoRequestModal'

const T = {
  cyan: '#00e0ff', violet: '#8b5cf6', text: '#f4f6ff', textDim: '#9aa2bf',
  line: 'rgba(255,255,255,0.12)', display: 'var(--font-display)', body: 'var(--font-body)',
}

export default function SendDuoRequestButton({ target }: { target: DuoRequestTarget }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [me, setMe] = useState<DuoRequestMe | null>(null)
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'accepted'>('none')

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profile }, { data: req }] = await Promise.all([
        supabase.from('profiles').select('display_name, riot_accounts(game_name, ranks(tier, division, league_points, queue)), matching_prefs(main_roles)').eq('id', user.id).maybeSingle(),
        supabase.from('duo_requests').select('status').or(`from_profile.eq.${user.id},to_profile.eq.${user.id}`).in('status', ['pending', 'accepted']).maybeSingle(),
      ])

      if (profile) {
        const ra = (profile as any).riot_accounts
        const mp = (profile as any).matching_prefs
        const solo = (ra?.ranks ?? []).find((r: any) => r.queue === 'RANKED_SOLO_5x5') ?? null
        setMe({
          name: ra?.game_name ?? (profile as any).display_name ?? 'MOI',
          role: mp?.main_roles?.[0] ?? null,
          rank: solo?.tier?.toLowerCase() ?? null,
          tier: solo?.division ?? null,
          lp:   solo?.league_points ?? null,
        })
      }
      if (req) setRequestStatus(req.status as 'pending' | 'accepted')
    })()
  }, [])

  async function handleConfirm(message: string) {
    const res = await fetch('/api/duo/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_profile: (target as any).profileId, match_score: target.match, message }),
    })
    if (res.ok) {
      setRequestStatus('pending')
      setShowModal(false)
    } else {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error ?? 'Erreur envoi')
    }
  }

  if (requestStatus === 'accepted') {
    return (
      <button onClick={() => router.push('/inbox')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, #00ff9d, ${T.cyan})`, color: '#001018', fontFamily: T.display, fontSize: 14, letterSpacing: '0.1em', fontWeight: 700 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="2.8" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
        Duo actif · Inbox
      </button>
    )
  }

  if (requestStatus === 'pending') {
    return (
      <button disabled style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 22px', borderRadius: 12, border: `1px solid rgba(255,255,255,0.12)`, cursor: 'not-allowed', background: 'rgba(255,255,255,0.06)', color: T.textDim, fontFamily: T.display, fontSize: 14, letterSpacing: '0.1em' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff9d" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
        Demande envoyée
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => me ? setShowModal(true) : router.push('/login')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: '#001018', fontFamily: T.display, fontSize: 14, letterSpacing: '0.1em', fontWeight: 700, boxShadow: `0 12px 32px -12px ${T.cyan}` }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        Send duo request
      </button>
      {showModal && me && (
        <DuoRequestModal target={target} me={me} onConfirm={handleConfirm} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}
