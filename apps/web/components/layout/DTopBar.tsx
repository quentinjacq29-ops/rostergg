'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NotificationsPanel from '@/components/overlays/NotificationsPanel'
import SearchPalette      from '@/components/overlays/SearchPalette'
import MoreMenu           from '@/components/overlays/MoreMenu'
import ReportModal        from '@/components/overlays/ReportModal'
import type { OverlayTarget } from '@/components/overlays/MoreMenu'

const T = {
  bg: '#0a0c14', line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', danger: '#ff3d6e',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

type Panel = 'notifs' | 'search' | 'more' | 'report' | null

type Props = {
  eyebrow:            string
  title:              string
  accent?:            string
  target?:            OverlayTarget
  initialUnreadCount?: number
  locale?:            string
}

export default function DTopBar({
  eyebrow, title,
  accent   = T.cyan,
  target,
  initialUnreadCount = 0,
  locale   = 'fr',
}: Props) {
  const router = useRouter()
  const [open,         setOpen]         = useState<Panel>(null)
  const [unreadCount,  setUnreadCount]  = useState(initialUnreadCount)
  const [isBookmarked, setIsBookmarked] = useState(target?.isBookmarked ?? false)

  // ⌘K global shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(p => p === 'search' ? null : 'search')
      }
      if (e.key === 'Escape') setOpen(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Realtime: unread badge on notifications table
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let removeChannel: (() => void) | null = null

    async function subscribe() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled || !user) return

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (cancelled) return
      setUnreadCount(count ?? 0)

      const channel = supabase
        .channel(`notif-badge:${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, () => setUnreadCount(n => n + 1))
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false).then(({ count: c }) => setUnreadCount(c ?? 0))
        })
        .subscribe()

      removeChannel = () => supabase.removeChannel(channel)
    }

    subscribe()
    return () => { cancelled = true; removeChannel?.() }
  }, [])

  function toggle(panel: Panel) {
    setOpen(p => p === panel ? null : panel)
  }

  const hasMore   = !!target
  const moreTarget: OverlayTarget | null = target
    ? { ...target, isBookmarked }
    : null

  return (
    <>
      {/* ── DTopBar ── */}
      <div style={{
        flexShrink: 0, height: 76, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', gap: 24, padding: '0 28px',
        borderBottom: `1px solid ${T.line}`,
        background: 'rgba(10,12,20,0.6)', backdropFilter: 'blur(12px)',
      }}>
        {/* Eyebrow + Title */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: T.mono, fontSize: 9.5, color: accent, letterSpacing: '0.24em', marginBottom: 3 }}>
            ◢ {eyebrow}
          </div>
          <div style={{ fontFamily: T.display, fontSize: 24, color: T.text, letterSpacing: '0.02em', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 340 }}>
            {title}
          </div>
        </div>

        {/* Search bar */}
        <div
          style={{ flex: 1, maxWidth: 460, cursor: 'text' }}
          onClick={() => toggle('search')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 42, padding: '0 14px', borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: `1px solid ${open === 'search' ? T.cyan + '66' : T.line}`, transition: 'border-color .15s' }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
            <span style={{ flex: 1, fontFamily: T.body, fontSize: 13.5, color: T.textMute }}>Search players, teams, champions…</span>
            <span style={{ display: 'flex', gap: 4 }}>
              {['⌘', 'K'].map(k => (
                <kbd key={k} style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, padding: '2px 6px', borderRadius: 5, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.line}` }}>{k}</kbd>
              ))}
            </span>
          </div>
        </div>

        {/* Right controls */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* ⋯ MORE (player-specific) */}
          {hasMore && (
            <button
              onClick={() => toggle('more')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 18px', height: 42, borderRadius: 11, background: open === 'more' ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.05)', border: `1px solid ${T.lineStrong}`, color: T.text, fontFamily: T.display, fontSize: 13, letterSpacing: '0.1em', cursor: 'pointer' }}
            >
              <span style={{ fontSize: 16, letterSpacing: '0.05em' }}>⋯</span> MORE
            </button>
          )}

          {/* Bell */}
          <button
            onClick={() => toggle('notifs')}
            style={{ position: 'relative', width: 42, height: 42, borderRadius: 11, cursor: 'pointer', background: open === 'notifs' ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)', border: `1px solid ${open === 'notifs' ? T.lineStrong : T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 1112 0c0 7 3 7 3 9H3c0-2 3-2 3-9zM10 21a2 2 0 004 0"/>
            </svg>
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: '50%', background: T.danger, boxShadow: `0 0 6px ${T.danger}`, border: `1.5px solid ${T.bg}` }} />
            )}
          </button>

          {/* Settings */}
          <button
            onClick={() => router.push(`/${locale}/settings`)}
            style={{ width: 42, height: 42, borderRadius: 11, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Overlays ── */}
      {open === 'notifs' && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 299 }} onClick={() => setOpen(null)} />
          <NotificationsPanel
            onClose={() => setOpen(null)}
            onCountChange={setUnreadCount}
          />
        </>
      )}

      {open === 'search' && (
        <SearchPalette
          onClose={() => setOpen(null)}
          locale={locale}
        />
      )}

      {open === 'more' && moreTarget && (
        <MoreMenu
          target={moreTarget}
          isBookmarked={isBookmarked}
          onBookmarkChange={setIsBookmarked}
          onReport={() => setOpen('report')}
          onBlock={() => setOpen(null)}
          onClose={() => setOpen(null)}
        />
      )}

      {open === 'report' && moreTarget && (
        <ReportModal
          targetId={moreTarget.profileId}
          displayName={moreTarget.displayName}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  )
}
