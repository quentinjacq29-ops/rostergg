'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DuoRequestModal, { type DuoRequestTarget, type DuoRequestMe } from '@/components/duo/DuoRequestModal'

const T = {
  cyan: '#00e0ff', violet: '#8b5cf6', live: '#00ff9d',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

export default function SendDuoRequestButton({ target }: { target: DuoRequestTarget & { profileId: string } }) {
  const router = useRouter()
  const [showModal, setShowModal]         = useState(false)
  const [me, setMe]                       = useState<DuoRequestMe | null>(null)
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'accepted'>('none')
  const [reqId, setReqId]                 = useState<string | null>(null)
  const [incoming, setIncoming]           = useState(false)   // la demande vient de LUI (je suis destinataire)
  const [responding, setResponding]       = useState(false)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profile }, { data: req }] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name, riot_accounts(game_name, ranks(tier, division, league_points, queue)), matching_prefs(main_roles)')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('duo_requests')
          .select('id, from_profile, to_profile, status')
          .or(`and(from_profile.eq.${user.id},to_profile.eq.${target.profileId}),and(from_profile.eq.${target.profileId},to_profile.eq.${user.id})`)
          .in('status', ['pending', 'accepted'])
          .maybeSingle(),
      ])

      if (profile) {
        const ra   = (profile as any).riot_accounts
        const mp   = (profile as any).matching_prefs
        const solo = (ra?.ranks ?? []).find((r: any) => r.queue === 'RANKED_SOLO_5x5') ?? null
        setMe({
          name: ra?.game_name ?? (profile as any).display_name ?? 'MOI',
          role: mp?.main_roles?.[0] ?? null,
          rank: solo?.tier?.toLowerCase() ?? null,
          tier: solo?.division ?? null,
          lp:   solo?.league_points ?? null,
        })
      }
      if (req) {
        setRequestStatus(req.status as 'pending' | 'accepted')
        setReqId((req as any).id)
        setIncoming((req as any).to_profile === user.id)
      }
    })()
  }, [target.profileId])

  async function handleConfirm(message: string) {
    const res = await fetch('/api/duo/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_profile: target.profileId, match_score: target.match, message }),
    })
    if (res.ok) {
      setRequestStatus('pending')
      setIncoming(false) // je viens d'envoyer → demande sortante
      setShowModal(false)
    } else {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error ?? 'Erreur envoi')
    }
  }

  // Répondre à une demande REÇUE depuis la page profil (accepter / refuser)
  async function respond(action: 'accept' | 'decline') {
    if (!reqId || responding) return
    setResponding(true)
    const res = await fetch('/api/duo/respond', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: reqId, action }),
    })
    setResponding(false)
    if (!res.ok) return
    if (action === 'accept') setRequestStatus('accepted')
    else { setRequestStatus('none'); setReqId(null); setIncoming(false) }
    router.refresh()
  }

  // ── État : duo accepté → chat ouvert
  if (requestStatus === 'accepted') {
    return (
      <button
        onClick={() => router.push('/fr/inbox')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.live}, ${T.cyan})`, color: '#001018', fontFamily: T.display, fontSize: 14, letterSpacing: '0.1em', fontWeight: 700 }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="2.8" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
        Duo actif · Inbox
      </button>
    )
  }

  // ── État : demande REÇUE (il m'a envoyé) → accepter / refuser
  if (requestStatus === 'pending' && incoming) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => respond('accept')} disabled={responding}
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', borderRadius: 12, border: 'none', cursor: responding ? 'default' : 'pointer', background: `linear-gradient(135deg, ${T.live}, ${T.cyan})`, color: '#001018', fontFamily: T.display, fontSize: 14, letterSpacing: '0.08em', fontWeight: 700, opacity: responding ? 0.6 : 1 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="2.8" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
            Accepter la demande
          </button>
          <button onClick={() => respond('decline')} disabled={responding}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.lineStrong}`, color: T.textDim, cursor: responding ? 'default' : 'pointer', fontFamily: T.display, fontSize: 13, letterSpacing: '0.08em', opacity: responding ? 0.6 : 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            Refuser
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 2 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.1em' }}>
            CE JOUEUR T&apos;A ENVOYÉ UNE DEMANDE
          </span>
        </div>
      </div>
    )
  }

  // ── États : none + pending (sortante) → deux CTA + label lock
  const isPending = requestStatus === 'pending'
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
        {/* Bouton principal */}
        {isPending ? (
          <button disabled style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 22px', borderRadius: 12, border: `1px solid rgba(255,255,255,0.12)`, cursor: 'not-allowed', background: 'rgba(255,255,255,0.06)', color: T.textDim, fontFamily: T.display, fontSize: 14, letterSpacing: '0.1em' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
            Demande envoyée
          </button>
        ) : (
          <button
            onClick={() => me ? setShowModal(true) : router.push('/login')}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: '#001018', fontFamily: T.display, fontSize: 14, letterSpacing: '0.1em', fontWeight: 700, boxShadow: `0 12px 32px -12px ${T.cyan}` }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            Send duo request
          </button>
        )}

        {/* Bouton ghost "Message" — ouvre la même modale */}
        <button
          onClick={() => me ? setShowModal(true) : router.push('/login')}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 22px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.lineStrong}`, color: T.text, cursor: 'pointer', fontFamily: T.display, fontSize: 13, letterSpacing: '0.1em' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 01-11.5 7.2L4 21l1.8-5.5A8 8 0 1121 12z"/></svg>
          Message
        </button>

        {/* Label verrou */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 2 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.1em' }}>
            CHAT DÉBLOQUÉ APRÈS ACCEPTATION
          </span>
        </div>
      </div>

      {showModal && me && (
        <DuoRequestModal
          target={target}
          me={me}
          onConfirm={handleConfirm}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
