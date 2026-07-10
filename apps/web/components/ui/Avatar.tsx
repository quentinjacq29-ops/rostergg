// Port exact de la maquette components.jsx → Avatar
// Rond, anneau couleur-de-rang, pastille online en bas-droite

export const RANK_COLORS: Record<string, string> = {
  iron:        '#7e7a78',
  bronze:      '#a05e2b',
  silver:      '#a3b5c0',
  gold:        '#c89b3c',
  platinum:    '#4bc4b0',
  emerald:     '#3ead84',
  diamond:     '#6fc6e7',
  master:      '#9d58c4',
  grandmaster: '#d84f4f',
  challenger:  '#ebd990',
}

// Pastille de statut (façon Messenger) : 🟢 en ligne · 🔴 hors ligne · 🟡 en game.
// « ingame » viendra quand on aura l'info de l'API Riot ; pour l'instant les
// appelants passent le booléen `online` → en ligne / hors ligne.
export type PresenceStatus = 'online' | 'offline' | 'ingame'
const STATUS_COLOR: Record<PresenceStatus, string> = {
  online:  '#00ff9d',
  offline: '#e0555f',
  ingame:  '#ffd166',
}

export default function Avatar({
  initials = 'AZ',
  size = 44,
  rank = 'iron',
  hue = 220,
  online = true,
  status,
  showStatus = true,
}: {
  initials?: string
  size?: number
  rank?: string        // lowercase tier key
  hue?: number
  online?: boolean
  status?: PresenceStatus   // prioritaire sur `online` (pour le futur « ingame »)
  showStatus?: boolean      // false → pas de pastille (ex. aperçu statique)
}) {
  const rankColor = RANK_COLORS[rank] ?? '#9aa2bf'
  const st: PresenceStatus = status ?? (online ? 'online' : 'offline')
  const dot = STATUS_COLOR[st]
  const glow = st !== 'offline'   // pas de halo pour hors ligne (feed moins bruyant)

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `linear-gradient(135deg, oklch(0.55 0.18 ${hue}), oklch(0.30 0.14 ${hue + 40}))`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontSize: size * 0.42,
        color: '#fff', letterSpacing: '0.02em',
        boxShadow: `0 0 0 2px ${rankColor}, 0 0 0 4px #0a0c14, 0 0 12px ${rankColor}60`,
      }}>
        {initials}
      </div>
      {showStatus && (
        <div style={{
          position: 'absolute', bottom: -1, right: -1,
          width: size * 0.28, height: size * 0.28,
          borderRadius: '50%',
          background: dot,
          boxShadow: glow ? `0 0 0 2px #0a0c14, 0 0 8px ${dot}` : `0 0 0 2px #0a0c14`,
        }} />
      )}
    </div>
  )
}
