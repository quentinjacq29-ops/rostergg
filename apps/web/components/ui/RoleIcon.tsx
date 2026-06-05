// Port exact de la maquette components.jsx → RoleIcon
// SVG paths géométriques par rôle, jamais de lettres

export const ROLE_META: Record<string, { c: string; name: string }> = {
  TOP:  { c: '#ff6a4d', name: 'TOP'     },
  JNG:  { c: '#3ddc97', name: 'JUNGLE'  },
  MID:  { c: '#00e0ff', name: 'MID'     },
  ADC:  { c: '#ffd166', name: 'ADC'     },
  SUP:  { c: '#b58dff', name: 'SUPPORT' },
  FILL: { c: '#9aa2bf', name: 'FILL'    },
}

export default function RoleIcon({
  role = 'FILL',
  size = 22,
  active = false,
}: {
  role: string
  size?: number
  active?: boolean
}) {
  const meta = ROLE_META[role?.toUpperCase()] ?? ROLE_META.FILL
  const c = active ? meta.c : '#5a607a'

  const paths: Record<string, React.ReactNode> = {
    TOP: (
      <>
        <path d="M3 21h7v-7" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M3 21L21 3" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      </>
    ),
    JNG: (
      <>
        <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="2" fill="none"/>
        <path d="M12 4v3M12 17v3M4 12h3M17 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2"
          stroke={c} strokeWidth="2" strokeLinecap="round"/>
      </>
    ),
    MID: (
      <path d="M3 21L21 3M3 14l7 7M10 3l11 11"
        stroke={c} strokeWidth="2" strokeLinecap="round" fill="none"/>
    ),
    ADC: (
      <>
        <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="2" fill="none"/>
        <circle cx="12" cy="12" r="8" stroke={c} strokeWidth="2" fill="none" opacity="0.5"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3"
          stroke={c} strokeWidth="2" strokeLinecap="round"/>
      </>
    ),
    SUP: (
      <path d="M12 3l3 6 6 1-4.5 4.5L18 21l-6-3-6 3 1.5-6.5L3 10l6-1z"
        stroke={c} strokeWidth="2" fill="none" strokeLinejoin="round"/>
    ),
    FILL: (
      <>
        <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" fill="none"/>
        <path d="M8 12h8M12 8v8" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      </>
    ),
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      {paths[role?.toUpperCase()] ?? paths.FILL}
    </svg>
  )
}
