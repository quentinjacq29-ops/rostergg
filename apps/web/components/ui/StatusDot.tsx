const COLORS: Record<string, string> = {
  online: '#00ff9d',
  queue:  '#ffb547',
  offline: '#5a607a',
}

export default function StatusDot({
  state,
  label,
}: {
  state: 'online' | 'queue' | 'offline'
  label?: string
}) {
  const color = COLORS[state] ?? COLORS.offline
  const pulse = state !== 'offline'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span
        className={pulse ? 'rgg-pulse' : undefined}
        style={{
          width: 7, height: 7, borderRadius: '50%',
          background: color,
          boxShadow: pulse ? `0 0 6px ${color}` : 'none',
          display: 'inline-block', flexShrink: 0,
        }}
      />
      {label && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9,
          color, letterSpacing: '0.1em',
        }}>{label}</span>
      )}
    </span>
  )
}
