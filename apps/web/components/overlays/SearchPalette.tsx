'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const T = {
  surface: '#0f121c', elevated: '#161a26',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6',
  body: 'var(--font-body)', mono: 'var(--font-mono)',
}

const CLASS_COLORS: Record<string, string> = {
  assassin: '#ff5577', fighter: '#ff8a3d', mage: '#7c5cff',
  marksman: '#ffd166', support: '#3ddc97', tank: '#5fa8ff',
}

type Player  = { id: string; displayName: string | null; gameName: string | null; platform: string | null; role: string | null; rank: string | null }
type Team    = { id: string; name: string; tag: string; crest: { c1?: string; c2?: string } | null }
type Champion = { id: string; name: string; cls: string }
type Results  = { players: Player[]; teams: Team[]; champions: Champion[] }

type Props = { onClose: () => void; locale?: string }

export default function SearchPalette({ onClose, locale = 'fr' }: Props) {
  const router  = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<Results>({ players: [], teams: [], champions: [] })
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>()

  useEffect(() => { inputRef.current?.focus() }, [])

  // flatten all results for keyboard nav
  const flat = [
    ...results.players.map(p => ({ type: 'player' as const, item: p })),
    ...results.teams.map(t   => ({ type: 'team'   as const, item: t })),
    ...results.champions.map(c => ({ type: 'champ' as const, item: c })),
  ]

  const search = useCallback((q: string) => {
    if (q.length < 2) { setResults({ players: [], teams: [], champions: [] }); return }
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(data => { setResults(data); setSelected(0) })
      .finally(() => setLoading(false))
  }, [])

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 200)
  }

  function navigate(idx: number) {
    const f = flat[idx]
    if (!f) return
    if (f.type === 'player') {
      const p = f.item as Player
      const gn = p.gameName ?? p.displayName ?? ''
      router.push(`/${locale}/u/${encodeURIComponent(gn)}/EUW`)
    } else if (f.type === 'team') {
      router.push(`/${locale}/teams/${(f.item as Team).id}`)
    }
    onClose()
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter')     navigate(selected)
    if (e.key === 'Escape')    onClose()
  }

  const hasResults = flat.length > 0

  return (
    <>
      {/* scrim */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,5,9,0.66)', backdropFilter: 'blur(2px)', zIndex: 299 }} onClick={onClose} />

      {/* palette */}
      <div style={{
        position: 'fixed', top: 132, left: '50%', transform: 'translateX(-50%)',
        width: 640, maxHeight: 580, borderRadius: 18, overflow: 'hidden',
        background: T.elevated, border: `1px solid ${T.lineStrong}`,
        boxShadow: '0 40px 90px -20px rgba(0,0,0,0.85)',
        display: 'flex', flexDirection: 'column', zIndex: 300,
      }}>
        {/* input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', borderBottom: `1px solid ${T.line}` }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={T.cyan} strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <input
            ref={inputRef}
            value={query}
            onChange={onInput}
            onKeyDown={onKey}
            placeholder="Joueurs, équipes, champions…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: T.body, fontSize: 17, color: T.text }}
          />
          <kbd style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim, padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.line}` }}>ESC</kbd>
        </div>

        {/* results */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 6px' }}>
          {loading && <div style={{ padding: '20px', textAlign: 'center', fontFamily: T.mono, fontSize: 11, color: T.textMute }}>RECHERCHE…</div>}

          {!loading && query.length >= 2 && !hasResults && (
            <div style={{ padding: '20px', textAlign: 'center', fontFamily: T.mono, fontSize: 11, color: T.textMute }}>AUCUN RÉSULTAT</div>
          )}

          {results.players.length > 0 && (
            <Group label="JOUEURS" count={results.players.length}>
              {results.players.map((p, i) => (
                <Row
                  key={p.id} selected={selected === i}
                  name={p.displayName ?? p.gameName ?? '—'}
                  meta={[p.role, p.rank, p.platform?.toUpperCase()].filter(Boolean).join(' · ')}
                  kind="JOUEUR" accent={T.cyan}
                  initials={(p.displayName ?? p.gameName ?? '?').slice(0, 2).toUpperCase()}
                  color={T.cyan}
                  onHover={() => setSelected(i)}
                  onClick={() => navigate(i)}
                />
              ))}
            </Group>
          )}

          {results.teams.length > 0 && (
            <Group label="ÉQUIPES" count={results.teams.length}>
              {results.teams.map((t, i) => {
                const idx = results.players.length + i
                const c1 = t.crest?.c1 ?? T.violet
                return (
                  <Row
                    key={t.id} selected={selected === idx}
                    name={t.name} meta={`TAG ${t.tag}`}
                    kind="ÉQUIPE" accent={T.violet}
                    initials={t.tag.slice(0, 2).toUpperCase()}
                    color={c1}
                    onHover={() => setSelected(idx)}
                    onClick={() => navigate(idx)}
                  />
                )
              })}
            </Group>
          )}

          {results.champions.length > 0 && (
            <Group label="CHAMPIONS" count={results.champions.length}>
              {results.champions.map((c, i) => {
                const idx = results.players.length + results.teams.length + i
                const color = CLASS_COLORS[c.cls] ?? T.textDim
                return (
                  <Row
                    key={c.id} selected={selected === idx}
                    name={c.name} meta={c.cls.toUpperCase()}
                    kind="CHAMPION" accent={color}
                    initials={c.name.slice(0, 2).toUpperCase()}
                    color={color}
                    onHover={() => setSelected(idx)}
                    onClick={() => { onClose() }}
                  />
                )
              })}
            </Group>
          )}
        </div>

        {/* footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 20px', borderTop: `1px solid ${T.line}`, background: T.surface }}>
          {([['↑↓', 'naviguer'], ['↵', 'ouvrir'], ['esc', 'fermer']] as [string,string][]).map(([k, l]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <kbd style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, padding: '2px 6px', borderRadius: 5, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.line}` }}>{k}</kbd>
              <span style={{ fontFamily: T.body, fontSize: 11.5, color: T.textMute }}>{l}</span>
            </span>
          ))}
          <span style={{ marginLeft: 'auto', fontFamily: T.mono, fontSize: 9.5, color: T.textMute, letterSpacing: '0.1em' }}>ROSTERGG SEARCH</span>
        </div>
      </div>
    </>
  )
}

function Group({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px' }}>
        <span style={{ fontFamily: T.mono, fontSize: 9.5, color: T.textMute, letterSpacing: '0.2em' }}>{label}</span>
        <span style={{ fontFamily: T.mono, fontSize: 9.5, color: T.textMute }}>{count}</span>
      </div>
      {children}
    </div>
  )
}

function Row({ name, meta, kind, accent, initials, color, selected, onHover, onClick }: {
  name: string; meta: string; kind: string; accent: string
  initials: string; color: string; selected: boolean
  onHover: () => void; onClick: () => void
}) {
  return (
    <div
      onMouseEnter={onHover}
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 16px', borderRadius: 11, cursor: 'pointer', background: selected ? `${T.cyan}14` : 'transparent', border: `1px solid ${selected ? T.cyan + '44' : 'transparent'}` }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}22`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: T.mono, fontSize: 11, fontWeight: 700, color }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: T.body, fontSize: 14, fontWeight: 600, color: T.text }}>{name}</div>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: accent, letterSpacing: '0.08em', marginTop: 2 }}>{meta}</div>
      </div>
      <span style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.1em', padding: '3px 7px', borderRadius: 6, border: `1px solid ${T.line}` }}>{kind}</span>
      {selected && <kbd style={{ fontFamily: T.mono, fontSize: 11, color: T.cyan, padding: '3px 7px', borderRadius: 6, background: `${T.cyan}1a`, border: `1px solid ${T.cyan}44` }}>↵</kbd>}
    </div>
  )
}
