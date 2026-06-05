'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { championIconUrl } from '@/lib/riot/assets'
import MatchRing from '@/components/ui/MatchRing'
import RoleIcon, { ROLE_META } from '@/components/ui/RoleIcon'
import Avatar, { RANK_COLORS } from '@/components/ui/Avatar'
import DuoFilterPanel from '@/components/duo/DuoFilterPanel'

// ── Design tokens (miroir de tokens.jsx) ──────────────────────────────
const T = {
  bg: '#0a0c14', surface: '#0f121c', elevated: '#161a26',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6', live: '#00ff9d', gold: '#ffd166',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

// ── Types ─────────────────────────────────────────────────────────────

type RankRow = { tier: string; division: string | null; league_points: number; wins: number; losses: number; queue: string }

type CandidateProfile = {
  id: string
  display_name: string | null
  avatar_url: string | null
  riot_accounts: {
    id: string
    game_name: string
    tag_line: string
    profile_icon_id: number | null
    ranks: RankRow[]
  }[] | null
  matching_prefs: {
    main_roles: string[]
    looking_for_roles: string[]
    languages: string[]
    playstyles: string[]
    goals: string[]
  }[] | null
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
  role: string | null
  rankFloor: string | null
  rankCeiling: string | null
  voice: boolean | null
  region: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────

function nameHue(s: string) {
  let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h
}

function playerName(p: CandidateProfile | null) {
  return p?.riot_accounts?.[0]?.game_name ?? p?.display_name ?? '—'
}
function playerInitials(p: CandidateProfile | null) {
  return playerName(p).slice(0, 2).toUpperCase()
}
function soloRank(p: CandidateProfile | null): RankRow | null {
  return p?.riot_accounts?.[0]?.ranks?.find(r => r.queue === 'RANKED_SOLO_5x5') ?? null
}

// ── DSynergy — port exact de la maquette desktop/duo.jsx ──────────────
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

// ── Pill — port exact de la maquette components.jsx ───────────────────
function Pill({ children, accent, mono = false, size = 'md' }: {
  children: React.ReactNode; accent?: string; mono?: boolean; size?: 'sm' | 'md'
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
      color: accent ?? T.text,
      fontFamily: mono ? T.mono : T.body,
      fontSize: fs, fontWeight: 600,
      letterSpacing: mono ? '0.08em' : '0.02em',
      textTransform: mono ? 'uppercase' : 'none', whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

// ── SectionLabel ──────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.22em' }}>
      {children}
    </div>
  )
}

// ── AvailabilityHeat — port exact de la maquette desktop/duo.jsx ──────
function AvailabilityHeat({ slots }: {
  slots: { weekday: number; slot: number; intensity: number }[]
}) {
  const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  const heat = [
    'rgba(255,255,255,0.04)',
    `${T.cyan}26`, `${T.cyan}55`, `${T.cyan}aa`,
  ]
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

// ── DuoFeedRow — port exact de la maquette desktop/duo.jsx ───────────
function DuoFeedRow({ item, selected, onClick }: {
  item: DuoItem; selected: boolean; onClick: () => void
}) {
  const p = item.profile
  const name = playerName(p)
  const init = playerInitials(p)
  const hue  = nameHue(name)
  const rank = soloRank(p)
  const rankKey = rank?.tier?.toLowerCase() ?? 'iron'
  const rankColor = RANK_COLORS[rankKey] ?? '#9aa2bf'

  const role    = item.candidate_role ?? p?.matching_prefs?.[0]?.main_roles?.[0] ?? 'FILL'
  const looking = p?.matching_prefs?.[0]?.looking_for_roles?.[0] ?? 'FILL'
  const roleMeta    = ROLE_META[role?.toUpperCase()]    ?? ROLE_META.FILL
  const lookingMeta = ROLE_META[looking?.toUpperCase()] ?? ROLE_META.FILL

  const tierLabel = rank ? `${rank.tier.slice(0,3)} ${rank.division ?? ''}`.trim() : 'UNRANKED'
  const lp        = rank?.league_points ?? 0

  return (
    <button onClick={onClick} style={{
      position: 'relative', display: 'flex', alignItems: 'center', gap: 13, width: '100%',
      padding: '13px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
      background: selected
        ? `linear-gradient(100deg, ${T.cyan}1c, ${T.violet}10)`
        : 'rgba(255,255,255,0.022)',
      border: `1px solid ${selected ? T.cyan + '66' : T.line}`,
      boxShadow: selected ? `0 8px 26px -12px ${T.cyan}, inset 0 0 0 1px ${T.cyan}22` : 'none',
      transition: 'background .14s, border-color .14s',
    }}>
      {selected && (
        <span style={{
          position: 'absolute', left: -1, top: 14, bottom: 14, width: 3,
          borderRadius: 3,
          background: `linear-gradient(${T.cyan},${T.violet})`,
          boxShadow: `0 0 10px ${T.cyan}`,
        }} />
      )}

      <Avatar initials={init} size={46} rank={rankKey} hue={hue} online />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + role → looking */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, lineHeight: 1 }}>
          <span style={{ fontFamily: T.display, fontSize: 16, color: T.text, letterSpacing: '0.04em' }}>
            {name}
          </span>
          {/* role badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '3px 6px', borderRadius: 6,
            background: `${roleMeta.c}1a`, border: `1px solid ${roleMeta.c}40`,
          }}>
            <RoleIcon role={role} size={11} active />
          </span>
          {/* arrow */}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
          {/* looking badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '3px 6px', borderRadius: 6,
            background: `${lookingMeta.c}14`, border: `1px solid ${lookingMeta.c}33`,
          }}>
            <RoleIcon role={looking} size={11} active />
          </span>
        </div>

        {/* Rank pill + LP + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
          <Pill mono size="sm" accent={rankColor}>{tierLabel}</Pill>
          <span style={{ fontFamily: T.mono, fontSize: 9.5, color: T.textDim, letterSpacing: '0.08em' }}>
            {lp} LP
          </span>
          {item.is_degraded && (
            <span style={{
              fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.08em',
              padding: '2px 6px', borderRadius: 4,
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.line}`,
            }}>HORS RÔLE</span>
          )}
        </div>
      </div>

      <MatchRing value={item.score} size={52} stroke={4} accent={T.cyan} accent2={T.violet} />
    </button>
  )
}

// ── DuoDetailPane — port exact de la maquette desktop/duo.jsx ─────────
function DuoDetailPane({ item, avail, champs, onRequest }: {
  item: DuoItem
  avail: { weekday: number; slot: number; intensity: number }[]
  champs: { champion_key: string; mastery_level: number }[]
  onRequest: () => void
}) {
  const p = item.profile
  const name = playerName(p)
  const init = playerInitials(p)
  const hue  = nameHue(name)
  const tag  = p?.riot_accounts?.[0]?.tag_line ? `#${p.riot_accounts[0].tag_line}` : ''
  const rank = soloRank(p)
  const rankKey   = rank?.tier?.toLowerCase() ?? 'iron'
  const rankColor = RANK_COLORS[rankKey] ?? '#9aa2bf'
  const rankLabel = rank ? `${rank.tier} ${rank.division ?? ''} · ${rank.league_points} LP`.trim() : 'UNRANKED'

  const role    = item.candidate_role ?? p?.matching_prefs?.[0]?.main_roles?.[0] ?? 'FILL'
  const looking = p?.matching_prefs?.[0]?.looking_for_roles?.[0] ?? 'FILL'
  const roleMeta    = ROLE_META[role?.toUpperCase()]    ?? ROLE_META.FILL
  const lookingMeta = ROLE_META[looking?.toUpperCase()] ?? ROLE_META.FILL
  const playstyles  = p?.matching_prefs?.[0]?.playstyles ?? []

  // Role fit score : 100 si non-dégradé (a passé le filtre), 0 sinon
  const roleFitScore = item.is_degraded ? 0 : 100

  // Win rate depuis ranks (wins / (wins+losses))
  const candidateRank = soloRank(p)
  const total = (candidateRank?.wins ?? 0) + (candidateRank?.losses ?? 0)
  const wr = total > 0 ? Math.round(((candidateRank?.wins ?? 0) / total) * 100) : '—'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Scrollable body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 34px 18px' }}>

        {/* Hero */}
        <div style={{ position: 'relative', display: 'flex', gap: 22, alignItems: 'flex-start' }}>
          <div style={{
            position: 'absolute', top: -28, left: -10, width: 220, height: 170,
            background: `radial-gradient(circle, ${T.cyan}33, transparent 70%)`,
            filter: 'blur(36px)', pointerEvents: 'none',
          }} />
          <Avatar initials={init} size={92} rank={rankKey} hue={hue} online />
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: T.display, fontSize: 34, color: T.text, letterSpacing: '0.02em', lineHeight: 1 }}>
                {name}
              </span>
              {tag && (
                <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim, letterSpacing: '0.1em' }}>
                  {tag}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <Pill mono accent={rankColor}>{rankLabel}</Pill>
              {/* role badge */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 11px', borderRadius: 999,
                background: `${roleMeta.c}1a`, border: `1px solid ${roleMeta.c}44`,
              }}>
                <RoleIcon role={role} size={14} active />
                <span style={{ fontFamily: T.mono, fontSize: 11, color: roleMeta.c, letterSpacing: '0.1em', fontWeight: 700 }}>
                  {roleMeta.name}
                </span>
              </span>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim, letterSpacing: '0.06em' }}>
                looking for
              </span>
              {/* looking badge */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 11px', borderRadius: 999,
                background: `${lookingMeta.c}14`, border: `1px solid ${lookingMeta.c}33`,
              }}>
                <RoleIcon role={looking} size={14} active />
                <span style={{ fontFamily: T.mono, fontSize: 11, color: lookingMeta.c, letterSpacing: '0.1em', fontWeight: 700 }}>
                  {lookingMeta.name}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* two-col body — port exact de desktop/duo.jsx DuoDetailPane */}
        <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 18 }}>

          {/* WHY YOU MATCH — gridColumn 1/-1 */}
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

          {/* WIN RATE — port de DStatBox */}
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: `1px solid ${T.line}` }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.2em' }}>WIN RATE</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 6 }}>
              <span style={{ fontFamily: T.display, fontSize: 28, color: T.live, letterSpacing: '0.01em', lineHeight: 1 }}>{wr}</span>
              <span style={{ fontFamily: T.display, fontSize: 15, color: T.live, opacity: 0.7 }}>%</span>
            </div>
          </div>

          {/* KDA — port de DStatBox */}
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: `1px solid ${T.line}` }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.2em' }}>KDA</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 6 }}>
              <span style={{ fontFamily: T.display, fontSize: 28, color: T.cyan, letterSpacing: '0.01em', lineHeight: 1 }}>—</span>
            </div>
          </div>

          {/* Champion pool — gridColumn 1/-1 */}
          {champs.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <SectionLabel>CHAMPION POOL · {role}</SectionLabel>
              <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                {champs.slice(0, 6).map((ch, i) => (
                  <div key={ch.champion_key} style={{
                    width: 66, height: 66, borderRadius: 10, overflow: 'hidden',
                    border: `1px solid ${i === 0 ? `${T.cyan}88` : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: i === 0 ? `0 0 0 2px ${T.cyan}, 0 0 14px ${T.cyan}66` : 'none',
                    background: '#161a26', flexShrink: 0,
                  }}>
                    <img src={championIconUrl(ch.champion_key)} alt={ch.champion_key}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Playstyle — gridColumn 1/-1 */}
          {playstyles.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <SectionLabel>PLAYSTYLE</SectionLabel>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {playstyles.map(s => <Pill key={s} mono accent={T.cyan}>{s}</Pill>)}
              </div>
            </div>
          )}

          {/* Availability — gridColumn 1/-1 */}
          {avail.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <SectionLabel>AVAILABILITY · THIS WEEK</SectionLabel>
              <AvailabilityHeat slots={avail} />
            </div>
          )}

        </div>
      </div>

      {/* Sticky CTA */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 34px',
        borderTop: `1px solid ${T.lineStrong}`,
        background: 'rgba(10,12,20,0.86)', backdropFilter: 'blur(14px)',
      }}>
        <button onClick={onRequest} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '14px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`,
          color: '#001018',
          fontFamily: T.display, fontSize: 14, letterSpacing: '0.1em',
          boxShadow: `0 0 0 1px ${T.cyan}66, 0 8px 24px -8px ${T.cyan}80`,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
          Send duo request
        </button>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '13px 18px', borderRadius: 10, cursor: 'pointer',
          background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.lineStrong}`,
          color: T.text, fontFamily: T.body, fontSize: 14, fontWeight: 600,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a8 8 0 01-11.5 7.2L4 21l1.8-5.5A8 8 0 1121 12z" />
          </svg>
          Message
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          {/* Save / Skip */}
          {[
            ['M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z', T.textDim],
            ['M18 6L6 18M6 6l12 12', '#ff3d6e'],
          ].map(([d, stroke], i) => (
            <button key={i} style={{
              width: 48, height: 48, borderRadius: 12, cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.lineStrong}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={d} />
              </svg>
            </button>
          ))}
        </div>
      </div>
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

  const [filters, setFilters] = useState<Filters>({
    role: initialPrefs?.looking_for_roles?.[0] ?? null,
    rankFloor: initialPrefs?.rank_floor ?? null,
    rankCeiling: null,
    voice: null,
    region: initialPrefs?.region ?? null,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [items, setItems] = useState<DuoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailAvail, setDetailAvail] = useState<{ weekday: number; slot: number; intensity: number }[]>([])
  const [detailChamps, setDetailChamps] = useState<{ champion_key: string; mastery_level: number }[]>([])

  // ── Active chips
  const chips: { id: string; label: string; role?: string }[] = []
  if (filters.role)     chips.push({ id: 'role',     label: filters.role,                        role: filters.role })
  if (filters.rankFloor) chips.push({ id: 'rankFloor', label: filters.rankFloor.toUpperCase() + '+' })
  if (filters.voice !== null) chips.push({ id: 'voice', label: filters.voice ? 'VOCAL' : 'NO VOICE' })
  if (filters.region)   chips.push({ id: 'region',   label: filters.region.toUpperCase() })

  const removeChip = (id: string) => {
    if (id === 'role')      setFilters(f => ({ ...f, role: null }))
    if (id === 'rankFloor') setFilters(f => ({ ...f, rankFloor: null }))
    if (id === 'voice')     setFilters(f => ({ ...f, voice: null }))
    if (id === 'region')    setFilters(f => ({ ...f, region: null }))
  }

  // ── Fetch feed
  const loadFeed = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    setSelectedId(null)

    const { data: feed, error } = await supabase.rpc('duo_feed', {
      p_user_id:      userId,
      p_role_filter:  filters.role      ?? undefined,
      p_rank_floor:   filters.rankFloor ?? undefined,
      p_rank_ceiling: filters.rankCeiling ?? undefined,
      p_voice:        filters.voice     ?? undefined,
      p_region:       filters.region    ?? undefined,
      p_limit: 40, p_offset: 0,
    })

    if (error || !feed?.length) { setItems([]); setLoading(false); return }

    const ids = (feed as FeedRow[]).map(f => f.candidate_id)

    const { data: rawProfiles } = await supabase
      .from('profiles')
      .select(`
        id, display_name, avatar_url,
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

  // ── Fetch detail data on selection change
  useEffect(() => {
    if (!selectedId) return
    setDetailAvail([])
    setDetailChamps([])
    ;(async () => {
      const [{ data: avail }, { data: ra }] = await Promise.all([
        supabase.from('availability').select('weekday, slot, intensity').eq('profile_id', selectedId),
        supabase.from('riot_accounts').select('id').eq('profile_id', selectedId).maybeSingle(),
      ])
      setDetailAvail(avail ?? [])
      if (ra?.id) {
        const { data: champs } = await supabase
          .from('champion_mastery')
          .select('champion_key, mastery_level')
          .eq('riot_account_id', ra.id)
          .not('champion_key', 'is', null)
          .order('mastery_points', { ascending: false })
          .limit(6)
        setDetailChamps(champs ?? [])
      }
    })()
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fitItems      = items.filter(i => !i.is_degraded)
  const degradedItems = items.filter(i => i.is_degraded)
  const selectedItem  = items.find(i => i.candidate_id === selectedId) ?? null

  // ── Empty states
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
    // Port de DesktopShell main area : flexDirection column (DTopBar + content)
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── DTopBar — port exact de desktop/shell.jsx → DTopBar */}
      <div style={{
        flexShrink: 0, height: 76, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', gap: 24, padding: '0 28px',
        borderBottom: `1px solid ${T.line}`,
        background: 'rgba(10,12,20,0.6)', backdropFilter: 'blur(12px)',
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.cyan, letterSpacing: '0.24em', marginBottom: 3 }}>
            ◢ COMPATIBILITY ENGINE · {items.length} ONLINE
          </div>
          <div style={{ fontFamily: T.display, fontSize: 24, color: T.text, letterSpacing: '0.02em', lineHeight: 1, whiteSpace: 'nowrap' }}>
            YOUR TOP DUOS
          </div>
        </div>
        <div style={{ flex: 1, maxWidth: 460 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, height: 42, padding: '0 14px',
            borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.line}`,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>
            </svg>
            <span style={{ flex: 1, fontFamily: T.body, fontSize: 13.5, color: T.textMute }}>
              Search players, teams, champions…
            </span>
            <span style={{ display: 'flex', gap: 4 }}>
              {['⌘','K'].map(k => (
                <kbd key={k} style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, padding: '2px 6px', borderRadius: 5, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.line}` }}>{k}</kbd>
              ))}
            </span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{ position: 'relative', width: 42, height: 42, borderRadius: 11, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 1112 0c0 7 3 7 3 9H3c0-2 3-2 3-9zM10 21a2 2 0 004 0"/>
            </svg>
            <span style={{ position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: '50%', background: danger, boxShadow: `0 0 6px ${danger}`, border: `1.5px solid ${T.bg}` }}/>
          </button>
          <button style={{ width: 42, height: 42, borderRadius: 11, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Content area (feed + detail) */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', position: 'relative' }}>

      {/* ── Filter panel */}
      {showFilters && (
        <DuoFilterPanel
          initial={filters}
          onClose={() => setShowFilters(false)}
          onApply={next => { setFilters(next); setShowFilters(false) }}
        />
      )}

      {/* ── Feed column (408px) */}
      <div className="rgg-feed-col" style={{
        width: 408, flexShrink: 0, height: '100%',
        display: 'flex', flexDirection: 'column',
        borderRight: `1px solid ${T.line}`,
        background: 'rgba(255,255,255,0.012)',
      }}>
        {/* Feed header */}
        <div style={{ flexShrink: 0, padding: '18px 18px 14px', borderBottom: `1px solid ${T.line}` }}>
          {/* eyebrow + count */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.16em' }}>
              <span style={{ fontFamily: T.display, fontSize: 15, color: T.text, letterSpacing: '0.04em' }}>
                {fitItems.length}
              </span>
              {' '}MATCHES · TRIÉS PAR % ▾
            </span>
            <button
              onClick={() => setShowFilters(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                background: `${T.violet}1a`, border: `1px solid ${T.violet}66`,
                color: T.violet, fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.violet} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              Filtres
              {chips.length > 0 && (
                <span style={{
                  minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8,
                  background: T.violet, color: '#08051a',
                  fontFamily: T.mono, fontSize: 9, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>{chips.length}</span>
              )}
            </button>
          </div>

          {/* Active chips */}
          {chips.length > 0 ? (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
              {chips.map(chip => {
                const color = chip.role ? (ROLE_META[chip.role]?.c ?? T.cyan) : T.textDim
                return (
                  <span key={chip.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 7px 7px 11px', borderRadius: 999,
                    background: `${color}1f`, border: `1px solid ${color}66`,
                    color, fontFamily: T.mono, fontSize: 11, fontWeight: 600,
                    letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    {chip.role && <RoleIcon role={chip.role} size={12} active />}
                    {chip.label}
                    <button onClick={() => removeChip(chip.id)} style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 16, height: 16, borderRadius: '50%', cursor: 'pointer',
                      border: 'none', padding: 0, background: `${color}26`,
                    }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
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

        {/* Feed list — padding 0 14px 18px + gap 9px (maquette exact) */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 14px 18px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {loading ? (
            Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{
                height: 72, borderRadius: 14, marginTop: i === 0 ? 9 : 0,
                background: 'rgba(255,255,255,0.022)', border: `1px solid ${T.line}`,
                animation: 'rgg-pulse 1.6s ease-in-out infinite',
              }} />
            ))
          ) : (
            <>
              {fitItems.map(item => (
                <DuoFeedRow
                  key={item.candidate_id} item={item}
                  selected={selectedId === item.candidate_id}
                  onClick={() => setSelectedId(item.candidate_id)}
                />
              ))}

              {/* Separator si < 5 matchs role-fit */}
              {degradedItems.length > 0 && fitItems.length < 5 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 2px' }}>
                    <div style={{ flex: 1, height: 1, background: T.line }} />
                    <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
                      MOINS DE MONDE SUR TES CRITÈRES
                    </span>
                    <div style={{ flex: 1, height: 1, background: T.line }} />
                  </div>
                  {degradedItems.map(item => (
                    <DuoFeedRow
                      key={item.candidate_id} item={item}
                      selected={selectedId === item.candidate_id}
                      onClick={() => setSelectedId(item.candidate_id)}
                    />
                  ))}
                </>
              )}

              {!loading && items.length === 0 && (
                <div style={{ padding: '48px 0', textAlign: 'center' }}>
                  <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.14em' }}>
                    AUCUN DUO TROUVÉ
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Detail pane */}
      <div className="rgg-detail-pane" style={{ flex: 1, minWidth: 0, height: '100%' }}>
        {selectedItem ? (
          <DuoDetailPane
            item={selectedItem} avail={detailAvail} champs={detailChamps}
            onRequest={() => { /* TODO Phase 3 step 5 */ }}
          />
        ) : !loading && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.16em' }}>
              SÉLECTIONNE UN DUO
            </span>
          </div>
        )}
      </div>

      </div>
    </div>
  )
}
