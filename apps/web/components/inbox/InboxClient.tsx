'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePresence } from '@/lib/hooks/usePresence'
import Avatar, { RANK_COLORS } from '@/components/ui/Avatar'
import RoleIcon, { ROLE_META } from '@/components/ui/RoleIcon'
import MatchRing from '@/components/ui/MatchRing'
import { championIconUrl } from '@/lib/riot/assets'

const T = {
  bg: '#0a0c14', surface: '#0f121c',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6', live: '#00ff9d', gold: '#ffd166',
  danger: '#ff3d6e', queue: '#ffb547',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

// ── Types ─────────────────────────────────────────────────────────────────

export type PendingRequest = {
  id: string
  matchScore: number | null
  message: string | null
  createdAt: string
  sender: {
    id: string
    displayName: string | null
    gameName: string | null
    tagLine: string | null
    mainRole: string | null
    lookingFor: string | null
    rankKey: string | null
    division: string | null
    lp: number | null
    wins: number | null
    losses: number | null
    champPool: Record<string, string[]>
  }
}

export type Conversation = {
  requestId: string
  conversationId: string
  matchScore: number | null
  unreadCount: number
  other: {
    id: string
    displayName: string | null
    gameName: string | null
    tagLine: string | null
    mainRole: string | null
    rankKey: string | null
    division: string | null
    lp: number | null
    champPool: Record<string, string[]>
  }
  lastMessage: { body: string; sender_id: string; created_at: string } | null
}

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  kind: string
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────

function nameHue(s: string) {
  let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h
}

// Construit une PendingRequest depuis la ligne jointe (même forme que la page serveur)
function buildRequest(d: any): PendingRequest {
  const p = d.sender
  const ra = p?.riot_accounts
  const mp = p?.matching_prefs
  const solo = (ra?.ranks ?? []).find((r: any) => r.queue === 'RANKED_SOLO_5x5') ?? null
  return {
    id: d.id, matchScore: d.match_score, message: d.message, createdAt: d.created_at,
    sender: {
      id: p?.id ?? '', displayName: p?.display_name ?? null,
      gameName: ra?.game_name ?? null, tagLine: ra?.tag_line ?? null,
      mainRole: mp?.main_roles?.[0] ?? null, lookingFor: mp?.looking_for_roles?.[0] ?? null,
      rankKey: solo?.tier?.toLowerCase() ?? null, division: solo?.division ?? null,
      lp: solo?.league_points ?? null, wins: solo?.wins ?? null, losses: solo?.losses ?? null,
      champPool: (mp?.champion_pool as Record<string, string[]>) ?? {},
    },
  }
}
function rankLabel(rankKey: string | null, division: string | null) {
  if (!rankKey) return 'UNRANKED'
  const high = ['master','grandmaster','challenger'].includes(rankKey.toLowerCase())
  return high ? rankKey.toUpperCase() : `${rankKey.toUpperCase().slice(0,3)} ${division ?? ''}`.trim()
}
function formatTime(iso: string) {
  const d = new Date(iso), now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Hier'
  return d.toLocaleDateString('fr', { day: 'numeric', month: 'short' })
}

// ── Pill ──────────────────────────────────────────────────────────────────
function Pill({ children, accent, mono = false }: { children: React.ReactNode; accent?: string; mono?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: accent ? `${accent}1f` : 'rgba(255,255,255,0.04)', border: `1px solid ${accent ? accent + '40' : T.line}`, color: accent ?? T.text, fontFamily: mono ? T.mono : T.body, fontSize: 10, fontWeight: 600, letterSpacing: mono ? '0.08em' : '0.02em', textTransform: mono ? 'uppercase' : 'none', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

// ── StatusDot ─────────────────────────────────────────────────────────────
function StatusDot({ online }: { online: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: online ? T.live : T.textMute, boxShadow: online ? `0 0 6px ${T.live}` : 'none' }} />
      <span style={{ fontFamily: T.mono, fontSize: 9, color: online ? T.live : T.textMute, letterSpacing: '0.1em' }}>
        {online ? 'EN LIGNE' : 'HORS LIGNE'}
      </span>
    </span>
  )
}

// ── ContextCard ───────────────────────────────────────────────────────────
function ContextCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.textMute, letterSpacing: '0.2em', marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  )
}

// ── ReqStat ───────────────────────────────────────────────────────────────
function ReqStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.line}`, textAlign: 'center' }}>
      <div style={{ fontFamily: T.mono, fontSize: 8.5, color: T.textMute, letterSpacing: '0.16em' }}>{label}</div>
      <div style={{ fontFamily: T.display, fontSize: 19, color: T.text, marginTop: 3 }}>{value}</div>
    </div>
  )
}

// ── RequestRow ────────────────────────────────────────────────────────────
function RequestRow({ r, selected, onlineIds, onClick, onAccept, onDecline, loading }: {
  r: PendingRequest; selected: boolean; onlineIds: Set<string>; onClick: () => void
  onAccept: () => void; onDecline: () => void; loading: boolean
}) {
  const rc   = ROLE_META[(r.sender.mainRole ?? 'FILL').toUpperCase()]?.c ?? T.textDim
  const name = r.sender.gameName ?? r.sender.displayName ?? '—'
  const hue  = nameHue(name)
  const online = onlineIds.has(r.sender.id)
  return (
    <button onClick={onClick} style={{ position: 'relative', display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%', textAlign: 'left', padding: '13px 14px', borderRadius: 13, cursor: 'pointer', background: selected ? `linear-gradient(100deg, ${T.queue}1c, transparent)` : 'rgba(255,255,255,0.018)', border: `1px solid ${selected ? T.queue + '55' : T.line}` }}>
      {selected && <span style={{ position: 'absolute', left: -1, top: 13, bottom: 13, width: 3, borderRadius: 3, background: T.queue, boxShadow: `0 0 8px ${T.queue}` }} />}
      <Avatar initials={name.slice(0,2).toUpperCase()} size={42} rank={r.sender.rankKey ?? 'iron'} hue={hue} online={online} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontFamily: T.display, fontSize: 15, color: T.text, letterSpacing: '0.03em' }}>{name}</span>
          {r.sender.mainRole && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 5px', borderRadius: 5, background: `${rc}1a`, border: `1px solid ${rc}40` }}>
              <RoleIcon role={r.sender.mainRole} size={9} active />
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.06em' }}>{formatTime(r.createdAt)}</span>
        </div>
        {r.message && (
          <div style={{ fontFamily: T.body, fontSize: 12, color: T.textDim, marginTop: 5, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{r.message}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: T.mono, fontSize: 10, color: T.cyan, letterSpacing: '0.06em' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.cyan }} />{r.matchScore ?? '—'}% MATCH
          </span>
          <div style={{ flex: 1 }} />
          <span role="button" title="Refuser" onClick={e => { e.stopPropagation(); if (!loading) onDecline() }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.lineStrong}`, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth="2.6" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </span>
          <span role="button" title="Accepter" onClick={e => { e.stopPropagation(); if (!loading) onAccept() }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: `${T.live}1c`, border: `1px solid ${T.live}55`, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </span>
        </div>
      </div>
    </button>
  )
}

