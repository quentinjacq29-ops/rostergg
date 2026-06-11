import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import Avatar from '@/components/ui/Avatar'
import MatchRing from '@/components/ui/MatchRing'
import RoleIcon from '@/components/ui/RoleIcon'

type Props = { params: { locale: string } }

// ─── Logo mark ──────────────────────────────────────────────────────────────
function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), overflow: 'hidden', background: 'linear-gradient(150deg, var(--surface), var(--void))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12), 0 0 16px rgba(0,224,255,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 48 48" fill="none">
        <path d="M9 9 L20 24 L9 39" stroke="var(--cyan)" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M39 9 L28 24 L39 39" stroke="var(--violet)" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="24" r="4.6" fill="var(--cyan)" />
      </svg>
    </span>
  )
}

// ─── Navbar ──────────────────────────────────────────────────────────────────
function LNav() {
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', gap: 28, padding: '18px 40px', borderBottom: '1px solid var(--line)', background: 'rgba(10,12,20,0.72)', backdropFilter: 'blur(14px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <LogoMark size={36} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '0.04em' }}>ROSTER<span style={{ color: 'var(--cyan)' }}>GG</span></span>
      </div>
      <div className="landing-nav-links" style={{ display: 'flex', gap: 26, marginLeft: 20 }}>
        {['Duo', 'Équipes', 'Coaching'].map(l => (
          <span key={l} style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-dim)', cursor: 'pointer', fontWeight: 500 }}>{l}</span>
        ))}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <LanguageSwitcher />
        <Link className="landing-nav-guest" href="/onboarding/1" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-dim)', textDecoration: 'none', fontWeight: 500 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
          Explorer sans compte
        </Link>
        <Link href="/login" style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}>
          Se connecter
        </Link>
        <Link href="/onboarding/1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 11, background: 'linear-gradient(135deg, var(--cyan), var(--violet))', color: '#001018', fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, boxShadow: '0 10px 26px -10px var(--cyan)', textDecoration: 'none' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /></svg>
          Connexion Riot
        </Link>
      </div>
    </nav>
  )
}

// ─── Hero visual (product preview card) ────────────────────────────────────
function HeroVisual() {
  const bars = [
    { label: 'Rôles', value: 'MID + Jungle', color: 'var(--cyan)', w: 96 },
    { label: 'Elo', value: 'Diamond II', color: 'var(--live)', w: 92 },
    { label: 'Horaires', value: '21h–01h', color: 'var(--violet)', w: 88 },
    { label: 'Langues', value: 'FR · EN', color: 'var(--gold)', w: 100 },
  ]
  return (
    <div className="landing-hero-visual" style={{ position: 'relative', width: 460, flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: -30, left: -20, right: -20, bottom: -30, background: 'radial-gradient(circle at 60% 40%, rgba(0,224,255,0.15), transparent 60%), radial-gradient(circle at 30% 80%, rgba(139,92,246,0.15), transparent 60%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(180deg, var(--surface), var(--bg))', border: '1px solid var(--line-strong)', boxShadow: '0 40px 90px -30px rgba(0,0,0,0.8)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--cyan), var(--violet), transparent)' }} />
        <div style={{ padding: '22px 22px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--cyan)', letterSpacing: '0.2em' }}>◢ COMPATIBILITY ENGINE</span>
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--live)' }}>
              <span className="rgg-pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />247 ONLINE
            </span>
          </div>
          {/* Match ring + avatars */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Avatar initials="VY" size={64} rank="diamond" hue={230} />
              <RoleIcon role="MID" size={16} active />
            </div>
            <MatchRing value={94} size={96} stroke={6} accent="#00e0ff" accent2="#8b5cf6" />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Avatar initials="KZ" size={64} rank="diamond" hue={280} />
              <RoleIcon role="JNG" size={16} active />
            </div>
          </div>
          {/* Compatibility bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bars.map(({ label, value, color, w }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-dim)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-mute)' }}>{value}</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${w}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${color}, ${color}cc)`, boxShadow: `0 0 8px ${color}80` }} />
                </div>
              </div>
            ))}
          </div>
          <button style={{ width: '100%', marginTop: 18, padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, var(--cyan), var(--violet))', color: '#001018', fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            Envoyer une demande de duo
          </button>
        </div>
      </div>
      {/* Floating chips */}
      <div style={{ position: 'absolute', top: 30, left: -46, padding: '8px 13px', borderRadius: 11, background: 'var(--surface)', border: '1px solid rgba(0,224,255,0.33)', boxShadow: '0 12px 30px -10px rgba(0,224,255,0.4)', display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--cyan)', display: 'inline-block' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text)', letterSpacing: '0.08em' }}>94% MATCH</span>
      </div>
      <div style={{ position: 'absolute', bottom: 60, right: -40, padding: '8px 13px', borderRadius: 11, background: 'var(--surface)', border: '1px solid rgba(139,92,246,0.33)', boxShadow: '0 12px 30px -10px rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', gap: 7 }}>
        <RoleIcon role="JNG" size={13} active />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text)', letterSpacing: '0.08em' }}>JUNGLE DISPO</span>
      </div>
    </div>
  )
}

