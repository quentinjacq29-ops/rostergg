import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Avatar, { RANK_COLORS } from '@/components/ui/Avatar'
import RoleIcon, { ROLE_META } from '@/components/ui/RoleIcon'
import MatchRing from '@/components/ui/MatchRing'
import StatusDot from '@/components/ui/StatusDot'
import { championIconUrl, profileIconUrl } from '@/lib/riot/assets'
import SendDuoRequestButton from '@/components/profile/SendDuoRequestButton'
import type { DuoRequestTarget } from '@/components/duo/DuoRequestModal'

const T = {
  bg: '#0a0c14', surface: '#0f121c', line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6', live: '#00ff9d', gold: '#ffd166', danger: '#ff3d6e',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

function nameHue(s: string) {
  let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h
}

function Pill({ children, accent, dim = false, mono = true }: { children: React.ReactNode; accent?: string; dim?: boolean; mono?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: accent ? `${accent}1f` : 'rgba(255,255,255,0.04)', border: `1px solid ${accent ? accent + '40' : T.line}`, color: accent ?? (dim ? T.textMute : T.text), fontFamily: mono ? T.mono : T.body, fontSize: 10, fontWeight: 600, letterSpacing: mono ? '0.08em' : '0.02em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function PPSection({ label, children, accent = T.cyan, right }: { label: string; children: React.ReactNode; accent?: string; right?: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: accent, letterSpacing: '0.22em' }}>◢ {label}</div>
        {right}
      </div>
      {children}
    </section>
  )
}

function PPCard({ children, pad = 20, style }: { children: React.ReactNode; pad?: number; style?: React.CSSProperties }) {
  return <div style={{ borderRadius: 16, padding: pad, background: 'rgba(255,255,255,0.025)', border: `1px solid ${T.line}`, ...style }}>{children}</div>
}

function DSynergy({ label, value, note, color }: { label: string; value: number; note: string; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontFamily: T.body, fontSize: 13, color: T.textDim, fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.06em' }}>{note}</span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${color}, ${color}cc)`, boxShadow: `0 0 10px ${color}80` }} />
      </div>
    </div>
  )
}

function PoolGroup({ role, label, champIds, masteryMap }: {
  role: string; label: 'PRINCIPAL' | 'SECONDAIRE'
  champIds: string[]; masteryMap: Record<string, { level: number; points: number }>
}) {
  const rc = ROLE_META[role]?.c ?? T.cyan
  function masteryLabel(id: string) {
    const m = masteryMap[id]; if (!m) return '—'
    return `M${m.level}${m.points > 1000 ? ` · ${Math.round(m.points / 1000)}k` : ''}`
  }
  return (
    <div style={{ borderRadius: 16, padding: 18, background: `linear-gradient(135deg, ${rc}10, transparent 72%)`, border: `1px solid ${rc}33` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, background: `${rc}1c`, border: `1px solid ${rc}55` }}>
          <RoleIcon role={role} size={18} active />
        </span>
        <span style={{ fontFamily: T.display, fontSize: 19, color: T.text, letterSpacing: '0.03em' }}>{ROLE_META[role]?.name ?? role}</span>
        <span style={{ fontFamily: T.mono, fontSize: 8.5, color: rc, letterSpacing: '0.16em', padding: '3px 8px', borderRadius: 6, background: `${rc}18`, border: `1px solid ${rc}40` }}>{label}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.1em' }}>{champIds.length} CHAMPS</span>
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {champIds.map((id, i) => (
          <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 70, height: 70, borderRadius: 12, overflow: 'hidden', background: '#161a26', border: `1.5px solid ${i === 0 ? rc : rc + '55'}`, boxShadow: i === 0 ? `0 0 0 2px ${rc}, 0 0 14px ${rc}66` : 'none' }}>
              <img src={championIconUrl(id)} alt={id} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ fontFamily: T.mono, fontSize: 8.5, color: i === 0 ? rc : T.textMute, letterSpacing: '0.04em' }}>{masteryLabel(id)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Heatmap disponibilités (lecture seule) ────────────────────────────────────
function AvailHeatRead({ slots }: { slots: { weekday: number; slot: number; intensity: number }[] }) {
  const DAYS  = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM']
  const heat  = ['rgba(255,255,255,0.04)', `${T.cyan}26`, `${T.cyan}55`, `${T.cyan}aa`]
  const grid  = Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 6 }, (_, s) => slots.find(a => a.weekday === d && a.slot === s)?.intensity ?? 0)
  )
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
      {grid.map((col, di) => (
        <div key={di} style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
          {col.map((v, si) => (
            <div key={si} style={{ width: 30, height: 16, borderRadius: 4, background: heat[v] ?? heat[0], border: `1px solid ${v ? T.cyan + '33' : T.line}` }} />
          ))}
          <span style={{ fontFamily: T.mono, fontSize: 8.5, color: T.textMute, letterSpacing: '0.08em', marginTop: 3 }}>{DAYS[di]}</span>
        </div>
      ))}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Props = { params: { locale: string; gameName: string; tagLine: string } }

export default async function PlayerProfilePage({ params }: Props) {
  const supabase = await createClient()
  const gn = decodeURIComponent(params.gameName)
  const tl = decodeURIComponent(params.tagLine)

  // 1 — Résolution depuis riot_accounts
  const { data: ra } = await supabase
    .from('riot_accounts')
    .select('id, profile_id, game_name, tag_line, profile_icon_id, platform')
    .ilike('game_name', gn)
    .ilike('tag_line', tl)
    .maybeSingle()

  if (!ra) notFound()

  // 2 — Données en parallèle
  const [
    { data: profile },
    { data: prefs },
    { data: ranks },
    { data: mastery },
    { data: avail },
  ] = await Promise.all([
    supabase.from('profiles').select('display_name, bio').eq('id', ra.profile_id).maybeSingle(),
    supabase.from('matching_prefs').select('main_roles, looking_for_roles, playstyles, languages, champion_pool').eq('profile_id', ra.profile_id).maybeSingle(),
    supabase.from('ranks').select('tier, division, league_points, wins, losses, queue').eq('riot_account_id', ra.id),
    supabase.from('champion_mastery').select('champion_key, mastery_level, mastery_points').eq('riot_account_id', ra.id).order('mastery_points', { ascending: false }),
    supabase.from('availability').select('weekday, slot, intensity').eq('profile_id', ra.profile_id),
  ])

  const solo = (ranks ?? []).find(r => r.queue === 'RANKED_SOLO_5x5') ?? null
  const rankKey = solo?.tier?.toLowerCase() ?? null
  const rkColor = RANK_COLORS[rankKey ?? 'iron'] ?? T.textMute

  function rankLabel() {
    if (!solo) return 'UNRANKED'
    const high = ['master','grandmaster','challenger'].includes(solo.tier.toLowerCase())
    return high ? `${solo.tier.toUpperCase()} · ${solo.league_points} LP`
      : `${solo.tier.toUpperCase()} ${solo.division ?? ''} · ${solo.league_points} LP`.trim()
  }

  const total = (solo?.wins ?? 0) + (solo?.losses ?? 0)
  const wr    = total > 0 ? Math.round(((solo?.wins ?? 0) / total) * 100) : null

  const mainRoles   = (prefs?.main_roles as string[])         ?? []
  const lookingRoles = (prefs?.looking_for_roles as string[]) ?? []
  const playstyles  = (prefs?.playstyles as string[])         ?? []
  const languages   = (prefs?.languages as string[])          ?? []
  const champPool   = (prefs?.champion_pool as Record<string, string[]>) ?? {}

  const mainRole      = mainRoles[0] ?? null
  const secondaryRole = mainRoles[1] ?? null
  const lookingRole   = lookingRoles[0] ?? null
  const rcMain  = ROLE_META[mainRole ?? 'FILL']?.c ?? T.textDim
  const rcSec   = ROLE_META[secondaryRole ?? 'FILL']?.c ?? T.textDim
  const rcLook  = ROLE_META[lookingRole ?? 'FILL']?.c ?? T.textDim

  const masteryMap: Record<string, { level: number; points: number }> = {}
  for (const m of mastery ?? []) {
    if (m.champion_key) masteryMap[m.champion_key] = { level: m.mastery_level, points: m.mastery_points }
  }

  const initials = ra.game_name.slice(0, 2).toUpperCase()
  const hue = nameHue(ra.game_name)

  // 3 — Optionnel : score vs current user (si connecté)
  const { data: { user } } = await supabase.auth.getUser()
  let matchScore: number | null = null
  let matchBreakdown: { role: number; elo: number; schedule: number; langs: number } | null = null

  if (user && user.id !== ra.profile_id) {
    const { data: feed } = await supabase.rpc('duo_feed', {
      p_user_id: user.id,
      p_limit: 50, p_offset: 0,
    })
    const row = (feed ?? []).find((r: any) => r.candidate_id === ra.profile_id)
    if (row) {
      matchScore = row.score
      matchBreakdown = { role: row.is_degraded ? 0 : 100, elo: row.elo_score, schedule: row.schedule_score, langs: row.language_score }
    }
  }

  const target: DuoRequestTarget & { profileId: string } = {
    profileId: ra.profile_id,
    name:    ra.game_name,
    tag:     `#${ra.tag_line}`,
    role:    mainRole,
    looking: lookingRole,
    rank:    rankKey,
    tier:    solo?.division ?? null,
    lp:      solo?.league_points ?? null,
    match:   matchScore ?? 0,
    hue,
  }

  const totalChamps = Object.values(champPool).reduce((n, arr) => n + arr.length, 0)
  const rolesWithPool = mainRoles.filter(r => (champPool[r] ?? []).length > 0)

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', background: T.bg, color: T.text, fontFamily: T.body }}>

      {/* HERO BAND */}
      <div style={{ position: 'relative', padding: '30px 36px 26px', borderBottom: `1px solid ${T.line}`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, left: 0, width: 420, height: 280, background: `radial-gradient(circle, ${T.cyan}26, transparent 70%)`, filter: 'blur(50px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -40, right: 60, width: 360, height: 240, background: `radial-gradient(circle, ${T.violet}22, transparent 70%)`, filter: 'blur(50px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 26 }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar initials={initials} size={118} rank={rankKey ?? 'iron'} hue={hue} online={false} />
            {ra.profile_icon_id && (
              <img src={profileIconUrl(ra.profile_icon_id)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: T.display, fontSize: 44, color: T.text, letterSpacing: '0.02em', lineHeight: 1 }}>{ra.game_name}</span>
              <span style={{ fontFamily: T.mono, fontSize: 16, color: T.textDim, letterSpacing: '0.08em' }}>#{ra.tag_line}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <Pill accent={rkColor}>{rankLabel()}</Pill>
              {mainRole && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: `${rcMain}1a`, border: `1px solid ${rcMain}44` }}>
                  <RoleIcon role={mainRole} size={14} active />
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: rcMain, letterSpacing: '0.1em', fontWeight: 700 }}>{ROLE_META[mainRole]?.name}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 8, color: rcMain, opacity: 0.8, letterSpacing: '0.12em', padding: '2px 5px', borderRadius: 5, background: `${rcMain}22` }}>MAIN</span>
                </span>
              )}
              {secondaryRole && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: `${rcSec}12`, border: `1px solid ${rcSec}33` }}>
                  <RoleIcon role={secondaryRole} size={14} active />
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: rcSec, letterSpacing: '0.1em', fontWeight: 700 }}>{ROLE_META[secondaryRole]?.name}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 8, color: rcSec, opacity: 0.8, letterSpacing: '0.12em', padding: '2px 5px', borderRadius: 5, background: `${rcSec}1e` }}>2ND</span>
                </span>
              )}
              {lookingRole && (
                <>
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim }}>seeks</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: `${rcLook}14`, border: `1px solid ${rcLook}33` }}>
                    <RoleIcon role={lookingRole} size={14} active />
                    <span style={{ fontFamily: T.mono, fontSize: 11, color: rcLook, letterSpacing: '0.1em', fontWeight: 700 }}>{ROLE_META[lookingRole]?.name}</span>
                  </span>
                </>
              )}
              <Pill dim>{ra.platform?.toUpperCase() ?? 'EUW'}</Pill>
              <div style={{ display: 'flex', gap: 5 }}>
                {languages.map((l, i) => (
                  <span key={l} style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: 999, background: i === 0 ? `${T.cyan}1f` : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 0 ? T.cyan + '40' : T.line}`, fontFamily: T.mono, fontSize: 10, color: i === 0 ? T.cyan : T.textDim, fontWeight: 600, letterSpacing: '0.08em' }}>
                    {l.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch', flexShrink: 0 }}>
            <SendDuoRequestButton target={target} />
          </div>
        </div>

        {/* Stat strip */}
        <div style={{ position: 'relative', marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[
            { label: 'MATCH',    value: matchScore != null ? matchScore : '—', suffix: matchScore != null ? '%' : '', accent: T.cyan },
            { label: 'WIN RATE', value: wr != null ? wr : '—',               suffix: wr != null ? '%' : '',    accent: T.live },
            { label: 'KDA',      value: '—',                                   suffix: '',                       accent: T.text },
            { label: 'GAMES',    value: total > 0 ? total : '—',              suffix: '',                       accent: T.text },
            { label: 'PEAK',     value: solo ? `${solo.tier.slice(0,1).toUpperCase()}${solo.tier.slice(1,3).toLowerCase()}` : '—', suffix: '', accent: T.gold },
          ].map(({ label, value, suffix, accent }) => (
            <div key={label} style={{ padding: '13px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.line}` }}>
              <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.2em' }}>{label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 5 }}>
                <span style={{ fontFamily: T.display, fontSize: 26, color: accent, lineHeight: 1 }}>{value}</span>
                {suffix && <span style={{ fontFamily: T.display, fontSize: 14, color: accent, opacity: 0.7 }}>{suffix}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BODY two-col */}
      <div style={{ padding: '26px 36px 40px', display: 'grid', gridTemplateColumns: '380px 1fr', gap: 28 }}>

        {/* LEFT */}
        <div>
          {/* WHY YOU MATCH */}
          {matchScore != null && matchBreakdown && (
            <PPSection label="WHY YOU MATCH">
              <PPCard pad={20} style={{ background: `linear-gradient(135deg, ${T.cyan}12, ${T.violet}12)`, border: `1px solid ${T.cyan}2e` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <MatchRing value={matchScore} size={92} stroke={6} accent={T.cyan} accent2={T.violet} />
                  <p style={{ margin: 0, fontFamily: T.body, fontSize: 13.5, color: T.textDim, lineHeight: 1.5 }}>
                    Score de compatibilité calculé sur tes préférences et celles de {ra.game_name}.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  <DSynergy label="Role fit"  value={matchBreakdown.role}     note={mainRole ? `${lookingRole ?? '?'} ↔ ${mainRole}` : ''}       color={T.cyan}   />
                  <DSynergy label="Elo range" value={matchBreakdown.elo}      note={rankKey ? rankLabel().split(' ·')[0] : ''}                    color={T.live}   />
                  <DSynergy label="Schedule"  value={matchBreakdown.schedule} note="overlap"                                                       color={T.violet} />
                  <DSynergy label="Languages" value={matchBreakdown.langs}    note={languages.join(' · ').toUpperCase()}                           color={T.gold}   />
                </div>
              </PPCard>
            </PPSection>
          )}

          {/* ABOUT */}
          {profile?.bio && (
            <PPSection label="ABOUT">
              <PPCard>
                <p style={{ margin: 0, fontFamily: T.body, fontSize: 14, color: T.textDim, lineHeight: 1.65 }}>&ldquo;{profile.bio}&rdquo;</p>
              </PPCard>
            </PPSection>
          )}

          {/* AVAILABILITY */}
          {(avail ?? []).length > 0 && (
            <PPSection label="AVAILABILITY · THIS WEEK">
              <PPCard>
                <AvailHeatRead slots={avail ?? []} />
              </PPCard>
            </PPSection>
          )}
        </div>

        {/* RIGHT */}
        <div>
          {/* CHAMPION POOL */}
          {rolesWithPool.length > 0 && (
            <PPSection
              label="CHAMPION POOL"
              right={<span style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.1em' }}>{totalChamps} CHAMPS · {rolesWithPool.length} RÔLE{rolesWithPool.length > 1 ? 'S' : ''}</span>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {rolesWithPool.map((r, i) => (
                  <PoolGroup
                    key={r}
                    role={r}
                    label={i === 0 ? 'PRINCIPAL' : 'SECONDAIRE'}
                    champIds={champPool[r] ?? []}
                    masteryMap={masteryMap}
                  />
                ))}
              </div>
            </PPSection>
          )}

          {/* PLAYSTYLE */}
          {playstyles.length > 0 && (
            <PPSection label="PLAYSTYLE">
              <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                {playstyles.map(s => (
                  <Pill key={s} accent={s === 'Tryhard' ? T.danger : T.cyan}>{s}</Pill>
                ))}
                {total > 0 && <Pill dim>RANKED SOLO/DUO</Pill>}
                {total > 0 && <Pill dim>{total} GAMES</Pill>}
              </div>
            </PPSection>
          )}
        </div>
      </div>
    </div>
  )
}
