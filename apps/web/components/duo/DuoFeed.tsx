'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { championIconUrl } from '@/lib/riot/assets'
import MatchRing from '@/components/ui/MatchRing'
import RoleIcon, { ROLE_META } from '@/components/ui/RoleIcon'
import Avatar, { RANK_COLORS } from '@/components/ui/Avatar'
import StatusDot from '@/components/ui/StatusDot'
import DuoFilterPanel from '@/components/duo/DuoFilterPanel'
import DuoRequestModal, { type DuoRequestTarget, type DuoRequestMe } from '@/components/duo/DuoRequestModal'
import { usePresence } from '@/lib/hooks/usePresence'

// ── Design tokens ─────────────────────────────────────────────────────
const T = {
  bg: '#0a0c14', surface: '#0f121c', elevated: '#161a26',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6', live: '#00ff9d', gold: '#ffd166',
  danger: '#ff3d6e',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

// ── Types ─────────────────────────────────────────────────────────────

type RankRow = { tier: string; division: string | null; league_points: number; wins: number; losses: number; queue: string }

// Supabase retourne riot_accounts et matching_prefs comme objets simples
// (pas tableaux) car profile_id est unique/PK dans ces tables.
type CandidateProfile = {
  id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  riot_accounts: {
    id: string
    game_name: string
    tag_line: string
    profile_icon_id: number | null
    ranks: RankRow[]
  } | null
  matching_prefs: {
    main_roles: string[]
    looking_for_roles: string[]
    languages: string[]
    playstyles: string[]
    goals: string[]
  } | null
}

type FeedRow = {
  candidate_id: string
  score: number
  elo_score: number
  schedule_score: number
  language_score: number
  style_score: number
  role_note: string
  elo_note: string
  schedule_note: string
  language_note: string
  candidate_role: string | null
  match_on: string | null
  is_degraded: boolean
}

type DuoItem = FeedRow & { profile: CandidateProfile | null }

type Filters = {
  role: string[] | null
  rankFloor: string | null
  rankCeiling: string | null
  voice: boolean | null
  region: string | null
}

// Statut de la demande entre le user courant et le candidat sélectionné
type RequestInfo = {
  id: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  fromMe: boolean
  conversationId: string | null
} | null

// ── Helpers ───────────────────────────────────────────────────────────

function nameHue(s: string) {
  let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h
}
function playerName(p: CandidateProfile | null) {
  return p?.riot_accounts?.game_name ?? p?.display_name ?? '—'
}
function playerInitials(p: CandidateProfile | null) {
  return playerName(p).slice(0, 2).toUpperCase()
}
function soloRank(p: CandidateProfile | null): RankRow | null {
  return p?.riot_accounts?.ranks?.find(r => r.queue === 'RANKED_SOLO_5x5') ?? null
}

// ── DSynergy ──────────────────────────────────────────────────────────
function DSynergy({ label, value, note, color }: {
  label: string; value: number; note: string; color: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontFamily: T.body, fontSize: 13, color: T.textDim, fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.06em' }}>{note}</span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{
          width: `${Math.max(0, Math.min(value, 100))}%`, height: '100%', borderRadius: 4,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 10px ${color}80`,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

// ── Pill ──────────────────────────────────────────────────────────────
function Pill({ children, accent, mono = false, dim = false, size = 'md' }: {
  children: React.ReactNode; accent?: string; mono?: boolean; dim?: boolean; size?: 'sm' | 'md'
}) {
  const padY = size === 'sm' ? 3 : 5
  const padX = size === 'sm' ? 8 : 10
  const fs   = size === 'sm' ? 10 : 11
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: `${padY}px ${padX}px`, borderRadius: 999,
      background: accent ? `${accent}1f` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${accent ? accent + '40' : T.line}`,
      color: accent ?? (dim ? T.textDim : T.text),
      fontFamily: mono ? T.mono : T.body,
      fontSize: fs, fontWeight: 600,
      letterSpacing: mono ? '0.08em' : '0.02em',
      textTransform: mono ? 'uppercase' : 'none', whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.22em' }}>
      {children}
    </div>
  )
}

// ── AvailabilityHeat ──────────────────────────────────────────────────
function AvailabilityHeat({ slots }: {
  slots: { weekday: number; slot: number; intensity: number }[]
}) {
  const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  const heat = ['rgba(255,255,255,0.04)', `${T.cyan}26`, `${T.cyan}55`, `${T.cyan}aa`]
  const grid = Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 6 }, (_, s) =>
      slots.find(a => a.weekday === day && a.slot === s)?.intensity ?? 0
    )
  )
  return (
    <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
      {grid.map((col, di) => (
        <div key={di} style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
          {col.map((v, si) => (
            <div key={si} style={{
              width: 30, height: 16, borderRadius: 4,
              background: heat[v] ?? heat[0],
              border: `1px solid ${v ? T.cyan + '33' : T.line}`,
            }} />
          ))}
          <span style={{ fontFamily: T.mono, fontSize: 8.5, color: T.textMute, letterSpacing: '0.08em', marginTop: 3 }}>
            {DAYS[di]}
          </span>
        </div>
      ))}
      <div style={{ marginLeft: 'auto', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 18 }}>
        <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute }}>LESS</span>
        {heat.map((h, i) => (
          <span key={i} style={{ width: 12, height: 12, borderRadius: 3, background: h, border: `1px solid ${T.line}` }} />
        ))}
        <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute }}>MORE</span>
      </div>
    </div>
  )
}

// ── DuoFeedRow ────────────────────────────────────────────────────────
function DuoFeedRow({ item, selected, online, onClick }: {
  item: DuoItem; selected: boolean; online: boolean; onClick: () => void
}) {
  const p = item.profile
  const name = playerName(p)
  const init = playerInitials(p)
  const hue  = nameHue(name)
  const rank = soloRank(p)
  const rankKey   = rank?.tier?.toLowerCase() ?? 'iron'
  const rankColor = RANK_COLORS[rankKey] ?? '#9aa2bf'
  const role    = item.candidate_role ?? p?.matching_prefs?.main_roles?.[0] ?? 'FILL'
  const looking = p?.matching_prefs?.looking_for_roles?.[0] ?? 'FILL'
  const roleMeta    = ROLE_META[role?.toUpperCase()]    ?? ROLE_META.FILL
  const lookingMeta = ROLE_META[looking?.toUpperCase()] ?? ROLE_META.FILL
  const tierLabel = rank ? `${rank.tier.slice(0,3)} ${rank.division ?? ''}`.trim() : 'UNRANKED'
  const lp        = rank?.league_points ?? 0

  return (
    <button onClick={onClick} style={{
      position: 'relative', display: 'flex', alignItems: 'center', gap: 13, width: '100%',
      padding: '13px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
      background: selected ? `linear-gradient(100deg, ${T.cyan}1c, ${T.violet}10)` : 'rgba(255,255,255,0.022)',
      border: `1px solid ${selected ? T.cyan + '66' : T.line}`,
      boxShadow: selected ? `0 8px 26px -12px ${T.cyan}, inset 0 0 0 1px ${T.cyan}22` : 'none',
      transition: 'background .14s, border-color .14s',
    }}>
      {selected && (
        <span style={{
          position: 'absolute', left: -1, top: 14, bottom: 14, width: 3, borderRadius: 3,
          background: `linear-gradient(${T.cyan},${T.violet})`,
          boxShadow: `0 0 10px ${T.cyan}`,
        }} />
      )}
      <Avatar initials={init} size={46} rank={rankKey} hue={hue} online={online} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, lineHeight: 1 }}>
          <span style={{ fontFamily: T.display, fontSize: 16, color: T.text, letterSpacing: '0.04em' }}>{name}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 6px', borderRadius: 6, background: `${roleMeta.c}1a`, border: `1px solid ${roleMeta.c}40` }}>
            <RoleIcon role={role} size={11} active />
          </span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 6px', borderRadius: 6, background: `${lookingMeta.c}14`, border: `1px solid ${lookingMeta.c}33` }}>
            <RoleIcon role={looking} size={11} active />
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
          <Pill mono size="sm" accent={rankColor}>{tierLabel}</Pill>
          <span style={{ fontFamily: T.mono, fontSize: 9.5, color: T.textDim, letterSpacing: '0.08em' }}>{lp} LP</span>
          <StatusDot state={online ? 'online' : 'offline'} />
          {item.is_degraded && (
            <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.08em', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.line}` }}>HORS RÔLE</span>
          )}
        </div>
      </div>
      <MatchRing value={item.score} size={52} stroke={4} accent={T.cyan} accent2={T.violet} />
    </button>
  )
}