// ─── Sections ────────────────────────────────────────────────────────────────
function LHero() {
  return (
    <header style={{ position: 'relative', overflow: 'hidden', padding: '80px 40px 90px' }}>
      <div style={{ position: 'absolute', top: -120, left: '8%', width: 600, height: 500, background: 'radial-gradient(circle, rgba(139,92,246,0.11), transparent 60%)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 40, right: 0, width: 620, height: 540, background: 'radial-gradient(circle, rgba(0,224,255,0.09), transparent 60%)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div className="landing-hero-inner" style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 70 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 999, background: 'rgba(0,224,255,0.06)', border: '1px solid rgba(0,224,255,0.23)', marginBottom: 26 }}>
            <span className="rgg-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', letterSpacing: '0.16em' }}>LEAGUE OF LEGENDS · EUW · NA · KR</span>
          </div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'clamp(48px,6vw,76px)', lineHeight: 0.94, letterSpacing: '-0.01em', color: 'var(--text)' }}>
            TROUVE TES<br />
            <span style={{ background: 'linear-gradient(120deg, var(--cyan), var(--violet))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              BONS COÉQUIPIERS.
            </span>
          </h1>
          <p style={{ marginTop: 24, fontSize: 18, lineHeight: 1.6, color: 'var(--text-dim)', maxWidth: 520 }}>
            Un duo compatible, une équipe à 5, un coach pour progresser. RosterGG te matche par rôle, elo, horaires et style de jeu — branché sur ton compte Riot.
          </p>
          <div className="landing-hero-cta" style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 36 }}>
            <Link href="/onboarding/1" style={{ padding: '17px 30px', borderRadius: 13, border: 'none', background: 'linear-gradient(135deg, var(--cyan), var(--violet))', color: '#001018', fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, boxShadow: '0 16px 40px -14px var(--cyan)', display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /></svg>
              Continuer avec Riot
            </Link>
            <Link href="/onboarding/1" style={{ padding: '17px 26px', borderRadius: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line-strong)', color: 'var(--text)', fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
              Explorer sans compte
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 30 }}>
            <div style={{ display: 'flex' }}>
              {[230, 280, 200, 320, 50].map((hue, i) => (
                <div key={i} style={{ marginLeft: i ? -12 : 0 }}>
                  <Avatar initials="" size={34} hue={hue} rank="diamond" online={false} />
                </div>
              ))}
            </div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-dim)' }}>
              <b style={{ color: 'var(--text)' }}>12 400+</b> joueurs ont trouvé leur duo cette semaine
            </span>
          </div>
          <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-mute)', letterSpacing: '0.06em' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--live)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            Parcours duos, équipes et coachs librement — compte Riot requis seulement pour contacter.
          </div>
          <div style={{ marginTop: 18, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-dim)' }}>
            Déjà un compte ?{' '}
            <Link href="/login" style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.06em', color: 'var(--cyan)', textDecoration: 'none', textTransform: 'uppercase' }}>
              Se connecter →
            </Link>
          </div>
        </div>
        <HeroVisual />
      </div>
    </header>
  )
}

