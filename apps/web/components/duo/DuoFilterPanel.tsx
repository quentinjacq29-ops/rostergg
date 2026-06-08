'use client'
// Port fidèle de desktop/flows-more.jsx → EditSearchDesktop (Desktop 11 V6)
import { useState } from 'react'
import RoleIcon, { ROLE_META } from '@/components/ui/RoleIcon'

const T = {
  bg: '#0a0c14', surface: '#0f121c', void: '#06070b',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6', danger: '#ff3d6e',
  gold: '#ffd166', live: '#00ff9d',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

const RANKS: Record<string, string> = {
  iron: '#7e7a78', bronze: '#a05e2b', silver: '#a3b5c0', gold: '#c89b3c',
  platinum: '#4bc4b0', emerald: '#3ead84', diamond: '#6fc6e7',
  master: '#9d58c4', grandmaster: '#d84f4f', challenger: '#ebd990',
}

const TIER_ORDER = ['IRON','BRONZE','SILVER','GOLD','PLATINUM','EMERALD','DIAMOND','MASTER','GRANDMASTER','CHALLENGER']

const LANGS: Record<string, { label: string; name: string; c: string }> = {
  fr: { label: 'FR', name: 'Français', c: '#5b8def' },
  en: { label: 'EN', name: 'English',  c: '#e85a5a' },
  es: { label: 'ES', name: 'Español',  c: '#ffb547' },
  de: { label: 'DE', name: 'Deutsch',  c: '#3ddc97' },
}

const STYLES = [
  { label: 'Tryhard', color: T.danger },
  { label: 'Vocal',   color: T.cyan   },
  { label: 'Roaming', color: T.cyan   },
  { label: 'Scaling', color: T.cyan   },
  { label: 'Climb',   color: T.gold   },
  { label: 'Clash',   color: T.gold   },
]

export type FilterValues = {
  role: string | null
  rankFloor: string | null
  rankCeiling: string | null
  voice: boolean | null
  region: string | null
}

// ── Section kicker — port exact ("◢ LABEL" en mono cyan)
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.cyan, letterSpacing: '0.2em', marginBottom: 13 }}>
        ◢ {label}
      </div>
      {children}
    </div>
  )
}

// ── LangChip — port de screens/flex-components.jsx
function LangChip({ code, primary = false }: { code: string; primary?: boolean }) {
  const l = LANGS[code] ?? LANGS.fr
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 6,
      background: primary ? `${l.c}22` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${primary ? l.c + '66' : T.line}`,
      fontFamily: T.mono, fontSize: 10, fontWeight: 700,
      color: primary ? l.c : T.text, letterSpacing: '0.1em',
    }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: l.c, boxShadow: primary ? `0 0 4px ${l.c}` : 'none' }}/>
      {l.label}
      {primary && <span style={{ fontSize: 7, color: l.c, opacity: 0.7, letterSpacing: '0.15em' }}>·MAIN</span>}
    </span>
  )
}

// ── DChip — port de desktop/shell.jsx
function DChip({ children, active = false, accent = T.cyan }: { children: React.ReactNode; active?: boolean; accent?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '8px 13px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
      background: active ? `${accent}1f` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? accent + '66' : T.line}`,
      color: active ? accent : T.textDim,
      fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>{children}</span>
  )
}

