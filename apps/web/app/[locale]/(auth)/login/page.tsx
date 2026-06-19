'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import Avatar from '@/components/ui/Avatar'
import { RANK_COLORS } from '@/components/ui/Avatar'

// ── Types ────────────────────────────────────────────────────────────────────

interface RecentAccount {
  gameName: string
  tagLine: string
  rankKey: string | null
  hue: number
  lastSeen: number
}

const STORAGE_KEY = 'rgg_last_account'

function rankLabel(rankKey: string | null): string {
  if (!rankKey) return 'UNRANKED'
  const k = rankKey.toLowerCase()
  if (['master', 'grandmaster', 'challenger'].includes(k)) return k.toUpperCase()
  return k.slice(0, 3).toUpperCase()
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 60000)
  if (diff < 60) return `il y a ${diff} min`
  const h = Math.floor(diff / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

const T = {
  bg: '#0a0c14', surface: '#0f121c', void: '#06070b',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6', live: '#00ff9d',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

// ── Logo mark ────────────────────────────────────────────────────────────────

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

// ── Brand panel gauche ────────────────────────────────────────────────────────

function BrandPanel() {
  return (
    <section className="auth-brand-panel" style={{ position: 'relative', display: 'flex', flexDirection: 'column', padding: '40px 56px', overflow: 'hidden', borderRight: `1px solid ${T.line}` }}>
      <div style={{ position: 'absolute', top: -120, left: '-10%', width: 560, height: 480, background: `radial-gradient(circle, ${T.violet}22, transparent 60%)`, filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -120, right: '-15%', width: 560, height: 480, background: `radial-gradient(circle, ${T.cyan}1a, transparent 60%)`, filter: 'blur(50px)', pointerEvents: 'none' }} />

      <Link href="/" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 11, textDecoration: 'none', width: 'fit-content' }}>
        <LgMark size={38} />
        <span style={{ fontFamily: T.display, fontSize: 22, letterSpacing: '0.04em', color: T.text }}>ROSTER<span style={{ color: T.cyan }}>GG</span></span>
      </Link>

      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 460 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 999, background: `${T.cyan}10`, border: `1px solid ${T.cyan}3a`, marginBottom: 26, width: 'fit-content' }}>
          <span className="rgg-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: T.live, display: 'inline-block' }} />
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.cyan, letterSpacing: '0.16em' }}>247 JOUEURS DE TON ELO EN LIGNE</span>
        </div>
        <h1 style={{ margin: 0, fontFamily: T.display, fontSize: 'clamp(44px,5.5vw,68px)', lineHeight: 0.94, letterSpacing: '-0.01em', color: T.text }}>
          BON<br />
          <span style={{ background: `linear-gradient(120deg, ${T.cyan}, ${T.violet})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>RETOUR.</span>
        </h1>
        <p style={{ marginTop: 22, fontSize: 17, lineHeight: 1.6, color: T.textDim, maxWidth: 420 }}>
          Reconnecte-toi pour retrouver tes duos, tes demandes en attente et tes équipes — exactement là où tu les as laissés.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 34 }}>
          <div style={{ display: 'flex' }}>
            {[230, 280, 200, 320, 50].map((hue, i) => (
              <div key={i} style={{ marginLeft: i ? -12 : 0 }}>
                <Avatar initials="" size={34} hue={hue} rank="diamond" online={false} />
              </div>
            ))}
          </div>
          <span style={{ fontFamily: T.body, fontSize: 13.5, color: T.textDim }}>
            <b style={{ color: T.text }}>12 400+</b> joueurs actifs cette semaine
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.04em', lineHeight: 1.6, maxWidth: 440 }}>
        RosterGG isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends.
      </div>
    </section>
  )
}

// ── Compte récent ─────────────────────────────────────────────────────────────

function RecentAccount({ account, onClick }: { account: RecentAccount; onClick: () => void }) {
  const rkColor = RANK_COLORS[account.rankKey ?? 'iron'] ?? T.textMute
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 15, background: `linear-gradient(120deg, ${T.cyan}14, ${T.violet}10)`, border: `1px solid ${T.cyan}55`, boxShadow: `0 0 26px -10px ${T.cyan}66`, cursor: 'pointer', textAlign: 'left' }}>
      <Avatar initials={account.gameName.slice(0, 2).toUpperCase()} size={50} rank={account.rankKey ?? 'iron'} hue={account.hue} online />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: T.display, fontSize: 18, color: T.text, letterSpacing: '0.03em' }}>{account.gameName}</span>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim }}>#{account.tagLine}</span>
          {account.rankKey && (
            <span style={{ padding: '2px 7px', borderRadius: 6, background: `${rkColor}1f`, border: `1px solid ${rkColor}55`, fontFamily: T.mono, fontSize: 9, color: rkColor, letterSpacing: '0.08em' }}>
              {rankLabel(account.rankKey)}
            </span>
          )}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 5, fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.04em' }}>
          <span className="rgg-pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: T.live, display: 'inline-block' }} />
          COMPTE MÉMORISÉ · DERNIÈRE SESSION {timeAgo(account.lastSeen).toUpperCase()}
        </div>
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, boxShadow: `0 10px 24px -10px ${T.cyan}`, flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </span>
    </button>
  )
}

// ── Carte connexion droite ────────────────────────────────────────────────────

function ConnectCard({ account, onRiotLogin }: { account: RecentAccount | null; onRiotLogin: () => void }) {
  const hasAccount = account !== null
  return (
    <section className="auth-card-panel" style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 64px' }}>
      <div className="auth-card-topline" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${T.cyan}, ${T.violet}, transparent)` }} />
      <div className="auth-inner-wrap" style={{ width: '100%', maxWidth: 392, margin: '0 auto' }}>

        {/* Mobile head — visible uniquement <900px */}
        <div className="auth-mobile-head">
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
            <LgMark size={34} />
            <span style={{ fontFamily: T.display, fontSize: 19, letterSpacing: '0.04em', color: T.text }}>ROSTER<span style={{ color: T.cyan }}>GG</span></span>
          </Link>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim, letterSpacing: '0.1em', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" /></svg>
            FR
          </span>
        </div>

        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.cyan, letterSpacing: '0.22em', marginBottom: 12 }}>◢ CONNEXION</div>
        <h2 style={{ margin: 0, fontFamily: T.display, fontSize: 38, letterSpacing: '0.01em', lineHeight: 1, color: T.text }}>CONTENT DE TE REVOIR</h2>
        <p style={{ margin: '14px 0 0', fontFamily: T.body, fontSize: 14.5, color: T.textDim, lineHeight: 1.6 }}>
          {hasAccount
            ? 'Reprends avec ton compte mémorisé, ou connecte-toi avec un autre compte Riot.'
            : 'Connecte ton compte Riot pour retrouver tes duos et équipes.'}
        </p>

        {hasAccount && (
          <>
            <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.textMute, letterSpacing: '0.2em', margin: '26px 0 11px' }}>REPRENDRE AVEC</div>
            <RecentAccount account={account} onClick={onRiotLogin} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0' }}>
              <span style={{ flex: 1, height: 1, background: T.line }} />
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.12em' }}>OU</span>
              <span style={{ flex: 1, height: 1, background: T.line }} />
            </div>
          </>
        )}

        <button
          onClick={onRiotLogin}
          style={{
            width: '100%', padding: '15px', borderRadius: 12, cursor: 'pointer',
            border: hasAccount ? `1px solid ${T.lineStrong}` : 'none',
            background: hasAccount ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${T.cyan}, ${T.violet})`,
            color: hasAccount ? T.text : '#001018',
            fontFamily: T.display, fontSize: 14, letterSpacing: '0.08em',
            textTransform: 'uppercase', fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: hasAccount ? 'none' : `0 16px 40px -14px ${T.cyan}`,
            marginTop: hasAccount ? 0 : 26,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={hasAccount ? T.cyan : '#001018'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
          </svg>
          Continuer avec Riot
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 18, flexWrap: 'wrap' }}>
          {[
            ['Pas de mot de passe', 'M9 12l2 2 4-4'],
            ['Connexion via Riot', 'M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z'],
            ['Tes données privées', 'M4 11V7a8 8 0 0116 0v4'],
          ].map(([label, path]) => (
            <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: T.mono, fontSize: 9.5, color: T.textMute, letterSpacing: '0.04em' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>
              {label}
            </span>
          ))}
        </div>

        <div style={{ marginTop: 30, paddingTop: 22, borderTop: `1px solid ${T.line}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontFamily: T.body, fontSize: 14, color: T.textDim }}>
            Pas encore de compte ?{' '}
            <Link href="/signup" style={{ fontFamily: T.display, fontSize: 13, letterSpacing: '0.06em', color: T.cyan, textDecoration: 'none', textTransform: 'uppercase' }}>
              Créer un compte →
            </Link>
          </div>
          <Link href="/onboarding/1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: T.body, fontSize: 13.5, color: T.textMute, textDecoration: 'none' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
            </svg>
            Continuer à explorer sans compte
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [account, setAccount] = useState<RecentAccount | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setAccount(JSON.parse(raw))
    } catch { /* localStorage inaccessible */ }
    setHydrated(true)
  }, [])

  function handleRiotLogin() {
    window.location.href = `/${window.location.pathname.split('/')[1]}/onboarding/1`
  }

  if (!hydrated) return <div style={{ width: '100%', minHeight: '100vh', background: T.bg }} />

  return (
    <div className="auth-layout" style={{
      background: T.bg, color: T.text, fontFamily: T.body,
      backgroundImage: `radial-gradient(1000px 600px at 100% -5%, ${T.violet}12, transparent 55%), radial-gradient(900px 560px at 0% 105%, ${T.cyan}0e, transparent 55%)`,
    }}>
      <BrandPanel />
      <ConnectCard account={account} onRiotLogin={handleRiotLogin} />
    </div>
  )
}