function LPillars() {
  const pillars = [
    {
      accent: 'var(--cyan)', kicker: 'DUO', title: 'Trouve ton partenaire',
      desc: 'Un feed classé par compatibilité : rôle complémentaire, même elo, horaires qui se recoupent. Swipe, demande, lance.',
      iconPath: <path d="M7 12l-3 3 3 3M17 12l3 3-3 3M14 4l-4 16" />,
    },
    {
      accent: 'var(--violet)', kicker: 'ÉQUIPES', title: 'Monte ou rejoins un roster',
      desc: 'Browse des équipes qui recrutent ton rôle, postule en un clic, ou crée ta team et gère tes candidatures.',
      iconPath: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /></>,
    },
    {
      accent: 'var(--train-rose)', kicker: 'COACHING', title: 'Progresse en 1v1',
      desc: 'Des spécialistes Challenger de ton rôle et de tes matchups difficiles. VOD review, live coaching, plan perso.',
      iconPath: <><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6M16 16l4 4" /></>,
    },
  ]
  return (
    <section style={{ padding: '60px 40px', maxWidth: 1240, margin: '0 auto' }}>
      <div className="landing-pillars-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {pillars.map(p => (
          <div key={p.kicker} style={{ position: 'relative', borderRadius: 20, padding: 28, background: 'linear-gradient(180deg, var(--surface), var(--bg))', border: '1px solid var(--line)', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -30, width: 160, height: 160, background: `radial-gradient(circle, ${p.accent}30, transparent 65%)`, filter: 'blur(20px)', pointerEvents: 'none' }} />
            <div style={{ width: 52, height: 52, borderRadius: 14, background: `${p.accent}1a`, border: `1px solid ${p.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={p.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{p.iconPath}</svg>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: p.accent, letterSpacing: '0.22em', marginBottom: 8 }}>{p.kicker}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text)', letterSpacing: '0.01em', marginBottom: 12 }}>{p.title}</div>
            <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--text-dim)', lineHeight: 1.6 }}>{p.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function LHowItWorks() {
  const steps = [
    ['01', 'Lie ton compte Riot', "On importe ton rang, ton historique et ton champ pool — vérifié, jamais ton mot de passe."],
    ['02', 'Dis-nous ce que tu cherches', 'Rôle, horaires, langues, style de jeu, objectif. 2 minutes.'],
    ['03', 'Matche & joue', 'On te classe les meilleurs duos, équipes et coachs. Demande, discute, lance la game.'],
  ]
  return (
    <section style={{ padding: '70px 40px', background: 'linear-gradient(180deg, transparent, rgba(15,18,28,0.55), transparent)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', letterSpacing: '0.24em', marginBottom: 14 }}>◢ COMMENT ÇA MARCHE</div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'clamp(32px,4vw,46px)', letterSpacing: '0.01em', color: 'var(--text)' }}>3 ÉTAPES, PUIS TU JOUES</h2>
        </div>
        <div className="landing-how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {steps.map(([n, t, d]) => (
            <div key={n} style={{ textAlign: 'center', padding: '0 14px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, lineHeight: 1, background: 'linear-gradient(135deg, var(--cyan), var(--violet))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 16 }}>{n}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 21, color: 'var(--text)', letterSpacing: '0.02em', marginBottom: 10 }}>{t}</div>
              <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6 }}>{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function LFinalCTA() {
  return (
    <section style={{ padding: '40px 40px 90px' }}>
      <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', borderRadius: 26, overflow: 'hidden', padding: '64px 48px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,224,255,0.09), rgba(139,92,246,0.09))', border: '1px solid rgba(0,224,255,0.23)' }}>
        <div style={{ position: 'absolute', top: -60, left: '30%', width: 400, height: 300, background: 'radial-gradient(circle, rgba(0,224,255,0.15), transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}><LogoMark size={56} /></div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'clamp(36px,5vw,52px)', letterSpacing: '0.01em', lineHeight: 1, color: 'var(--text)' }}>PRÊT À MONTER ?</h2>
          <p style={{ margin: '16px auto 0', fontFamily: 'var(--font-body)', fontSize: 17, color: 'var(--text-dim)', lineHeight: 1.6, maxWidth: 460 }}>
            Gratuit, sans engagement. Une seule connexion Riot — pas de formulaire, pas de mot de passe — et tu trouves ton premier duo ce soir.
          </p>
          <div className="landing-final-cta-btns" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 32 }}>
            <Link href="/onboarding/1" style={{ padding: '17px 32px', borderRadius: 13, border: 'none', background: 'linear-gradient(135deg, var(--cyan), var(--violet))', color: '#001018', fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, boxShadow: '0 16px 40px -14px var(--cyan)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /></svg>
              Continuer avec Riot
            </Link>
            <Link href="/onboarding/1" style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.08em', color: 'var(--text)', textDecoration: 'none', textTransform: 'uppercase' }}>
              Explorer sans compte →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function LFooter() {
  const cols: [string, string[]][] = [
    ['PRODUIT', ['Duo matching', 'Équipes', 'Coaching 1v1', 'Comment ça marche']],
    ['RESSOURCES', ['Comment ça marche', 'Blog', 'Statut serveurs', 'Support']],
    ['LÉGAL', ['Confidentialité', 'CGU', 'Cookies', 'Mentions légales']],
  ]
  return (
    <footer style={{ borderTop: '1px solid var(--line)', padding: '50px 40px 40px', background: 'var(--void)' }}>
      <div className="landing-footer-grid" style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 30 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <LogoMark size={34} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '0.04em', color: 'var(--text)' }}>ROSTER<span style={{ color: 'var(--cyan)' }}>GG</span></span>
          </div>
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.6, maxWidth: 280 }}>
            La plateforme pour trouver ton duo, ton équipe et ton coach sur League of Legends.
          </p>
        </div>
        {cols.map(([h, items]) => (
          <div key={h}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.2em', marginBottom: 16 }}>{h}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {items.map(i => <span key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-mute)', cursor: 'pointer' }}>{i}</span>)}
            </div>
          </div>
        ))}
      </div>
      <div className="landing-footer-bottom" style={{ maxWidth: 1240, margin: '36px auto 0', paddingTop: 24, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-mute)', letterSpacing: '0.06em' }}>© 2026 RosterGG</span>
        <span className="landing-footer-disc" style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-mute)', letterSpacing: '0.04em', maxWidth: 620, textAlign: 'right', lineHeight: 1.5 }}>
          RosterGG isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends.
        </span>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default async function HomePage({ params: { locale } }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: prefs } = await supabase
      .from('matching_prefs')
      .select('profile_id')
      .eq('profile_id', user.id)
      .maybeSingle()
    redirect(prefs ? `/${locale}/duo` : `/${locale}/onboarding/1`)
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', backgroundImage: 'radial-gradient(1000px 600px at 100% -5%, rgba(139,92,246,0.07), transparent 55%)' }}>
      <LNav />
      <LHero />
      <LPillars />
      <LHowItWorks />
      <LFinalCTA />
      <LFooter />
    </div>
  )
}
