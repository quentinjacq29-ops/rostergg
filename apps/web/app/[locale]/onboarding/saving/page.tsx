'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { Link, useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ONB_STEPS_V2, RANK_COLORS } from '@/lib/constants'

// Slots de l'étape Disponibilités (cf. OnbStep7Availability)
const SLOTS = ['17h', '19h', '21h', '23h', '01h', '03h']

const INTENT_LABEL: Record<string, string> = {
  duo: 'DUO',
  team: 'ÉQUIPE',
  coaching: 'COACHING',
}

type RecapChip = { label: string; color?: string }

// ── Récap construit depuis le localStorage onboarding, AVANT qu'il soit effacé ──
function buildRecap(): RecapChip[] {
  if (typeof window === 'undefined') return []
  const chips: RecapChip[] = []
  const get = (k: string) => localStorage.getItem(k)

  // 1. Rôles — rôle principal + 1er rôle recherché (ex : "MID + JNG")
  const mainRole = get('onb_main_role')
  let lookingFirst: string | null = null
  try {
    const arr = JSON.parse(get('onb_looking_for_roles') ?? 'null')
    if (Array.isArray(arr) && arr.length) lookingFirst = String(arr[0])
  } catch { /* ignore */ }
  if (mainRole) {
    chips.push({ label: lookingFirst ? `${mainRole} + ${lookingFirst}` : mainRole, color: '#00e0ff' })
  }

  // 2. Rang (ex : "GOLD II") — couleur sémantique selon le tier
  try {
    const riot = JSON.parse(get('onb_riot') ?? 'null') as { tier?: string | null; rank?: string | null } | null
    if (riot?.tier) {
      const tier = riot.tier.toUpperCase()
      chips.push({ label: riot.rank ? `${tier} ${riot.rank}` : tier, color: RANK_COLORS[tier] ?? 'var(--diamond)' })
    }
  } catch { /* ignore */ }

  // 3. Langues (ex : "FR · EN")
  try {
    const langs = JSON.parse(get('onb_langs') ?? 'null')
    if (Array.isArray(langs) && langs.length) {
      chips.push({ label: langs.map((l: string) => l.toUpperCase()).join(' · ') })
    }
  } catch { /* ignore */ }

  // 4. Intentions — goals si l'étape Style existe, sinon l'intent
  let intentChip: RecapChip | null = null
  try {
    const styles = JSON.parse(get('onb_styles') ?? 'null') as { goals?: string[] } | null
    if (styles?.goals?.length) {
      intentChip = { label: styles.goals.map(g => g.toUpperCase()).join(' · '), color: 'var(--gold)' }
    }
  } catch { /* ignore */ }
  if (!intentChip) {
    const intent = get('onb_intent')
    if (intent && INTENT_LABEL[intent]) intentChip = { label: INTENT_LABEL[intent], color: 'var(--gold)' }
  }
  if (intentChip) chips.push(intentChip)

  // 5. Créneau (ex : "21H–01H") — amplitude des slots cochés
  try {
    const avail = JSON.parse(get('onb_availability') ?? 'null') as Array<{ slot: number }> | null
    if (Array.isArray(avail) && avail.length) {
      const slots = avail.map(a => a.slot).filter(s => s >= 0 && s < SLOTS.length)
      if (slots.length) {
        const min = Math.min(...slots), max = Math.max(...slots)
        const label = (min === max ? SLOTS[min] : `${SLOTS[min]}–${SLOTS[max]}`).toUpperCase()
        chips.push({ label })
      }
    }
  } catch { /* ignore */ }

  return chips
}

async function fetchMatchCount(): Promise<number | null> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase.rpc('duo_feed', { p_user_id: user.id, p_role_filters: null, p_limit: 40, p_offset: 0 })
    if (error || !data) return null
    return (data as unknown[]).length
  } catch {
    return null
  }
}