// ── SentRequestRow ────────────────────────────────────────────────────────
function SentRequestRow({ r, selected, onlineIds, onClick, onCancel, loading }: {
  r: PendingRequest; selected: boolean; onlineIds: Set<string>; onClick: () => void; onCancel: () => void; loading: boolean
}) {
  const rc   = ROLE_META[(r.sender.mainRole ?? 'FILL').toUpperCase()]?.c ?? T.textDim
  const name = r.sender.gameName ?? r.sender.displayName ?? '—'
  const hue  = nameHue(name)
  const online = onlineIds.has(r.sender.id)
  return (
    <button onClick={onClick} style={{ position: 'relative', display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%', textAlign: 'left', padding: '13px 14px', borderRadius: 13, cursor: 'pointer', background: selected ? `linear-gradient(100deg, ${T.queue}1c, transparent)` : 'rgba(255,255,255,0.018)', border: `1px solid ${selected ? T.queue + '55' : T.line}` }}>
      {selected && <span style={{ position: 'absolute', left: -1, top: 13, bottom: 13, width: 3, borderRadius: 3, background: T.queue, boxShadow: `0 0 8px ${T.queue}` }} />}
      <Avatar initials={name.slice(0, 2).toUpperCase()} size={42} rank={r.sender.rankKey ?? 'iron'} hue={hue} online={online} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontFamily: T.display, fontSize: 15, color: T.text, letterSpacing: '0.03em' }}>{name}</span>
          {r.sender.mainRole && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 5px', borderRadius: 5, background: `${rc}1a`, border: `1px solid ${rc}40` }}>
              <RoleIcon role={r.sender.mainRole} size={9} active />
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.06em' }}>{formatTime(r.createdAt)}</span>
        </div>
        {r.message && (
          <div style={{ fontFamily: T.body, fontSize: 12, color: T.textDim, marginTop: 5, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{r.message}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: T.mono, fontSize: 9.5, color: T.queue, letterSpacing: '0.08em' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.queue, boxShadow: `0 0 8px ${T.queue}` }} />EN ATTENTE
          </span>
          <div style={{ flex: 1 }} />
          <span role="button" onClick={e => { e.stopPropagation(); if (!loading) onCancel() }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.lineStrong}`, fontFamily: T.mono, fontSize: 9, color: T.textDim, letterSpacing: '0.06em', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth="2.6" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>ANNULER
          </span>
        </div>
      </div>
    </button>
  )
}

// ── ConvoRow ──────────────────────────────────────────────────────────────
function ConvoRow({ conv, selected, onlineIds, unread, onClick }: {
  conv: Conversation; selected: boolean; onlineIds: Set<string>; unread: number; onClick: () => void
}) {
  const name   = conv.other.gameName ?? conv.other.displayName ?? '—'
  const hue    = nameHue(name)
  const online = onlineIds.has(conv.other.id)
  return (
    <button onClick={onClick} style={{ position: 'relative', display: 'flex', gap: 12, alignItems: 'center', width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 13, cursor: 'pointer', background: selected ? `linear-gradient(100deg, ${T.cyan}18, transparent)` : 'transparent', border: `1px solid ${selected ? T.cyan + '44' : 'transparent'}` }}>
      {selected && <span style={{ position: 'absolute', left: -1, top: 13, bottom: 13, width: 3, borderRadius: 3, background: T.cyan, boxShadow: `0 0 8px ${T.cyan}` }} />}
      <Avatar initials={name.slice(0,2).toUpperCase()} size={44} rank={conv.other.rankKey ?? 'iron'} hue={hue} online={online} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontFamily: T.display, fontSize: 15, color: T.text, letterSpacing: '0.03em' }}>{name}</span>
          {conv.other.mainRole && <RoleIcon role={conv.other.mainRole} size={11} active />}
          <span style={{ marginLeft: 'auto', fontFamily: T.mono, fontSize: 9.5, color: unread > 0 ? T.cyan : T.textMute }}>
            {conv.lastMessage ? formatTime(conv.lastMessage.created_at) : ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
          <span style={{ flex: 1, minWidth: 0, fontFamily: T.body, fontSize: 12.5, color: unread > 0 ? T.text : T.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: unread > 0 ? 600 : 400 }}>
            {conv.lastMessage?.body ?? 'Conversation ouverte'}
          </span>
          {unread > 0 && <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: T.cyan, color: '#001018', fontFamily: T.mono, fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>}
        </div>
      </div>
    </button>
  )
}

// ── Bubble ────────────────────────────────────────────────────────────────
function Bubble({ m, isMe, otherInitials, otherHue, otherRankKey }: {
  m: Message; isMe: boolean; otherInitials: string; otherHue: number; otherRankKey: string
}) {
  if (m.kind === 'system') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 999, background: `${T.live}14`, border: `1px solid ${T.live}40`, fontFamily: T.mono, fontSize: 10, color: T.live, letterSpacing: '0.14em' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.live }} />
          {m.body}
        </span>
      </div>
    )
  }
  if (m.kind === 'lobby_invite') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 999, background: `${T.violet}14`, border: `1px solid ${T.violet}40`, fontFamily: T.mono, fontSize: 10, color: T.violet, letterSpacing: '0.14em' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.violet} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          {m.body}
        </span>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
      {!isMe && (
        <div style={{ marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' }}>
          <Avatar initials={otherInitials} size={26} rank={otherRankKey} hue={otherHue} online={false} />
        </div>
      )}
      <div style={{ maxWidth: '62%' }}>
        <div style={{ padding: '11px 15px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMe ? `linear-gradient(135deg, ${T.cyan}, ${T.cyan}bb)` : 'rgba(255,255,255,0.05)', border: isMe ? 'none' : `1px solid ${T.line}`, color: isMe ? '#001018' : T.text, fontFamily: T.body, fontSize: 14, lineHeight: 1.45, fontWeight: isMe ? 500 : 400, boxShadow: isMe ? `0 6px 18px -8px ${T.cyan}` : 'none' }}>
          {m.body}
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, marginTop: 4, textAlign: isMe ? 'right' : 'left', letterSpacing: '0.08em' }}>
          {formatTime(m.created_at)}
        </div>
      </div>
    </div>
  )
}

// ── ContextRail ───────────────────────────────────────────────────────────
function ContextRail({ className, name, initials, hue, rankKey, division, lp, matchScore, mainRole, rightRole, champPool, online, pendingLabel }: {
  className?: string
  name: string; initials: string; hue: number; rankKey: string | null; division: string | null; lp: number | null
  matchScore: number | null
  mainRole: string | null
  rightRole: string | null  // lookingFor (requests) or currentUser mainRole (convs)
  champPool: Record<string, string[]>; online: boolean; pendingLabel?: string
}) {
  const rc  = ROLE_META[(mainRole  ?? 'FILL').toUpperCase()]?.c ?? T.textDim
  const rrc = ROLE_META[(rightRole ?? 'FILL').toUpperCase()]?.c ?? T.textDim
  const firstPool = mainRole ? (champPool[mainRole.toUpperCase()] ?? Object.values(champPool)[0] ?? []) : Object.values(champPool)[0] ?? []
  return (
    <div className={className} style={{ width: 296, flexShrink: 0, height: '100%', overflowY: 'auto', padding: '22px 20px', borderLeft: `1px solid ${T.line}`, background: 'rgba(255,255,255,0.012)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: 18, borderBottom: `1px solid ${T.line}` }}>
        <Avatar initials={initials} size={72} rank={rankKey ?? 'iron'} hue={hue} online={online} />
        <div style={{ fontFamily: T.display, fontSize: 22, color: T.text, letterSpacing: '0.03em', marginTop: 12 }}>{name}</div>
        {pendingLabel && (
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.1em', marginTop: 5 }}>{pendingLabel}</div>
        )}
        {matchScore !== null && (
          <div style={{ marginTop: 12 }}>
            <MatchRing value={matchScore} size={72} stroke={5} accent={T.cyan} accent2={T.violet} />
          </div>
        )}
      </div>
      <div style={{ paddingTop: 18 }}>
        {(mainRole || rightRole) && (
          <ContextCard label="RÔLES">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, background: `${rc}1a`, border: `1px solid ${rc}44`, flex: 1, justifyContent: 'center' }}>
                {mainRole && <RoleIcon role={mainRole} size={14} active />}
                <span style={{ fontFamily: T.mono, fontSize: 11, color: rc, fontWeight: 700 }}>{mainRole ?? '—'}</span>
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, background: `${rrc}14`, border: `1px solid ${rrc}33`, flex: 1, justifyContent: 'center' }}>
                {rightRole && <RoleIcon role={rightRole} size={14} active />}
                <span style={{ fontFamily: T.mono, fontSize: 11, color: rrc, fontWeight: 700 }}>{rightRole ?? '—'}</span>
              </span>
            </div>
          </ContextCard>
        )}
        {firstPool.length > 0 && (
          <ContextCard label="TOP CHAMPIONS">
            <div style={{ display: 'flex', gap: 8 }}>
              {firstPool.slice(0, 3).map((champId, i) => (
                <div key={champId} style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', background: '#161a26', border: `1.5px solid ${i === 0 ? (RANK_COLORS[rankKey ?? 'iron'] ?? '#9aa2bf') : 'rgba(255,255,255,0.1)'}`, boxShadow: i === 0 ? `0 0 0 1.5px ${RANK_COLORS[rankKey ?? 'iron']}, 0 0 10px ${RANK_COLORS[rankKey ?? 'iron']}66` : 'none' }}>
                  <img src={championIconUrl(champId)} alt={champId} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </ContextCard>
        )}
        <StatusDot online={online} />
      </div>
    </div>
  )
}

// ── Segmented (port exact de DSegmented desktop/shell.jsx) ──────────────────
function Segmented({ items, active, onSelect }: {
  items: { id: string; label: string; badge?: number }[]; active: string; onSelect: (id: string) => void
}) {
  return (
    <div style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.line}` }}>
      {items.map(it => {
        const on = it.id === active
        return (
          <button key={it.id} onClick={() => onSelect(it.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', background: on ? `linear-gradient(135deg, ${T.cyan}, ${T.cyan}aa)` : 'transparent', color: on ? '#001018' : T.textDim, fontFamily: T.display, fontSize: 12, letterSpacing: '0.12em', fontWeight: 700, boxShadow: on ? `0 6px 16px -8px ${T.cyan}` : 'none' }}>
            {it.label}
            {it.badge ? (
              <span style={{ minWidth: 17, height: 17, padding: '0 5px', borderRadius: 9, background: on ? 'rgba(0,16,24,0.28)' : T.queue, color: on ? '#001018' : '#1a1400', fontFamily: T.mono, fontSize: 9.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{it.badge}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

// ── EmptyList ─────────────────────────────────────────────────────────────
function EmptyList({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ padding: '40px 4px', textAlign: 'center' }}>
      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.18em' }}>{label}</div>
      {sub && <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, opacity: 0.6, marginTop: 6, letterSpacing: '0.1em' }}>{sub}</div>}
    </div>
  )
}

// ── Main InboxClient ───────────────────────────────────────────────────────

export default function InboxClient({
  userId,
  currentUserRole,
  currentUserName,
  pendingRequests: initialPending,
  sentRequests: initialSent,
  conversations: initialConversations,
}: {
  userId: string
  currentUserRole: string | null
  currentUserName: string
  pendingRequests: PendingRequest[]
  sentRequests: PendingRequest[]
  conversations: Conversation[]
}) {
  const supabase = createClient()
  const router   = useRouter()
  const params   = useSearchParams()
  const { onlineIds } = usePresence(userId)

  const [pending,       setPending]       = useState(initialPending)
  const [conversations, setConversations] = useState(initialConversations)
  const [unreadCounts,  setUnreadCounts]  = useState<Record<string, number>>(
    Object.fromEntries(initialConversations.map(c => [c.conversationId, c.unreadCount]))
  )

  // Onglets : Conversations / Demandes + sous-toggle Reçues / Envoyées
  const [tab,    setTab]    = useState<'convos' | 'requests'>(
    // aligne l'onglet par défaut sur la sélection initiale (deep-link conv → convos ; sinon demandes si présentes)
    params.get('conv') ? 'convos' : (initialPending.length > 0 ? 'requests' : 'convos')
  )
  const [reqDir, setReqDir] = useState<'recues' | 'envoyees'>('recues')
  const [sent, setSent] = useState(initialSent)
  const sentCount = sent.length
  // Mobile : liste plein écran ↔ détail plein écran (le desktop montre les 3 panneaux)
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')
  const openDetail = () => setMobileView('detail')

  // Re-synchronise l'état quand le serveur renvoie des données fraîches
  // (router.refresh / navigation) — sinon useState garde la 1ère valeur (périmée).
  useEffect(() => { setPending(initialPending) }, [initialPending])
  useEffect(() => { setSent(initialSent) }, [initialSent])
  useEffect(() => {
    setConversations(initialConversations)
    setUnreadCounts(Object.fromEntries(initialConversations.map(c => [c.conversationId, c.unreadCount])))
  }, [initialConversations])
  // Données fraîches à chaque arrivée sur l'inbox (contourne le Router Cache Next)
  useEffect(() => { router.refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sélection
  const initialConvId = params.get('conv')
  const [selectedType, setSelectedType] = useState<'request' | 'sentRequest' | 'conversation' | null>(
    initialConvId ? 'conversation' : (initialPending.length > 0 ? 'request' : (initialConversations.length > 0 ? 'conversation' : null))
  )
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConvId ?? initialPending[0]?.id ?? initialConversations[0]?.conversationId ?? null
  )

  // Chat state
  const [messages,     setMessages]     = useState<Message[]>([])
  const [msgInput,     setMsgInput]     = useState('')
  const [sending,      setSending]      = useState(false)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [peerTyping,   setPeerTyping]   = useState(false)
  const messagesEndRef  = useRef<HTMLDivElement>(null)
  const typingChanRef   = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const peerTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Derived
  const selectedRequest = pending.find(r => r.id === selectedId) ?? null
  const selectedSent    = sent.find(r => r.id === selectedId) ?? null
  const selectedConv    = conversations.find(c => c.conversationId === selectedId) ?? null
  const convId          = selectedType === 'conversation' ? selectedId : null
  const convIdRef       = useRef(convId)
  useEffect(() => { convIdRef.current = convId }, [convId])

  // ── Messages Realtime ─────────────────────────────────────────────────
  const loadMessages = useCallback(async (cid: string) => {
    const { data } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, body, kind, created_at')
      .eq('conversation_id', cid)
      .order('created_at', { ascending: true })
    setMessages((data as Message[]) ?? [])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!convId) { setMessages([]); return }
    loadMessages(convId)
    const ch = supabase
      .channel(`messages:${convId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` }, payload => {
        const msg = payload.new as Message
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [convId, loadMessages]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Mark-read quand on ouvre une conversation ─────────────────────────
  useEffect(() => {
    if (!convId) return
    supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', convId)
      .eq('profile_id', userId)
      .then(() => setUnreadCounts(prev => ({ ...prev, [convId]: 0 })))
  }, [convId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime : notifier l'émetteur quand sa demande est acceptée ──────
  const sentRef = useRef(sent)
  useEffect(() => { sentRef.current = sent }, [sent])
  useEffect(() => {
    const ch = supabase
      .channel(`duo-requests:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'duo_requests',
        filter: `from_profile=eq.${userId}`,
      }, payload => {
        const upd = payload.new as { id: string; status: string; conversation_id: string | null }
        if (upd.status === 'accepted' && upd.conversation_id) {
          const cId = upd.conversation_id
          const req = sentRef.current.find(r => r.id === upd.id)
          setSent(prev => prev.filter(r => r.id !== upd.id))
          setPending(prev => prev.filter(r => r.id !== upd.id))
          // Ajout optimiste de la conversation (le destinataire qui a accepté)
          if (req) {
            const newConv: Conversation = {
              requestId: req.id, conversationId: cId, matchScore: req.matchScore, unreadCount: 0,
              other: {
                id: req.sender.id, displayName: req.sender.displayName, gameName: req.sender.gameName,
                tagLine: req.sender.tagLine, mainRole: req.sender.mainRole, rankKey: req.sender.rankKey,
                division: req.sender.division, lp: req.sender.lp, champPool: req.sender.champPool,
              },
              lastMessage: req.message ? { body: req.message, sender_id: req.sender.id, created_at: req.createdAt } : null,
            }
            setConversations(prev => prev.some(c => c.conversationId === cId) ? prev : [newConv, ...prev])
          }
          router.refresh()
          setTab('convos')
          setReqDir('recues')
          setSelectedType('conversation')
          setSelectedId(cId)
        }
      })
      // Demande REÇUE en direct → l'ajouter à la liste Reçues
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'duo_requests',
        filter: `to_profile=eq.${userId}`,
      }, async payload => {
        const row = payload.new as { id: string; status: string }
        if (row.status !== 'pending') return
        const { data } = await supabase
          .from('duo_requests')
          .select('id, match_score, message, created_at, sender:profiles!from_profile(id, display_name, riot_accounts(game_name, tag_line, ranks(tier, division, league_points, wins, losses, queue)), matching_prefs(main_roles, looking_for_roles, champion_pool))')
          .eq('id', row.id)
          .maybeSingle()
        if (!data) return
        const req = buildRequest(data)
        setPending(prev => prev.some(r => r.id === req.id) ? prev : [req, ...prev])
      })
      // Demande annulée/refusée par l'autre → retirer de nos listes
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'duo_requests',
      }, payload => {
        const del = payload.old as { id?: string }
        if (!del?.id) return
        setPending(prev => prev.filter(r => r.id !== del.id))
        setSent(prev => prev.filter(r => r.id !== del.id))
      })
      // Nouveau message dans n'importe quelle conversation → maj de la liste (aperçu,
      // remontée en tête, non-lus) même si la conv n'est pas ouverte. RLS limite aux
      // convs de l'utilisateur.
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
      }, payload => {
        const msg = payload.new as Message
        setConversations(prev => {
          const idx = prev.findIndex(c => c.conversationId === msg.conversation_id)
          if (idx === -1) return prev
          const updated = { ...prev[idx], lastMessage: { body: msg.body, sender_id: msg.sender_id, created_at: msg.created_at } }
          return [updated, ...prev.slice(0, idx), ...prev.slice(idx + 1)]
        })
        if (msg.conversation_id !== convIdRef.current && msg.sender_id !== userId) {
          setUnreadCounts(prev => ({ ...prev, [msg.conversation_id]: (prev[msg.conversation_id] ?? 0) + 1 }))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Typing Broadcast per-conv ─────────────────────────────────────────
  useEffect(() => {
    if (typingChanRef.current) {
      supabase.removeChannel(typingChanRef.current)
      typingChanRef.current = null
    }
    setPeerTyping(false)
    if (!convId) return

    const ch = supabase
      .channel(`typing:${convId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.userId === userId) return
        setPeerTyping(true)
        if (peerTypingTimer.current) clearTimeout(peerTypingTimer.current)
        peerTypingTimer.current = setTimeout(() => setPeerTyping(false), 3000)
      })
      .subscribe()
    typingChanRef.current = ch
  }, [convId]) // eslint-disable-line react-hooks/exhaustive-deps

  function broadcastTyping() {
    typingChanRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId } })
  }

  // ── Actions ───────────────────────────────────────────────────────────
  async function handleRespond(requestId: string, action: 'accept' | 'decline') {
    const req = pending.find(x => x.id === requestId)
    setRespondingId(requestId)
    const res = await fetch('/api/duo/respond', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, action }),
    })
    setRespondingId(null)
    if (res.ok) {
      setPending(prev => prev.filter(r => r.id !== requestId))
      if (action === 'accept') {
        const data = await res.json()
        // Ajout optimiste : la conversation apparaît tout de suite (pas d'attente du refresh serveur)
        if (req && data.conversation_id) {
          const newConv: Conversation = {
            requestId: req.id,
            conversationId: data.conversation_id,
            matchScore: req.matchScore,
            unreadCount: 0,
            other: {
              id: req.sender.id, displayName: req.sender.displayName, gameName: req.sender.gameName,
              tagLine: req.sender.tagLine, mainRole: req.sender.mainRole, rankKey: req.sender.rankKey,
              division: req.sender.division, lp: req.sender.lp, champPool: req.sender.champPool,
            },
            lastMessage: req.message ? { body: req.message, sender_id: req.sender.id, created_at: req.createdAt } : null,
          }
          setConversations(prev => prev.some(c => c.conversationId === newConv.conversationId) ? prev : [newConv, ...prev])
        }
        router.refresh()
        setTab('convos') // la conversation créée vit dans l'onglet Conversations
        setReqDir('recues')
        setSelectedType('conversation')
        setSelectedId(data.conversation_id)
      } else {
        const remaining = pending.filter(r => r.id !== requestId)
        setSelectedId(remaining[0]?.id ?? conversations[0]?.conversationId ?? null)
        setSelectedType(remaining.length > 0 ? 'request' : 'conversation')
      }
    }
  }

  async function handleCancel(requestId: string) {
    setRespondingId(requestId)
    const res = await fetch(`/api/duo/request?id=${encodeURIComponent(requestId)}`, { method: 'DELETE' })
    setRespondingId(null)
    if (res.ok) {
      const remaining = sent.filter(r => r.id !== requestId)
      setSent(remaining)
      setSelectedId(remaining[0]?.id ?? null)
      setSelectedType(remaining.length > 0 ? 'sentRequest' : null)
      setMobileView('list')
    }
  }

  async function handleSendMessage() {
    if (!convId || !msgInput.trim() || sending) return
    setSending(true)
    const body = msgInput.trim()
    const { data, error } = await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: userId,
      body,
      kind: 'text',
    }).select('id, conversation_id, sender_id, body, kind, created_at').single()
    if (error) {
      console.error('[inbox] send error:', error.code, error.message)
      setSending(false)
      return
    }
    setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data as Message])
    setMsgInput('')
    setSending(false)
  }


  const pendingCount = pending.length
  const convCount    = conversations.length

  // Changement d'onglet → sélectionne le 1er élément de l'onglet (cohérence pane centrale)
  function switchTab(t: 'convos' | 'requests') {
    setTab(t)
    if (t === 'convos' && conversations[0]) { setSelectedType('conversation'); setSelectedId(conversations[0].conversationId) }
    else if (t === 'requests' && reqDir === 'recues' && pending[0]) { setSelectedType('request'); setSelectedId(pending[0].id) }
  }

  return (
    <div className="rgg-inbox-root" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* 3 panneaux desktop ⇆ liste/détail empilés mobile */}
      <div className={`rgg-inbox-3pane rgg-inbox-view-${mobileView}`} style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* ── Liste gauche (onglets Conversations / Demandes) ────────── */}
        <div className="rgg-inbox-list" style={{ width: 348, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${T.line}`, background: 'rgba(255,255,255,0.012)' }}>

          {/* Onglets (DSegmented) */}
          <div style={{ flexShrink: 0, padding: '16px 16px 10px' }}>
            <Segmented
              items={[{ id: 'convos', label: 'CONVERSATIONS' }, { id: 'requests', label: 'DEMANDES', badge: pendingCount }]}
              active={tab}
              onSelect={id => switchTab(id as 'convos' | 'requests')}
            />
          </div>

          {/* Contenu */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 12px 16px' }}>
            {tab === 'convos' ? (
              conversations.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {conversations.map(conv => (
                    <ConvoRow key={conv.conversationId} conv={conv} onlineIds={onlineIds}
                      unread={unreadCounts[conv.conversationId] ?? 0}
                      selected={selectedType === 'conversation' && selectedId === conv.conversationId}
                      onClick={() => { setSelectedType('conversation'); setSelectedId(conv.conversationId); openDetail() }}
                    />
                  ))}
                </div>
              ) : <EmptyList label="AUCUNE CONVERSATION" />
            ) : (
              <>
                {/* Sous-toggle Reçues / Envoyées (DSegmented) */}
                <div style={{ padding: '8px 2px 12px' }}>
                  <Segmented
                    items={[{ id: 'recues', label: 'REÇUES', badge: pendingCount }, { id: 'envoyees', label: 'ENVOYÉES', badge: sentCount }]}
                    active={reqDir}
                    onSelect={id => {
                      setReqDir(id as 'recues' | 'envoyees')
                      if (id === 'recues' && pending[0]) { setSelectedType('request'); setSelectedId(pending[0].id) }
                      else if (id === 'envoyees' && sent[0]) { setSelectedType('sentRequest'); setSelectedId(sent[0].id) }
                    }}
                  />
                </div>

                {/* Deux listes distinctes, gardées par le sous-toggle */}
                {reqDir === 'recues' ? (
                  pending.length > 0
                    ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {pending.map(r => (
                          <RequestRow key={r.id} r={r} onlineIds={onlineIds} loading={respondingId === r.id}
                            selected={selectedType === 'request' && selectedId === r.id}
                            onClick={() => { setSelectedType('request'); setSelectedId(r.id); openDetail() }}
                            onAccept={() => handleRespond(r.id, 'accept')}
                            onDecline={() => handleRespond(r.id, 'decline')}
                          />
                        ))}
                      </div>
                    : <EmptyList label="AUCUNE DEMANDE REÇUE" />
                ) : (
                  sent.length > 0
                    ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {sent.map(r => (
                          <SentRequestRow key={r.id} r={r} onlineIds={onlineIds} loading={respondingId === r.id}
                            selected={selectedType === 'sentRequest' && selectedId === r.id}
                            onClick={() => { setSelectedType('sentRequest'); setSelectedId(r.id); openDetail() }}
                            onCancel={() => handleCancel(r.id)}
                          />
                        ))}
                      </div>
                    : <EmptyList label="AUCUNE DEMANDE ENVOYÉE" />
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Détail (fil / demande + rail) — plein écran en mobile ──── */}
        <div className="rgg-inbox-detail">
          {selectedType === 'request' && selectedRequest ? (
            <RequestDetailPane
              r={selectedRequest} onlineIds={onlineIds} respondingId={respondingId}
              onAccept={() => handleRespond(selectedRequest.id, 'accept')}
              onDecline={() => handleRespond(selectedRequest.id, 'decline')}
              onBack={() => setMobileView('list')}
            />
          ) : selectedType === 'sentRequest' && selectedSent ? (
            <RequestDetailPane
              r={selectedSent} onlineIds={onlineIds} respondingId={respondingId}
              onAccept={() => {}} onDecline={() => {}}
              onBack={() => setMobileView('list')}
              sent onCancel={() => handleCancel(selectedSent.id)}
            />
          ) : selectedType === 'conversation' && selectedConv ? (
            <ChatPane
              conv={selectedConv} userId={userId} messages={messages} onlineIds={onlineIds}
              msgInput={msgInput} sending={sending} peerTyping={peerTyping}
              messagesEndRef={messagesEndRef}
              onInputChange={v => { setMsgInput(v); if (v) broadcastTyping() }}
              onSend={handleSendMessage}
              onBack={() => setMobileView('list')}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.16em' }}>SÉLECTIONNE UNE CONVERSATION</span>
            </div>
          )}

          {selectedType === 'request' && selectedRequest ? (
            <ContextRail
              className="rgg-inbox-rail"
              name={selectedRequest.sender.gameName ?? selectedRequest.sender.displayName ?? '—'}
              initials={(selectedRequest.sender.gameName ?? selectedRequest.sender.displayName ?? '—').slice(0,2).toUpperCase()}
              hue={nameHue(selectedRequest.sender.gameName ?? selectedRequest.sender.displayName ?? '—')}
              rankKey={selectedRequest.sender.rankKey}
              division={selectedRequest.sender.division}
              lp={selectedRequest.sender.lp}
              matchScore={selectedRequest.matchScore}
              mainRole={selectedRequest.sender.mainRole}
              rightRole={selectedRequest.sender.lookingFor}
              champPool={selectedRequest.sender.champPool}
              online={onlineIds.has(selectedRequest.sender.id)}
              pendingLabel="RIOT ID MASQUÉ · DEMANDE EN ATTENTE"
            />
          ) : selectedType === 'sentRequest' && selectedSent ? (
            <ContextRail
              className="rgg-inbox-rail"
              name={selectedSent.sender.gameName ?? selectedSent.sender.displayName ?? '—'}
              initials={(selectedSent.sender.gameName ?? selectedSent.sender.displayName ?? '—').slice(0,2).toUpperCase()}
              hue={nameHue(selectedSent.sender.gameName ?? selectedSent.sender.displayName ?? '—')}
              rankKey={selectedSent.sender.rankKey}
              division={selectedSent.sender.division}
              lp={selectedSent.sender.lp}
              matchScore={selectedSent.matchScore}
              mainRole={selectedSent.sender.mainRole}
              rightRole={selectedSent.sender.lookingFor}
              champPool={selectedSent.sender.champPool}
              online={onlineIds.has(selectedSent.sender.id)}
              pendingLabel="RIOT ID MASQUÉ · DEMANDE EN ATTENTE"
            />
          ) : selectedType === 'conversation' && selectedConv ? (
            <ContextRail
              className="rgg-inbox-rail"
              name={selectedConv.other.gameName ?? selectedConv.other.displayName ?? '—'}
              initials={(selectedConv.other.gameName ?? selectedConv.other.displayName ?? '—').slice(0,2).toUpperCase()}
              hue={nameHue(selectedConv.other.gameName ?? selectedConv.other.displayName ?? '—')}
              rankKey={selectedConv.other.rankKey}
              division={selectedConv.other.division}
              lp={selectedConv.other.lp}
              matchScore={selectedConv.matchScore}
              mainRole={selectedConv.other.mainRole}
              rightRole={currentUserRole}
              champPool={selectedConv.other.champPool}
              online={onlineIds.has(selectedConv.other.id)}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ── RequestDetailPane ─────────────────────────────────────────────────────
function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button className="rgg-inbox-back" onClick={onClick} style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.lineStrong}`, color: T.textDim, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
    </button>
  )
}

function RequestDetailPane({ r, onlineIds, respondingId, onAccept, onDecline, onBack, sent = false, onCancel }: {
  r: PendingRequest; onlineIds: Set<string>; respondingId: string | null
  onAccept: () => void; onDecline: () => void; onBack: () => void
  sent?: boolean; onCancel?: () => void
}) {
  const name    = r.sender.gameName ?? r.sender.displayName ?? '—'
  const init    = name.slice(0, 2).toUpperCase()
  const hue     = nameHue(name)
  const online  = onlineIds.has(r.sender.id)
  const rc      = ROLE_META[(r.sender.mainRole ?? 'FILL').toUpperCase()]?.c ?? T.textDim
  const rk      = r.sender.rankKey ?? 'iron'
  const rl      = rankLabel(r.sender.rankKey, r.sender.division)
  const rkColor = RANK_COLORS[rk] ?? '#9aa2bf'
  const wr      = r.sender.wins !== null && r.sender.losses !== null && (r.sender.wins + r.sender.losses) > 0
    ? Math.round((r.sender.wins / (r.sender.wins + r.sender.losses)) * 100) : null
  const poolCount = Object.values(r.sender.champPool).flat().length
  const loading   = respondingId === r.id

  return (
    <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px', borderBottom: `1px solid ${T.line}`, background: 'rgba(10,12,20,0.5)' }}>
        <BackBtn onClick={onBack} />
        <Avatar initials={init} size={44} rank={rk} hue={hue} online={online} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontFamily: T.display, fontSize: 19, color: T.text, letterSpacing: '0.03em' }}>{name}</span>
            <Pill mono accent={rkColor}>{rl}</Pill>
            {r.sender.mainRole && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 7px', borderRadius: 6, background: `${rc}1a`, border: `1px solid ${rc}40` }}>
                <RoleIcon role={r.sender.mainRole} size={11} active />
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: `${T.queue}18`, border: `1px solid ${T.queue}44`, fontFamily: T.mono, fontSize: 9.5, color: T.queue, letterSpacing: '0.12em' }}>EN ATTENTE</span>
          </div>
          <div style={{ marginTop: 4 }}><StatusDot online={online} /></div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '26px 24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', fontFamily: T.mono, fontSize: 9.5, color: T.textMute, letterSpacing: '0.16em', margin: '0 0 18px' }}>
          {formatTime(r.createdAt).toUpperCase()}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 999, background: `${T.cyan}14`, border: `1px solid ${T.cyan}40`, fontFamily: T.mono, fontSize: 10, color: T.cyan, letterSpacing: '0.14em' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.cyan} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            {sent ? <>TU AS ENVOYÉ UNE DEMANDE À {name.toUpperCase()}</> : <>{name.toUpperCase()} T&apos;A ENVOYÉ UNE DEMANDE DE DUO</>}
          </span>
        </div>
        {r.message && (
          <div style={{ display: 'flex', gap: 11, marginBottom: 22, maxWidth: 560 }}>
            <Avatar initials={init} size={34} rank={rk} hue={hue} online={false} />
            <div style={{ flex: 1 }}>
              <div style={{ padding: '13px 16px', borderRadius: '16px 16px 16px 4px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.line}`, color: T.text, fontFamily: T.body, fontSize: 14.5, lineHeight: 1.5 }}>
                {r.message}
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, marginTop: 4, letterSpacing: '0.08em' }}>{formatTime(r.createdAt)}</div>
            </div>
          </div>
        )}
        <div style={{ maxWidth: 560, borderRadius: 18, padding: 22, background: `linear-gradient(135deg, ${T.cyan}10, ${T.violet}0c)`, border: `1px solid ${T.cyan}2e` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <MatchRing value={r.matchScore ?? 0} size={70} stroke={5} accent={T.cyan} accent2={T.violet} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: T.display, fontSize: 18, color: T.text, letterSpacing: '0.02em' }}>Vous matchez à {r.matchScore ?? '—'}%</div>
              <div style={{ fontFamily: T.body, fontSize: 13, color: T.textDim, marginTop: 4, lineHeight: 1.45 }}>
                {r.sender.mainRole ?? '—'} · cherche un {r.sender.lookingFor ?? '—'} · {rl}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9, marginTop: 18 }}>
            <ReqStat label="LP"       value={r.sender.lp ?? '—'} />
            <ReqStat label="WIN RATE" value={wr !== null ? `${wr}%` : '—'} />
            <ReqStat label="POOL"     value={poolCount} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '11px 14px', borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.line}` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M19 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4" /></svg>
            <span style={{ fontFamily: T.body, fontSize: 12.5, color: T.textDim, lineHeight: 1.4 }}>
              {sent
                ? <>En attente de la réponse de <b style={{ color: T.text }}>{name}</b>. Le chat et les <b style={{ color: T.text }}>Riot ID</b> se débloquent à l&apos;acceptation.</>
                : <>En acceptant, le chat s&apos;ouvre et vos <b style={{ color: T.text }}>Riot ID</b> sont révélés des deux côtés.</>}
            </span>
          </div>
          {r.sender.gameName && r.sender.tagLine && (
            <Link href={`/u/${encodeURIComponent(r.sender.gameName)}/${encodeURIComponent(r.sender.tagLine)}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.lineStrong}`, color: T.textDim, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
              Voir le profil de {name}
            </Link>
          )}
          {sent ? (
            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              <button onClick={onCancel} disabled={loading} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.lineStrong}`, color: T.textDim, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: T.display, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' as const, opacity: loading ? 0.5 : 1 }}>
                {loading
                  ? <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${T.textDim}`, borderTopColor: 'transparent', animation: 'rgg-spin 0.7s linear infinite', display: 'inline-block' }} />
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth="2.6" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>}
                Annuler la demande
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              <button onClick={onDecline} disabled={loading} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.lineStrong}`, color: T.textDim, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: T.display, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' as const, opacity: loading ? 0.5 : 1 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth="2.6" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>Refuser
              </button>
              <button onClick={onAccept} disabled={loading} style={{ flex: 1.6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${T.live}, ${T.cyan})`, color: '#001018', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: T.display, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontWeight: 700, whiteSpace: 'nowrap', boxShadow: `0 14px 32px -12px ${T.live}`, opacity: loading ? 0.7 : 1 }}>
                {loading
                  ? <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #001018', borderTopColor: 'transparent', animation: 'rgg-spin 0.7s linear infinite', display: 'inline-block' }} />
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                }
                Accepter le duo
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0, padding: '14px 24px 18px', borderTop: `1px solid ${T.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: `1px dashed ${T.lineStrong}` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M19 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4" /></svg>
          <span style={{ fontFamily: T.body, fontSize: 13.5, color: T.textMute }}>{sent ? `En attente de la réponse de ${name} · le chat s'ouvre à l'acceptation.` : `Accepte la demande de ${name} pour débloquer le chat.`}</span>
        </div>
      </div>
    </div>
  )
}

// ── ChatPane ──────────────────────────────────────────────────────────────
function ChatPane({ conv, userId, messages, onlineIds, msgInput, sending, peerTyping, messagesEndRef, onInputChange, onSend, onBack }: {
  conv: Conversation; userId: string; messages: Message[]; onlineIds: Set<string>
  msgInput: string; sending: boolean; peerTyping: boolean
  messagesEndRef: React.RefObject<HTMLDivElement>
  onInputChange: (v: string) => void
  onSend: () => void
  onBack: () => void
}) {
  const name    = conv.other.gameName ?? conv.other.displayName ?? '—'
  const init    = name.slice(0, 2).toUpperCase()
  const hue     = nameHue(name)
  const online  = onlineIds.has(conv.other.id)
  const rk      = conv.other.rankKey ?? 'iron'
  const rl      = rankLabel(conv.other.rankKey, conv.other.division)
  const rkColor = RANK_COLORS[rk] ?? '#9aa2bf'
  const rc      = ROLE_META[(conv.other.mainRole ?? 'FILL').toUpperCase()]?.c ?? T.textDim
  // Riot ID révélé (conversation acceptée)
  const riotId  = conv.other.gameName && conv.other.tagLine ? `${conv.other.gameName}#${conv.other.tagLine}` : null

  const [copied, setCopied] = useState(false)
  function copyRiotId() {
    if (!riotId) return
    navigator.clipboard?.writeText(riotId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600) }).catch(() => {})
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() }
  }

  return (
    <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Thread header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px', borderBottom: `1px solid ${T.line}`, background: 'rgba(10,12,20,0.5)' }}>
        <BackBtn onClick={onBack} />
        <Avatar initials={init} size={44} rank={rk} hue={hue} online={online} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
            <span style={{ fontFamily: T.display, fontSize: 19, color: T.text, letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{name}</span>
            <span style={{ flexShrink: 0, display: 'inline-flex' }}><Pill mono accent={rkColor}>{rl}</Pill></span>
            {conv.other.mainRole && (
              <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 7px', borderRadius: 6, background: `${rc}1a`, border: `1px solid ${rc}40` }}>
                <RoleIcon role={conv.other.mainRole} size={11} active />
              </span>
            )}
          </div>
          <div style={{ marginTop: 4 }}><StatusDot online={online} /></div>
        </div>
        {/* Copier le Riot ID — icône seule en mobile (label masqué via CSS) */}
        {riotId && (
          <button className="rgg-chat-copyid" onClick={copyRiotId} title={`Copier ${riotId}`} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 16px', borderRadius: 11, border: 'none', cursor: 'pointer', background: copied ? `${T.live}1f` : `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: copied ? T.live : '#001018', fontFamily: T.display, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap', boxShadow: copied ? 'none' : `0 6px 16px -8px ${T.cyan}` }}>
            <svg style={{ flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
            <span className="rgg-chat-copyid-label">{copied ? 'Copié !' : 'Copier le Riot ID'}</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Bandeau acceptation */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 999, background: `${T.live}14`, border: `1px solid ${T.live}40`, fontFamily: T.mono, fontSize: 10, color: T.live, letterSpacing: '0.14em' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.live, boxShadow: `0 0 8px ${T.live}` }} />DEMANDE DE DUO ACCEPTÉE{conv.matchScore !== null ? ` · ${conv.matchScore}% MATCH` : ''}
          </span>
        </div>
        {/* Carte Riot ID révélé */}
        {riotId && (
          <div style={{ maxWidth: 460, alignSelf: 'center', width: '100%', borderRadius: 15, padding: 16, marginBottom: 18, background: `linear-gradient(135deg, ${T.live}14, ${T.cyan}10)`, border: `1px solid ${T.live}3a` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: T.mono, fontSize: 9.5, color: T.live, letterSpacing: '0.12em' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V7a5 5 0 0110 0M5 11h14v10H5z" /></svg>RIOT ID RÉVÉLÉ
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 12 }}>
              <span style={{ fontFamily: T.display, fontSize: 22, color: T.text, letterSpacing: '0.03em' }}>{conv.other.gameName}</span>
              <span style={{ fontFamily: T.mono, fontSize: 13, color: T.textDim }}>#{conv.other.tagLine}</span>
              <button onClick={copyRiotId} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 13px', borderRadius: 10, background: copied ? `${T.live}1f` : 'rgba(255,255,255,0.06)', border: `1px solid ${copied ? T.live + '66' : T.lineStrong}`, color: copied ? T.live : T.text, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></svg>{copied ? 'Copié' : 'Copier'}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 11, fontFamily: T.body, fontSize: 11.5, color: T.textDim, lineHeight: 1.4 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 6L9 17l-5-5" /></svg>Ajoute ce Riot ID dans League pour l&apos;inviter en partie.
            </div>
          </div>
        )}
        <div style={{ textAlign: 'center', fontFamily: T.mono, fontSize: 9.5, color: T.textMute, letterSpacing: '0.16em', margin: '0 0 10px' }}>AUJOURD&apos;HUI</div>
        {messages.filter(m => !(m.kind === 'system' && m.body.startsWith('DUO REQUEST ACCEPTED'))).map(m => (
          <Bubble key={m.id} m={m} isMe={m.sender_id === userId} otherInitials={init} otherHue={hue} otherRankKey={rk} />
        ))}
        {/* Typing indicator */}
        {peerTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 2px' }}>
            <Avatar initials={init} size={26} rank={rk} hue={hue} online={false} />
            <span style={{ display: 'inline-flex', gap: 3, padding: '9px 13px', borderRadius: '14px 14px 14px 4px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.line}` }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: T.textDim, animation: `df-dot 1.4s ${i * 0.2}s infinite` }} />
              ))}
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div style={{ flexShrink: 0, padding: '14px 24px 18px', borderTop: `1px solid ${T.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 8px 8px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.lineStrong}` }}>
          <input
            value={msgInput}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Message ${name}…`}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: T.body, fontSize: 14, color: T.text }}
          />
          <button
            onClick={onSend}
            disabled={sending || !msgInput.trim()}
            style={{ width: 44, height: 44, borderRadius: 11, border: 'none', cursor: sending || !msgInput.trim() ? 'not-allowed' : 'pointer', background: sending || !msgInput.trim() ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: sending || !msgInput.trim() ? 'none' : `0 6px 16px -8px ${T.cyan}`, transition: 'all .15s', flexShrink: 0 }}
          >
            {sending
              ? <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'transparent', animation: 'rgg-spin 0.7s linear infinite', display: 'inline-block' }} />
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={msgInput.trim() ? '#001018' : T.textMute} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg>
            }
          </button>
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, marginTop: 6, letterSpacing: '0.08em' }}>
          Entrée pour envoyer · Shift+Entrée pour sauter une ligne
        </div>
      </div>
    </div>
  )
}
