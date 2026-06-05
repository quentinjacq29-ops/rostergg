'use client'
import { useId } from 'react'

// Port exact de la maquette components.jsx → MatchRing
// radius = (size - stroke) / 2  (pas stroke*2)
// nombre + % en display:flex alignItems:baseline
// label en dessous (vide par défaut dans le feed)
export default function MatchRing({
  value = 92,
  size = 116,
  stroke = 6,
  label = '',
  accent = '#00e0ff',
  accent2 = '#8b5cf6',
}: {
  value: number
  size?: number
  stroke?: number
  label?: string
  accent?: string
  accent2?: string
}) {
  const uid = useId().replace(/:/g, '')
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = c * (value / 100)

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} />
            <stop offset="100%" stopColor={accent2} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r}
          stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r}
          stroke={`url(#${uid})`} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ filter: `drop-shadow(0 0 6px ${accent}80)` }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', lineHeight: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: size * 0.42, fontWeight: 400,
            color: '#f4f6ff', letterSpacing: '-0.02em',
          }}>{value}</span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: size * 0.18, color: accent, marginLeft: 2,
          }}>%</span>
        </div>
        {label && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: size * 0.085,
            color: '#9aa2bf', letterSpacing: '0.2em', marginTop: 4,
          }}>{label}</div>
        )}
      </div>
    </div>
  )
}
