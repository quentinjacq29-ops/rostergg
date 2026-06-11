'use client'
// Port fidèle de desktop/duo-request.jsx (v8) — deux états : compose / sent
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Avatar, { RANK_COLORS } from '@/components/ui/Avatar'
import RoleIcon, { ROLE_META } from '@/components/ui/RoleIcon'
import MatchRing from '@/components/ui/MatchRing'

const T = {
  bg: '#0a0c14', surface: '#0f121c',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6', live: '#00ff9d', danger: '#ff3d6e',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

const SUGGESTIONS = [
  'Salut ! Chaud pour duo ce soir ? Je main mid roaming.',
  'On tryhard la montée cette semaine ? Vocal dispo.',
  'Ton early jungle + mon roam, on call les plays ?',
]
const MAX_MSG = 280

export type DuoRequestTarget = {
  name: string; tag: string; role: string | null; looking: string | null
  rank: string | null; tier: string | null; lp: number | null; match: number; hue: number
}
export type DuoRequestMe = {
  name: string; role: string | null; rank: string | null; tier: string | null; lp: number | null; hue?: number
}

// ── DRChip — chip identité joueur (port de duo-request.jsx)
function DRChip({ p, label, you = false }: { p: DuoRequestTarget | DuoRequestMe; label: string; you?: boolean }) {
  const rc = ROLE_META[(p.role ?? 'FILL').toUpperCase()]?.c ?? T.textDim
  const rankKey = p.rank?.toLowerCase() ?? 'iron'
  const rankColor = RANK_COLORS[rankKey] ?? '#9aa2bf'
  const initials = p.name.slice(0, 2).toUpperCase()
  const hue = (p as any).hue ?? 220
  const tierLabel = p.rank
    ? `${p.rank.slice(0,3).toUpperCase()} ${p.tier ?? ''}`.trim()
    : 'UNRANKED'
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 11, padding: '8px 15px 8px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: `1px solid ${you ? T.live + '44' : T.line}` }}>
      <Avatar initials={initials} size={34} rank={rankKey} hue={hue} online={false} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, lineHeight: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontFamily: T.display, fontSize: 16, color: T.text, letterSpacing: '0.03em' }}>{p.name}</span>
          {p.role && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 5px', borderRadius: 5, background: `${rc}1a`, border: `1px solid ${rc}40` }}>
              <RoleIcon role={p.role} size={9} active />
            </span>
          )}
        </div>
        <span style={{ fontFamily: T.mono, fontSize: 9.5, color: T.textDim, letterSpacing: '0.08em' }}>
          {label} · {tierLabel} · {p.lp ?? 0} LP
        </span>
      </div>
    </div>
  )
}