const SAVING_STEPS = ['Compte Riot vérifié', 'Champion pool analysé', 'Créneaux calculés', 'Matchs en cours de recherche']
const Check = ({ s = 12 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#00ff9d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
)

function SavingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dest = (searchParams.get('dest') ?? '/duo') as '/'

  const [phase, setPhase] = useState<'saving' | 'finish' | 'error'>('saving')
  const [doneSteps, setDoneSteps] = useState(0)
  const [recap, setRecap] = useState<RecapChip[]>([])
  const [matchCount, setMatchCount] = useState<number | null>(null)
  const ctaRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    // Capture le récap AVANT toute écriture/effacement du localStorage
    setRecap(buildRecap())

    // Checklist séquentielle (cosmétique, rythme l'attente) : 1ère à +300ms puis +420ms
    const stepTimers = SAVING_STEPS.map((_, i) =>
      setTimeout(() => setDoneSteps(d => Math.max(d, i + 1)), 300 + i * 420)
    )

    let cancelled = false

    async function saveAll() {
      // 1. Link Riot account (now authenticated)
      const riotRaw = localStorage.getItem('onb_riot')
      if (riotRaw) {
        const riot = JSON.parse(riotRaw) as {
          gameName: string; tagLine: string; platform: string;
          puuid?: string; tier?: string; rank?: string; lp?: number; level?: number
        }
        if (riot.gameName && riot.tagLine) {
          await fetch('/api/riot/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameName: riot.gameName, tagLine: riot.tagLine, platform: riot.platform ?? 'euw1' }),
          })
        }
      }

      // 2. Save matching prefs: languages
      const langs = localStorage.getItem('onb_langs')
      if (langs) {
        await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 3, data: { languages: JSON.parse(langs) } }) })
      }

      // 3. Save roles + playstyle/goals (fusionnés à l'étape 04 « Rôle & style »)
      const mainRole = localStorage.getItem('onb_main_role')
      const secondaryRole = localStorage.getItem('onb_secondary_role') || null
      let playstyles: string[] | undefined
      let goals: string[] | undefined
      try {
        const s = JSON.parse(localStorage.getItem('onb_styles') ?? 'null') as { playstyles?: string[]; goals?: string[] } | null
        if (s) { playstyles = s.playstyles; goals = s.goals }
      } catch { /* ignore */ }
      if (mainRole) {
        await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 4, data: { main_role: mainRole, secondary_role: secondaryRole || null, playstyles, goals } }) })
      }

      // 4. Save availability
      const availRaw = localStorage.getItem('onb_availability')
      if (availRaw) {
        await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 8, data: { availability: JSON.parse(availRaw) } }) })
      }

      // 5. Save team prefs (parcours team uniquement)
      const intent = localStorage.getItem('onb_intent')
      const teamPrefsRaw = localStorage.getItem('onb_team_prefs')
      if (intent === 'team' && teamPrefsRaw) {
        await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 'team', data: { team_prefs: JSON.parse(teamPrefsRaw) } }) })
      }

      // 6. Clear onboarding data
      const keys = ['onb_riot', 'onb_intent', 'onb_main_role', 'onb_secondary_role', 'onb_champion_pool', 'onb_langs', 'onb_styles', 'onb_team_prefs', 'onb_availability']
      keys.forEach(k => localStorage.removeItem(k))
    }

    ;(async () => {
      // min ~1.2s d'affichage anti-flash (cf. handoff §4.1)
      const minDisplay = new Promise(res => setTimeout(res, 1200))
      try {
        await Promise.all([saveAll(), minDisplay])
        const count = await fetchMatchCount()
        if (cancelled) return
        setMatchCount(count)
        setPhase('finish')
      } catch {
        if (!cancelled) setPhase('error')
      }
    })()

    return () => { cancelled = true; stepTimers.forEach(clearTimeout) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Focus le CTA à l'apparition du finish (a11y, cf. handoff §4.6)
  useEffect(() => {
    if (phase === 'finish') ctaRef.current?.focus()
  }, [phase])

  const total = ONB_STEPS_V2.length

  return (
    <div className="onb-shell" style={{ width: '100%', height: '100dvh', display: 'flex', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>

      {/* ── Rail gauche (desktop only — masqué ≤880px par .onb-rail) ── */}
      <aside className="onb-rail" style={{ width: 340, flexShrink: 0, height: '100%', boxSizing: 'border-box', position: 'relative', overflow: 'hidden', background: 'linear-gradient(165deg, var(--surface), var(--void))', borderRight: '1px solid var(--line)', padding: '38px 32px', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', top: -80, left: -60, width: 340, height: 340, background: 'radial-gradient(circle, rgba(0,224,255,0.11), transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, right: -80, width: 320, height: 320, background: 'radial-gradient(circle, rgba(139,92,246,0.11), transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(150deg, var(--surface), var(--void))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1), 0 0 20px rgba(0,224,255,0.27)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
              <path d="M9 9 L20 24 L9 39" stroke="var(--cyan)" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M39 9 L28 24 L39 39" stroke="var(--violet)" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="24" cy="24" r="4.6" fill="var(--cyan)" />
            </svg>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '0.04em', color: 'var(--text)' }}>
            ROSTER<span style={{ color: 'var(--cyan)' }}>GG</span>
          </div>
        </div>
        <div style={{ position: 'relative', fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-dim)', letterSpacing: '0.24em', marginBottom: 18 }}>◢ CRÉATION DU PROFIL</div>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 13 }}>
          {ONB_STEPS_V2.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, border: '2px solid var(--live)', background: 'rgba(0,255,157,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check />
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, letterSpacing: '0.05em', color: 'var(--live)' }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative', height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, var(--cyan), var(--violet))', boxShadow: '0 0 10px var(--cyan)' }} />
        </div>
        <div style={{ position: 'relative', fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-mute)', letterSpacing: '0.14em', marginTop: 10 }}>{total} / {total} · TERMINÉ</div>
      </aside>

      {/* ── Contenu centré ── */}
      <main style={{ flex: 1, minWidth: 0, height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40, overflowY: 'auto', backgroundImage: 'radial-gradient(900px 560px at 50% 32%, rgba(0,224,255,0.08), transparent 60%)' }}>

        {phase === 'error' ? (
          <div>
            <p style={{ color: 'var(--rose)', marginBottom: 16 }}>Une erreur est survenue pendant la sauvegarde. Réessaie.</p>
            <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, var(--cyan), var(--violet))', color: '#001018', fontFamily: 'var(--font-display)', fontSize: 13, cursor: 'pointer', letterSpacing: '0.1em' }}>
              Réessayer
            </button>
          </div>
        ) : phase === 'saving' ? (
          /* ═══ ÉTAT 1 — ON CONSTRUIT TON PROFIL ═══ */
          <div role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="sv-loader" style={{ width: 104, height: 104, position: 'relative', borderRadius: '50%', marginBottom: 30 }}>
              <span className="sv-loader-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 0deg, var(--cyan), var(--violet), transparent 78%)' }} />
              <span style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: 'var(--bg)' }} />
            </div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4vw, 44px)', letterSpacing: '0.01em' }}>ON CONSTRUIT TON PROFIL</h2>
            <p style={{ margin: '14px auto 0', fontSize: 16, color: 'var(--text-dim)', maxWidth: 460, lineHeight: 1.6 }}>
              On classe tes champions, on calcule tes créneaux et on cherche déjà tes premiers matchs…
            </p>
            <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 11, textAlign: 'left' }}>
              {SAVING_STEPS.map((label, i) => {
                const done = i < doneSteps
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.06em', color: done ? 'var(--text-dim)' : 'var(--text-mute)', opacity: done ? 1 : 0.45, transition: 'opacity 0.3s, color 0.3s' }}>
                    <span style={{ width: 20, height: 20, borderRadius: 5, border: `1px solid ${done ? 'rgba(0,255,157,0.5)' : 'var(--line-strong)'}`, background: done ? 'rgba(0,255,157,0.18)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.3s, border-color 0.3s' }}>
                      {done && <Check />}
                    </span>
                    {label}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* ═══ ÉTAT 2 — TON PROFIL EST PRÊT ═══ */
          <div className="sv-finish" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="sv-checkring" style={{ width: 112, height: 112, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 30, background: 'rgba(0,255,157,0.14)', border: '1px solid rgba(0,255,157,0.4)' }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#00ff9d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h2 className="sv-rise sv-d1" style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4vw, 44px)', letterSpacing: '0.01em' }}>TON PROFIL EST PRÊT</h2>
            <p className="sv-rise sv-d2" style={{ margin: '14px auto 0', fontSize: 16, color: 'var(--text-dim)', maxWidth: 460, lineHeight: 1.6 }}>
              {matchCount && matchCount > 0
                ? <>On a déjà trouvé <b style={{ color: 'var(--text)' }}>{matchCount} duo{matchCount > 1 ? 's' : ''} compatible{matchCount > 1 ? 's' : ''}</b> qui jouent à tes horaires.</>
                : <>Ton profil est en ligne. Découvre les joueurs compatibles avec tes critères.</>}
            </p>
            {recap.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, justifyContent: 'center', margin: '28px 0 32px', maxWidth: 560 }}>
                {recap.map((c, i) => (
                  <span
                    key={i}
                    className={`sv-rise sv-chip-${i}`}
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
                      padding: '9px 15px', borderRadius: 999,
                      color: c.color ?? 'var(--text-dim)',
                      border: `1px solid ${c.color ? `color-mix(in srgb, ${c.color} 33%, transparent)` : 'var(--line-strong)'}`,
                    }}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
            )}
            <Link ref={ctaRef} href={dest} className="sv-rise sv-cta" style={{ textDecoration: 'none' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '18px 44px', borderRadius: 13, background: 'linear-gradient(135deg, var(--cyan), var(--violet))', color: '#001018', fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, boxShadow: '0 16px 40px -14px var(--cyan)' }}>
                Découvrir mes duos
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#001018" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
            </Link>
          </div>
        )}
      </main>

      <style>{`
        @keyframes sv-spin { to { transform: rotate(360deg); } }
        .sv-loader-ring { animation: sv-spin 1s linear infinite; }
        @keyframes sv-pop { from { transform: scale(.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes sv-rise { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .sv-loader-ring { animation: none; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .sv-checkring { animation: sv-pop .5s cubic-bezier(.2,1.3,.4,1) both; }
          .sv-rise { animation: sv-rise .5s ease both; }
          .sv-d1 { animation-delay: .12s; }
          .sv-d2 { animation-delay: .2s; }
          .sv-chip-0 { animation-delay: .28s; }
          .sv-chip-1 { animation-delay: .34s; }
          .sv-chip-2 { animation-delay: .40s; }
          .sv-chip-3 { animation-delay: .46s; }
          .sv-chip-4 { animation-delay: .52s; }
          .sv-cta { animation-delay: .58s; }
        }
      `}</style>
    </div>
  )
}

export default function SavingPage() {
  return <Suspense><SavingContent /></Suspense>
}
