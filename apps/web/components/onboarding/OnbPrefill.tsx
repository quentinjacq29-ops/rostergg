type Props = { children: React.ReactNode }

export default function OnbPrefill({ children }: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 11,
      padding: '12px 15px', borderRadius: 12, marginBottom: 20,
      background: 'linear-gradient(100deg, rgba(0,255,157,0.08), transparent)',
      border: '1px solid rgba(0,255,157,0.23)',
    }}>
      <span style={{
        width: 24, height: 24, borderRadius: 7, flexShrink: 0,
        background: 'rgba(0,255,157,0.13)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--live)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 6" />
        </svg>
      </span>
      <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.45 }}>
        {children}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--live)', letterSpacing: '0.14em', whiteSpace: 'nowrap' }}>
        VIA RIOT
      </span>
    </div>
  )
}
