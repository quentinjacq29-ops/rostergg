'use client'
import { useState, useRef, useCallback } from 'react'
import Avatar, { RANK_COLORS } from '@/components/ui/Avatar'
import RoleIcon, { ROLE_META } from '@/components/ui/RoleIcon'
import { championIconUrl, profileIconUrl } from '@/lib/riot/assets'

const T = {
  bg: '#0a0c14', surface: '#0f121c', surface2: '#161927',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6', live: '#00ff9d', danger: '#ff3d6e',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

const ALL_ROLES = ['TOP', 'JNG', 'MID', 'ADC', 'SUP'] as const
const ALL_STYLES = ['Tryhard', 'Roaming', 'Vocal', 'Scaling', 'Aggro', 'Chill', 'Macro', 'Teamfight']
const ALL_LANGS  = ['fr', 'en', 'es', 'de']
const LANG_LABEL: Record<string, string> = { fr: 'FR', en: 'EN', es: 'ES', de: 'DE' }
const LANG_FLAG:  Record<string, string> = { fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', de: '🇩🇪' }
const DAYS  = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM']
const SLOTS = ['18h', '20h', '22h', '00h', '02h', '04h']
const BIO_MAX = 200
const DEBOUNCE_MS = 600

export type AvailSlot = { weekday: number; slot: number; intensity: number }

export type MeClientProps = {
  userId: string
  displayName: string | null
  gameName: string | null
  tagLine: string | null
  rankKey: string | null
  division: string | null
  lp: number | null
  mainRoles: string[]
  secondaryRole: string | null
  lookingForRoles: string[]
  bio: string | null
  playstyles: string[]
  languages: string[]
  voiceRequired: boolean
  availability: AvailSlot[]
  champPool: string[]
  lastSyncedAt: string | null
  profileIconId: number | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Pill({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: accent ? `${accent}1f` : 'rgba(255,255,255,0.05)', border: `1px solid ${accent ? accent + '40' : T.line}`, color: accent ?? T.text, fontFamily: T.mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 11 }}>
      <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.18em' }}>{children}</span>
      {hint && <span style={{ fontFamily: T.mono, fontSize: 9.5, color: T.textMute, letterSpacing: '0.06em' }}>{hint}</span>}
    </div>
  )
}

function EditCard({ children, accent = T.cyan, label }: { children: React.ReactNode; accent?: string; label: string }) {
  return (
    <div style={{ borderRadius: 16, padding: 22, background: 'rgba(255,255,255,0.022)', border: `1px solid ${T.line}`, marginBottom: 18 }}>
      <div style={{ fontFamily: T.mono, fontSize: 10, color: accent, letterSpacing: '0.22em', marginBottom: 18 }}>◢ {label}</div>
      {children}
    </div>
  )
}

function RolePick({ role, active, onClick }: { role: string; active: boolean; onClick: () => void }) {
  const rc = ROLE_META[role]?.c ?? T.textDim
  return (
    <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '13px 0', borderRadius: 12, cursor: 'pointer', background: active ? `${rc}1a` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? rc + '66' : T.line}`, boxShadow: active ? `0 0 14px ${rc}33` : 'none', transition: 'background .12s, border-color .12s' }}>
      <RoleIcon role={role} size={22} active={active} />
      <span style={{ fontFamily: T.mono, fontSize: 9.5, color: active ? rc : T.textDim, fontWeight: 700, letterSpacing: '0.06em' }}>{role}</span>
    </div>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <span onClick={onClick} style={{ width: 44, height: 26, borderRadius: 999, padding: 3, background: on ? T.cyan : 'rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', transition: 'background .15s', boxShadow: on ? `0 0 12px ${T.cyan}66` : 'none', flexShrink: 0 }}>
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: on ? '#001018' : T.textDim, marginLeft: on ? 18 : 0, transition: 'margin .15s' }} />
    </span>
  )
}

// ── Heatmap éditable ──────────────────────────────────────────────────────────

function AvailHeatEdit({ grid, onChange }: {
  grid: number[][]
  onChange: (weekday: number, slot: number, val: number) => void
}) {
  const painting = useRef(false)
  const paintVal = useRef(0)
  const heat = ['rgba(255,255,255,0.04)', `${T.cyan}26`, `${T.cyan}55`, `${T.cyan}aa`]

  function start(d: number, s: number) {
    painting.current = true
    paintVal.current = grid[d][s] > 0 ? 0 : 2
    onChange(d, s, paintVal.current)
  }
  function enter(d: number, s: number) {
    if (!painting.current) return
    onChange(d, s, paintVal.current)
  }

  return (
    <div
      style={{ marginTop: 12, display: 'flex', gap: 10, userSelect: 'none' }}
      onMouseLeave={() => { painting.current = false }}
      onMouseUp={() => { painting.current = false }}
    >
      {grid.map((col, di) => (
        <div key={di} style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
          {col.map((v, si) => (
            <div
              key={si}
              style={{ width: 30, height: 16, borderRadius: 4, background: heat[v] ?? heat[0], border: `1px solid ${v ? T.cyan + '33' : T.line}`, cursor: 'pointer', transition: 'background .1s' }}
              onMouseDown={() => start(di, si)}
              onMouseEnter={() => enter(di, si)}
            />
          ))}
          <span style={{ fontFamily: T.mono, fontSize: 8.5, color: T.textMute, letterSpacing: '0.08em', marginTop: 3 }}>{DAYS[di]}</span>
        </div>
      ))}
      {/* Slot labels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 0, justifyContent: 'flex-start' }}>
        {SLOTS.map((s, i) => (
          <div key={i} style={{ height: 16, display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
            <span style={{ fontFamily: T.mono, fontSize: 8, color: T.textMute }}>{s}</span>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div style={{ marginLeft: 'auto', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 18 }}>
        <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute }}>MOINS</span>
        {heat.map((h, i) => (
          <span key={i} style={{ width: 12, height: 12, borderRadius: 3, background: h, border: `1px solid ${T.line}` }} />
        ))}
        <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute }}>PLUS</span>
      </div>
    </div>
  )
}

// ── Formatage ─────────────────────────────────────────────────────────────────

function formatRelative(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'à l\'instant'
  if (diff < 60) return `il y a ${diff} min`
  const h = Math.floor(diff / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

function rankLabel(rankKey: string | null, division: string | null, lp: number | null) {
  if (!rankKey) return 'UNRANKED'
  const high = ['master', 'grandmaster', 'challenger'].includes(rankKey.toLowerCase())
  const base = high ? rankKey.toUpperCase() : `${rankKey.slice(0, 3).toUpperCase()} ${division ?? ''}`.trim()
  return lp !== null ? `${base} · ${lp} LP` : base
}

// ── Grille dispo initiale depuis les slots DB ─────────────────────────────────

function slotsToGrid(slots: AvailSlot[]): number[][] {
  const grid = Array.from({ length: 7 }, () => Array(6).fill(0))
  for (const s of slots) {
    if (s.weekday >= 0 && s.weekday < 7 && s.slot >= 0 && s.slot < 6) {
      grid[s.weekday][s.slot] = s.intensity
    }
  }
  return grid
}

function gridToSlots(grid: number[][]): AvailSlot[] {
  const out: AvailSlot[] = []
  for (let d = 0; d < 7; d++) {
    for (let s = 0; s < 6; s++) {
      if (grid[d][s] > 0) out.push({ weekday: d, slot: s, intensity: grid[d][s] })
    }
  }
  return out
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function MeClient(props: MeClientProps) {
  const [bio,       setBio]       = useState(props.bio ?? '')
  const [roles,     setRoles]     = useState<string[]>(
    props.mainRoles.length > 0
      ? (props.secondaryRole ? [props.mainRoles[0], props.secondaryRole] : [props.mainRoles[0]])
      : []
  )
  const [looking,   setLooking]   = useState<string[]>(props.lookingForRoles)
  const [styles,    setStyles]    = useState<string[]>(props.playstyles)
  const [langs,     setLangs]     = useState<string[]>(props.languages)
  const [voice,     setVoice]     = useState(props.voiceRequired)
  const [avGrid,    setAvGrid]    = useState<number[][]>(() => slotsToGrid(props.availability))
  const [saved,     setSaved]     = useState(false)
  const [syncing,   setSyncing]   = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rkColor  = RANK_COLORS[props.rankKey ?? 'iron'] ?? T.textDim
  const initials = (props.gameName ?? props.displayName ?? '?').slice(0, 2).toUpperCase()
  const rankLbl  = rankLabel(props.rankKey, props.division, props.lp)
  const main      = roles[0] ?? null
  const secondary = roles[1] ?? null

  // ── Debounced autosave ────────────────────────────────────────────────────
  const schedSave = useCallback((patch: object) => {
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await fetch('/api/me/prefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      setSaved(true)
    }, DEBOUNCE_MS)
  }, [])

  function updBio(v: string) {
    const val = v.slice(0, BIO_MAX)
    setBio(val)
    schedSave({ bio: val })
  }

  function toggleRole(setter: React.Dispatch<React.SetStateAction<string[]>>, list: string[], v: string, max?: number) {
    const next = list.includes(v)
      ? list.filter(x => x !== v)
      : max && list.length >= max ? [...list.slice(1), v] : [...list, v]
    setter(next)
    return next
  }

  function updRoles(v: string) {
    const next = toggleRole(setRoles, roles, v)
    schedSave({ main_roles: next })
  }
  function updLooking(v: string) {
    const next = toggleRole(setLooking, looking, v)
    schedSave({ looking_for_roles: next })
  }
  function updStyles(v: string) {
    const next = toggleRole(setStyles, styles, v)
    schedSave({ playstyles: next })
  }
  function updLangs(v: string) {
    const next = toggleRole(setLangs, langs, v)
    schedSave({ languages: next })
  }
  function updVoice() {
    const next = !voice
    setVoice(next)
    schedSave({ voice_required: next })
  }
  function updAvail(weekday: number, slot: number, val: number) {
    setAvGrid(prev => {
      const g = prev.map(col => [...col])
      g[weekday][slot] = val
      schedSave({ availability: gridToSlots(g) })
      return g
    })
  }

  async function handleResync() {
    setSyncing(true)
    await fetch('/api/riot/sync', { method: 'POST' })
    setSyncing(false)
    window.location.reload()
  }

  const lastSyncLabel = props.lastSyncedAt
    ? `Synchronisé ${formatRelative(props.lastSyncedAt)}`
    : 'Jamais synchronisé'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <div style={{ flexShrink: 0, height: 76, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 24, padding: '0 28px', borderBottom: `1px solid ${T.line}`, background: 'rgba(10,12,20,0.6)', backdropFilter: 'blur(12px)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.cyan, letterSpacing: '0.24em', marginBottom: 3 }}>◢ MON PROFIL · ÉDITION</div>
          <div style={{ fontFamily: T.display, fontSize: 24, color: T.text, letterSpacing: '0.02em', lineHeight: 1 }}>
            {props.gameName ?? props.displayName ?? 'Mon profil'}
          </div>
        </div>
        {saved && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: T.mono, fontSize: 10, color: T.live, letterSpacing: '0.1em' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.live, boxShadow: `0 0 6px ${T.live}` }} />
            ENREGISTRÉ
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '26px 36px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 28, maxWidth: 1100, margin: '0 auto' }}>

          {/* ── Colonne gauche : aperçu live ──────────────────────────── */}
          <div>
            <div style={{ position: 'sticky', top: 0 }}>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.22em', marginBottom: 14 }}>◢ APERÇU LIVE</div>
              <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: `linear-gradient(180deg, ${T.surface}, ${T.bg})`, border: `1px solid ${T.line}` }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${T.cyan}, ${T.violet}, transparent)` }} />
                <div style={{ padding: '24px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  {/* Avatar */}
                  <div style={{ position: 'relative' }}>
                    <Avatar initials={initials} size={92} rank={props.rankKey ?? 'iron'} hue={180} online={false} />
                    {props.profileIconId && (
                      <img src={profileIconUrl(props.profileIconId)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    )}
                  </div>
                  {/* Nom */}
                  <div style={{ fontFamily: T.display, fontSize: 26, color: T.text, letterSpacing: '0.03em', marginTop: 14 }}>
                    {props.gameName ?? props.displayName ?? '—'}
                    {props.tagLine && <span style={{ color: T.textDim, fontSize: 14 }}> #{props.tagLine}</span>}
                  </div>
                  {/* Rang */}
                  <div style={{ marginTop: 10 }}>
                    <Pill accent={rkColor}>{rankLbl}</Pill>
                  </div>
                  {/* Rôles */}
                  {(main || secondary || looking[0]) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {main && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 999, background: `${ROLE_META[main]?.c ?? T.textDim}1a`, border: `1px solid ${ROLE_META[main]?.c ?? T.textDim}44` }}>
                          <RoleIcon role={main} size={13} active />
                          <span style={{ fontFamily: T.mono, fontSize: 10, color: ROLE_META[main]?.c ?? T.textDim, fontWeight: 700 }}>{main}</span>
                        </span>
                      )}
                      {secondary && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 999, background: `${ROLE_META[secondary]?.c ?? T.textDim}14`, border: `1px solid ${ROLE_META[secondary]?.c ?? T.textDim}33` }}>
                          <RoleIcon role={secondary} size={13} active />
                          <span style={{ fontFamily: T.mono, fontSize: 10, color: ROLE_META[secondary]?.c ?? T.textDim, fontWeight: 700 }}>{secondary}</span>
                        </span>
                      )}
                      {looking[0] && (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 999, background: `${ROLE_META[looking[0]]?.c ?? T.textDim}14`, border: `1px solid ${ROLE_META[looking[0]]?.c ?? T.textDim}33` }}>
                            <RoleIcon role={looking[0]} size={13} active />
                            <span style={{ fontFamily: T.mono, fontSize: 10, color: ROLE_META[looking[0]]?.c ?? T.textDim, fontWeight: 700 }}>{looking[0]}</span>
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  {/* Bio */}
                  <p style={{ margin: '16px 0 0', fontSize: 13, color: bio ? T.textDim : T.textMute, lineHeight: 1.55, fontStyle: bio ? 'italic' : 'normal' }}>
                    {bio ? `"${bio}"` : 'Ta bio apparaîtra ici…'}
                  </p>
                  {/* Style tags */}
                  {styles.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {styles.map(s => (
                        <Pill key={s} accent={s === 'Tryhard' ? T.danger : T.cyan}>{s}</Pill>
                      ))}
                    </div>
                  )}
                </div>
                {/* Champion pool */}
                {props.champPool.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '0 22px 22px' }}>
                    {props.champPool.slice(0, 5).map((ch, i) => (
                      <div key={ch} style={{ width: 44, height: 44, borderRadius: 9, overflow: 'hidden', background: T.surface2, border: `1.5px solid ${i === 0 ? rkColor : 'rgba(255,255,255,0.1)'}`, boxShadow: i === 0 ? `0 0 0 1.5px ${rkColor}, 0 0 8px ${rkColor}66` : 'none' }}>
                        <img src={championIconUrl(ch)} alt={ch} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Callout info */}
              <div style={{ marginTop: 14, padding: '13px 16px', borderRadius: 12, background: `${T.cyan}0e`, border: `1px solid ${T.cyan}33`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.cyan} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                <span style={{ fontFamily: T.body, fontSize: 12.5, color: T.textDim, lineHeight: 1.4 }}>
                  Un profil complet apparaît <b style={{ color: T.cyan }}>3× plus haut</b> dans les feeds de duo.
                </span>
              </div>
            </div>
          </div>

          {/* ── Colonne droite : formulaire ──────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Compte Riot */}
            <EditCard label="COMPTE RIOT" accent={T.live}>
              {props.gameName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '14px 16px', borderRadius: 13, background: `${T.live}0e`, border: `1px solid ${T.live}3a` }}>
                  {props.profileIconId
                    ? <img src={profileIconUrl(props.profileIconId)} alt="" style={{ width: 48, height: 48, borderRadius: '50%', border: `2px solid ${T.live}44`, objectFit: 'cover', flexShrink: 0 }} />
                    : <Avatar initials={initials} size={48} rank={props.rankKey ?? 'iron'} hue={180} online={false} />
                  }
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: T.display, fontSize: 17, color: T.text }}>
                        {props.gameName}{props.tagLine && <span style={{ color: T.textDim, fontFamily: T.body, fontSize: 14 }}> #{props.tagLine}</span>}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: `${T.live}1f`, border: `1px solid ${T.live}55`, fontFamily: T.mono, fontSize: 9, color: T.live, fontWeight: 700, letterSpacing: '0.08em' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="3.5" strokeLinecap="round"><path d="M5 12l5 5L20 6" /></svg>
                        VÉRIFIÉ
                      </span>
                    </div>
                    <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.08em', marginTop: 5 }}>{lastSyncLabel}</div>
                  </div>
                  <button onClick={handleResync} disabled={syncing} style={{ padding: '9px 15px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.lineStrong}`, color: T.text, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.1em', cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.6 : 1 }}>
                    {syncing ? '…' : '↻ RESYNC'}
                  </button>
                </div>
              ) : (
                <p style={{ fontFamily: T.body, fontSize: 13.5, color: T.textMute }}>Aucun compte Riot lié.</p>
              )}
            </EditCard>

            {/* Bio */}
            <EditCard label="BIO" accent={T.cyan}>
              <FieldLabel hint={`${bio.length}/${BIO_MAX}`}>TON ACCROCHE · OPTIONNEL</FieldLabel>
              <textarea
                value={bio}
                onChange={e => updBio(e.target.value)}
                placeholder="Présente-toi en deux lignes…"
                style={{ width: '100%', minHeight: 88, resize: 'none', boxSizing: 'border-box', padding: '13px 15px', borderRadius: 13, background: 'rgba(255,255,255,0.035)', border: `1px solid ${T.lineStrong}`, color: T.text, fontFamily: T.body, fontSize: 14, lineHeight: 1.5, outline: 'none' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                <span style={{ fontFamily: T.body, fontSize: 12, color: T.textMute, lineHeight: 1.4 }}>Visible sur ton profil public et dans la popin de demande de duo.</span>
              </div>
            </EditCard>

            {/* Rôles */}
            <EditCard label="RÔLES" accent={T.cyan}>
              <FieldLabel hint="LE 1ER = PRINCIPAL">JE JOUE</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                {ALL_ROLES.map(r => <RolePick key={r} role={r} active={roles.includes(r)} onClick={() => updRoles(r)} />)}
              </div>
              <div style={{ height: 1, background: T.line, margin: '20px 0' }} />
              <FieldLabel>JE CHERCHE</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                {ALL_ROLES.map(r => <RolePick key={r} role={r} active={looking.includes(r)} onClick={() => updLooking(r)} />)}
              </div>
            </EditCard>

            {/* Style & Langues */}
            <EditCard label="STYLE & LANGUES" accent={T.cyan}>
              <FieldLabel>STYLE DE JEU</FieldLabel>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ALL_STYLES.map(s => {
                  const on = styles.includes(s)
                  const c = s === 'Tryhard' ? T.danger : T.cyan
                  return (
                    <span key={s} onClick={() => updStyles(s)} style={{ padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', transition: 'background .12s, border-color .12s, color .12s', background: on ? `${c}1f` : 'rgba(255,255,255,0.04)', border: `1px solid ${on ? c + '66' : T.line}`, color: on ? c : T.textDim }}>
                      {s}
                    </span>
                  )
                })}
              </div>
              <div style={{ height: 1, background: T.line, margin: '20px 0' }} />
              <FieldLabel>LANGUES</FieldLabel>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ALL_LANGS.map(l => {
                  const on = langs.includes(l)
                  return (
                    <span key={l} onClick={() => updLangs(l)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', transition: 'background .12s', background: on ? `${T.cyan}1f` : 'rgba(255,255,255,0.04)', border: `1px solid ${on ? T.cyan + '66' : T.line}`, color: on ? T.cyan : T.textDim }}>
                      <span>{LANG_FLAG[l]}</span>
                      <span>{LANG_LABEL[l]}</span>
                    </span>
                  )
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
                <div>
                  <div style={{ fontFamily: T.body, fontSize: 14, color: T.text, fontWeight: 600 }}>Vocal obligatoire</div>
                  <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.06em', marginTop: 3 }}>Ne matcher qu&apos;avec des joueurs qui parlent en vocal</div>
                </div>
                <Toggle on={voice} onClick={updVoice} />
              </div>
            </EditCard>

            {/* Disponibilités */}
            <EditCard label="DISPONIBILITÉS" accent={T.cyan}>
              <FieldLabel hint="CLIQUE + GLISSE POUR PEINDRE">CETTE SEMAINE · FUSEAU EUROPE/PARIS</FieldLabel>
              <AvailHeatEdit grid={avGrid} onChange={updAvail} />
            </EditCard>

          </div>
        </div>
      </div>
    </div>
  )
}