// ── PoolGroup — port exact de desktop/profile.jsx ─────────────────────
function PoolGroup({ role, label, champIds, masteryMap }: {
  role: string
  label: 'PRINCIPAL' | 'SECONDAIRE'
  champIds: string[]
  masteryMap: Record<string, { level: number; points: number }>
}) {
  const rc = ROLE_META[role]?.c ?? T.cyan

  function masteryLabel(id: string) {
    const m = masteryMap[id]
    if (!m) return '—'
    const pts = m.points > 1000 ? ` · ${Math.round(m.points / 1000)}k` : ''
    return `M${m.level}${pts}`
  }

  return (
    <div style={{ borderRadius: 16, padding: 18, background: `linear-gradient(135deg, ${rc}10, transparent 72%)`, border: `1px solid ${rc}33` }}>
      {/* Header : icône rôle + nom + badge PRINCIPAL/SECONDAIRE + compteur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, background: `${rc}1c`, border: `1px solid ${rc}55` }}>
          <RoleIcon role={role} size={18} active />
        </span>
        <span style={{ fontFamily: T.display, fontSize: 19, color: T.text, letterSpacing: '0.03em' }}>
          {ROLE_META[role]?.name ?? role}
        </span>
        <span style={{ fontFamily: T.mono, fontSize: 8.5, color: rc, letterSpacing: '0.16em', padding: '3px 8px', borderRadius: 6, background: `${rc}18`, border: `1px solid ${rc}40` }}>
          {label}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.1em' }}>
          {champIds.length} CHAMPS
        </span>
      </div>
      {/* Grille de champions */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {champIds.map((id, i) => (
          <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 70, height: 70, borderRadius: 12, overflow: 'hidden', background: '#161a26',
              border: `1.5px solid ${i === 0 ? rc : rc + '55'}`,
              boxShadow: i === 0 ? `0 0 0 2px ${rc}, 0 0 14px ${rc}66` : 'none',
            }}>
              <img src={championIconUrl(id)} alt={id} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ fontFamily: T.mono, fontSize: 8.5, color: i === 0 ? rc : T.textMute, letterSpacing: '0.04em' }}>
              {masteryLabel(id)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── DuoDetailPane ─────────────────────────────────────────────────────
function DuoDetailPane({ item, avail, champPool, masteryMap, online, requestInfo, onOpenRequest, onAccept, onDecline, onMessage }: {
  item: DuoItem
  avail: { weekday: number; slot: number; intensity: number }[]
  champPool: Record<string, string[]>
  masteryMap: Record<string, { level: number; points: number }>
  online: boolean
  requestInfo: RequestInfo
  onOpenRequest: () => void
  onAccept: (requestId: string) => void
  onDecline: (requestId: string) => void
  onMessage: (conversationId: string) => void
}) {
  const p = item.profile
  const name = playerName(p)
  const init = playerInitials(p)
  const hue  = nameHue(name)
  const tag  = p?.riot_accounts?.tag_line ? `#${p.riot_accounts.tag_line}` : ''
  const rank = soloRank(p)
  const rankKey   = rank?.tier?.toLowerCase() ?? 'iron'
  const rankColor = RANK_COLORS[rankKey] ?? '#9aa2bf'
  const rankLabel = rank ? `${rank.tier} ${rank.division ?? ''} · ${rank.league_points} LP`.trim() : 'UNRANKED'
  const role    = item.candidate_role ?? p?.matching_prefs?.main_roles?.[0] ?? 'FILL'
  const looking = p?.matching_prefs?.looking_for_roles?.[0] ?? 'FILL'
  const roleMeta    = ROLE_META[role?.toUpperCase()]    ?? ROLE_META.FILL
  const lookingMeta = ROLE_META[looking?.toUpperCase()] ?? ROLE_META.FILL
  const playstyles  = p?.matching_prefs?.playstyles ?? []
  const roleFitScore = item.is_degraded ? 0 : 100
  const candidateRank = soloRank(p)
  const total = (candidateRank?.wins ?? 0) + (candidateRank?.losses ?? 0)
  const wr = total > 0 ? Math.round(((candidateRank?.wins ?? 0) / total) * 100) : '—'

  // ── CTA logic selon le statut de la demande
  const ri = requestInfo
  const isAccepted = ri?.status === 'accepted'
  const isPendingFromMe = ri?.status === 'pending' && ri.fromMe
  const isPendingToMe   = ri?.status === 'pending' && !ri.fromMe

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Scrollable body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 34px 18px' }}>

        {/* Hero */}
        <div style={{ position: 'relative', display: 'flex', gap: 22, alignItems: 'flex-start' }}>
          <div style={{ position: 'absolute', top: -28, left: -10, width: 220, height: 170, background: `radial-gradient(circle, ${T.cyan}33, transparent 70%)`, filter: 'blur(36px)', pointerEvents: 'none' }} />
          <Avatar initials={init} size={92} rank={rankKey} hue={hue} online={online} />
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            {(() => {
              const profileGameName = p?.riot_accounts?.game_name
              const profileTagLine  = p?.riot_accounts?.tag_line
              const profileHref = profileGameName && profileTagLine
                ? `/u/${encodeURIComponent(profileGameName)}/${encodeURIComponent(profileTagLine)}`
                : null
              return profileHref ? (
                <a href={profileHref} title="Voir la fiche complète"
                  style={{ position: 'absolute', top: 0, right: 0, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderRadius: 11, textDecoration: 'none', cursor: 'pointer', background: `${T.cyan}1c`, border: `1.5px solid ${T.cyan}`, color: T.cyan, boxShadow: `0 0 0 4px ${T.cyan}14`, fontFamily: T.mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Voir le profil complet
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.cyan} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
                </a>
              ) : null
            })()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 230 }}>
              <span style={{ fontFamily: T.display, fontSize: 34, color: T.text, letterSpacing: '0.02em', lineHeight: 1 }}>{name}</span>
              {tag && <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim, letterSpacing: '0.1em' }}>{tag}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <Pill mono accent={rankColor}>{rankLabel}</Pill>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, background: `${roleMeta.c}1a`, border: `1px solid ${roleMeta.c}44` }}>
                <RoleIcon role={role} size={14} active />
                <span style={{ fontFamily: T.mono, fontSize: 11, color: roleMeta.c, letterSpacing: '0.1em', fontWeight: 700 }}>{roleMeta.name}</span>
              </span>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim, letterSpacing: '0.06em' }}>looking for</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, background: `${lookingMeta.c}14`, border: `1px solid ${lookingMeta.c}33` }}>
                <RoleIcon role={looking} size={14} active />
                <span style={{ fontFamily: T.mono, fontSize: 11, color: lookingMeta.c, letterSpacing: '0.1em', fontWeight: 700 }}>{lookingMeta.name}</span>
              </span>
              <StatusDot state={online ? 'online' : 'offline'} />
            </div>
            {p?.bio && <p style={{ margin: '16px 0 0', fontSize: 14.5, lineHeight: 1.6, color: T.textDim, maxWidth: 560 }}>&ldquo;{p.bio}&rdquo;</p>}
          </div>
        </div>

        {/* two-col body */}
        <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 18 }}>

          {/* WHY YOU MATCH */}
          <div style={{ gridColumn: '1 / -1', borderRadius: 18, padding: 22, background: `linear-gradient(135deg, ${T.cyan}12, ${T.violet}12)`, border: `1px solid ${T.cyan}2e` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <MatchRing value={item.score} size={104} stroke={6} accent={T.cyan} accent2={T.violet} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.cyan, letterSpacing: '0.24em' }}>◢ COMPATIBILITY ENGINE</div>
                <div style={{ fontFamily: T.display, fontSize: 22, color: T.text, letterSpacing: '0.02em', marginTop: 4 }}>WHY YOU TWO CLICK</div>
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 26px' }}>
                  <DSynergy label="Role fit"  value={roleFitScore}        note={item.role_note}      color={T.cyan}   />
                  <DSynergy label="Elo range" value={item.elo_score}      note={item.elo_note}       color={T.live}   />
                  <DSynergy label="Schedule"  value={item.schedule_score} note={item.schedule_note}  color={T.violet} />
                  <DSynergy label="Languages" value={item.language_score} note={item.language_note}  color={T.gold}   />
                </div>
              </div>
            </div>
          </div>

          {/* WIN RATE */}
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: `1px solid ${T.line}` }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.2em' }}>WIN RATE</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 6 }}>
              <span style={{ fontFamily: T.display, fontSize: 28, color: T.live, letterSpacing: '0.01em', lineHeight: 1 }}>{wr}</span>
              {typeof wr === 'number' && <span style={{ fontFamily: T.display, fontSize: 15, color: T.live, opacity: 0.7 }}>%</span>}
            </div>
          </div>

          {/* KDA */}
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: `1px solid ${T.line}` }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.2em' }}>KDA</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 6 }}>
              <span style={{ fontFamily: T.display, fontSize: 28, color: T.cyan, letterSpacing: '0.01em', lineHeight: 1 }}>—</span>
            </div>
          </div>

          {/* Champion pool par rôle — port de PoolGroup (desktop/profile.jsx) */}
          {(() => {
            const mainRoles = p?.matching_prefs?.main_roles ?? []
            const labels: Record<string, 'PRINCIPAL' | 'SECONDAIRE'> = {
              ...(mainRoles[0] ? { [mainRoles[0]]: 'PRINCIPAL' } : {}),
              ...(mainRoles[1] ? { [mainRoles[1]]: 'SECONDAIRE' } : {}),
            }
            // Ordre : main role d'abord, secondaire ensuite
            const orderedRoles = mainRoles.filter(r => (champPool[r] ?? []).length > 0)
            if (orderedRoles.length === 0) return null
            const totalChamps = orderedRoles.reduce((n, r) => n + (champPool[r]?.length ?? 0), 0)
            return (
              <div style={{ gridColumn: '1 / -1' }}>
                {/* Header section */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <SectionLabel>CHAMPION POOL</SectionLabel>
                  <span style={{ fontFamily: T.mono, fontSize: 9.5, color: T.textMute, letterSpacing: '0.1em' }}>
                    {totalChamps} CHAMPS · {orderedRoles.length} RÔLE{orderedRoles.length > 1 ? 'S' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {orderedRoles.map(r => (
                    <PoolGroup
                      key={r}
                      role={r}
                      label={labels[r] ?? 'PRINCIPAL'}
                      champIds={champPool[r] ?? []}
                      masteryMap={masteryMap}
                    />
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Playstyle */}
          {playstyles.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <SectionLabel>PLAYSTYLE</SectionLabel>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {playstyles.map(s => <Pill key={s} mono accent={T.cyan}>{s}</Pill>)}
                <Pill mono dim>RANKED</Pill>
                {total > 0 && <Pill mono dim>{total} GAMES</Pill>}
              </div>
            </div>
          )}

          {/* Availability */}
          {avail.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <SectionLabel>AVAILABILITY · THIS WEEK</SectionLabel>
              <AvailabilityHeat slots={avail} />
            </div>
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 34px', borderTop: `1px solid ${T.lineStrong}`, background: 'rgba(10,12,20,0.86)', backdropFilter: 'blur(14px)' }}>

        {/* ── Cas 1 : pas de demande active → boutons standard */}
        {!ri && (
          <>
            <button onClick={onOpenRequest} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: '#001018', fontFamily: T.display, fontSize: 14, letterSpacing: '0.1em', boxShadow: `0 0 0 1px ${T.cyan}66, 0 8px 24px -8px ${T.cyan}80` }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              Send duo request
            </button>
            <button disabled style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '13px 18px', borderRadius: 10, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.line}`, color: T.textMute, fontFamily: T.body, fontSize: 14, fontWeight: 600, opacity: 0.5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 01-11.5 7.2L4 21l1.8-5.5A8 8 0 1121 12z" /></svg>
              Message
            </button>
          </>
        )}

        {/* ── Cas 2 : demande envoyée par moi, en attente */}
        {isPendingFromMe && (
          <>
            <button disabled style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 22px', borderRadius: 10, cursor: 'not-allowed', background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.lineStrong}`, color: T.textDim, fontFamily: T.display, fontSize: 14, letterSpacing: '0.1em' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              Demande envoyée
            </button>
            <button disabled style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '13px 18px', borderRadius: 10, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.line}`, color: T.textMute, fontFamily: T.body, fontSize: 14, fontWeight: 600, opacity: 0.5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 01-11.5 7.2L4 21l1.8-5.5A8 8 0 1121 12z" /></svg>
              Message
            </button>
          </>
        )}

        {/* ── Cas 3 : cette personne m'a envoyé une demande */}
        {isPendingToMe && ri && (
          <>
            <button onClick={() => onAccept(ri.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.live}cc, ${T.cyan})`, color: '#001810', fontFamily: T.display, fontSize: 14, letterSpacing: '0.1em', boxShadow: `0 0 0 1px ${T.live}66, 0 8px 24px -8px ${T.live}60` }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#001810" strokeWidth="2.8" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              Accepter
            </button>
            <button onClick={() => onDecline(ri.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '13px 18px', borderRadius: 10, cursor: 'pointer', background: `${T.danger}18`, border: `1px solid ${T.danger}55`, color: T.danger, fontFamily: T.body, fontSize: 14, fontWeight: 600 }}>
              Refuser
            </button>
          </>
        )}

        {/* ── Cas 4 : duo accepté → Message débloqué */}
        {isAccepted && ri && (
          <>
            <button disabled style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 22px', borderRadius: 10, cursor: 'not-allowed', background: `${T.live}18`, border: `1px solid ${T.live}44`, color: T.live, fontFamily: T.display, fontSize: 14, letterSpacing: '0.1em' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              Duo actif
            </button>
            <button onClick={() => ri.conversationId && onMessage(ri.conversationId)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '13px 18px', borderRadius: 10, cursor: 'pointer', background: `${T.cyan}14`, border: `1px solid ${T.cyan}55`, color: T.cyan, fontFamily: T.body, fontSize: 14, fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 01-11.5 7.2L4 21l1.8-5.5A8 8 0 1121 12z" /></svg>
              Message
            </button>
          </>
        )}

        {/* Save / Skip icons */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          {[['M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z', T.textDim], ['M18 6L6 18M6 6l12 12', T.danger]].map(([d, stroke], i) => (
            <button key={i} style={{ width: 48, height: 48, borderRadius: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.lineStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══ Hub MOBILE (≤859px) — cartes dépliables, switcher, bottom-sheet ══════
type MobileProps = {
  className?: string
  items: DuoItem[]
  loading: boolean
  error: boolean
  onlineIds: Set<string>
  filters: Filters
  chips: { id: string; label: string; role?: string }[]
  removeChip: (id: string) => void
  onApplyFilters: (f: Filters) => void
  onRetry: () => void
  selectedId: string | null
  onToggleCard: (id: string) => void
  detailPool: Record<string, string[]>
  detailRequest: RequestInfo
  onOpenRequest: () => void
  onAccept: (id: string) => void
  onDecline: (id: string) => void
  onMessage: (conversationId: string) => void
  onSkip: (id: string) => void
}

const MODES = [
  { key: 'duo' as const, label: 'Duo' },
  { key: 'teams' as const, label: 'Teams' },
  { key: '1v1' as const, label: '1v1' },
]
const ELO_OPTS: { label: string; tier: string }[] = [
  { label: 'PLAT+', tier: 'PLATINUM' },
  { label: 'EME+', tier: 'EMERALD' },
  { label: 'DIA+', tier: 'DIAMOND' },
  { label: 'MASTER+', tier: 'MASTER' },
]
const REGION_OPTS = ['EUW', 'EUNE', 'NA', 'KR']
const LANG_OPTS = ['fr', 'en', 'es', 'de', 'it']

function MStatus({ online }: { online: boolean }) {
  const c = online ? T.live : T.textMute
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: T.mono, fontSize: 9, letterSpacing: '0.1em', color: c }}>
      <i style={{ width: 7, height: 7, borderRadius: '50%', background: c, boxShadow: online ? `0 0 8px ${c}` : 'none' }} />
      {online ? 'EN LIGNE' : 'HORS LIGNE'}
    </span>
  )
}

function MFopt({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <span onClick={onClick} style={{
      padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
      fontFamily: T.mono, fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
      background: on ? `${T.cyan}24` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${on ? T.cyan + '73' : T.lineStrong}`,
      color: on ? T.cyan : T.textDim,
    }}>{children}</span>
  )
}

function MToggle({ on, onClick, title, hint }: { on: boolean; onClick: () => void; title: string; hint: string }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16, padding: '13px 15px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.line}`, cursor: 'pointer' }}>
      <div>
        <div style={{ fontSize: 13.5, color: T.text, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 11, color: T.textMute, marginTop: 2 }}>{hint}</div>
      </div>
      <span style={{ width: 44, height: 26, borderRadius: 14, position: 'relative', flexShrink: 0, transition: 'background .2s', background: on ? T.cyan : 'rgba(255,255,255,0.1)' }}>
        <i style={{ position: 'absolute', top: 3, left: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'transform .2s', transform: on ? 'translateX(18px)' : 'none' }} />
      </span>
    </div>
  )
}

function MFsec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 18 }}>
      <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.14em' }}>{label}</span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 11 }}>{children}</div>
    </div>
  )
}

function MSkel() {
  return (
    <div className="dm-skel" style={{ borderRadius: 16, padding: 15, background: T.surface, border: `1px solid ${T.line}`, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <span className="dm-sk" style={{ width: 50, height: 50, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <span className="dm-sk" style={{ display: 'block', height: 12, width: '44%', borderRadius: 8 }} />
          <span className="dm-sk" style={{ display: 'block', height: 10, width: '64%', borderRadius: 8, marginTop: 10 }} />
        </div>
        <span className="dm-sk" style={{ width: 50, height: 50, borderRadius: '50%' }} />
      </div>
    </div>
  )
}

function MCard({ item, online, expanded, pool, request, onToggle, onOpenRequest, onAccept, onDecline, onMessage, onSkip }: {
  item: DuoItem; online: boolean; expanded: boolean
  pool: Record<string, string[]>; request: RequestInfo
  onToggle: () => void; onOpenRequest: () => void
  onAccept: (id: string) => void; onDecline: (id: string) => void; onMessage: (c: string) => void; onSkip: (id: string) => void
}) {
  const p = item.profile
  const name = playerName(p)
  const init = playerInitials(p)
  const hue = nameHue(name)
  const tag = p?.riot_accounts?.tag_line ? `#${p.riot_accounts.tag_line}` : ''
  const rank = soloRank(p)
  const rankKey = rank?.tier?.toLowerCase() ?? 'iron'
  const rankColor = RANK_COLORS[rankKey] ?? '#9aa2bf'
  const rankLabel = rank ? `${rank.tier} ${rank.division ?? ''} · ${rank.league_points} LP`.trim() : 'UNRANKED'
  const role = item.candidate_role ?? p?.matching_prefs?.main_roles?.[0] ?? 'FILL'
  const looking = p?.matching_prefs?.looking_for_roles?.[0] ?? 'FILL'
  const roleMeta = ROLE_META[role?.toUpperCase()] ?? ROLE_META.FILL
  const lookingMeta = ROLE_META[looking?.toUpperCase()] ?? ROLE_META.FILL
  const playstyles = p?.matching_prefs?.playstyles ?? []
  const total = (rank?.wins ?? 0) + (rank?.losses ?? 0)
  const wr = total > 0 ? Math.round(((rank?.wins ?? 0) / total) * 100) : null
  const poolRole = (pool[role] && pool[role].length ? role : Object.keys(pool).find(k => pool[k]?.length)) ?? role
  const poolIds = expanded ? (pool[poolRole] ?? []) : []

  const ri = request
  const isAccepted = ri?.status === 'accepted'
  const isPendingFromMe = ri?.status === 'pending' && ri.fromMe
  const isPendingToMe = ri?.status === 'pending' && !ri.fromMe

  const syn = [
    { l: 'Rôle', n: item.role_note, v: item.is_degraded ? 45 : 96, c: T.cyan },
    { l: 'Elo', n: item.elo_note, v: item.elo_score, c: T.live },
    { l: 'Horaires', n: item.schedule_note, v: item.schedule_score, c: T.violet },
    { l: 'Langues', n: item.language_note, v: item.language_score, c: T.gold },
  ]

  return (
    <article className={`dm-card${expanded ? ' open' : ''}`} style={{ borderRadius: 16, background: `linear-gradient(180deg, ${T.surface}, ${T.bg})`, border: `1px solid ${expanded ? T.cyan + '61' : T.line}`, overflow: 'hidden', marginTop: 12, boxShadow: expanded ? `0 10px 30px -16px ${T.cyan}` : 'none', transition: 'border-color .15s' }}>
      {/* compact row */}
      <div onClick={onToggle} role="button" aria-expanded={expanded} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 15, cursor: 'pointer' }}>
        <Avatar initials={init} size={50} rank={rankKey} hue={hue} online={online} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', lineHeight: 1 }}>
            <span style={{ fontFamily: T.display, fontSize: 18, color: T.text, letterSpacing: '0.03em' }}>{name}</span>
            {tag && <span style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textDim }}>{tag}</span>}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 6, background: `${roleMeta.c}1a`, border: `1px solid ${roleMeta.c}40` }}><RoleIcon role={role} size={11} active /></span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2.6" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 6, background: `${lookingMeta.c}14`, border: `1px solid ${lookingMeta.c}33` }}><RoleIcon role={looking} size={11} active /></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 8, flexWrap: 'wrap' }}>
            <Pill mono size="sm" accent={rankColor}>{rankLabel}</Pill>
            <MStatus online={online} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <MatchRing value={item.score} size={50} stroke={4} accent={T.cyan} accent2={T.violet} />
          <svg className={`dm-chev${expanded ? ' open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={expanded ? T.cyan : T.textMute} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </div>
      </div>

      {/* detail */}
      <div className={`dm-detail${expanded ? ' open' : ''}`}>
        <div className="dm-detail-in">
          <div style={{ padding: '4px 15px 16px' }}>
            {p?.bio && <p style={{ margin: '0 0 16px', fontSize: 13.5, lineHeight: 1.55, color: T.textDim, fontStyle: 'italic', paddingTop: 14, borderTop: `1px solid ${T.line}` }}>&ldquo;{p.bio}&rdquo;</p>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', ...(p?.bio ? {} : { paddingTop: 14, borderTop: `1px solid ${T.line}` }) }}>
              {syn.map(s => (
                <div key={s.l}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontSize: 12.5, color: T.textDim, fontWeight: 500 }}>{s.l}</span>
                    <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.04em' }}>{s.n}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(0, Math.min(s.v, 100))}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${s.c}, ${s.c}b3)` }} />
                  </div>
                </div>
              ))}
            </div>

            {poolIds.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <span style={{ fontFamily: T.mono, fontSize: 9.5, color: T.textDim, letterSpacing: '0.2em' }}>CHAMPION POOL · {(ROLE_META[poolRole]?.name ?? poolRole).toUpperCase()}</span>
                <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 11 }}>
                  {poolIds.slice(0, 6).map((id, i) => (
                    <span key={id} style={{ width: 46, height: 46, borderRadius: 11, overflow: 'hidden', background: '#161a26', border: `1px solid ${i === 0 ? T.cyan + '8c' : T.line}`, boxShadow: i === 0 ? `0 0 12px ${T.cyan}47` : 'none' }}>
                      <img src={championIconUrl(id)} alt={id} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(playstyles.length > 0 || wr !== null) && (
              <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {playstyles.map(s => <span key={s} style={{ fontFamily: T.mono, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', padding: '6px 12px', borderRadius: 999, background: `${T.cyan}1f`, border: `1px solid ${T.cyan}61`, color: T.cyan }}>{s}</span>)}
                {wr !== null && <span style={{ fontFamily: T.mono, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.line}`, color: T.textDim }}>{wr}% WR</span>}
                {total > 0 && <span style={{ fontFamily: T.mono, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.line}`, color: T.textDim }}>{total} games</span>}
              </div>
            )}

            {/* actions */}
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => onSkip(item.candidate_id)} aria-label="Passer" style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 13, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.lineStrong}`, color: T.textDim, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>

              {isPendingToMe && ri ? (
                <>
                  <button onClick={() => onDecline(ri.id)} style={{ padding: '0 14px', height: 48, borderRadius: 13, background: `${T.danger}18`, border: `1px solid ${T.danger}55`, color: T.danger, fontFamily: T.body, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Refuser</button>
                  <button onClick={() => onAccept(ri.id)} style={{ flex: 1, height: 48, borderRadius: 13, border: 'none', background: `linear-gradient(135deg, ${T.live}cc, ${T.cyan})`, color: '#001810', fontFamily: T.display, fontSize: 13, letterSpacing: '0.03em', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer' }}>Accepter</button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => isAccepted && ri?.conversationId && onMessage(ri.conversationId)}
                    disabled={!isAccepted}
                    style={{ padding: '0 14px', height: 48, borderRadius: 13, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.lineStrong}`, color: isAccepted ? T.text : T.textMute, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: isAccepted ? 'pointer' : 'not-allowed', opacity: isAccepted ? 1 : 0.5, fontFamily: T.display, fontSize: 12, letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                    Message
                  </button>
                  {isAccepted ? (
                    <span style={{ flex: 1, height: 48, borderRadius: 13, background: `${T.live}18`, border: `1px solid ${T.live}44`, color: T.live, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: T.display, fontSize: 13, letterSpacing: '0.03em', textTransform: 'uppercase', fontWeight: 700 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>Duo actif
                    </span>
                  ) : isPendingFromMe ? (
                    <span style={{ flex: 1, height: 48, borderRadius: 13, background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.lineStrong}`, color: T.textDim, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: T.display, fontSize: 13, letterSpacing: '0.03em', textTransform: 'uppercase', fontWeight: 700 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>Demande envoyée
                    </span>
                  ) : (
                    <button onClick={onOpenRequest} style={{ flex: 1, height: 48, borderRadius: 13, border: 'none', background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: '#001018', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: T.display, fontSize: 13, letterSpacing: '0.03em', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer', boxShadow: `0 12px 30px -14px ${T.cyan}` }}>
                      Envoyer un duo
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function DuoFeedMobile(props: MobileProps) {
  const { items, loading, error, onlineIds, filters, chips, removeChip, onApplyFilters, onRetry,
    selectedId, onToggleCard, detailPool, detailRequest, onOpenRequest, onAccept, onDecline, onMessage, onSkip } = props

  const [mode, setMode] = useState<'duo' | 'teams' | '1v1'>('duo')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [langs, setLangs] = useState<string[]>([])
  const [queueOnly, setQueueOnly] = useState(false)
  // sheet draft
  const [dRole, setDRole] = useState<string[]>([])
  const [dFloor, setDFloor] = useState<string | null>(null)
  const [dRegion, setDRegion] = useState<string | null>(null)
  const [dVoice, setDVoice] = useState(false)
  const [dLangs, setDLangs] = useState<string[]>([])
  const [dQueue, setDQueue] = useState(false)

  function openSheet() {
    setDRole(filters.role ?? [])
    setDFloor(filters.rankFloor)
    setDRegion(filters.region)
    setDVoice(filters.voice === true)
    setDLangs(langs)
    setDQueue(queueOnly)
    setSheetOpen(true)
  }
  function applySheet() {
    onApplyFilters({ role: dRole.length ? dRole : null, rankFloor: dFloor, rankCeiling: filters.rankCeiling ?? null, voice: dVoice ? true : null, region: dRegion })
    setLangs(dLangs)
    setQueueOnly(dQueue)
    setSheetOpen(false)
  }
  function resetSheet() { setDRole([]); setDFloor(null); setDRegion(null); setDVoice(false); setDLangs([]); setDQueue(false) }
  function toggleArr(arr: string[], v: string) { return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] }

  // post-filtres locaux (langues + en file) — RPC ne les gère pas
  const shown = items.filter(it => {
    if (queueOnly && !onlineIds.has(it.candidate_id)) return false
    if (langs.length) {
      const cl = it.profile?.matching_prefs?.languages ?? []
      if (!langs.some(l => cl.includes(l))) return false
    }
    return true
  })
  const fit = shown.filter(i => !i.is_degraded)
  const degraded = shown.filter(i => i.is_degraded)
  const badge = chips.length + langs.length + (queueOnly ? 1 : 0)

  function clearAll() {
    onApplyFilters({ role: null, rankFloor: null, rankCeiling: null, voice: null, region: null })
    setLangs([]); setQueueOnly(false)
  }

  return (
    <div className={props.className} style={{ padding: '4px 2px 88px' }}>
      {/* mode switcher */}
      <div style={{ display: 'flex', gap: 5, padding: 4, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.line}`, marginBottom: 16 }}>
        {MODES.map(m => {
          const on = mode === m.key
          return (
            <button key={m.key} onClick={() => setMode(m.key)} style={{ flex: 1, height: 44, borderRadius: 11, border: 'none', cursor: 'pointer', background: on ? `linear-gradient(135deg, ${T.cyan}, ${T.violet})` : 'transparent', color: on ? '#001018' : T.textDim, fontFamily: T.display, fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase', boxShadow: on ? `0 8px 20px -10px ${T.cyan}` : 'none' }}>
              {m.label}
            </button>
          )
        })}
      </div>

      {mode !== 'duo' ? (
        <div style={{ textAlign: 'center', padding: '52px 28px', borderRadius: 20, background: `linear-gradient(180deg, ${T.surface}, ${T.bg})`, border: `1px solid ${T.line}`, marginTop: 6 }}>
          <span style={{ display: 'inline-flex', width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.lineStrong}`, marginBottom: 18 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          </span>
          <h2 style={{ margin: 0, fontFamily: T.display, fontSize: 22, color: T.text, letterSpacing: '0.02em' }}>{mode === 'teams' ? 'TEAMS' : '1V1'} · BIENTÔT</h2>
          <p style={{ margin: '12px auto 0', fontSize: 14, color: T.textDim, lineHeight: 1.6, maxWidth: 300 }}>
            {mode === 'teams' ? 'La recherche d’équipes arrive bientôt dans ce hub.' : 'Le matchmaking 1v1 (sparring) arrive bientôt.'} En attendant, le mode Duo est pleinement disponible.
          </p>
          <button onClick={() => setMode('duo')} style={{ marginTop: 22, padding: '13px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: '#001018', fontFamily: T.display, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
            Revenir au Duo
          </button>
        </div>
      ) : (
        <>
          {/* feed header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim, letterSpacing: '0.14em' }}>
              <b style={{ fontFamily: T.display, fontSize: 17, color: T.text, letterSpacing: '0.04em' }}>{fit.length}</b> MATCHES · TRIÉS PAR %
            </span>
            <button onClick={openSheet} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 13px', borderRadius: 10, cursor: 'pointer', background: `${T.violet}1f`, border: `1px solid ${T.violet}73`, color: T.violet, fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
              Filtres
              {badge > 0 && <span style={{ minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: T.violet, color: '#08051a', fontSize: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>}
            </button>
            {(chips.length > 0 || langs.length > 0 || queueOnly) && (
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', width: '100%' }}>
                {chips.map(chip => {
                  const color = chip.role ? (ROLE_META[chip.role]?.c ?? T.cyan) : T.textDim
                  return (
                    <span key={chip.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 7px 6px 11px', borderRadius: 999, background: `${color}1f`, border: `1px solid ${color}66`, color, fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {chip.role && <RoleIcon role={chip.role} size={12} active />}{chip.label}
                      <button onClick={() => removeChip(chip.id)} style={{ width: 16, height: 16, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: `${color}26`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </span>
                  )
                })}
                {langs.map(l => (
                  <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 7px 6px 11px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.lineStrong}`, color: T.textDim, fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {l}
                    <button onClick={() => setLangs(prev => prev.filter(x => x !== l))} style={{ width: 16, height: 16, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: 'rgba(255,255,255,0.09)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
                {queueOnly && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 7px 6px 11px', borderRadius: 999, background: `${T.live}1f`, border: `1px solid ${T.live}66`, color: T.live, fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    EN FILE
                    <button onClick={() => setQueueOnly(false)} style={{ width: 16, height: 16, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: `${T.live}26`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="3.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* states */}
          {loading ? (
            <>{Array.from({ length: 4 }).map((_, i) => <MSkel key={i} />)}</>
          ) : error ? (
            <div style={{ maxWidth: 440, margin: '6vh auto', textAlign: 'center', padding: '40px 28px', borderRadius: 20, background: `linear-gradient(180deg, ${T.surface}, ${T.bg})`, border: `1px solid ${T.line}` }}>
              <span style={{ display: 'inline-flex', width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', background: `${T.danger}1f`, border: `1px solid ${T.danger}66` }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={T.danger} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>
              </span>
              <h2 style={{ margin: 0, fontFamily: T.display, fontSize: 24, color: T.text, letterSpacing: '0.02em' }}>IMPOSSIBLE DE CHARGER</h2>
              <p style={{ margin: '12px auto 0', fontSize: 14, color: T.textDim, lineHeight: 1.6, maxWidth: 320 }}>On n&apos;a pas pu récupérer tes matchs. Vérifie ta connexion et réessaie.</p>
              <button onClick={onRetry} style={{ marginTop: 24, padding: '13px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: '#001018', fontFamily: T.display, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>Réessayer</button>
            </div>
          ) : shown.length === 0 ? (
            <div style={{ maxWidth: 440, margin: '6vh auto', textAlign: 'center', padding: '40px 28px', borderRadius: 20, background: `linear-gradient(180deg, ${T.surface}, ${T.bg})`, border: `1px solid ${T.line}` }}>
              <span style={{ display: 'inline-flex', width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.lineStrong}` }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
              </span>
              <h2 style={{ margin: 0, fontFamily: T.display, fontSize: 24, color: T.text, letterSpacing: '0.02em' }}>AUCUN DUO POUR CES FILTRES</h2>
              <p style={{ margin: '12px auto 0', fontSize: 14, color: T.textDim, lineHeight: 1.6, maxWidth: 320 }}>Personne ne correspond à tous tes critères pour l&apos;instant. Élargis ta recherche ou réessaie plus tard.</p>
              <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={openSheet} style={{ padding: '13px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: '#001018', fontFamily: T.display, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>Élargir les filtres</button>
                <button onClick={clearAll} style={{ padding: '13px 22px', borderRadius: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.lineStrong}`, color: T.text, fontFamily: T.display, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Tout voir</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontFamily: T.mono, fontSize: 9.5, color: T.textMute, letterSpacing: '0.08em' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                Tape une carte pour déplier le détail
              </div>
              {fit.map(item => (
                <MCard key={item.candidate_id} item={item} online={onlineIds.has(item.candidate_id)} expanded={selectedId === item.candidate_id}
                  pool={selectedId === item.candidate_id ? detailPool : {}} request={selectedId === item.candidate_id ? detailRequest : null}
                  onToggle={() => onToggleCard(item.candidate_id)} onOpenRequest={onOpenRequest} onAccept={onAccept} onDecline={onDecline} onMessage={onMessage} onSkip={onSkip} />
              ))}
              {degraded.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 2px 4px' }}>
                    <div style={{ flex: 1, height: 1, background: T.line }} />
                    <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>HORS CRITÈRES STRICTS</span>
                    <div style={{ flex: 1, height: 1, background: T.line }} />
                  </div>
                  {degraded.map(item => (
                    <MCard key={item.candidate_id} item={item} online={onlineIds.has(item.candidate_id)} expanded={selectedId === item.candidate_id}
                      pool={selectedId === item.candidate_id ? detailPool : {}} request={selectedId === item.candidate_id ? detailRequest : null}
                      onToggle={() => onToggleCard(item.candidate_id)} onOpenRequest={onOpenRequest} onAccept={onAccept} onDecline={onDecline} onMessage={onMessage} onSkip={onSkip} />
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ── Filters bottom-sheet ── */}
      <div onClick={() => setSheetOpen(false)} className={`dm-backdrop${sheetOpen ? ' open' : ''}`} />
      <aside className={`dm-sheet${sheetOpen ? ' open' : ''}`} aria-hidden={!sheetOpen}>
        <div style={{ width: 40, height: 4, borderRadius: 3, background: T.lineStrong, margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0, fontFamily: T.display, fontSize: 20, color: T.text, letterSpacing: '0.04em' }}>FILTRES</h3>
          <span onClick={resetSheet} style={{ marginLeft: 'auto', fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Réinitialiser</span>
          <button onClick={() => setSheetOpen(false)} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${T.lineStrong}`, background: 'rgba(255,255,255,0.04)', color: T.textDim, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <MFsec label="RÔLE RECHERCHÉ">
          {(['TOP', 'JNG', 'MID', 'ADC', 'SUP'] as const).map(r => (
            <MFopt key={r} on={dRole.includes(r)} onClick={() => setDRole(prev => toggleArr(prev, r))}>{r}</MFopt>
          ))}
        </MFsec>
        <MFsec label="ELO MINIMUM">
          {ELO_OPTS.map(o => (
            <MFopt key={o.tier} on={dFloor === o.tier} onClick={() => setDFloor(dFloor === o.tier ? null : o.tier)}>{o.label}</MFopt>
          ))}
        </MFsec>
        <MFsec label="RÉGION">
          {REGION_OPTS.map(r => (
            <MFopt key={r} on={dRegion === r} onClick={() => setDRegion(dRegion === r ? null : r)}>{r}</MFopt>
          ))}
        </MFsec>
        <MFsec label="LANGUES">
          {LANG_OPTS.map(l => (
            <MFopt key={l} on={dLangs.includes(l)} onClick={() => setDLangs(prev => toggleArr(prev, l))}>{l.toUpperCase()}</MFopt>
          ))}
        </MFsec>
        <MToggle on={dVoice} onClick={() => setDVoice(v => !v)} title="Vocal obligatoire" hint="Uniquement les joueurs avec micro" />
        <MToggle on={dQueue} onClick={() => setDQueue(v => !v)} title="En file maintenant" hint="Disponibles pour jouer tout de suite" />

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={resetSheet} style={{ flexShrink: 0, padding: '0 18px', height: 50, borderRadius: 13, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.lineStrong}`, color: T.text, fontFamily: T.display, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>Réinit.</button>
          <button onClick={applySheet} style={{ flex: 1, height: 50, borderRadius: 13, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: '#001018', fontFamily: T.display, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, boxShadow: `0 12px 30px -14px ${T.cyan}` }}>Voir les résultats</button>
        </div>
      </aside>

      <style>{`
        .dm-detail { display:grid; grid-template-rows:0fr; transition:grid-template-rows .3s ease; }
        .dm-detail.open { grid-template-rows:1fr; }
        .dm-detail-in { overflow:hidden; }
        .dm-chev { transition: transform .28s; }
        .dm-chev.open { transform: rotate(180deg); }
        .dm-backdrop { position:fixed; inset:0; z-index:70; background:rgba(4,5,10,0.62); opacity:0; pointer-events:none; transition:opacity .22s; }
        .dm-backdrop.open { opacity:1; pointer-events:auto; }
        .dm-sheet { position:fixed; left:50%; bottom:0; transform:translateX(-50%) translateY(101%); width:100%; max-width:430px; z-index:71; background:linear-gradient(180deg,var(--surface),var(--bg)); border-top:1px solid var(--line-strong); border-radius:22px 22px 0 0; padding:14px 18px calc(16px + env(safe-area-inset-bottom)); transition:transform .3s cubic-bezier(.2,.9,.3,1); max-height:90vh; overflow:auto; box-shadow:0 -24px 60px -24px rgba(0,0,0,0.75); }
        .dm-sheet.open { transform:translateX(-50%) translateY(0); }
        .dm-sk { background:linear-gradient(100deg,rgba(255,255,255,0.04),rgba(255,255,255,0.09),rgba(255,255,255,0.04)); background-size:200% 100%; animation:dm-shimmer 1.3s linear infinite; }
        @keyframes dm-shimmer { to { background-position:-200% 0; } }
        @media (prefers-reduced-motion:reduce) { .dm-sk { animation:none; } .dm-detail, .dm-chev, .dm-sheet, .dm-backdrop { transition:none; } }
      `}</style>
    </div>
  )
}

// ── Main DuoFeed ──────────────────────────────────────────────────────

export default function DuoFeed({
  userId,
  initialPrefs,
}: {
  userId: string | null
  initialPrefs: { looking_for_roles: string[]; rank_floor: string | null; region: string | null } | null
}) {
  const supabase = createClient()
  const router   = useRouter()
  const { onlineIds, onlineCount } = usePresence(userId)

  const [filters, setFilters] = useState<Filters>({
    role: initialPrefs?.looking_for_roles?.length ? initialPrefs.looking_for_roles : null,
    rankFloor: initialPrefs?.rank_floor ?? null,
    rankCeiling: null,
    voice: null,
    region: initialPrefs?.region ?? null,
  })
  const [showFilters,  setShowFilters]  = useState(false)
  const [myProfile,    setMyProfile]    = useState<DuoRequestMe | null>(null)
  const [showModal,    setShowModal]    = useState(false)
  const [items,        setItems]        = useState<DuoItem[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(false)
  const [selectedId,   setSelectedId]   = useState<string | null>(null)
  const [detailAvail,  setDetailAvail]  = useState<{ weekday: number; slot: number; intensity: number }[]>([])
  const [detailPool,    setDetailPool]    = useState<Record<string, string[]>>({})
  // mastery par champion : { Ahri: { level: 7, points: 112000 } }
  const [detailMastery, setDetailMastery] = useState<Record<string, { level: number; points: number }>>({})
  const [detailRequest, setDetailRequest] = useState<RequestInfo>(null)

  // Active chips
  const chips: { id: string; label: string; role?: string }[] = []
  if (filters.role?.length) filters.role.forEach(r => chips.push({ id: `role_${r}`, label: r, role: r }))
  if (filters.rankFloor) chips.push({ id: 'rankFloor', label: filters.rankFloor.toUpperCase() + '+' })
  if (filters.voice !== null) chips.push({ id: 'voice', label: filters.voice ? 'VOCAL' : 'NO VOICE' })
  if (filters.region)    chips.push({ id: 'region',    label: filters.region.toUpperCase() })

  const removeChip = (id: string) => {
    if (id.startsWith('role_')) {
      const r = id.slice(5)
      setFilters(f => {
        const next = (f.role ?? []).filter(x => x !== r)
        return { ...f, role: next.length ? next : null }
      })
    }
    if (id === 'rankFloor') setFilters(f => ({ ...f, rankFloor: null }))
    if (id === 'voice')     setFilters(f => ({ ...f, voice: null }))
    if (id === 'region')    setFilters(f => ({ ...f, region: null }))
  }

  // ── Fetch feed
  const loadFeed = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    setError(false)
    setSelectedId(null)
    setDetailRequest(null)

    const { data: feed, error: rpcError } = await supabase.rpc('duo_feed', {
      p_user_id:      userId,
      p_role_filters: filters.role       ?? undefined,
      p_rank_floor:   filters.rankFloor ?? undefined,
      p_rank_ceiling: filters.rankCeiling ?? undefined,
      p_voice:        filters.voice     ?? undefined,
      p_region:       filters.region    ?? undefined,
      p_limit: 40, p_offset: 0,
    })

    if (rpcError) { console.error('[duo_feed] RPC error:', rpcError.message, rpcError); setError(true); setItems([]); setLoading(false); return }
    if (!feed?.length) { setItems([]); setLoading(false); return }

    const ids = (feed as FeedRow[]).map(f => f.candidate_id)

    const { data: rawProfiles } = await supabase
      .from('profiles')
      .select(`
        id, display_name, avatar_url, bio,
        riot_accounts(id, game_name, tag_line, profile_icon_id,
          ranks(tier, division, league_points, queue)),
        matching_prefs(main_roles, looking_for_roles, languages, playstyles, goals)
      `)
      .in('id', ids)

    const pMap = Object.fromEntries(
      (rawProfiles ?? []).map(p => [p.id, p as unknown as CandidateProfile])
    )
    const merged = (feed as FeedRow[]).map(f => ({ ...f, profile: pMap[f.candidate_id] ?? null }))

    setItems(merged)
    if (merged.length > 0) setSelectedId(merged[0].candidate_id)
    setLoading(false)
  }, [userId, filters]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadFeed() }, [loadFeed])

  // ── Fetch profil courant (pour DuoRequestModal "Ce que X verra")
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, riot_accounts(game_name, ranks(tier, division, league_points, queue)), matching_prefs(main_roles)')
        .eq('id', userId)
        .maybeSingle()
      if (data) {
        const ra   = (data as any).riot_accounts
        const mp   = (data as any).matching_prefs
        const solo = (ra?.ranks ?? []).find((r: any) => r.queue === 'RANKED_SOLO_5x5') ?? null
        setMyProfile({
          name:  ra?.game_name ?? (data as any).display_name ?? 'MOI',
          role:  mp?.main_roles?.[0]          ?? null,
          rank:  solo?.tier?.toLowerCase()    ?? null,
          tier:  solo?.division               ?? null,
          lp:    solo?.league_points          ?? null,
          hue:   180,
        })
      }
    })()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch detail data + request status on selection change
  useEffect(() => {
    if (!selectedId || !userId) return
    setDetailAvail([])
    setDetailPool({})
    setDetailMastery({})
    setDetailRequest(null)
    ;(async () => {
      const [{ data: avail }, { data: prefs }, { data: ra }, { data: req }] = await Promise.all([
        supabase.from('availability').select('weekday, slot, intensity').eq('profile_id', selectedId),
        supabase.from('matching_prefs').select('champion_pool').eq('profile_id', selectedId).maybeSingle(),
        supabase.from('riot_accounts').select('id').eq('profile_id', selectedId).maybeSingle(),
        supabase
          .from('duo_requests')
          .select('id, status, from_profile, conversation_id')
          .or(`from_profile.eq.${selectedId},to_profile.eq.${selectedId}`)
          .in('status', ['pending', 'accepted'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      setDetailAvail(avail ?? [])
      setDetailPool((prefs?.champion_pool as Record<string, string[]>) ?? {})

      if (ra?.id) {
        const { data: mastery } = await supabase
          .from('champion_mastery')
          .select('champion_key, mastery_level, mastery_points')
          .eq('riot_account_id', ra.id)
        const map: Record<string, { level: number; points: number }> = {}
        for (const m of mastery ?? []) {
          if (m.champion_key) map[m.champion_key] = { level: m.mastery_level, points: m.mastery_points }
        }
        setDetailMastery(map)
      }

      if (req) {
        setDetailRequest({
          id: req.id,
          status: req.status as NonNullable<RequestInfo>['status'],
          fromMe: req.from_profile === userId,
          conversationId: req.conversation_id ?? null,
        })
      }
    })()
  }, [selectedId, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions
  async function handleSendRequest(message: string) {
    if (!selectedId) return
    const selectedItem = items.find(i => i.candidate_id === selectedId)
    const res = await fetch('/api/duo/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_profile: selectedId,
        match_score: selectedItem?.score ?? null,
        message,
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (res.ok) {
      const data = await res.json()
      setDetailRequest({ id: data.id, status: 'pending', fromMe: true, conversationId: null })
      setShowModal(false)
    } else {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? `HTTP ${res.status}`)
    }
  }

  async function handleAccept(requestId: string) {
    const res = await fetch('/api/duo/respond', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, action: 'accept' }),
    })
    if (res.ok) {
      const data = await res.json()
      setDetailRequest(prev => prev ? { ...prev, status: 'accepted', conversationId: data.conversation_id } : null)
    }
  }

  async function handleDecline(requestId: string) {
    const res = await fetch('/api/duo/respond', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, action: 'decline' }),
    })
    if (res.ok) {
      setDetailRequest(null)
    }
  }

  function handleMessage(conversationId: string) {
    router.push(`/inbox?conv=${conversationId}`)
  }

  function handleSkip(id: string) {
    setItems(prev => prev.filter(i => i.candidate_id !== id))
    setSelectedId(prev => (prev === id ? null : prev))
  }

  const fitItems      = items.filter(i => !i.is_degraded)
  const degradedItems = items.filter(i => i.is_degraded)
  const selectedItem  = items.find(i => i.candidate_id === selectedId) ?? null
  const selectedProfile = selectedItem?.profile ?? null

  if (!userId) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.cyan, letterSpacing: '0.24em' }}>◢ COMPATIBILITY ENGINE</div>
      <div style={{ fontFamily: T.display, fontSize: 28, color: T.text, textAlign: 'center' }}>CONNECTE-TOI<br/>POUR VOIR TES DUOS</div>
    </div>
  )
  if (!loading && !initialPrefs) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.cyan, letterSpacing: '0.24em' }}>◢ COMPATIBILITY ENGINE</div>
      <div style={{ fontFamily: T.display, fontSize: 24, color: T.text, textAlign: 'center' }}>COMPLÈTE L&apos;ONBOARDING<br/>POUR VOIR TES MATCHS</div>
    </div>
  )

  const danger = '#ff3d6e'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Modal d'envoi de demande */}
      {showModal && selectedItem && (() => {
        const tName = playerName(selectedProfile)
        const tRank = soloRank(selectedProfile)
        const target: DuoRequestTarget = {
          name:    tName,
          tag:     selectedProfile?.riot_accounts?.tag_line ? `#${selectedProfile.riot_accounts.tag_line}` : '',
          role:    selectedItem.candidate_role ?? selectedProfile?.matching_prefs?.main_roles?.[0] ?? null,
          looking: selectedProfile?.matching_prefs?.looking_for_roles?.[0] ?? null,
          rank:    tRank?.tier?.toLowerCase() ?? null,
          tier:    tRank?.division            ?? null,
          lp:      tRank?.league_points       ?? null,
          match:   selectedItem.score,
          hue:     nameHue(tName),
        }
        return (
          <DuoRequestModal
            target={target}
            me={myProfile ?? { name: 'MOI', role: null, rank: null, tier: null, lp: null }}
            onConfirm={handleSendRequest}
            onClose={() => setShowModal(false)}
          />
        )
      })()}

      {/* Content area (feed + detail) — DESKTOP ≥860px */}
      <div className="rgg-duo-desktop" style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Filter panel */}
        {showFilters && (
          <DuoFilterPanel
            initial={filters}
            onClose={() => setShowFilters(false)}
            onApply={next => { setFilters(next); setShowFilters(false) }}
          />
        )}

        {/* Feed column */}
        <div className="rgg-feed-col" style={{ width: 408, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${T.line}`, background: 'rgba(255,255,255,0.012)' }}>
          {/* Feed header */}
          <div style={{ flexShrink: 0, padding: '18px 18px 14px', borderBottom: `1px solid ${T.line}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.16em' }}>
                <span style={{ fontFamily: T.display, fontSize: 15, color: T.text, letterSpacing: '0.04em' }}>{fitItems.length}</span>
                {' '}MATCHES · TRIÉS PAR % ▾
              </span>
              <button onClick={() => setShowFilters(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 12px', borderRadius: 10, cursor: 'pointer', background: `${T.violet}1a`, border: `1px solid ${T.violet}66`, color: T.violet, fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.violet} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
                Filtres
                {chips.length > 0 && <span style={{ minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: T.violet, color: '#08051a', fontFamily: T.mono, fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{chips.length}</span>}
              </button>
            </div>
            {chips.length > 0 ? (
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                {chips.map(chip => {
                  const color = chip.role ? (ROLE_META[chip.role]?.c ?? T.cyan) : T.textDim
                  return (
                    <span key={chip.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 7px 7px 11px', borderRadius: 999, background: `${color}1f`, border: `1px solid ${color}66`, color, fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {chip.role && <RoleIcon role={chip.role} size={12} active />}
                      {chip.label}
                      <button onClick={() => removeChip(chip.id)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', cursor: 'pointer', border: 'none', padding: 0, background: `${color}26` }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </span>
                  )
                })}
              </div>
            ) : (
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.1em', padding: '3px 0' }}>
                AUCUN FILTRE · TOUS LES DUOS EUW EN LIGNE
              </div>
            )}
          </div>

          {/* Feed list */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 14px 18px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {loading ? (
              Array.from({ length: 7 }).map((_, i) => (
                <div key={i} style={{ height: 72, borderRadius: 14, marginTop: i === 0 ? 9 : 0, background: 'rgba(255,255,255,0.022)', border: `1px solid ${T.line}`, animation: 'rgg-pulse 1.6s ease-in-out infinite' }} />
              ))
            ) : (
              <>
                {fitItems.map(item => (
                  <DuoFeedRow key={item.candidate_id} item={item} selected={selectedId === item.candidate_id} online={onlineIds.has(item.candidate_id)} onClick={() => setSelectedId(item.candidate_id)} />
                ))}
                {degradedItems.length > 0 && fitItems.length < 5 && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 2px' }}>
                      <div style={{ flex: 1, height: 1, background: T.line }} />
                      <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>MOINS DE MONDE SUR TES CRITÈRES</span>
                      <div style={{ flex: 1, height: 1, background: T.line }} />
                    </div>
                    {degradedItems.map(item => (
                      <DuoFeedRow key={item.candidate_id} item={item} selected={selectedId === item.candidate_id} online={onlineIds.has(item.candidate_id)} onClick={() => setSelectedId(item.candidate_id)} />
                    ))}
                  </>
                )}
                {!loading && items.length === 0 && (
                  <div style={{ padding: '48px 0', textAlign: 'center' }}>
                    <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.14em' }}>AUCUN DUO TROUVÉ</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Detail pane */}
        <div className="rgg-detail-pane" style={{ flex: 1, minWidth: 0, height: '100%' }}>
          {selectedItem ? (
            <DuoDetailPane
              item={selectedItem} avail={detailAvail} champPool={detailPool} masteryMap={detailMastery}
              online={onlineIds.has(selectedItem.candidate_id)}
              requestInfo={detailRequest}
              onOpenRequest={() => setShowModal(true)}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onMessage={handleMessage}
            />
          ) : !loading && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.16em' }}>SÉLECTIONNE UN DUO</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Hub MOBILE ≤859px (cartes dépliables, switcher, bottom-sheet) ── */}
      <DuoFeedMobile
        className="rgg-duo-mobile"
        items={items}
        loading={loading}
        error={error}
        onlineIds={onlineIds}
        filters={filters}
        chips={chips}
        removeChip={removeChip}
        onApplyFilters={setFilters}
        onRetry={loadFeed}
        selectedId={selectedId}
        onToggleCard={id => setSelectedId(prev => (prev === id ? null : id))}
        detailPool={detailPool}
        detailRequest={detailRequest}
        onOpenRequest={() => setShowModal(true)}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onMessage={handleMessage}
        onSkip={handleSkip}
      />
    </div>
  )
}