export default function DuoFilterPanel({
  initial,
  onApply,
  onClose,
}: {
  initial: FilterValues
  onApply: (f: FilterValues) => void
  onClose: () => void
}) {
  const [f, setF] = useState<FilterValues>(initial)

  const set = <K extends keyof FilterValues>(k: K, v: FilterValues[K]) =>
    setF(prev => ({ ...prev, [k]: v }))

  // Elo slider visual — compute positions from TIER_ORDER
  const floorIdx = f.rankFloor ? TIER_ORDER.indexOf(f.rankFloor.toUpperCase()) : 1
  const ceilIdx  = f.rankCeiling ? TIER_ORDER.indexOf(f.rankCeiling.toUpperCase()) : 7
  const fi = Math.max(0, floorIdx === -1 ? 1 : floorIdx)
  const ci = Math.min(TIER_ORDER.length - 1, ceilIdx === -1 ? 7 : ceilIdx)
  const leftPct  = Math.round((fi / (TIER_ORDER.length - 1)) * 100)
  const rightPct = Math.round((ci / (TIER_ORDER.length - 1)) * 100)
  const floorColor  = RANKS[TIER_ORDER[fi].toLowerCase()] ?? T.cyan
  const ceilColor   = RANKS[TIER_ORDER[ci].toLowerCase()] ?? T.violet

  return (
    // Overlay couvre toute la zone main (topbar + content)
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: T.bg,
      display: 'flex', flexDirection: 'column',
      backgroundImage: `radial-gradient(900px 500px at 50% -10%, ${T.violet}14, transparent 60%)`,
    }}>
      {/* ── Topbar — port de DTopBar (hauteur 76px, blur) */}
      <div style={{
        flexShrink: 0, height: 76, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', gap: 24, padding: '0 28px',
        borderBottom: `1px solid ${T.line}`,
        background: 'rgba(10,12,20,0.6)', backdropFilter: 'blur(12px)',
      }}>
        {/* Back button */}
        <button onClick={onClose} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '0 16px 0 0', background: 'none', border: 'none',
          cursor: 'pointer', color: T.textDim,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M11 6l-6 6 6 6"/>
          </svg>
        </button>
        {/* Title */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.cyan, letterSpacing: '0.24em', marginBottom: 3 }}>
            ◢ FILTRES DE RECHERCHE
          </div>
          <div style={{ fontFamily: T.display, fontSize: 24, color: T.text, letterSpacing: '0.02em', lineHeight: 1 }}>
            AFFINE TON MATCHING
          </div>
        </div>
        {/* Search */}
        <div style={{ flex: 1, maxWidth: 460 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, height: 42, padding: '0 14px',
            borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.line}`,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>
            </svg>
            <span style={{ flex: 1, fontFamily: T.body, fontSize: 13.5, color: T.textMute }}>Rechercher…</span>
          </div>
        </div>
        {/* Réinitialiser */}
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => setF({ role: null, rankFloor: null, rankCeiling: null, voice: null, region: null })}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 9,
              padding: '13px 22px', borderRadius: 12, cursor: 'pointer',
              border: `1px solid ${T.lineStrong}`,
              background: 'rgba(255,255,255,0.05)',
              color: T.text,
              fontFamily: T.display, fontSize: 13, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* ── Content — centré, maxWidth 760 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '30px 40px 40px' }}>
        <div style={{ width: '100%', maxWidth: 760 }}>

          {/* RÔLE RECHERCHÉ */}
          <Section label="RÔLE RECHERCHÉ">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {(['TOP','JNG','MID','ADC','SUP'] as const).map(r => {
                const on = f.role === r
                const rc = ROLE_META[r].c
                return (
                  <div key={r} onClick={() => set('role', on ? null : r)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    padding: '16px 0', borderRadius: 13, cursor: 'pointer',
                    background: on ? `${rc}1a` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${on ? rc + '66' : T.line}`,
                  }}>
                    <RoleIcon role={r} size={24} active={on} />
                    <span style={{ fontFamily: T.mono, fontSize: 10, color: on ? rc : T.textDim, fontWeight: 700 }}>{r}</span>
                  </div>
                )
              })}
            </div>
            {f.role === null && (
              <div style={{ marginTop: 10, fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.12em' }}>
                AUCUN RÔLE SÉLECTIONNÉ → TOUS RÔLES · Role fit neutralisé dans le score
              </div>
            )}
          </Section>

          {/* FOURCHETTE D'ELO */}
          <Section label="FOURCHETTE D'ELO">
            <div style={{ padding: '18px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: `1px solid ${T.line}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '3px 10px', borderRadius: 999,
                  background: `${floorColor}1f`, border: `1px solid ${floorColor}40`,
                  fontFamily: T.mono, fontSize: 10, fontWeight: 600,
                  color: floorColor, letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  {TIER_ORDER[fi]}
                </span>
                <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, alignSelf: 'center' }}>→</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '3px 10px', borderRadius: 999,
                  background: `${ceilColor}1f`, border: `1px solid ${ceilColor}40`,
                  fontFamily: T.mono, fontSize: 10, fontWeight: 600,
                  color: ceilColor, letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  {TIER_ORDER[ci]}
                </span>
              </div>
              {/* Visual slider track */}
              <div style={{ position: 'relative', height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.07)', marginBottom: 12 }}>
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, borderRadius: 4,
                  left: `${leftPct}%`, right: `${100 - rightPct}%`,
                  background: `linear-gradient(90deg, ${T.cyan}, ${T.violet})`,
                }}/>
                <span style={{
                  position: 'absolute', left: `${leftPct}%`, top: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#fff', boxShadow: `0 0 10px ${T.cyan}`,
                  display: 'inline-block',
                }}/>
                <span style={{
                  position: 'absolute', left: `${rightPct}%`, top: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#fff', boxShadow: `0 0 10px ${T.violet}`,
                  display: 'inline-block',
                }}/>
              </div>
              {/* Clickable tier labels */}
              <div style={{ display: 'flex', gap: 4 }}>
                {TIER_ORDER.map((tier, idx) => {
                  const inRange = idx >= fi && idx <= ci
                  const tc = RANKS[tier.toLowerCase()] ?? '#9aa2bf'
                  return (
                    <button key={tier} onClick={() => {
                      if (f.rankFloor === null || idx < fi) {
                        set('rankFloor', tier)
                      } else if (f.rankCeiling === null && tier !== f.rankFloor) {
                        set('rankCeiling', tier)
                      } else {
                        setF(p => ({ ...p, rankFloor: tier, rankCeiling: null }))
                      }
                    }} style={{
                      flex: 1, padding: '4px 2px', borderRadius: 5, cursor: 'pointer',
                      background: inRange ? `${tc}1a` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${inRange ? tc + '55' : T.line}`,
                      fontFamily: T.mono, fontSize: 7.5, fontWeight: 700,
                      color: inRange ? tc : T.textMute, letterSpacing: '0.06em',
                    }}>
                      {tier.slice(0, 2)}
                    </button>
                  )
                })}
              </div>
            </div>
          </Section>

          {/* LANGUES + STATUT — 2-col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <Section label="LANGUES">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <LangChip code="fr" primary />
                <LangChip code="en" primary />
                <LangChip code="es" />
                <LangChip code="de" />
              </div>
            </Section>
            <Section label="STATUT">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div onClick={() => set('voice', f.voice === true ? null : true)}>
                  <DChip active={f.voice === true} accent={T.cyan}>EN LIGNE</DChip>
                </div>
                <div onClick={() => set('voice', null)}>
                  <DChip active={f.voice === null} accent={T.cyan}>EN QUEUE</DChip>
                </div>
                <DChip>VÉRIFIÉ</DChip>
              </div>
            </Section>
          </div>

          {/* STYLE & OBJECTIF */}
          <Section label="STYLE & OBJECTIF">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {STYLES.map(({ label, color }) => {
                const on = false // style filter not wired to RPC yet
                return (
                  <span key={label} style={{
                    padding: '9px 15px', borderRadius: 999, cursor: 'pointer',
                    fontFamily: T.mono, fontSize: 11, fontWeight: 600,
                    background: on ? `${color}1f` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${on ? color + '66' : T.line}`,
                    color: on ? color : T.textDim,
                  }}>{label}</span>
                )
              })}
            </div>
          </Section>

          {/* CTA */}
          <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
            <button
              onClick={() => onApply(f)}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '16px 28px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`,
                color: '#001018',
                fontFamily: T.display, fontSize: 14, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                boxShadow: `0 0 0 1px ${T.cyan}55, 0 12px 30px -10px ${T.cyan}, 0 0 40px -16px ${T.violet}`,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>
              </svg>
              Voir les résultats
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
