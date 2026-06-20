'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import OnbShell from './OnbShell'

const DAYS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM']
const SLOTS = ['17h', '19h', '21h', '23h', '01h', '03h']
const NUM_DAYS = 7
const NUM_SLOTS = 6

// intensity → background color
function heatColor(v: number): string {
  if (v === 0) return 'rgba(255,255,255,0.04)'
  if (v === 1) return 'rgba(0,224,255,0.15)'
  if (v === 2) return 'rgba(0,224,255,0.38)'
  return 'rgba(0,224,255,0.68)'
}

function heatBorder(v: number): string {
  if (v === 0) return 'var(--line)'
  return `rgba(0,224,255,${v * 0.2 + 0.12})`
}

type Grid = number[][]

function defaultGrid(): Grid {
  return Array.from({ length: NUM_DAYS }, () => Array(NUM_SLOTS).fill(0))
}

type Props = { locale: string; step: number; steps?: readonly string[]; onDone?: () => void }

export default function OnbStep7Availability({ locale, step, steps, onDone }: Props) {
  const [grid, setGrid] = useState<Grid>(defaultGrid)
  const router = useRouter()

  function handleCell(day: number, slot: number) {
    setGrid(prev => {
      const next = prev.map(row => [...row])
      next[day][slot] = (next[day][slot] + 1) % 4
      return next
    })
  }

  async function handleContinue() {
    // Convert grid to availability rows
    const rows: Array<{ weekday: number; slot: number; intensity: number }> = []
    grid.forEach((col, day) =>
      col.forEach((intensity, slot) => {
        if (intensity > 0) rows.push({ weekday: day, slot, intensity })
      })
    )
    fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 7, data: { availability: rows } }),
    }).catch(() => {})
    // Store availability for the saving page
    if (typeof window !== 'undefined') localStorage.setItem('onb_availability', JSON.stringify(rows))
    if (onDone) { onDone(); return }
    // Auth (email magic link) → callback → /onboarding/saving (sauvegarde + écran de fin) → dest
    const intent = typeof window !== 'undefined' ? localStorage.getItem('onb_intent') : null
    const dest = intent === 'team' ? '/teams' : '/duo'
    router.push(`/onboarding/finish?dest=${encodeURIComponent(dest)}`)
  }

  const LEGEND = [0, 1, 2, 3]

  return (
    <OnbShell
      step={step}
      steps={steps}
      title="QUAND JOUES-TU ?"
      sub="Tes créneaux de jeu — on chevauche les agendas pour matcher des joueurs dispo en même temps."
      onContinue={handleContinue}
      locale={locale}
    >
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em' }}>
        CETTE SEMAINE · FUSEAU EUROPE/PARIS
      </label>

      <div style={{ marginTop: 14, padding: '18px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.025)', border: '1px solid var(--line)' }}>
        {/* CSS grid : 44px labels + 7 colonnes égales — tient à 390px */}
        <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(7, 1fr)', gap: 4, width: '100%' }}>
          {/* En-têtes jours (ligne 0) */}
          <div /> {/* coin vide */}
          {DAYS.map(d => (
            <div key={d} style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-mute)', letterSpacing: '0.02em', textAlign: 'center', paddingBottom: 4 }}>{d}</div>
          ))}
          {/* Lignes : label créneau + 7 cellules */}
          {SLOTS.map((slot, si) => (
            <>
              <div key={`lbl-${si}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-mute)', display: 'flex', alignItems: 'center', letterSpacing: '0.02em' }}>{slot}</div>
              {grid.map((col, di) => (
                <div
                  key={`${di}-${si}`}
                  onClick={() => handleCell(di, si)}
                  title={`${DAYS[di]} ${slot} — intensité ${col[si]}`}
                  style={{
                    aspectRatio: '1', maxHeight: 34, borderRadius: 6, cursor: 'pointer',
                    background: heatColor(col[si]),
                    border: `1px solid ${heatBorder(col[si])}`,
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                />
              ))}
            </>
          ))}
        </div>

        {/* Legend */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-mute)', letterSpacing: '0.06em' }}>
          <span>Moins</span>
          {LEGEND.map(v => (
            <span key={v} style={{ width: 14, height: 14, borderRadius: 4, background: heatColor(v), display: 'inline-block', flexShrink: 0 }} />
          ))}
          <span>Plus</span>
          <span style={{ marginLeft: 'auto' }}>Tape pour ajuster</span>
        </div>
      </div>

      <p style={{ marginTop: 12, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mute)', margin: '12px 0 0' }}>
        Clique pour augmenter l&apos;intensité — clique 4× pour remettre à zéro.
      </p>
    </OnbShell>
  )
}
