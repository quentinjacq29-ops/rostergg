'use client'
// Chrome mobile de la page profil /u/:riotId — nav (haut) + barre CTA sticky (bas).
// Connecté : ‹ Retour · ⋯ (MoreMenu) + CTA actifs (DuoRequestModal).
// Invité : Connexion · S'inscrire + CTA en login-wall (→ /login, /signup).
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import DuoRequestModal, { type DuoRequestTarget, type DuoRequestMe } from '@/components/duo/DuoRequestModal'
import MoreMenu, { type OverlayTarget } from '@/components/overlays/MoreMenu'
import ReportModal from '@/components/overlays/ReportModal'

const T = {
  bg: '#0a0c14',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6', live: '#00ff9d',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

// ── Nav haut (sticky) ─────────────────────────────────────────────────────────
export function ProfileMobileNav({ authed, more }: { authed: boolean; more: OverlayTarget | null }) {
  const router = useRouter()
  const [panel, setPanel] = useState<'more' | 'report' | null>(null)
  const [bookmarked, setBookmarked] = useState(more?.isBookmarked ?? false)

  return (
    <nav className="rgg-pp-mobile-nav" style={{ position: 'sticky', top: 0, zIndex: 40, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', minHeight: 56, boxSizing: 'border-box', background: 'rgba(8,10,16,0.9)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${T.line}` }}>
      {authed ? (
        <>
          <button onClick={() => router.back()} aria-label="Retour" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 6px', background: 'none', border: 'none', cursor: 'pointer', color: T.textDim, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.06em' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            RETOUR
          </button>
          <span style={{ margin: '0 auto', fontFamily: T.mono, fontSize: 11, color: T.textDim, letterSpacing: '0.16em' }}>PROFIL JOUEUR</span>
          {more ? (
            <button onClick={() => setPanel('more')} aria-label="Plus" style={{ width: 40, height: 40, borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.lineStrong}`, color: T.textDim, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
            </button>
          ) : <span style={{ width: 40, flexShrink: 0 }} />}
        </>
      ) : (
        <>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(150deg, #0f121c, #06070b)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1), 0 0 12px rgba(0,224,255,0.22)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="17" height="17" viewBox="0 0 48 48" fill="none"><path d="M9 9 L20 24 L9 39" stroke="#00e0ff" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M39 9 L28 24 L39 39" stroke="#8b5cf6" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="24" cy="24" r="4.6" fill="#00e0ff" /></svg>
            </span>
            <span style={{ fontFamily: T.display, fontSize: 16, letterSpacing: '0.03em', color: T.text }}>ROSTER<span style={{ color: T.cyan }}>GG</span></span>
          </Link>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Link href="/login" style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 12px', borderRadius: 9, textDecoration: 'none', color: T.textDim, border: `1px solid ${T.lineStrong}` }}>Connexion</Link>
            <Link href="/signup" style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 12px', borderRadius: 9, textDecoration: 'none', color: '#001018', background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, fontWeight: 700 }}>S&apos;inscrire</Link>
          </div>
        </>
      )}

      {panel === 'more' && more && (
        <MoreMenu target={{ ...more, isBookmarked: bookmarked }} isBookmarked={bookmarked} onBookmarkChange={setBookmarked} onReport={() => setPanel('report')} onBlock={() => setPanel(null)} onClose={() => setPanel(null)} />
      )}
      {panel === 'report' && more && (
        <ReportModal targetId={more.profileId} displayName={more.displayName} onClose={() => setPanel(null)} />
      )}
    </nav>
  )
}

// ── Barre CTA sticky (bas) ──────────────────────────────────────────────────────
export function ProfileMobileCTA({ target, authed }: { target: DuoRequestTarget & { profileId: string }; authed: boolean }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [me, setMe] = useState<DuoRequestMe | null>(null)
  const [status, setStatus] = useState<'none' | 'pending' | 'accepted'>('none')

  useEffect(() => {
    if (!authed) return
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: profile }, { data: req }] = await Promise.all([
        supabase.from('profiles').select('display_name, riot_accounts(game_name, ranks(tier, division, league_points, queue)), matching_prefs(main_roles)').eq('id', user.id).maybeSingle(),
        supabase.from('duo_requests').select('status').or(`and(from_profile.eq.${user.id},to_profile.eq.${target.profileId}),and(from_profile.eq.${target.profileId},to_profile.eq.${user.id})`).in('status', ['pending', 'accepted']).maybeSingle(),
      ])
      if (profile) {
        const ra = (profile as any).riot_accounts
        const mp = (profile as any).matching_prefs
        const solo = (ra?.ranks ?? []).find((r: any) => r.queue === 'RANKED_SOLO_5x5') ?? null
        setMe({ name: ra?.game_name ?? (profile as any).display_name ?? 'MOI', role: mp?.main_roles?.[0] ?? null, rank: solo?.tier?.toLowerCase() ?? null, tier: solo?.division ?? null, lp: solo?.league_points ?? null })
      }
      if (req) setStatus(req.status as 'pending' | 'accepted')
    })()
  }, [authed, target.profileId])

  async function handleConfirm(message: string) {
    const res = await fetch('/api/duo/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to_profile: target.profileId, match_score: target.match, message }) })
    if (res.ok) { setStatus('pending'); setShowModal(false) }
    else { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? 'Erreur envoi') }
  }

  // Login-wall : invité → connexion / inscription
  const onMsg = () => { if (!authed) { router.push('/login'); return } if (status === 'accepted') router.push('/inbox'); else if (me) setShowModal(true) }
  const onDuo = () => { if (!authed) { router.push('/signup'); return } if (status !== 'pending' && me) setShowModal(true) }

  const accepted = status === 'accepted'
  const pending = status === 'pending'

  return (
    <div className="rgg-pp-mobile-cta" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: '100%', maxWidth: 430, zIndex: 60, background: 'rgba(8,10,16,0.95)', backdropFilter: 'blur(16px)', borderTop: `1px solid ${T.lineStrong}`, padding: '12px 16px calc(12px + env(safe-area-inset-bottom))' }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onMsg} style={{ flex: 1, height: 50, borderRadius: 13, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.lineStrong}`, color: T.text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer', fontFamily: T.display, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 01-11.5 7.2L4 21l1.8-5.5A8 8 0 1121 12z" /></svg>
          Message
        </button>
        {pending ? (
          <span style={{ flex: 1.6, height: 50, borderRadius: 13, background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.lineStrong}`, color: T.textDim, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: T.display, fontSize: 14, letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 700 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>Demande envoyée
          </span>
        ) : accepted ? (
          <button onClick={() => router.push('/inbox')} style={{ flex: 1.6, height: 50, borderRadius: 13, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.live}, ${T.cyan})`, color: '#001018', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: T.display, fontSize: 14, letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 700 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="2.8" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>Duo actif · Inbox
          </button>
        ) : (
          <button onClick={onDuo} style={{ flex: 1.6, height: 50, borderRadius: 13, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: '#001018', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: T.display, fontSize: 14, letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 700, boxShadow: `0 12px 30px -14px ${T.cyan}` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>Envoyer un duo
          </button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 9, fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.06em' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
        {authed ? 'Chat débloqué après acceptation de la demande' : 'Connecte-toi pour contacter ce joueur'}
      </div>

      {showModal && me && (
        <DuoRequestModal target={target} me={me} onConfirm={handleConfirm} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
