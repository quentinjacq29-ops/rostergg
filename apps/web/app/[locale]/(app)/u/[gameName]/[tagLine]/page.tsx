import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Avatar, { RANK_COLORS } from '@/components/ui/Avatar'
import RoleIcon, { ROLE_META } from '@/components/ui/RoleIcon'
import MatchRing from '@/components/ui/MatchRing'
import ChampionTile from '@/components/ui/ChampionTile'
import { profileIconUrl } from '@/lib/riot/assets'
import SendDuoRequestButton from '@/components/profile/SendDuoRequestButton'
import type { DuoRequestTarget } from '@/components/duo/DuoRequestModal'
import DTopBar from '@/components/layout/DTopBar'
import { ProfileMobileNav, ProfileMobileCTA } from '@/components/profile/PlayerProfileMobileChrome'

const T = {
  bg: '#0a0c14', surface: '#0f121c', elevated: '#161a26',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6', live: '#00ff9d',
  gold: '#ffd166', danger: '#ff3d6e',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

// PEAK format : "diamond II" → "D2", "master" → "M", etc.
const TIER_ABBR: Record<string, string> = {
  iron: 'I', bronze: 'B', silver: 'S', gold: 'G', platinum: 'P',
  emerald: 'E', diamond: 'D', master: 'M', grandmaster: 'GM', challenger: 'C',
}

const LANG_COLORS: Record<string, string> = {
  fr: '#5b8def', en: '#e85a5a', es: '#ffb547', de: '#3ddc97', it: '#8b5cf6',
}

// ── Fallback PP (desktop/profile.jsx — objet PP) ─────────────────────────────
const PP = {
  match: 94, kda: '2.9', games: 388, wr: 58,
  pitch: "Main top bruiser qui joue la carte autant que sa lane — TP timings, splitpush, et je flex jungle quand le draft le demande. Je cherche un mid qui roam et call les objectifs. Vocal, posé, focus montée.",
  breakdown: { role: 96, elo: 92, schedule: 88, langs: 100, style: 84 },
  notes:     { role: 'JNG ↔ MID', elo: 'D2 ↔ D2', schedule: '21h–01h', langs: 'FR · EN', style: 'Tryhard' },
}

// ── Primitives (port fidèle profile.jsx) ─────────────────────────────────────

function PPSection({ label, children, accent = T.cyan, right }: {
  label: string; children: React.ReactNode; accent?: string; right?: React.ReactNode
}) {
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

function PPCard({ children, pad = 20, style }: {
  children: React.ReactNode; pad?: number; style?: React.CSSProperties
}) {
  return (
    <div style={{ borderRadius: 16, padding: pad, background: 'rgba(255,255,255,0.025)', border: `1px solid ${T.line}`, ...style }}>
      {children}
    </div>
  )
}

function Pill({ children, accent, dim }: { children: React.ReactNode; accent?: string; dim?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999,
      background: accent ? `${accent}1f` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${accent ? accent + '40' : T.line}`,
      color: accent ?? (dim ? T.textMute : T.text),
      fontFamily: T.mono, fontSize: 11, fontWeight: 600,
      letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

function LangChip({ code, primary }: { code: string; primary: boolean }) {
  const c = LANG_COLORS[code.toLowerCase()] ?? T.textDim
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6,
      background: primary ? `${c}22` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${primary ? c + '66' : T.line}`,
      fontFamily: T.mono, fontSize: 10, fontWeight: 700,
      color: primary ? c : T.text, letterSpacing: '0.1em',
    }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: c, boxShadow: primary ? `0 0 4px ${c}` : 'none' }} />
      {code.toUpperCase()}
      {primary && <span style={{ fontSize: 7, color: c, opacity: 0.7, letterSpacing: '0.15em' }}>·MAIN</span>}
    </span>
  )
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

