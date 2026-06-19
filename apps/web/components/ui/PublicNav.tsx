'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import LanguageSwitcher from '@/components/LanguageSwitcher'

function LogoMark({ size = 36 }: { size?: number }) {
  const r = Math.round(size * 0.3)
  return (
    <span style={{ width: size, height: size, borderRadius: r, overflow: 'hidden', background: 'linear-gradient(150deg, var(--surface), var(--void))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12), 0 0 16px rgba(0,224,255,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 48 48" fill="none">
        <path d="M9 9 L20 24 L9 39" stroke="var(--cyan)" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M39 9 L28 24 L39 39" stroke="var(--violet)" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="24" r="4.6" fill="var(--cyan)" />
      </svg>
    </span>
  )
}

export default function PublicNav() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', gap: 28, padding: '16px 40px', borderBottom: '1px solid var(--line)', background: 'rgba(10,12,20,0.72)', backdropFilter: 'blur(14px)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
          <LogoMark size={36} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '0.04em', color: 'var(--text)' }}>
            ROSTER<span style={{ color: 'var(--cyan)' }}>GG</span>
          </span>
        </Link>

        <div className="landing-nav-links" style={{ display: 'flex', gap: 26, marginLeft: 20 }}>
          {['Duo', 'Équipes', 'Coaching'].map(l => (
            <span key={l} style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-dim)', cursor: 'pointer', fontWeight: 500 }}>{l}</span>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <LanguageSwitcher />
          <Link className="landing-nav-guest" href="/onboarding/1" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-dim)', textDecoration: 'none', fontWeight: 500 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
            </svg>
            Explorer sans compte
          </Link>
          <Link href="/login" style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}>
            Se connecter
          </Link>
          <Link href="/onboarding/1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 11, background: 'linear-gradient(135deg, var(--cyan), var(--violet))', color: '#001018', fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, boxShadow: '0 10px 26px -10px var(--cyan)', textDecoration: 'none' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
            </svg>
            Connexion Riot
          </Link>
          <button
            className="landing-hamb"
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line-strong)', color: 'var(--text)', cursor: 'pointer', flexShrink: 0 }}
          >
            {open
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            }
          </button>
        </div>
      </nav>

      <div className={`landing-mobile-menu${open ? ' open' : ''}`} style={{ padding: '0 24px 16px' }}>
        {['Duo', 'Équipes', 'Coaching'].map(l => (
          <span key={l} onClick={() => setOpen(false)} style={{ padding: '13px 4px', fontSize: 16, color: 'var(--text-dim)', borderBottom: '1px solid var(--line)', display: 'block', cursor: 'pointer' }}>{l}</span>
        ))}
        <Link href="/login" onClick={() => setOpen(false)} style={{ padding: '13px 4px', fontSize: 16, color: 'var(--text-dim)', borderBottom: '1px solid var(--line)', display: 'block', textDecoration: 'none' }}>
          Se connecter
        </Link>
        <div style={{ paddingTop: 16 }}>
          <Link href="/onboarding/1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 22px', borderRadius: 11, background: 'linear-gradient(135deg, var(--cyan), var(--violet))', color: '#001018', fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, textDecoration: 'none' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
            </svg>
            Continuer avec Riot
          </Link>
        </div>
      </div>
    </>
  )
}
