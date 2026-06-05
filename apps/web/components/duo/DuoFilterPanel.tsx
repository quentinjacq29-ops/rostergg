'use client'
import { useState } from 'react'
import RoleIcon, { ROLE_META } from '@/components/ui/RoleIcon'

const TIERS = ['IRON','BRONZE','SILVER','GOLD','PLATINUM','EMERALD','DIAMOND','MASTER','GRANDMASTER','CHALLENGER'] as const
const TIER_SHORTS: Record<string, string> = {
  IRON: 'IR', BRONZE: 'BR', SILVER: 'SI', GOLD: 'GO',
  PLATINUM: 'PL', EMERALD: 'EM', DIAMOND: 'DI',
  MASTER: 'MA', GRANDMASTER: 'GM', CHALLENGER: 'CH',
}
const TIER_COLORS: Record<string, string> = {
  IRON: '#9aa2bf', BRONZE: '#cd7f32', SILVER: '#b0b8c8',
  GOLD: '#ffd166', PLATINUM: '#4dc9b0', EMERALD: '#3ddc97',
  DIAMOND: '#5b9ff5', MASTER: '#b58dff', GRANDMASTER: '#ff6a4d',
  CHALLENGER: '#f4e93e',
}
const REGIONS = [
  { label: 'EUW',  value: 'euw1' },
  { label: 'EUNE', value: 'eun1' },
  { label: 'NA',   value: 'na1'  },
  { label: 'KR',   value: 'kr'   },
  { label: 'BR',   value: 'br1'  },
]
const ROLES = ['TOP','JNG','MID','ADC','SUP']
const LANGS = [
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'en', label: 'EN', name: 'English'  },
  { code: 'es', label: 'ES', name: 'Español'  },
  { code: 'de', label: 'DE', name: 'Deutsch'  },
  { code: 'it', label: 'IT', name: 'Italiano' },
]

