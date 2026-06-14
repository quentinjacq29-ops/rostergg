'use client'
import { useState } from 'react'

const T = {
  elevated: '#161a26', surface: '#0f121c',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', danger: '#ff3d6e',
  body: 'var(--font-body)', mono: 'var(--font-mono)',
}

function Ico({ d, size = 16, c = T.textDim }: { d: string | string[]; size?: number; c?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  )
}

export type OverlayTarget = {
  profileId:   string
  displayName: string
  riotId:      string | null  // null = non révélé
  isBookmarked: boolean
}

type Props = {
  target:           OverlayTarget
  isBookmarked:     boolean
  onBookmarkChange: (v: boolean) => void
  onReport:         () => void
  onBlock:          () => void
  onClose:          () => void
}

export default function MoreMenu({ target, isBookmarked, onBookmarkChange, onReport, onBlock, onClose }: Props) {
  const [blocking, setBlocking]   = useState(false)
  const [copied,   setCopied]     = useState(false)
  const [toast,    setToast]      = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  async function toggleBookmark() {
    const next = !isBookmarked
    onBookmarkChange(next)
    if (next) {
      await fetch('/api/me/bookmarks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: target.profileId }) })
      showToast('Joueur sauvegardé')
    } else {
      await fetch(`/api/me/bookmarks?playerId=${target.profileId}`, { method: 'DELETE' })
      showToast('Supprimé des favoris')
    }
  }

  async function copyRiotId() {
    if (!target.riotId) return
    await navigator.clipboard.writeText(target.riotId)
    setCopied(true)
    showToast('Riot ID copié !')
    setTimeout(() => setCopied(false), 2000)
  }

  async function shareProfile() {
    const url = `${location.origin}/fr/u/${encodeURIComponent(target.displayName)}/EUW`
    if (navigator.share) {
      await navigator.share({ title: target.displayName, url })
    } else {
      await navigator.clipboard.writeText(url)
      showToast('Lien copié !')
    }
  }

  async function blockPlayer() {
    if (!confirm(`Bloquer ${target.displayName} ? Vous disparaissez mutuellement du feed.`)) return
    setBlocking(true)
    await fetch('/api/me/blocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: target.profileId }) })
    setBlocking(false)
    onBlock()
    onClose()
  }

  const Item = ({ icon, label, hint, danger = false, disabled = false, onClick: click }: {
    icon: string | string[]; label: string; hint?: string; danger?: boolean; disabled?: boolean; onClick: () => void
  }) => (
    <div
      onClick={disabled ? undefined : click}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9, cursor: disabled ? 'default' : 'pointer', color: danger ? T.danger : disabled ? T.textMute : T.text, opacity: disabled ? 0.45 : 1 }}
    >
      <Ico d={icon} size={16} c={danger ? T.danger : disabled ? T.textMute : T.textDim} />
      <span style={{ flex: 1, fontFamily: T.body, fontSize: 13.5, fontWeight: 600 }}>{label}</span>
      {hint && <span style={{ fontFamily: T.mono, fontSize: 9.5, color: T.textMute, letterSpacing: '0.08em' }}>{hint}</span>}
    </div>
  )

  return (
    <>
      {/* backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 299 }} onClick={onClose} />

      {/* menu */}
      <div style={{
        position: 'fixed', top: 80, right: 16 + 42 + 12 + 42 + 12, /* right of bell + settings */
        width: 258, borderRadius: 14, padding: 6,
        background: T.elevated, border: `1px solid ${T.lineStrong}`,
        boxShadow: '0 26px 60px -18px rgba(0,0,0,0.8)', zIndex: 300,
      }}>
        {/* caret */}
        <div style={{ position: 'absolute', top: -7, right: 30, width: 14, height: 14, background: T.elevated, borderLeft: `1px solid ${T.lineStrong}`, borderTop: `1px solid ${T.lineStrong}`, transform: 'rotate(45deg)' }} />

        <Item
          icon={isBookmarked
            ? 'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z'
            : 'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z'}
          label={isBookmarked ? 'Sauvegardé' : 'Sauvegarder le joueur'}
          hint="B"
          onClick={toggleBookmark}
        />
        <Item
          icon={['M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8', 'M16 6l-4-4-4 4', 'M12 2v13']}
          label="Partager le profil"
          onClick={shareProfile}
        />
        {/* Copier Riot ID — gaté section R */}
        {target.riotId ? (
          <Item
            icon={['M9 9h10a2 2 0 012 2v10a2 2 0 01-2 2H9a2 2 0 01-2-2V11a2 2 0 012-2z', 'M5 15H4a2 2 0 01-2-2V3a2 2 0 012-2h10a2 2 0 012 2v1']}
            label="Copier le Riot ID"
            hint={copied ? 'COPIÉ !' : target.riotId}
            onClick={copyRiotId}
          />
        ) : (
          <Item
            icon={['M9 9h10a2 2 0 012 2v10a2 2 0 01-2 2H9a2 2 0 01-2-2V11a2 2 0 012-2z', 'M5 15H4a2 2 0 01-2-2V3a2 2 0 012-2h10a2 2 0 012 2v1']}
            label="Copier le Riot ID"
            hint="🔒 DUO ACCEPTÉ"
            disabled
            onClick={() => {}}
          />
        )}

        <div style={{ height: 1, background: T.line, margin: '6px 8px' }} />

        <Item
          icon={['M18.4 5.6L5.6 18.4', 'M12 22a10 10 0 100-20 10 10 0 000 20z']}
          label={blocking ? 'Blocage…' : 'Bloquer ce joueur'}
          onClick={blockPlayer}
        />
        <Item
          icon={['M4 21V4a1 1 0 011-1h11l-2 4 2 4H5', 'M4 21h2']}
          label="Signaler"
          danger
          onClick={() => { onReport(); onClose() }}
        />
      </div>

      {/* toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', borderRadius: 10, background: T.elevated, border: `1px solid ${T.lineStrong}`, fontFamily: T.mono, fontSize: 11, color: T.cyan, letterSpacing: '0.08em', zIndex: 400, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          {toast}
        </div>
      )}
    </>
  )
}