function TeamCrest({ c1, c2, tag, size = 42 }: { c1: string; c2: string; tag: string; size?: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size * 1.08, flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
      <div style={{ position: 'absolute', inset: 2, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: `radial-gradient(circle at 30% 25%, ${c1}30, transparent 50%), linear-gradient(180deg, ${T.elevated}, ${T.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: T.display, fontSize: size * 0.36, color: c1, textShadow: `0 0 8px ${c1}66` }}>{tag.slice(0, 2).toUpperCase()}</span>
      </div>
    </div>
  )
}

function PoolGroup({ role, label, champIds, masteryMap }: {
  role: string; label: 'PRINCIPAL' | 'SECONDAIRE'; champIds: string[]; masteryMap: Record<string, string>
}) {
  const rc = ROLE_META[role]?.c ?? T.cyan
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
            <ChampionTile champKey={id} size={70} ring={i === 0} />
            <span style={{ fontFamily: T.mono, fontSize: 8.5, color: i === 0 ? rc : T.textMute, letterSpacing: '0.04em' }}>
              {masteryMap[id] ?? 'M5'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AvailHeatRead({ slots }: { slots: { weekday: number; slot: number; intensity: number }[] }) {
  const DAYS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM']
  const heat = ['rgba(255,255,255,0.04)', `${T.cyan}26`, `${T.cyan}55`, `${T.cyan}aa`]
  const grid = Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 6 }, (_, s) => slots.find(a => a.weekday === d && a.slot === s)?.intensity ?? 0)
  )
  return (
    <div style={{ display: 'flex', gap: 10 }}>
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

function nameHue(s: string) {
  let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h
}

type Props = { params: { locale: string; gameName: string; tagLine: string } }

// Profil joueur public → indexable SEO (titre/description par joueur)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const gn = decodeURIComponent(params.gameName)
  const tl = decodeURIComponent(params.tagLine)
  return {
    title: `${gn} #${tl} — Profil joueur`,
    description: `Profil LoL de ${gn}#${tl} sur RosterGG : rang, rôles, champion pool, disponibilités et compatibilité duo. Trouve un duo compatible.`,
    robots: { index: true, follow: true },
    openGraph: {
      title: `${gn} #${tl} · RosterGG`,
      description: `Rang, champion pool et compatibilité duo de ${gn}#${tl}.`,
    },
  }
}

export default async function PlayerProfilePage({ params }: Props) {
  const supabase = await createClient()
  const gn = decodeURIComponent(params.gameName)
  const tl = decodeURIComponent(params.tagLine)

  const { data: ra } = await supabase
    .from('riot_accounts')
    .select('id, profile_id, game_name, tag_line, profile_icon_id, platform')
    .ilike('game_name', gn).ilike('tag_line', tl).maybeSingle()
  if (!ra) notFound()

  const [
    { data: profile },
    { data: prefs },
    { data: ranks },
    { data: mastery },
    { data: avail },
    { data: teamMemberships },
  ] = await Promise.all([
    supabase.from('profiles').select('display_name, bio').eq('id', ra.profile_id).maybeSingle(),
    supabase.from('matching_prefs').select('main_roles,looking_for_roles,playstyles,languages,champion_pool,voice_required').eq('profile_id', ra.profile_id).maybeSingle(),
    supabase.from('ranks').select('tier,division,league_points,wins,losses,queue').eq('riot_account_id', ra.id),
    supabase.from('champion_mastery').select('champion_key,mastery_level,mastery_points').eq('riot_account_id', ra.id).order('mastery_points', { ascending: false }),
    supabase.from('availability').select('weekday,slot,intensity').eq('profile_id', ra.profile_id),
    supabase.from('team_members').select('role,member_role,teams(id,name,tag,crest)').eq('profile_id', ra.profile_id),
  ])

  // ── Rangs
  const solo    = (ranks ?? []).find(r => r.queue === 'RANKED_SOLO_5x5') ?? null
  const rankKey = solo?.tier?.toLowerCase() ?? null
  const rkColor = RANK_COLORS[rankKey ?? 'iron'] ?? T.textMute

  function rankLabelStr() {
    if (!solo) return 'UNRANKED'
    const high = ['master','grandmaster','challenger'].includes(solo.tier.toLowerCase())
    return high ? `${solo.tier.toUpperCase()} · ${solo.league_points} LP`
                : `${solo.tier.toUpperCase()} ${solo.division ?? ''} · ${solo.league_points} LP`.trim()
  }

  // PEAK — "D2", "M", "GM", "C"
  function peakStr() {
    if (!solo || !rankKey) return 'D1'
    const abbr = TIER_ABBR[rankKey] ?? rankKey.slice(0,1).toUpperCase()
    const high = ['master','grandmaster','challenger'].includes(rankKey)
    return high ? abbr : `${abbr}${solo.division ?? ''}`
  }

  const wins   = solo?.wins   ?? 0
  const losses = solo?.losses ?? 0
  const total  = wins + losses
  const wr     = total > 0 ? Math.round((wins / total) * 100) : PP.wr

  // ── Prefs
  const mainRoles    = (prefs?.main_roles        as string[]) ?? []
  const lookingRoles = (prefs?.looking_for_roles as string[]) ?? []
  const playstyles   = (prefs?.playstyles        as string[]) ?? []
  const languages    = (prefs?.languages         as string[]) ?? []
  const champPool    = (prefs?.champion_pool as Record<string,string[]>) ?? {}

  const mainRole      = mainRoles[0]    ?? null
  const secondaryRole = mainRoles[1]    ?? null
  const lookingRole   = lookingRoles[0] ?? null
  const rcMain = ROLE_META[mainRole      ?? 'FILL']?.c ?? T.textDim
  const rcSec  = ROLE_META[secondaryRole ?? 'FILL']?.c ?? T.textDim
  const rcLook = ROLE_META[lookingRole   ?? 'FILL']?.c ?? T.textDim

  // ── Mastery map — clé normalisée en minuscules
  const masteryMap: Record<string,string> = {}
  for (const m of mastery ?? []) {
    if (!m.champion_key) continue
    const lbl = `M${m.mastery_level}${m.mastery_points > 1000 ? ` · ${Math.round(m.mastery_points/1000)}k` : ''}`
    masteryMap[m.champion_key.toLowerCase()] = lbl
    masteryMap[m.champion_key] = lbl
  }
  function masteryForPool(ids: string[]): Record<string,string> {
    const out: Record<string,string> = {}
    for (const id of ids) out[id] = masteryMap[id] ?? masteryMap[id.toLowerCase()] ?? 'M5'
    return out
  }

  const hue      = nameHue(ra.game_name)
  const initials = ra.game_name.slice(0,2).toUpperCase()

  // ── Compatibilité (autre utilisateur connecté)
  const { data: { user } } = await supabase.auth.getUser()
  let matchScore: number | null = null
  let bd: typeof PP.breakdown | null = null
  let notes: typeof PP.notes | null = null

  if (user && user.id !== ra.profile_id) {
    const [{ data: scoreRows }, { data: viewerPrefs }] = await Promise.all([
      supabase.rpc('duo_score', { p_user_id: user.id, p_candidate_id: ra.profile_id }),
      supabase.from('matching_prefs').select('main_roles,playstyles,languages').eq('profile_id', user.id).maybeSingle(),
    ])
    const row = (scoreRows ?? [])[0] ?? null
    if (row) {
      const viewerRole    = (viewerPrefs?.main_roles as string[] | null)?.[0] ?? null
      const candidateRole = mainRoles[0] ?? null
      const roleNote      = candidateRole && viewerRole
        ? `${candidateRole} ↔ ${viewerRole}`
        : 'tous rôles'

      matchScore = row.score
      bd = {
        role:     row.is_degraded ? 0 : 100,
        elo:      row.elo_score      ?? 0,
        schedule: row.schedule_score ?? 0,
        langs:    row.language_score ?? 0,
        style:    row.style_score    ?? PP.breakdown.style,
      }
      notes = {
        role:     roleNote,
        elo:      row.elo_note      ?? PP.notes.elo,
        schedule: row.schedule_note ?? PP.notes.schedule,
        langs:    (row.language_note ?? languages.map(l => l.toUpperCase()).join(' · ')) || PP.notes.langs,
        style:    (viewerPrefs?.playstyles as string[] | null)?.[0] ?? playstyles[0] ?? PP.notes.style,
      }
    }
  }

  // Bookmark + Riot ID reveal (viewer only)
  let isBookmarked    = false
  let revealedRiotId: string | null = null

  if (user && user.id !== ra.profile_id) {
    const [{ data: bookmark }, { data: accepted }] = await Promise.all([
      supabase.from('bookmarks').select('target_id').eq('user_id', user.id).eq('target_id', ra.profile_id).maybeSingle(),
      supabase.from('duo_requests')
        .select('id')
        .or(`and(from_profile.eq.${user.id},to_profile.eq.${ra.profile_id}),and(from_profile.eq.${ra.profile_id},to_profile.eq.${user.id})`)
        .eq('status', 'accepted')
        .maybeSingle(),
    ])
    isBookmarked   = !!bookmark
    revealedRiotId = accepted ? `${ra.game_name}#${ra.tag_line}` : null
  }

  // Toujours afficher WHY YOU MATCH — fallback PP si pas de données réelles
  const displayMatch = matchScore ?? PP.match
  const displayBd    = bd    ?? PP.breakdown
  const displayNotes = notes ?? PP.notes

  // ABOUT — toujours afficher
  const pitch = profile?.bio ?? PP.pitch

  // KDA — fallback PP jusqu'à connexion Match-V5
  const kda = PP.kda

  const target: DuoRequestTarget & { profileId: string } = {
    profileId: ra.profile_id, name: ra.game_name, tag: `#${ra.tag_line}`,
    role: mainRole, looking: lookingRole, rank: rankKey,
    tier: solo?.division ?? null, lp: solo?.league_points ?? null,
    match: displayMatch, hue,
  }

  const authed = !!user && user.id !== ra.profile_id
  const moreTarget = authed ? {
    profileId: ra.profile_id,
    displayName: profile?.display_name ?? ra.game_name,
    riotId: revealedRiotId,
    isBookmarked,
  } : null

  const rolesWithPool = mainRoles.filter(r => (champPool[r] ?? []).length > 0)
  const totalChamps   = Object.values(champPool).reduce((n, arr) => n + arr.length, 0)

  const styleChips = [...playstyles]
  if (prefs?.voice_required && !styleChips.map(s=>s.toLowerCase()).includes('vocal')) styleChips.push('Vocal')

  const teams = (teamMemberships ?? [])
    .map((tm: any) => {
      const t = tm.teams; if (!t) return null
      const c = (t.crest ?? {}) as { c1?: string; c2?: string }
      return { id: t.id, name: t.name, tag: t.tag, c1: c.c1 ?? T.violet, c2: c.c2 ?? T.cyan, role: tm.role, badge: tm.member_role === 'captain' ? 'CAPTAIN' : 'MEMBER' }
    }).filter(Boolean) as { id:string; name:string; tag:string; c1:string; c2:string; role:string|null; badge:string }[]

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', background:T.bg, color:T.text, fontFamily:T.body }}>

      {/* ══ DTopBar — desktop uniquement (≥860px) ════════════════════════════════ */}
      <div className="rgg-pp-chrome-desktop">
        <DTopBar
          eyebrow="PLAYER PROFILE · FROM YOUR TOP DUOS"
          title={ra.game_name.toUpperCase()}
          accent={T.cyan}
          locale={params.locale}
          target={moreTarget ?? undefined}
        />
      </div>

      {/* ══ Contenu scrollable ═══════════════════════════════════════════════════ */}
      <div style={{ flex:1, overflowY:'auto' }}>

        {/* ════════ DESKTOP (≥860px) ════════ */}
        <div className="rgg-pp-desktop">

        {/* HERO BAND */}
        <div style={{ position:'relative', padding:'30px 36px 26px', borderBottom:`1px solid ${T.line}`, overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-60, left:0, width:420, height:280, background:`radial-gradient(circle, ${T.cyan}26, transparent 70%)`, filter:'blur(50px)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', top:-40, right:60, width:360, height:240, background:`radial-gradient(circle, ${T.violet}22, transparent 70%)`, filter:'blur(50px)', pointerEvents:'none' }} />

          <div style={{ position:'relative', display:'flex', alignItems:'center', gap:26 }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <Avatar initials={initials} size={118} rank={rankKey ?? 'iron'} hue={hue} online={false} />
              {ra.profile_icon_id && <img src={profileIconUrl(ra.profile_icon_id)} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} />}
            </div>

            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontFamily:T.display, fontSize:44, color:T.text, letterSpacing:'0.02em', lineHeight:1 }}>{ra.game_name}</span>
                <span style={{ fontFamily:T.mono, fontSize:16, color:T.textDim, letterSpacing:'0.08em' }}>#{ra.tag_line}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:11, marginTop:14, flexWrap:'wrap' }}>
                <Pill accent={rkColor}>{rankLabelStr()}</Pill>
                {mainRole && (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:999, background:`${rcMain}1a`, border:`1px solid ${rcMain}44` }}>
                    <RoleIcon role={mainRole} size={14} active />
                    <span style={{ fontFamily:T.mono, fontSize:11, color:rcMain, letterSpacing:'0.1em', fontWeight:700 }}>{ROLE_META[mainRole]?.name}</span>
                    <span style={{ fontFamily:T.mono, fontSize:8, color:rcMain, opacity:0.8, padding:'2px 5px', borderRadius:5, background:`${rcMain}22`, letterSpacing:'0.12em' }}>MAIN</span>
                  </span>
                )}
                {secondaryRole && (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:999, background:`${rcSec}12`, border:`1px solid ${rcSec}33` }}>
                    <RoleIcon role={secondaryRole} size={14} active />
                    <span style={{ fontFamily:T.mono, fontSize:11, color:rcSec, letterSpacing:'0.1em', fontWeight:700 }}>{ROLE_META[secondaryRole]?.name}</span>
                    <span style={{ fontFamily:T.mono, fontSize:8, color:rcSec, opacity:0.8, padding:'2px 5px', borderRadius:5, background:`${rcSec}1e`, letterSpacing:'0.12em' }}>2ND</span>
                  </span>
                )}
                {lookingRole && <>
                  <span style={{ fontFamily:T.mono, fontSize:11, color:T.textDim }}>seeks</span>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:999, background:`${rcLook}14`, border:`1px solid ${rcLook}33` }}>
                    <RoleIcon role={lookingRole} size={14} active />
                    <span style={{ fontFamily:T.mono, fontSize:11, color:rcLook, letterSpacing:'0.1em', fontWeight:700 }}>{ROLE_META[lookingRole]?.name}</span>
                  </span>
                </>}
                <Pill dim>{ra.platform?.toUpperCase() ?? 'EUW'}</Pill>
                <div style={{ display:'flex', gap:4 }}>
                  {languages.map((l,i) => <LangChip key={l} code={l} primary={i===0} />)}
                </div>
              </div>
            </div>

            <SendDuoRequestButton target={target} />
          </div>

          {/* Stat strip */}
          <div style={{ position:'relative', marginTop:22, display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12 }}>
            {([
              ['MATCH',    displayMatch,           '%', T.cyan],
              ['WIN RATE', wr,                     '%', T.live],
              ['KDA',      kda,                    '',  T.text],
              ['GAMES',    total > 0 ? total : PP.games, '', T.text],
              ['PEAK',     peakStr(),              '',  T.gold],
            ] as [string, string|number, string, string][]).map(([l,v,s,a]) => (
              <div key={l} style={{ padding:'13px 16px', borderRadius:14, background:'rgba(255,255,255,0.03)', border:`1px solid ${T.line}` }}>
                <div style={{ fontFamily:T.mono, fontSize:9, color:T.textMute, letterSpacing:'0.2em' }}>{l}</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:2, marginTop:5 }}>
                  <span style={{ fontFamily:T.display, fontSize:26, color:a, lineHeight:1 }}>{v}</span>
                  {s && <span style={{ fontFamily:T.display, fontSize:14, color:a, opacity:0.7 }}>{s}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BODY 2 colonnes */}
        <div style={{ padding:'26px 36px 40px', display:'grid', gridTemplateColumns:'380px 1fr', gap:28 }}>

          {/* ── Colonne gauche ── */}
          <div>

            {/* 1. WHY YOU MATCH — toujours visible (fallback PP si pas de données réelles) */}
            <PPSection label="WHY YOU MATCH">
              <PPCard pad={20} style={{ background:`linear-gradient(135deg, ${T.cyan}12, ${T.violet}12)`, border:`1px solid ${T.cyan}2e` }}>
                <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16 }}>
                  <MatchRing value={displayMatch} size={92} stroke={6} accent={T.cyan} accent2={T.violet} label="MATCH" />
                  <p style={{ margin:0, fontFamily:T.body, fontSize:13.5, color:T.textDim, lineHeight:1.5 }}>
                    Top compatibility this week. Complementary roles, same elo bracket, overlapping schedule.
                  </p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
                  <DSynergy label="Role fit"  value={displayBd.role}     note={displayNotes.role}     color={T.cyan}   />
                  <DSynergy label="Elo range" value={displayBd.elo}      note={displayNotes.elo}      color={T.live}   />
                  <DSynergy label="Schedule"  value={displayBd.schedule} note={displayNotes.schedule} color={T.violet} />
                  <DSynergy label="Languages" value={displayBd.langs}    note={displayNotes.langs}    color={T.gold}   />
                  <DSynergy label="Playstyle" value={displayBd.style}    note={displayNotes.style}    color={T.danger} />
                </div>
              </PPCard>
            </PPSection>

            {/* 2. ABOUT — toujours visible (fallback PP.pitch) */}
            <PPSection label="ABOUT">
              <PPCard>
                <p style={{ margin:0, fontFamily:T.body, fontSize:14, color:T.textDim, lineHeight:1.65 }}>&ldquo;{pitch}&rdquo;</p>
              </PPCard>
            </PPSection>

            {/* 3. AVAILABILITY */}
            {(avail ?? []).length > 0 && (
              <PPSection label="AVAILABILITY · THIS WEEK">
                <PPCard><AvailHeatRead slots={avail ?? []} /></PPCard>
              </PPSection>
            )}

            {/* 4. TEAMS */}
            {teams.length > 0 && (
              <PPSection label="TEAMS">
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {teams.map(t => (
                    <PPCard key={t.id} pad={14} style={{ display:'flex', alignItems:'center', gap:13 }}>
                      <TeamCrest c1={t.c1} c2={t.c2} tag={t.tag} size={42} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:T.display, fontSize:16, color:T.text, letterSpacing:'0.03em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</div>
                        <div style={{ fontFamily:T.mono, fontSize:9.5, color:T.textDim, letterSpacing:'0.12em', marginTop:3 }}>{t.role ? `${t.role.toUpperCase()} · ` : ''}{t.badge}</div>
                      </div>
                      <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 7px', borderRadius:6, background:`${t.c1}1c`, border:`1px solid ${t.c1}55`, color:t.c1, fontFamily:T.mono, fontSize:9, fontWeight:700, letterSpacing:'0.15em' }}>{t.badge}</span>
                    </PPCard>
                  ))}
                </div>
              </PPSection>
            )}
          </div>

          {/* ── Colonne droite ── */}
          <div>

            {/* CHAMPION POOL */}
            {rolesWithPool.length > 0 && (
              <PPSection label="CHAMPION POOL" right={<span style={{ fontFamily:T.mono, fontSize:10, color:T.textMute, letterSpacing:'0.1em' }}>{totalChamps} CHAMPS · {rolesWithPool.length} RÔLE{rolesWithPool.length>1?'S':''}</span>}>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {rolesWithPool.map((r,i) => (
                    <PoolGroup key={r} role={r} label={i===0?'PRINCIPAL':'SECONDAIRE'} champIds={champPool[r]??[]} masteryMap={masteryForPool(champPool[r]??[])} />
                  ))}
                </div>
              </PPSection>
            )}

            {/* PLAYSTYLE */}
            {styleChips.length > 0 && (
              <PPSection label="PLAYSTYLE">
                <div style={{ display:'flex', gap:9, flexWrap:'wrap' }}>
                  {styleChips.map(s => <Pill key={s} accent={s.toLowerCase()==='tryhard'?T.danger:T.cyan}>{s}</Pill>)}
                  <Pill dim>RANKED SOLO/DUO</Pill>
                  <Pill dim>CLASH</Pill>
                </div>
              </PPSection>
            )}

          </div>
        </div>
        </div>{/* ════ /DESKTOP ════ */}

        {/* ════════ MOBILE (≤859px) ════════ */}
        <div className="rgg-pp-mobile" style={{ paddingBottom: 104 }}>
          <ProfileMobileNav authed={authed} more={moreTarget} />

          {/* HERO */}
          <header style={{ position:'relative', padding:'24px 18px 20px', borderBottom:`1px solid ${T.line}`, overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-60, left:-40, width:280, height:200, background:`radial-gradient(circle, ${T.cyan}38, transparent 70%)`, filter:'blur(46px)', pointerEvents:'none' }} />
            <div style={{ position:'absolute', top:-40, right:-30, width:240, height:180, background:`radial-gradient(circle, ${T.violet}30, transparent 70%)`, filter:'blur(46px)', pointerEvents:'none' }} />
            <div style={{ position:'relative', display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ position:'relative', width:80, height:80, flexShrink:0 }}>
                <Avatar initials={initials} size={80} rank={rankKey ?? 'iron'} hue={hue} online={false} />
                {ra.profile_icon_id && <img src={profileIconUrl(ra.profile_icon_id)} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} />}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <h1 style={{ margin:0, fontFamily:T.display, fontSize:30, letterSpacing:'0.02em', lineHeight:1, color:T.text }}>{ra.game_name}</h1>
                <span style={{ fontFamily:T.mono, fontSize:11, color:T.textDim, marginTop:6, display:'block' }}>#{ra.tag_line}</span>
              </div>
            </div>
            <div style={{ position:'relative', display:'flex', alignItems:'center', gap:7, marginTop:16, flexWrap:'wrap' }}>
              <Pill accent={rkColor}>{rankLabelStr()}</Pill>
              {mainRole && (
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:999, border:`1px solid ${rcMain}`, color:rcMain, fontFamily:T.mono, fontSize:10, fontWeight:700, letterSpacing:'0.06em' }}>
                  {ROLE_META[mainRole]?.name ?? mainRole}<span style={{ fontSize:7.5, padding:'1px 4px', borderRadius:4, background:rcMain, color:T.bg, letterSpacing:'0.1em' }}>MAIN</span>
                </span>
              )}
              {secondaryRole && (
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:999, border:`1px solid ${rcSec}`, color:rcSec, fontFamily:T.mono, fontSize:10, fontWeight:700, letterSpacing:'0.06em' }}>
                  {ROLE_META[secondaryRole]?.name ?? secondaryRole}<span style={{ fontSize:7.5, padding:'1px 4px', borderRadius:4, background:rcSec, color:T.bg, letterSpacing:'0.1em' }}>2ND</span>
                </span>
              )}
              {lookingRole && <>
                <span style={{ fontFamily:T.mono, fontSize:10, color:T.textDim }}>cherche</span>
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:999, border:`1px solid ${rcLook}`, color:rcLook, fontFamily:T.mono, fontSize:10, fontWeight:700, letterSpacing:'0.06em' }}>{ROLE_META[lookingRole]?.name ?? lookingRole}</span>
              </>}
              {languages.map((l,i) => <LangChip key={l} code={l} primary={i===0} />)}
            </div>
            <div style={{ position:'relative', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:18 }}>
              {([
                ['MATCH', displayMatch, '%', T.cyan],
                ['WIN RATE', wr, '%', T.live],
                ['KDA', kda, '', T.text],
                ['GAMES', total > 0 ? total : PP.games, '', T.text],
                ['PEAK', peakStr(), '', T.gold],
                ['SERVEUR', ra.platform?.toUpperCase() ?? 'EUW', '', T.text],
              ] as [string, string|number, string, string][]).map(([l,v,s,a]) => (
                <div key={l} style={{ padding:'11px 12px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:`1px solid ${T.line}` }}>
                  <div style={{ fontFamily:T.mono, fontSize:8, color:T.textMute, letterSpacing:'0.16em' }}>{l}</div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:2, marginTop:5 }}>
                    <span style={{ fontFamily:T.display, fontSize:l==='SERVEUR'?18:22, color:a, lineHeight:1 }}>{v}</span>
                    {s && <span style={{ fontFamily:T.display, fontSize:12, color:a, opacity:0.7 }}>{s}</span>}
                  </div>
                </div>
              ))}
            </div>
          </header>

          {/* WHY YOU MATCH */}
          <section style={{ padding:'20px 18px', borderBottom:`1px solid ${T.line}` }}>
            <div style={{ fontFamily:T.mono, fontSize:10, color:T.cyan, letterSpacing:'0.2em', marginBottom:13 }}>◢ POURQUOI VOUS MATCHEZ</div>
            <div style={{ borderRadius:16, padding:18, background:`linear-gradient(135deg, ${T.cyan}1f, ${T.violet}1f)`, border:`1px solid ${T.cyan}47` }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
                <MatchRing value={displayMatch} size={68} stroke={6} accent={T.cyan} accent2={T.violet} />
                <p style={{ margin:0, fontFamily:T.body, fontSize:13, color:T.textDim, lineHeight:1.5 }}>Top compatibilité cette semaine. Rôles complémentaires, même tranche d&apos;elo, créneaux qui se recoupent.</p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <DSynergy label="Rôle" value={displayBd.role} note={displayNotes.role} color={T.cyan} />
                <DSynergy label="Elo" value={displayBd.elo} note={displayNotes.elo} color={T.live} />
                <DSynergy label="Horaires" value={displayBd.schedule} note={displayNotes.schedule} color={T.violet} />
                <DSynergy label="Langues" value={displayBd.langs} note={displayNotes.langs} color={T.gold} />
                <DSynergy label="Style" value={displayBd.style} note={displayNotes.style} color={T.danger} />
              </div>
            </div>
          </section>

          {/* À PROPOS */}
          <section style={{ padding:'20px 18px', borderBottom:`1px solid ${T.line}` }}>
            <div style={{ fontFamily:T.mono, fontSize:10, color:T.cyan, letterSpacing:'0.2em', marginBottom:13 }}>◢ À PROPOS</div>
            <p style={{ margin:0, fontFamily:T.body, fontSize:14, color:T.textDim, lineHeight:1.6 }}>&ldquo;{pitch}&rdquo;</p>
          </section>

          {/* CHAMPION POOL */}
          {rolesWithPool.length > 0 && (
            <section style={{ padding:'20px 18px', borderBottom:`1px solid ${T.line}` }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:13 }}>
                <span style={{ fontFamily:T.mono, fontSize:10, color:T.cyan, letterSpacing:'0.2em' }}>◢ CHAMPION POOL</span>
                <span style={{ fontFamily:T.mono, fontSize:9, color:T.textMute, letterSpacing:'0.1em' }}>{totalChamps} CHAMPS · {rolesWithPool.length} RÔLE{rolesWithPool.length>1?'S':''}</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {rolesWithPool.map((r,i) => (
                  <PoolGroup key={r} role={r} label={i===0?'PRINCIPAL':'SECONDAIRE'} champIds={champPool[r]??[]} masteryMap={masteryForPool(champPool[r]??[])} />
                ))}
              </div>
            </section>
          )}

          {/* STYLE DE JEU */}
          {styleChips.length > 0 && (
            <section style={{ padding:'20px 18px', borderBottom:`1px solid ${T.line}` }}>
              <div style={{ fontFamily:T.mono, fontSize:10, color:T.cyan, letterSpacing:'0.2em', marginBottom:13 }}>◢ STYLE DE JEU</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {styleChips.map(s => <Pill key={s} accent={s.toLowerCase()==='tryhard'?T.danger:T.cyan}>{s}</Pill>)}
                <Pill dim>RANKED SOLO/DUO</Pill>
              </div>
            </section>
          )}

          {/* DISPONIBILITÉS */}
          {(avail ?? []).length > 0 && (
            <section style={{ padding:'20px 18px', borderBottom:`1px solid ${T.line}` }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:13 }}>
                <span style={{ fontFamily:T.mono, fontSize:10, color:T.cyan, letterSpacing:'0.2em' }}>◢ DISPONIBILITÉS</span>
                <span style={{ fontFamily:T.mono, fontSize:9, color:T.textMute, letterSpacing:'0.1em' }}>FUSEAU EUROPE/PARIS</span>
              </div>
              <AvailHeatRead slots={avail ?? []} />
            </section>
          )}

          {/* ÉQUIPES */}
          {teams.length > 0 && (
            <section style={{ padding:'20px 18px' }}>
              <div style={{ fontFamily:T.mono, fontSize:10, color:T.cyan, letterSpacing:'0.2em', marginBottom:13 }}>◢ ÉQUIPES</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {teams.map(t => (
                  <div key={t.id} style={{ display:'flex', alignItems:'center', gap:13, borderRadius:14, padding:13, background:'rgba(255,255,255,0.025)', border:`1px solid ${T.line}` }}>
                    <TeamCrest c1={t.c1} c2={t.c2} tag={t.tag} size={42} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:T.display, fontSize:16, color:T.text, letterSpacing:'0.03em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</div>
                      <div style={{ fontFamily:T.mono, fontSize:9, color:T.textDim, letterSpacing:'0.1em', marginTop:3 }}>{t.role ? `${t.role.toUpperCase()} · ` : ''}{t.badge}</div>
                    </div>
                    <span style={{ fontFamily:T.mono, fontSize:9, letterSpacing:'0.1em', padding:'4px 9px', borderRadius:6, color:t.c1, background:`${t.c1}1c`, border:`1px solid ${t.c1}55` }}>{t.badge}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <ProfileMobileCTA target={target} authed={authed} />
        </div>
      </div>
    </div>
  )
}