export type FilterValues = {
  role: string | null
  rankFloor: string | null
  rankCeiling: string | null
  voice: boolean | null
  region: string | null
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#9aa2bf', letterSpacing: '0.22em' }}>
        {children}
      </div>
      {sub && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#5a607a', marginTop: 3 }}>{sub}</div>
      )}
    </div>
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

  const activeCount = [f.role, f.rankFloor ?? f.rankCeiling, f.voice !== null ? true : null, f.region]
    .filter(Boolean).length

  return (
    /* overlay */
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 40,
        background: 'rgba(6,7,11,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex',
      }}
    >
      {/* panel — stop propagation so clicks inside don't close */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 408, flexShrink: 0, height: '100%',
          background: '#0f121c',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* ── Header */}
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '22px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f4f6ff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 6l-6 6 6 6"/>
            </svg>
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#00e0ff', letterSpacing: '0.22em' }}>
              ◢ DUO SEARCH
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#f4f6ff', letterSpacing: '0.08em', marginTop: 4 }}>
              EDIT FILTERS
            </div>
          </div>
          <button
            onClick={() => setF({ role: null, rankFloor: null, rankCeiling: null, voice: null, region: null })}
            style={{
              height: 36, padding: '0 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#9aa2bf', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.14em', cursor: 'pointer',
            }}
          >
            RESET
          </button>
        </div>

        {/* ── Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 100px' }}>

          {/* ROLE WANTED */}
          <div style={{ marginBottom: 24 }}>
            <SectionTitle sub="Le rôle que tu veux trouver">ROLE WANTED</SectionTitle>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {/* PEU IMPORTE */}
              <button
                onClick={() => set('role', null)}
                style={{
                  padding: '9px 14px', borderRadius: 999, cursor: 'pointer',
                  background: f.role === null ? '#00e0ff1a' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${f.role === null ? '#00e0ff66' : 'rgba(255,255,255,0.08)'}`,
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                  color: f.role === null ? '#00e0ff' : '#5a607a',
                }}
              >
                TOUS RÔLES
              </button>
              {ROLES.map(r => {
                const meta = ROLE_META[r]
                const on = f.role === r
                return (
                  <button
                    key={r}
                    onClick={() => set('role', on ? null : r)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '9px 14px', borderRadius: 999, cursor: 'pointer',
                      background: on ? `${meta.c}1a` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${on ? meta.c + '66' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <RoleIcon role={r} size={11} active={on} />
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.1em', color: on ? meta.c : '#5a607a',
                    }}>{meta.name}</span>
                  </button>
                )
              })}
            </div>
            {f.role === null && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#5a607a', letterSpacing: '0.12em', marginTop: 8 }}>
                TOUS RÔLES → Role fit neutralisé, score redistribué
              </div>
            )}
          </div>

          {/* RANK RANGE */}
          <div style={{ marginBottom: 24 }}>
            <SectionTitle sub="Rang minimum et maximum">RANK RANGE</SectionTitle>
            <div style={{
              padding: '14px', borderRadius: 14,
              background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#5a607a', letterSpacing: '0.16em', marginBottom: 4 }}>MIN</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: f.rankFloor ? TIER_COLORS[f.rankFloor] : '#5a607a', letterSpacing: '0.04em' }}>
                    {f.rankFloor ?? 'TOUS'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#5a607a', letterSpacing: '0.16em', marginBottom: 4 }}>MAX</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: f.rankCeiling ? TIER_COLORS[f.rankCeiling] : '#5a607a', letterSpacing: '0.04em' }}>
                    {f.rankCeiling ?? 'TOUS'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                {TIERS.map(t => {
                  const floorIdx = TIERS.indexOf(f.rankFloor as typeof TIERS[number])
                  const ceilIdx  = TIERS.indexOf(f.rankCeiling as typeof TIERS[number])
                  const idx = TIERS.indexOf(t)
                  const inRange = (
                    (floorIdx === -1 || idx >= floorIdx) &&
                    (ceilIdx  === -1 || idx <= ceilIdx)
                  )
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        const idx2 = TIERS.indexOf(t)
                        const fi = TIERS.indexOf(f.rankFloor as typeof TIERS[number])
                        // first click → set floor, second click same → clear, third → set ceiling
                        if (f.rankFloor === null) { set('rankFloor', t) }
                        else if (idx2 < fi) { set('rankFloor', t) }
                        else if (f.rankCeiling === null && t !== f.rankFloor) { set('rankCeiling', t) }
                        else { setF(prev => ({ ...prev, rankFloor: t, rankCeiling: null })) }
                      }}
                      style={{
                        padding: '5px 8px', borderRadius: 7, cursor: 'pointer',
                        background: inRange && (f.rankFloor || f.rankCeiling)
                          ? `${TIER_COLORS[t]}1a` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${inRange && (f.rankFloor || f.rankCeiling) ? TIER_COLORS[t] + '55' : 'rgba(255,255,255,0.06)'}`,
                        fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
                        letterSpacing: '0.1em',
                        color: inRange && (f.rankFloor || f.rankCeiling) ? TIER_COLORS[t] : '#5a607a',
                      }}
                    >
                      {TIER_SHORTS[t]}
                    </button>
                  )
                })}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#5a607a', letterSpacing: '0.1em' }}>
                Clique 1× pour min · 2× pour max · même bouton pour reset
              </div>
            </div>
          </div>

          {/* VOICE */}
          <div style={{ marginBottom: 24 }}>
            <SectionTitle>VOICE CHAT</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
              {([
                { label: 'REQUIRED', sub: 'Discord / in-game', value: true  as boolean | null },
                { label: 'ANY',      sub: 'Peu importe',       value: null                    },
                { label: 'NO VOICE', sub: 'Texte seulement',   value: false as boolean | null },
              ] as const).map(opt => {
                const on = f.voice === opt.value
                return (
                  <button
                    key={opt.label}
                    onClick={() => set('voice', opt.value)}
                    style={{
                      padding: '10px 8px', borderRadius: 10, textAlign: 'center', cursor: 'pointer',
                      background: on ? '#00e0ff1a' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${on ? '#00e0ff66' : 'rgba(255,255,255,0.06)'}`,
                      boxShadow: on ? '0 0 12px #00e0ff25' : 'none',
                      display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.12em', color: on ? '#00e0ff' : '#9aa2bf',
                    }}>{opt.label}</span>
                    <span style={{
                      fontFamily: 'var(--font-body)', fontSize: 10,
                      color: on ? '#00e0ff' : '#5a607a', opacity: 0.8,
                    }}>{opt.sub}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* SERVER */}
          <div style={{ marginBottom: 24 }}>
            <SectionTitle>SERVER</SectionTitle>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              <button
                onClick={() => set('region', null)}
                style={{
                  padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                  background: f.region === null ? '#00e0ff1a' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${f.region === null ? '#00e0ff66' : 'rgba(255,255,255,0.06)'}`,
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
                  color: f.region === null ? '#00e0ff' : '#5a607a',
                }}
              >
                TOUS
              </button>
              {REGIONS.map(({ label, value }) => {
                const on = f.region === value
                return (
                  <button
                    key={value}
                    onClick={() => set('region', on ? null : value)}
                    style={{
                      padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                      background: on ? '#00e0ff1a' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${on ? '#00e0ff66' : 'rgba(255,255,255,0.06)'}`,
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
                      color: on ? '#00e0ff' : '#9aa2bf',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

        </div>

        {/* ── Sticky CTA */}
        <div style={{
          flexShrink: 0, padding: '14px 20px 20px',
          background: 'linear-gradient(180deg, transparent, #0f121c 30%)',
          display: 'flex', gap: 8,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '13px 16px', borderRadius: 12, cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#9aa2bf', fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: '0.12em',
            }}
          >
            CANCEL
          </button>
          <button
            onClick={() => onApply(f)}
            style={{
              flex: 1, padding: '13px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #00e0ff, #8b5cf6)',
              color: '#001018', fontFamily: 'var(--font-display)', fontSize: 13,
              letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700,
              boxShadow: '0 8px 24px -6px #00e0ff80',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            VOIR LES RÉSULTATS
            {activeCount > 0 && (
              <span style={{
                minWidth: 20, height: 20, padding: '0 5px', borderRadius: 10,
                background: 'rgba(0,0,0,0.25)', color: '#001018',
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>{activeCount}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