export default function DuoRequestModal({
  target, me, onConfirm, onClose,
}: {
  target: DuoRequestTarget
  me: DuoRequestMe
  onConfirm: (message: string) => Promise<void>
  onClose: () => void
}) {
  const router = useRouter()
  const [state,   setState]   = useState<'compose' | 'sent'>('compose')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const sent = state === 'sent'

  const lookingName = ROLE_META[(target.looking ?? 'FILL').toUpperCase()]?.name ?? (target.looking ?? '')

  async function handleSend() {
    setLoading(true)
    try {
      await onConfirm(message)
      setState('sent')
    } catch (err) {
      console.error('[DuoRequestModal] send error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    // Backdrop
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(6,7,11,0.72)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: 540, borderRadius: 22, overflow: 'hidden', position: 'relative', background: `linear-gradient(180deg, ${T.surface}, ${T.bg})`, border: `1px solid ${T.cyan}44`, boxShadow: `0 44px 100px -34px rgba(0,0,0,0.88), 0 0 70px -24px ${T.cyan}` }}>
        {/* glow */}
        <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 280, height: 150, background: `radial-gradient(circle, ${T.cyan}33, transparent 70%)`, filter: 'blur(34px)', pointerEvents: 'none' }} />

        {/* Header */}
        <div style={{ position: 'relative', padding: '24px 28px 18px', borderBottom: `1px solid ${T.line}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.cyan, letterSpacing: '0.2em' }}>
              {sent ? '◢ DEMANDE ENVOYÉE' : '◢ ENVOYER UNE DEMANDE DE DUO'}
            </span>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.lineStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
            <DRChip p={target} label={`CHERCHE ${lookingName}`} />
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <MatchRing value={target.match} size={56} stroke={5} accent={T.cyan} accent2={T.violet} />
              <span style={{ fontFamily: T.mono, fontSize: 8.5, color: T.textMute, letterSpacing: '0.14em' }}>MATCH</span>
            </div>
          </div>
        </div>

        {sent ? (
          /* ── État ENVOYÉE */
          <div style={{ position: 'relative', padding: '30px 28px 26px', textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, margin: '0 auto 16px', background: `${T.live}1a`, border: `1px solid ${T.live}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h2 style={{ margin: 0, fontFamily: T.display, fontSize: 25, color: T.text, letterSpacing: '0.02em' }}>Demande envoyée à {target.name}</h2>
            <p style={{ margin: '10px auto 0', fontFamily: T.body, fontSize: 13.5, color: T.textDim, lineHeight: 1.55, maxWidth: 380 }}>
              {target.name} reçoit ta demande dans son inbox. Le chat s&apos;ouvre dès qu&apos;il accepte — vos Riot ID seront alors révélés des deux côtés.
            </p>
            {message && (
              <div style={{ margin: '18px auto 0', maxWidth: 400, textAlign: 'left', padding: '12px 15px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.line}` }}>
                <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.16em' }}>TON MESSAGE</span>
                <p style={{ margin: '6px 0 0', fontFamily: T.body, fontSize: 13.5, color: T.textDim, lineHeight: 1.5 }}>&ldquo;{message}&rdquo;</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
              <button onClick={() => setState('compose')} style={{ padding: '13px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.lineStrong}`, color: T.text, cursor: 'pointer', fontFamily: T.display, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                Retour
              </button>
              <button onClick={() => { onClose(); router.push('/fr/inbox') }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 20px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: '#001018', cursor: 'pointer', fontFamily: T.display, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontWeight: 700, boxShadow: `0 14px 32px -12px ${T.cyan}` }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                Voir l&apos;inbox
              </button>
            </div>
          </div>
        ) : (
          /* ── État COMPOSE */
          <div style={{ position: 'relative', padding: '20px 28px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.18em' }}>TON MOT D&apos;INTRO · OPTIONNEL</span>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: message.length > MAX_MSG ? T.danger : T.textMute, letterSpacing: '0.08em' }}>{message.length}/{MAX_MSG}</span>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value.slice(0, MAX_MSG))}
              placeholder="Présente-toi en deux lignes — ce que tu joues, ce que tu cherches, tes dispos…"
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'none', padding: '13px 15px', borderRadius: 13, background: 'rgba(255,255,255,0.035)', border: `1px solid ${T.lineStrong}`, color: T.text, fontFamily: T.body, fontSize: 14, lineHeight: 1.5, outline: 'none' }}
            />

            {/* Suggestions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => setMessage(s)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.line}`, cursor: 'pointer', fontFamily: T.body, fontSize: 12, color: T.textDim, maxWidth: 230, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.cyan} strokeWidth="2.4" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4" /></svg>
                  {s}
                </button>
              ))}
            </div>

            {/* Ce que X verra */}
            <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 13, background: `linear-gradient(135deg, ${T.cyan}0f, transparent 75%)`, border: `1px solid ${T.cyan}2a` }}>
              <span style={{ fontFamily: T.mono, fontSize: 9.5, color: T.cyan, letterSpacing: '0.16em' }}>CE QUE {target.name.toUpperCase()} VERRA</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 11 }}>
                <DRChip p={me} label="TON PROFIL" you />
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginLeft: 'auto' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  <span style={{ fontFamily: T.mono, fontSize: 9.5, color: T.textMute, letterSpacing: '0.05em', maxWidth: 150, lineHeight: 1.4 }}>Ton Riot ID reste masqué jusqu&apos;à l&apos;acceptation</span>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '13px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.lineStrong}`, color: T.text, cursor: 'pointer', fontFamily: T.display, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                Annuler
              </button>
              <button onClick={handleSend} disabled={loading} style={{ flex: 1.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 20px', borderRadius: 12, border: 'none', background: loading ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: loading ? T.textDim : '#001018', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: T.display, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontWeight: 700, boxShadow: loading ? 'none' : `0 14px 32px -12px ${T.cyan}`, whiteSpace: 'nowrap' }}>
                {loading ? (
                  <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${T.textDim}`, borderTopColor: 'transparent', animation: 'rgg-spin 0.7s linear infinite', display: 'inline-block' }} />
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                )}
                {loading ? 'Envoi…' : 'Envoyer la demande'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
