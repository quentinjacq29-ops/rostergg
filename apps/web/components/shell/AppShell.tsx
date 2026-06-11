'use client'
// Port exact de desktop/shell.jsx → DSidebar + DesktopShell
// + bottom nav mobile
import { Link } from '@/i18n/navigation'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

const T = {
  bg: '#0a0c14', surface: '#0f121c', void: '#06070b',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6', danger: '#ff3d6e',
  queue: '#ffb547', gold: '#ffd166', live: '#00ff9d',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

const RANKS: Record<string, string> = {
  iron: '#7e7a78', bronze: '#a05e2b', silver: '#a3b5c0', gold: '#c89b3c',
  platinum: '#4bc4b0', emerald: '#3ead84', diamond: '#6fc6e7',
  master: '#9d58c4', grandmaster: '#d84f4f', challenger: '#ebd990',
}

// Nav items — icônes SVG identiques à desktop/shell.jsx
const NAV = [
  {
    id: 'duo', label: 'Duo', href: '/duo', accent: T.cyan,
    icon: <path d="M7 12l-3 3 3 3M17 12l3 3-3 3M14 4l-4 16"/>,
  },
  {
    id: 'teams', label: 'Teams', href: '/teams', accent: T.violet,
    icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
  },
  {
    id: 'training', label: 'Training', href: '/training', accent: '#ff3d6e', badge: 'NEW',
    icon: <><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M14.5 6.5L18 3h3v3l-3.5 3.5"/></>,
  },
  {
    id: 'inbox', label: 'Inbox', href: '/inbox', accent: T.cyan,
    icon: <path d="M21 12a8 8 0 01-11.5 7.2L4 21l1.8-5.5A8 8 0 1121 12z"/>,
  },
]

type ShellUser = {
  id?: string
  displayName: string | null
  gameName: string | null
  tagLine: string | null
  avatarUrl: string | null
  rankKey?: string | null
  rankLabel?: string | null
  rankHue?: number
}

export default function AppShell({
  children,
  user,
  inboxCount = 0,
}: {
  children: ReactNode
  user: ShellUser | null
  inboxCount?: number
}) {
  const pathname = usePathname()
  const activeId = NAV.find(n => pathname.includes(n.href))?.id ?? 'duo'

  const userName  = user?.gameName ?? user?.displayName ?? 'Joueur'
  const initials  = userName.slice(0, 2).toUpperCase()
  const rankColor = RANKS[user?.rankKey ?? 'iron'] ?? '#9aa2bf'

  // Badge inbox temps réel — souscription Realtime sur duo_requests
  const [badge, setBadge] = useState(inboxCount)
  useEffect(() => { setBadge(inboxCount) }, [inboxCount])
  useEffect(() => {
    if (!user?.id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`inbox-badge:${user.id}`)
      // Demande reçue → +1
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'duo_requests',
        filter: `to_profile=eq.${user.id}`,
      }, () => setBadge(n => n + 1))
      // Demande reçue acceptée/refusée → -1
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'duo_requests',
        filter: `to_profile=eq.${user.id}`,
      }, (payload: any) => {
        if (payload.new?.status !== 'pending') setBadge(n => Math.max(0, n - 1))
      })
      // Demande envoyée acceptée → +1 (notif côté émetteur)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'duo_requests',
        filter: `from_profile=eq.${user.id}`,
      }, (payload: any) => {
        if (payload.new?.status === 'accepted') setBadge(n => n + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  // Mémorise le compte connecté pour le chip "compte récent" sur /login
  useEffect(() => {
    if (!user?.gameName) return
    try {
      localStorage.setItem('rgg_last_account', JSON.stringify({
        gameName: user.gameName,
        tagLine:  user.tagLine ?? '',
        rankKey:  user.rankKey ?? null,
        hue:      230,
        lastSeen: Date.now(),
      }))
    } catch { /* localStorage inaccessible */ }
  }, [user?.gameName])

  return (
    // DesktopShell : flex row, height 100vh, overflow hidden
    <div style={{
      width: '100%', height: '100vh', display: 'flex', overflow: 'hidden',
      background: T.bg, color: T.text, fontFamily: T.body,
      backgroundImage: `
        radial-gradient(1100px 600px at 18% -10%, ${T.violet}14, transparent 55%),
        radial-gradient(900px 520px at 105% 115%, ${T.cyan}10, transparent 55%)
      `,
    }}>

      {/* ── DSidebar (desktop ≥860px) */}
      <aside className="rgg-sidebar" style={{
        display: 'none', // shown via CSS media query
        width: 248, flexShrink: 0, height: '100%', boxSizing: 'border-box',
        background: `linear-gradient(180deg, ${T.surface}, ${T.void})`,
        borderRight: `1px solid ${T.line}`,
        flexDirection: 'column', padding: '24px 16px 18px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 8px 26px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11, position: 'relative', overflow: 'hidden',
            background: `linear-gradient(150deg, ${T.surface}, ${T.void})`,
            boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.1), 0 0 20px ${T.cyan}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
              <path d="M9 9 L20 24 L9 39" stroke={T.cyan} strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M39 9 L28 24 L39 39" stroke={T.violet} strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="24" cy="24" r="4.6" fill={T.cyan}/>
            </svg>
          </div>
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontFamily: T.display, fontSize: 21, color: T.text, letterSpacing: '0.04em' }}>
              ROSTER<span style={{ color: T.cyan }}>GG</span>
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 8.5, color: T.cyan, letterSpacing: '0.24em', marginTop: 3 }}>
              v2.4 · EUW
            </div>
          </div>
        </div>

        {/* MENU kicker */}
        <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.24em', padding: '0 10px 10px' }}>
          MENU
        </div>

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {NAV.map(item => {
            const on = activeId === item.id
            const a  = item.accent
            return (
              <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  position: 'relative', width: '100%', display: 'flex', alignItems: 'center', gap: 13,
                  padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                  background: on ? `linear-gradient(100deg, ${a}26, ${a}0c)` : 'transparent',
                  border: `1px solid ${on ? a + '55' : 'transparent'}`,
                  boxShadow: on ? `inset 0 0 22px ${a}1f` : 'none',
                  transition: 'background .15s, border-color .15s',
                }}>
                  {on && (
                    <span style={{
                      position: 'absolute', left: -1, top: 10, bottom: 10, width: 3,
                      borderRadius: 3, background: a, boxShadow: `0 0 10px ${a}`,
                    }}/>
                  )}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke={on ? a : T.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={on ? { filter: `drop-shadow(0 0 5px ${a}80)` } : {}}>
                    {item.icon}
                  </svg>
                  <span style={{ flex: 1, fontFamily: T.display, fontSize: 15, letterSpacing: '0.08em', color: on ? T.text : T.textDim }}>
                    {item.label.toUpperCase()}
                  </span>
                  {item.id === 'inbox' && badge > 0 ? (
                    <span style={{
                      minWidth: 19, height: 19, padding: '0 5px', borderRadius: 10,
                      background: T.danger, color: '#fff',
                      fontFamily: T.mono, fontSize: 10, fontWeight: 800,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 0 8px ${T.danger}70`,
                    }}>{badge}</span>
                  ) : null}
                  {item.badge ? (
                    <span style={{
                      padding: '2px 6px', borderRadius: 6, background: a,
                      color: '#180408', fontFamily: T.mono, fontSize: 8,
                      fontWeight: 800, letterSpacing: '0.12em',
                    }}>{item.badge}</span>
                  ) : null}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* ── PERSONNEL — Mon profil (DMeNavItem, v12) */}
        <div style={{ height: 1, background: T.line, margin: '16px 6px 0' }} />
        <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.24em', padding: '14px 10px 10px' }}>
          PERSONNEL
        </div>
        <Link href="/me" style={{ textDecoration: 'none' }}>
          <div style={{
            position: 'relative', width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
            background: activeId === 'me'
              ? `linear-gradient(100deg, ${T.cyan}2e, ${T.cyan}10)`
              : `${T.cyan}0a`,
            border: `1px solid ${activeId === 'me' ? T.cyan + '66' : T.cyan + '2e'}`,
            boxShadow: activeId === 'me' ? `inset 0 0 22px ${T.cyan}1f` : 'none',
            transition: 'background .15s, border-color .15s',
          }}>
            {activeId === 'me' && (
              <span style={{ position: 'absolute', left: -1, top: 10, bottom: 10, width: 3, borderRadius: 3, background: T.cyan, boxShadow: `0 0 10px ${T.cyan}` }} />
            )}
            {/* Avatar avec ring de rang */}
            <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: `linear-gradient(135deg, oklch(0.55 0.18 230), oklch(0.30 0.14 270))`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: T.display, fontSize: 13, color: '#fff',
                boxShadow: `0 0 0 2px ${rankColor}, 0 0 0 3px ${T.bg}`,
              }}>{initials}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
              <div style={{ fontFamily: T.display, fontSize: 14, letterSpacing: '0.08em', color: activeId === 'me' ? T.text : T.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                MON PROFIL
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 8.5, color: T.cyan, letterSpacing: '0.14em', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName.toUpperCase()} · ÉDITER MA FICHE
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={activeId === 'me' ? T.cyan : T.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </Link>

        <div style={{ flex: 1 }} />
      </aside>

      {/* ── Main */}
      <main className="rgg-main" style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </main>

      {/* ── Bottom nav (mobile <860px) */}
      <nav className="rgg-bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, display: 'none' }}>
        <div style={{
          display: 'flex', background: T.surface,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {NAV.map(item => {
            const on = activeId === item.id
            return (
              <Link key={item.id} href={item.href} style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 3, padding: '8px 0 6px',
                textDecoration: 'none',
              }}>
                <span style={{
                  display: 'block', width: 18, height: 3, borderRadius: 2, marginBottom: 2,
                  background: on ? item.accent : 'transparent',
                  transition: 'background .14s',
                }}/>
                <span style={{ fontFamily: T.display, fontSize: 10, color: on ? item.accent : T.textMute, letterSpacing: '0.08em' }}>
                  {item.label.toUpperCase()}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
