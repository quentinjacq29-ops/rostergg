'use client'
// Port de desktop/me.jsx (v9) — scope : bio + compte Riot uniquement
import { useState, useRef } from 'react'
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

const BIO_MAX = 200

export type MeClientProps = {
  userId: string
  displayName: string | null
  gameName: string | null
  tagLine: string | null
  rankKey: string | null
  division: string | null
  lp: number | null
  mainRole: string | null
  lookingFor: string | null
  bio: string | null
  champPool: string[]       // top 5 champion keys
  lastSyncedAt: string | null
  profileIconId: number | null
}

function Pill({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: accent ? `${accent}1f` : 'rgba(255,255,255,0.05)', border: `1px solid ${accent ? accent + '40' : T.line}`, color: accent ?? T.text, fontFamily: T.mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

export default function MeClient(props: MeClientProps) {
  const [bio,     setBio]     = useState(props.bio ?? '')
  const [saved,   setSaved]   = useState(false)
  const [syncing, setSyncing] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rankLabel = props.rankKey
    ? (['master','grandmaster','challenger'].includes(props.rankKey.toLowerCase())
        ? props.rankKey.toUpperCase()
        : `${props.rankKey.slice(0,3).toUpperCase()} ${props.division ?? ''}`.trim() + (props.lp !== null ? ` · ${props.lp} LP` : ''))
    : 'UNRANKED'
  const rkColor = RANK_COLORS[props.rankKey ?? 'iron'] ?? T.textDim
  const initials = (props.gameName ?? props.displayName ?? '?').slice(0, 2).toUpperCase()
  const mainRoleColor = ROLE_META[(props.mainRole ?? 'FILL').toUpperCase()]?.c ?? T.textDim
  const lookingColor  = ROLE_META[(props.lookingFor ?? 'FILL').toUpperCase()]?.c ?? T.textDim

  const lastSyncLabel = props.lastSyncedAt
    ? `Synchronisé ${formatRelative(props.lastSyncedAt)}`
    : 'Jamais synchronisé'

  function handleBioChange(v: string) {
    setBio(v.slice(0, BIO_MAX))
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveBio(v.slice(0, BIO_MAX)), 900)
  }

  async function saveBio(value: string) {
    const res = await fetch('/api/me/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio: value }),
    })
    if (res.ok) setSaved(true)
  }

  async function handleResync() {
    setSyncing(true)
    await fetch('/api/riot/sync', { method: 'POST' })
    setSyncing(false)
    window.location.reload()
  }

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

          {/* ── Colonne gauche : aperçu live ────────────────────────── */}
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
                      <img
                        src={profileIconUrl(props.profileIconId)}
                        alt=""
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    )}
                  </div>
                  {/* Nom */}
                  <div style={{ fontFamily: T.display, fontSize: 26, color: T.text, letterSpacing: '0.03em', marginTop: 14 }}>
                    {props.gameName ?? props.displayName ?? '—'}
                    {props.tagLine && <span style={{ color: T.textDim, fontSize: 14 }}> #{props.tagLine}</span>}
                  </div>
                  {/* Rang */}
                  <div style={{ marginTop: 10 }}>
                    <Pill accent={rkColor}>{rankLabel}</Pill>
                  </div>
                  {/* Rôles */}
                  {(props.mainRole || props.lookingFor) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                      {props.mainRole && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 999, background: `${mainRoleColor}1a`, border: `1px solid ${mainRoleColor}44` }}>
                          <RoleIcon role={props.mainRole} size={13} active />
                          <span style={{ fontFamily: T.mono, fontSize: 10, color: mainRoleColor, fontWeight: 700 }}>{props.mainRole}</span>
                        </span>
                      )}
                      {props.mainRole && props.lookingFor && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                      )}
                      {props.lookingFor && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 999, background: `${lookingColor}14`, border: `1px solid ${lookingColor}33` }}>
                          <RoleIcon role={props.lookingFor} size={13} active />
                          <span style={{ fontFamily: T.mono, fontSize: 10, color: lookingColor, fontWeight: 700 }}>{props.lookingFor}</span>
                        </span>
                      )}
                    </div>
                  )}
                  {/* Bio live */}
                  <p style={{ margin: '16px 0 0', fontSize: 13, color: bio ? T.textDim : T.textMute, lineHeight: 1.55, fontStyle: bio ? 'italic' : 'normal' }}>
                    {bio ? `"${bio}"` : 'Ta bio apparaîtra ici…'}
                  </p>
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.cyan} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                <span style={{ fontFamily: T.body, fontSize: 12.5, color: T.textDim, lineHeight: 1.4 }}>
                  Un profil complet apparaît <b style={{ color: T.cyan }}>3× plus haut</b> dans les feeds de duo.
                </span>
              </div>
            </div>
          </div>

          {/* ── Colonne droite : formulaire ──────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Compte Riot */}
            <div style={{ borderRadius: 16, padding: 22, background: 'rgba(255,255,255,0.022)', border: `1px solid ${T.line}` }}>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.live, letterSpacing: '0.22em', marginBottom: 18 }}>◢ COMPTE RIOT</div>
              {props.gameName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '14px 16px', borderRadius: 13, background: `${T.live}0e`, border: `1px solid ${T.live}3a` }}>
                  {props.profileIconId && (
                    <img src={profileIconUrl(props.profileIconId)} alt="" style={{ width: 48, height: 48, borderRadius: '50%', border: `2px solid ${T.live}44`, objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  {!props.profileIconId && (
                    <Avatar initials={initials} size={48} rank={props.rankKey ?? 'iron'} hue={180} online={false} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: T.display, fontSize: 17, color: T.text }}>
                        {props.gameName}
                        {props.tagLine && <span style={{ color: T.textDim, fontFamily: T.body, fontSize: 14 }}> #{props.tagLine}</span>}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: `${T.live}1f`, border: `1px solid ${T.live}55`, fontFamily: T.mono, fontSize: 9, color: T.live, fontWeight: 700, letterSpacing: '0.08em' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="3.5" strokeLinecap="round"><path d="M5 12l5 5L20 6"/></svg>
                        VÉRIFIÉ
                      </span>
                    </div>
                    <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.08em', marginTop: 5 }}>
                      {lastSyncLabel}
                    </div>
                  </div>
                  <button
                    onClick={handleResync}
                    disabled={syncing}
                    style={{ padding: '9px 15px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.lineStrong}`, color: T.text, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.1em', cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.6 : 1 }}
                  >
                    {syncing ? '…' : '↻ RESYNC'}
                  </button>
                </div>
              ) : (
                <p style={{ fontFamily: T.body, fontSize: 13.5, color: T.textMute }}>Aucun compte Riot lié — retourne à l&apos;onboarding pour en ajouter un.</p>
              )}
            </div>

            {/* Bio */}
            <div style={{ borderRadius: 16, padding: 22, background: 'rgba(255,255,255,0.022)', border: `1px solid ${T.line}` }}>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.cyan, letterSpacing: '0.22em', marginBottom: 18 }}>◢ BIO</div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 11 }}>
                <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: '0.18em' }}>TON ACCROCHE · OPTIONNEL</span>
                <span style={{ fontFamily: T.mono, fontSize: 10, color: bio.length >= BIO_MAX ? T.danger : T.textMute, letterSpacing: '0.08em' }}>{bio.length}/{BIO_MAX}</span>
              </div>
              <textarea
                value={bio}
                onChange={e => handleBioChange(e.target.value)}
                placeholder="Présente-toi en deux lignes — ce que tu joues, ton état d'esprit, ce que tu cherches chez un duo…"
                style={{ width: '100%', minHeight: 88, resize: 'none', boxSizing: 'border-box', padding: '13px 15px', borderRadius: 13, background: 'rgba(255,255,255,0.035)', border: `1px solid ${T.lineStrong}`, color: T.text, fontFamily: T.body, fontSize: 14, lineHeight: 1.5, outline: 'none' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                <span style={{ fontFamily: T.body, fontSize: 12, color: T.textMute, lineHeight: 1.4 }}>
                  Visible sur ton profil public et dans la popin de demande de duo. Tu peux la laisser vide.
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

function formatRelative(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1)  return 'à l\'instant'
  if (diff < 60) return `il y a ${diff} min`
  const h = Math.floor(diff / 60)
  if (h < 24)    return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}
