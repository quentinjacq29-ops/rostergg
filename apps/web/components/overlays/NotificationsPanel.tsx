'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { profileIconUrl } from '@/lib/riot/assets'

const T = {
  bg: '#0a0c14', surface: '#0f121c', elevated: '#161a26',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6', live: '#00ff9d',
  gold: '#ffd166', danger: '#ff3d6e',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

type Notif = {
  id: string
  type: 'duo_request' | 'duo_accepted' | 'team_invite' | 'system'
  payload: Record<string, any>
  read: boolean
  created_at: string
  actor: {
    id: string
    display_name: string | null
    avatar_url: string | null
    riot_accounts: { game_name: string; profile_icon_id: number | null } | null
  } | null
}

function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)     return `${Math.round(diff)} s`
  if (diff < 3600)   return `${Math.round(diff / 60)} min`
  if (diff < 86400)  return `${Math.round(diff / 3600)} h`
  return `${Math.round(diff / 86400)} j`
}

function accentFor(type: Notif['type']) {
  if (type === 'duo_accepted') return T.live
  if (type === 'team_invite')  return T.violet
  return T.cyan
}

function metaFor(n: Notif): string {
  if (n.type === 'duo_request')  return 'Demande de duo'
  if (n.type === 'duo_accepted') {
    const rid = n.payload.revealedRiotId
    return rid ? `Riot ID révélé · ${rid}` : 'Demande acceptée'
  }
  if (n.type === 'team_invite')  return `Invite équipe · ${n.payload.teamName ?? ''}`
  return n.payload.subtitle ?? ''
}

function textFor(n: Notif): string {
  if (n.type === 'duo_request')  return 'vous a envoyé une demande de duo'
  if (n.type === 'duo_accepted') return 'a accepté votre demande de duo'
  if (n.type === 'team_invite')  return "vous invite à rejoindre l'équipe"
  return n.payload.text ?? 'Nouvelle notification'
}

function actorName(n: Notif): string {
  return n.actor?.display_name
    ?? n.actor?.riot_accounts?.game_name
    ?? (n.type === 'system' ? 'RosterGG' : '—')
}

function hasAction(n: Notif) {
  return n.type === 'duo_request' || n.type === 'team_invite'
}

function actionLabel(n: Notif) {
  return n.type === 'team_invite' ? 'REJOINDRE' : 'ACCEPTER'
}

async function doAccept(n: Notif) {
  if (n.type === 'duo_request' && n.payload.requestId) {
    await fetch(`/api/duo/requests/${n.payload.requestId}/accept`, { method: 'POST' })
  }
  if (n.type === 'team_invite' && n.payload.invitationId) {
    await fetch(`/api/me/team/invitations/${n.payload.invitationId}/accept`, { method: 'POST' })
  }
}

async function doIgnore(n: Notif) {
  if (n.type === 'duo_request' && n.payload.requestId) {
    await fetch(`/api/duo/requests/${n.payload.requestId}/decline`, { method: 'POST' })
  }
}

type Props = {
  onClose: () => void
  onCountChange: (count: number) => void
}

export default function NotificationsPanel({ onClose, onCountChange }: Props) {
  const [notifs, setNotifs]     = useState<Notif[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/me/notifications')
      .then(r => r.json())
      .then(({ notifications, unread_count }) => {
        setNotifs(notifications ?? [])
        onCountChange(unread_count ?? 0)
        setLoading(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function markRead(id: string) {
    await fetch(`/api/me/notifications/${id}/read`, { method: 'POST' })
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    onCountChange(Math.max(0, notifs.filter(n => !n.read).length - 1))
  }

  async function markAllRead() {
    await fetch('/api/me/notifications/read-all', { method: 'POST' })
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    onCountChange(0)
  }

  const unread = notifs.filter(n => !n.read).length

  return (
    <div style={{
      position: 'fixed', top: 80, right: 16, width: 392, maxHeight: 560,
      borderRadius: 16, overflow: 'hidden', background: T.elevated,
      border: `1px solid ${T.lineStrong}`,
      boxShadow: '0 30px 70px -20px rgba(0,0,0,0.8)',
      display: 'flex', flexDirection: 'column', zIndex: 300,
    }}>
      {/* caret */}
      <div style={{ position: 'absolute', top: -7, right: 22, width: 14, height: 14, background: T.elevated, borderLeft: `1px solid ${T.lineStrong}`, borderTop: `1px solid ${T.lineStrong}`, transform: 'rotate(45deg)' }} />

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 16px', borderBottom: `1px solid ${T.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontFamily: T.display, fontSize: 15, color: T.text, letterSpacing: '0.06em' }}>NOTIFICATIONS</span>
          {unread > 0 && (
            <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: T.danger, color: '#fff', fontFamily: T.mono, fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        <span
          onClick={markAllRead}
          style={{ fontFamily: T.mono, fontSize: 10, color: T.cyan, letterSpacing: '0.06em', cursor: 'pointer' }}
        >
          TOUT MARQUER LU
        </span>
      </div>

      {/* list */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading && (
          <div style={{ padding: 24, textAlign: 'center', fontFamily: T.mono, fontSize: 11, color: T.textMute }}>
            CHARGEMENT…
          </div>
        )}
        {!loading && notifs.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', fontFamily: T.mono, fontSize: 11, color: T.textMute }}>
            AUCUNE NOTIFICATION
          </div>
        )}
        {notifs.map(n => {
          const accent = accentFor(n.type)
          return (
            <div
              key={n.id}
              onClick={() => { markRead(n.id); onClose() }}
              style={{ display: 'flex', gap: 12, padding: '13px 16px', borderBottom: `1px solid ${T.line}`, background: n.read ? 'transparent' : `${T.cyan}08`, position: 'relative', cursor: 'pointer' }}
            >
              {!n.read && (
                <span style={{ position: 'absolute', left: 6, top: 22, width: 6, height: 6, borderRadius: '50%', background: T.cyan, boxShadow: `0 0 6px ${T.cyan}` }} />
              )}
              {/* icon */}
              <div style={{ width: 38, height: 38, borderRadius: 11, background: `${accent}1f`, border: `1px solid ${accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: accent }}>
                  {actorName(n).slice(0, 2).toUpperCase()}
                </span>
              </div>
              {/* body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.body, fontSize: 13, color: T.textDim, lineHeight: 1.4 }}>
                  <b style={{ color: T.text, fontWeight: 700 }}>{actorName(n)}</b> {textFor(n)}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 9.5, color: accent, letterSpacing: '0.08em', marginTop: 4 }}>
                  {metaFor(n).toUpperCase()}
                </div>
                {hasAction(n) && (
                  <div style={{ display: 'flex', gap: 7, marginTop: 9 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { doAccept(n); markRead(n.id); onClose() }}
                      style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, color: '#001018', fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' }}
                    >
                      {actionLabel(n)}
                    </button>
                    <button
                      onClick={() => { doIgnore(n); markRead(n.id) }}
                      style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${T.lineStrong}`, background: 'transparent', color: T.textDim, fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' }}
                    >
                      IGNORER
                    </button>
                  </div>
                )}
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.textMute, whiteSpace: 'nowrap' }}>
                {relTime(n.created_at)}
              </div>
            </div>
          )
        })}
      </div>

      {/* footer */}
      <div style={{ padding: '12px 16px', textAlign: 'center', borderTop: `1px solid ${T.line}`, background: T.surface }}>
        <span style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textDim, letterSpacing: '0.1em', cursor: 'pointer' }}>
          VOIR TOUTES LES NOTIFICATIONS
        </span>
      </div>
    </div>
  )
}
