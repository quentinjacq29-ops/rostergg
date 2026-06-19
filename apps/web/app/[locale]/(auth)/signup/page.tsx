'use client'

import { Link } from '@/i18n/navigation'

const T = {
  bg: '#0a0c14', surface: '#0f121c', void: '#06070b',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6', live: '#00ff9d',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

function LgMark({ size = 36 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), overflow: 'hidden', background: `linear-gradient(150deg, ${T.surface}, ${T.void})`, boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.12), 0 0 16px ${T.cyan}33`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 48 48" fill="none">
        <path d="M9 9 L20 24 L9 39" stroke={T.cyan} strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M39 9 L28 24 L39 39" stroke={T.violet} strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="24" r="4.6" fill={T.cyan} />
      </svg>
    </span>
  )
}

function BrandPanel() {
  return (
    <section className="auth-brand-panel" style={{ position: 'relative', display: 'flex', flexDirection: 'column', padding: '40px 56px', overflow: 'hidden', borderRight: `1px solid ${T.line}` }}>
      <div style={{ position: 'absolute', top: -120, left: '-10%', width: 560, height: 480, background: `radial-gradient(circle, ${T.cyan}1f, transparent 60%)`, filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -120, right: '-15%', width: 560, height: 480, background: `radial-gradient(circle, ${T.violet}1e, transparent 60%)`, filter: 'blur(50px)', pointerEvents: 'none' }} />

      <Link href="/" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 11, textDecoration: 'none', width: 'fit-content' }}>
        <LgMark size={38} />
        <span style={{ fontFamily: T.display, fontSize: 22, letterSpacing: '0.04em', color: T.text }}>ROSTER<span style={{ color: T.cyan }}>GG</span></span>
      </Link>

      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 480 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 999, background: `${T.cyan}10`, border: `1px solid ${T.cyan}3a`, marginBottom: 26, width: 'fit-content' }}>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.cyan, letterSpacing: '0.16em' }}>GRATUIT · SANS ENGAGEMENT</span>
        </div>
        <h1 style={{ margin: 0, fontFamily: T.display, fontSize: 'clamp(44px,5.5vw,66px)', lineHeight: 0.94, letterSpacing: '-0.01em', color: T.text }}>
          REJOINS<br />
          <span style={{ background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>LE ROSTER.</span>
        </h1>
        <p style={{ marginTop: 22, fontSize: 17, lineHeight: 1.6, color: T.textDim, maxWidth: 430 }}>
          Une seule connexion Riot — pas de formulaire, pas de mot de passe — et tu trouves ton premier duo ce soir.
        </p>

        <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            {
              iconPath: <path d="M7 12l-3 3 3 3M17 12l3 3-3 3M14 4l-4 16" />,
              title: 'Matching par compatibilité',
              desc: 'Rôle, elo, horaires, style de jeu.',
            },
            {
              iconPath: <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />,
              title: 'Rang vérifié via Riot',
              desc: "Importé automatiquement, jamais ton mot de passe.",
            },
            {
              iconPath: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /></>,
              title: 'Duo, équipes & coaching',
              desc: 'Tout au même endroit, dès l\'inscription.',
            },
          ].map(p => (
            <div key={p.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `${T.cyan}1a`, border: `1px solid ${T.cyan}47` }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.cyan} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{p.iconPath}</svg>
              </span>
              <span>
                <span style={{ display: 'block', fontFamily: T.body, fontWeight: 600, fontSize: 15, color: T.text }}>{p.title}</span>
                <span style={{ display: 'block', fontSize: 13, color: T.textDim, lineHeight: 1.5, marginTop: 2 }}>{p.desc}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.04em', lineHeight: 1.6, maxWidth: 440 }}>
        RosterGG isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends.
      </div>
    </section>
  )
}

function SignupCard() {
  function handleRiotSignup() {
    window.location.href = `/${window.location.pathname.split('/')[1]}/onboarding/1`
  }

  return (
    <section className="auth-card-panel" style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 64px' }}>
      <div className="auth-card-topline" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${T.cyan}, ${T.violet}, transparent)` }} />
      <div className="auth-inner-wrap" style={{ width: '100%', maxWidth: 392, margin: '0 auto' }}>

        {/* Mobile head */}
        <div className="auth-mobile-head">
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
            <LgMark size={34} />
            <span style={{ fontFamily: T.display, fontSize: 19, letterSpacing: '0.04em', color: T.text }}>ROSTER<span style={{ color: T.cyan }}>GG</span></span>
          </Link>
          <Link href="/login" style={{ fontFamily: T.display, fontSize: 12, letterSpacing: '0.06em', color: T.cyan, textDecoration: 'none', textTransform: 'uppercase' }}>Connexion</Link>
        </div>

        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.cyan, letterSpacing: '0.22em', marginBottom: 12 }}>◢ CRÉER UN COMPTE</div>
        <h2 style={{ margin: 0, fontFamily: T.display, fontSize: 36, letterSpacing: '0.01em', lineHeight: 1.02, color: T.text }}>EN 3 MINUTES,<br />TU JOUES.</h2>
        <p style={{ margin: '14px 0 0', fontFamily: T.body, fontSize: 14.5, color: T.textDim, lineHeight: 1.6 }}>
          Lie ton compte Riot pour démarrer. On s&apos;occupe du reste.
        </p>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, margin: '24px 0 26px' }}>
          {[
            { n: 1, label: 'Lie ton compte Riot', done: true },
            { n: 2, label: 'Choisis ton pseudo RosterGG', done: false },
            { n: 3, label: 'Dis-nous ce que tu cherches', done: false },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 0', borderBottom: s.n < 3 ? `1px solid ${T.line}` : 'none' }}>
              <span style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: T.mono, fontSize: 12,
                background: s.done ? `${T.live}29` : 'transparent',
                border: `1px solid ${s.done ? `${T.live}73` : T.lineStrong}`,
                color: s.done ? T.live : T.textDim,
              }}>
                {s.done
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6" /></svg>
                  : s.n
                }
              </span>
              <span style={{ fontFamily: T.body, fontSize: 14, color: s.done ? T.text : T.textDim }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* RSO CTA */}
        <button
          onClick={handleRiotSignup}
          style={{ width: '100%', padding: '17px', borderRadius: 13, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: '#001018', fontFamily: T.display, fontSize: 15, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: `0 16px 40px -14px ${T.cyan}, 0 0 50px -20px ${T.violet}` }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
          </svg>
          Créer mon compte avec Riot
        </button>

        {/* Réassurance */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            ['Pas de mot de passe', 'M9 12l2 2 4-4'],
            ['Données privées', 'M4 11V7a8 8 0 0116 0v4'],
            ['Gratuit', 'M20 6L9 17l-5-5'],
          ].map(([label, path]) => (
            <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: T.mono, fontSize: 9.5, color: T.textMute, letterSpacing: '0.04em' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>
              {label}
            </span>
          ))}
        </div>

        <div style={{ marginTop: 26, paddingTop: 22, borderTop: `1px solid ${T.line}`, fontFamily: T.body, fontSize: 14, color: T.textDim }}>
          Déjà un compte ?{' '}
          <Link href="/login" style={{ fontFamily: T.display, fontSize: 13, letterSpacing: '0.06em', color: T.cyan, textDecoration: 'none', textTransform: 'uppercase' }}>
            Se connecter →
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function SignupPage() {
  return (
    <div className="auth-layout" style={{
      background: T.bg, color: T.text, fontFamily: T.body,
      backgroundImage: `radial-gradient(1000px 600px at 100% -5%, ${T.cyan}1f, transparent 55%), radial-gradient(900px 560px at 0% 105%, ${T.violet}17, transparent 55%)`,
    }}>
      <BrandPanel />
      <SignupCard />
    </div>
  )
}
