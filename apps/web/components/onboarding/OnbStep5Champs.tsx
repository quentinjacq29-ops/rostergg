'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import OnbShell from './OnbShell'
import OnbPrefill from './OnbPrefill'
import { CHAMP_CLASS_COLORS, ROLES } from '@/lib/constants'
import { CHAMPIONS_STATIC, type ChampionStatic } from '@/lib/champions-data'
import { ROLE_PATHS } from './OnbStep3Role'

function tag(name: string) {
  const parts = name.replace(/[^a-zA-Z ]/g, '').split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

type ChampPool = Record<string, string[]> // { MID: ['Ahri', 'Zed'], ADC: ['Jinx'] }

type Props = { locale: string; step: number; steps?: readonly string[]; onDone?: () => void }

const DDVERSION = '15.10.1'

export default function OnbStep5Champs({ locale, step, steps, onDone }: Props) {
  const [champs, setChamps] = useState<ChampionStatic[]>(CHAMPIONS_STATIC)
  const [ddVersion, setDdVersion] = useState(DDVERSION)
  const [mainRole, setMainRole] = useState('MID')
  const [secondaryRole, setSecondaryRole] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('main')
  const [pool, setPool] = useState<ChampPool>({})
  const [prefillNames, setPrefillNames] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [imgFailed, setImgFailed] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Read roles + Riot data from localStorage
    try {
      const storedMain = localStorage.getItem('onb_main_role') ?? 'MID'
      const storedSecondary = localStorage.getItem('onb_secondary_role') || null
      setMainRole(storedMain)
      setSecondaryRole(storedSecondary || null)

      const riotData = JSON.parse(localStorage.getItem('onb_riot') ?? '{}')
      if (riotData?.topChamps?.length > 0) {
        // Pre-fill all top champs into the main role pool
        setPool({ [storedMain]: riotData.topChamps, ...(storedSecondary ? { [storedSecondary]: [] } : {}) })
        setPrefillNames(riotData.topChamps.slice(0, 3))
      } else {
        setPool({ [storedMain]: [], ...(storedSecondary ? { [storedSecondary]: [] } : {}) })
      }
    } catch { /* ignore */ }

    // Try live champion list
    fetch('/api/champions')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: Array<ChampionStatic & { version: string }>) => {
        if (data.length > 0) { setChamps(data); setDdVersion(data[0].version) }
      })
      .catch(() => {})
  }, [])

  const currentRole = activeTab === 'main' ? mainRole : (secondaryRole ?? mainRole)
  const currentPool = pool[currentRole] ?? []

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? champs.filter(c => c.name.toLowerCase().includes(q)) : champs
  }, [champs, query])

  function toggle(id: string) {
    setPool(prev => {
      const cur = prev[currentRole] ?? []
      return { ...prev, [currentRole]: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] }
    })
  }

  function markImgFailed(id: string) {
    setImgFailed(prev => new Set(prev).add(id))
  }

  async function handleContinue() {
    // Validate: if secondary role exists, its pool must not be empty
    if (secondaryRole && (pool[secondaryRole] ?? []).length === 0) {
      setActiveTab('secondary')
      setError(`Ajoute au moins un champion pour ton rôle secondaire ${ROLES[secondaryRole as keyof typeof ROLES]?.name ?? secondaryRole}.`)
      return
    }
    setError(null)
    fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 6, data: { champion_pool: pool } }),
    }).catch(() => {})
    // Store for downstream use
    if (typeof window !== 'undefined') localStorage.setItem('onb_champion_pool', JSON.stringify(pool))
    if (onDone) onDone(); else router.push(`/onboarding/${step + 1}`)
  }

  const hasTabs = Boolean(secondaryRole)
  const tabs = hasTabs
    ? [{ id: 'main', role: mainRole, label: 'PRINCIPAL' }, { id: 'secondary', role: secondaryRole!, label: 'SECONDAIRE' }]
    : [{ id: 'main', role: mainRole, label: 'PRINCIPAL' }]

  const prefillLabel = prefillNames.map(id => champs.find(c => c.id === id)?.name ?? id).join(', ')

  return (
    <OnbShell
      step={step}
      steps={steps}
      title="TON CHAMPION POOL"
      sub="Tes champions maîtrisés, séparés par rôle. On les a importés de Riot — ajuste chaque pool à ta guise."
      onContinue={handleContinue}
      locale={locale}
    >
      {prefillLabel && (
        <OnbPrefill>Importés depuis ta maîtrise Riot, classés par rôle. Bascule entre tes rôles ci-dessous.</OnbPrefill>
      )}

      {/* Validation error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, marginBottom: 16, background: 'rgba(255,61,110,0.08)', border: '1px solid rgba(255,61,110,0.25)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /><path d="M12 9v4M12 17h.01" />
          </svg>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--rose)' }}>{error}</span>
        </div>
      )}

      {/* Role tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        {tabs.map(({ id, role, label }) => {
          const on = activeTab === id
          const c = ROLES[role as keyof typeof ROLES]?.c ?? 'var(--cyan)'
          const count = (pool[role] ?? []).length
          return (
            <button key={id} onClick={() => { setActiveTab(id); setQuery('') }} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 11, padding: '13px 16px', borderRadius: 13, cursor: 'pointer', background: on ? `color-mix(in srgb, ${c} 9%, transparent)` : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? c + '66' : 'var(--line)'}`, boxShadow: on ? `0 0 16px ${c}22` : 'none', transition: 'all 0.15s ease' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" style={{ color: on ? c : 'var(--text-dim)', flexShrink: 0 }}>{ROLE_PATHS[role]}</svg>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: on ? 'var(--text)' : 'var(--text-dim)', letterSpacing: '0.03em' }}>{ROLES[role as keyof typeof ROLES]?.name ?? role}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: on ? c : 'var(--text-mute)', letterSpacing: '0.12em' }}>{label} · {count}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 46, padding: '0 16px', borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', marginBottom: 18 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
        </svg>
        <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder={`Rechercher un champion ${ROLES[currentRole as keyof typeof ROLES]?.name ?? ''}…`} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text)' }} />
        {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 0, display: 'flex' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg></button>}
      </div>

      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em' }}>
        POOL {(ROLES[currentRole as keyof typeof ROLES]?.name ?? currentRole).toUpperCase()} · {currentPool.length}
      </label>

      {/* Champion grid */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        {filtered.map(c => {
          const on = currentPool.includes(c.id)
          const color = CHAMP_CLASS_COLORS[c.cls] ?? '#9aa2bf'
          const showImg = !imgFailed.has(c.id)
          return (
            <div key={c.id} onClick={() => toggle(c.id)} title={c.name} style={{ position: 'relative', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 58, height: 58, borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${on ? color : color + '44'}`, boxShadow: on ? `0 0 0 2px ${color}, 0 0 14px ${color}55` : 'none', background: `linear-gradient(160deg, ${color}22, var(--elevated))`, opacity: on ? 1 : 0.6, transition: 'box-shadow 0.15s, border-color 0.15s, opacity 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text)', letterSpacing: '0.04em' }}>{tag(c.name)}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{c.cls.slice(0, 3)}</span>
                </div>
                {showImg && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/champions/icon/${c.id}`} alt={c.name} width={58} height={58} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'relative', zIndex: 1 }} onError={() => markImgFailed(c.id)} />
                )}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, color: on ? color : 'var(--text-mute)', textAlign: 'center', letterSpacing: '0.04em', maxWidth: 58, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
              {on && (
                <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 8px ${color}`, zIndex: 2 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="4" strokeLinecap="round"><path d="M5 12l5 5L20 6" /></svg>
                </span>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && query && <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mute)', margin: 0 }}>Aucun champion &quot;{query}&quot; trouvé.</p>}
      </div>
    </OnbShell>
  )
}
