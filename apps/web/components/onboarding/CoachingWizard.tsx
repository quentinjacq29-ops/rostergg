'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import CoachShell, { ROSE, ROSE2 } from './CoachShell'
import OnbPrefill from './OnbPrefill'
import { ROLES, RANK_COLORS, LANGS, CHAMP_CLASS_COLORS } from '@/lib/constants'
import { PLATFORM_LABELS, TIER_COLORS } from '@/lib/riot/assets'
import { CHAMPIONS_STATIC } from '@/lib/champions-data'
import { RoleGrid, ROLE_PATHS } from './OnbStep3Role'

// ── helpers ──────────────────────────────────────────────────────────────────

function Label({ children, mt = 0 }: { children: React.ReactNode; mt?: number }) {
  return (
    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em', display: 'block', marginTop: mt }}>
      {children}
    </label>
  )
}

function Chip({ children, active, accent = ROSE, onClick }: { children: React.ReactNode; active: boolean; accent?: string; onClick: () => void }) {
  return (
    <span onClick={onClick} style={{ padding: '10px 16px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', transition: 'all .14s', background: active ? `${accent}1f` : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? accent + '77' : 'var(--line)'}`, color: active ? accent : 'var(--text-dim)' }}>
      {children}
    </span>
  )
}

function BigChoice({ icon, title, desc, active, accent = ROSE, radio = false, onClick }: { icon: React.ReactNode; title: string; desc: string; active: boolean; accent?: string; radio?: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 16, cursor: 'pointer', background: active ? `color-mix(in srgb, ${accent} 11%, transparent)` : 'rgba(255,255,255,0.025)', border: `1px solid ${active ? accent + '66' : 'var(--line)'}`, boxShadow: active ? `0 8px 22px -12px ${accent}` : 'none', transition: 'all 0.15s ease' }}>
      <div style={{ width: 50, height: 50, borderRadius: 13, flexShrink: 0, background: active ? `${accent}1f` : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? accent + '55' : 'var(--line)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? accent : 'var(--text-dim)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, color: 'var(--text)', letterSpacing: '0.02em' }}>{title}</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-dim)', marginTop: 3 }}>{desc}</div>
      </div>
      <span style={{ width: 24, height: 24, borderRadius: radio ? '50%' : 7, flexShrink: 0, border: `1.5px solid ${active ? accent : 'var(--line-strong)'}`, background: active && !radio ? accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {active && (radio
          ? <span style={{ width: 11, height: 11, borderRadius: '50%', background: accent, display: 'block' }} />
          : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1a0408" strokeWidth="4" strokeLinecap="round"><path d="M5 12l5 5L20 6" /></svg>)}
      </span>
    </div>
  )
}

const RANK_LADDER = [
  ['iron', 'IRON'], ['bronze', 'BRONZE'], ['silver', 'SILVER'], ['gold', 'GOLD'],
  ['platinum', 'PLAT'], ['emerald', 'EMER'], ['diamond', 'DIAM'], ['master', 'MASTER'],
  ['gm', 'GM'], ['challenger', 'CHALL'],
] as const

function RankLadder({ value, onPick, dimBelow }: { value: string; onPick: (v: string) => void; dimBelow?: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
      {RANK_LADDER.map(([key, label], i) => {
        const on = value === key
        const c = RANK_COLORS[key.toUpperCase()] ?? '#9aa2bf'
        const faded = dimBelow != null && i < dimBelow
        return (
          <button key={key} onClick={() => onPick(key)} style={{ flex: 1, padding: '13px 0 11px', borderRadius: 10, cursor: 'pointer', textAlign: 'center', transition: 'all .14s', background: on ? `${c}26` : faded ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.04)', border: `1px solid ${on ? c : 'var(--line)'}`, boxShadow: on ? `0 0 16px ${c}55` : 'none', opacity: faded ? 0.4 : 1 }}>
            <div style={{ width: 16, height: 16, margin: '0 auto', borderRadius: 4, transform: 'rotate(45deg)', background: on ? c : 'transparent', border: `2px solid ${c}`, boxShadow: on ? `0 0 8px ${c}` : 'none' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.04em', color: on ? c : 'var(--text-mute)', marginTop: 7 }}>{label}</div>
          </button>
        )
      })}
    </div>
  )
}

const LANG_COLORS: Record<string, string> = { fr: '#5b8def', en: '#e85a5a', es: '#ffb547', de: '#3ddc97', it: '#8b5cf6', pt: '#ff6a4d' }

const FOCUS_GROUPS: Array<[string, string[]]> = [
  ['MACRO & VISION', ['Wave management', 'Roaming', 'Vision & wards', 'Contrôle objectifs', 'Tempo', 'Macro de fin']],
  ['MÉCANIQUE', ['CS / last hit', 'Combos', 'Positioning', 'Trading', 'Temps de réaction']],
  ['MENTAL & RÉGULARITÉ', ['Tilt & mental', 'Consistance', 'Communication', 'Confiance']],
]

const MATCHUP_PAINS = ['Je me fais poke à mort', 'All-in niveau 2-6', 'Roam, je suis en retard', 'Je sais pas trade', 'Side lane / split', 'Sa mobilité me gap']

const NEMESIS_POOL = ['zed', 'yasuo', 'irelia', 'kayn', 'briar', 'syndra', 'ahri', 'vex']

// ── State types ───────────────────────────────────────────────────────────────

type WizardState = {
  platform: string
  gameName: string
  tagLine: string
  riotVerified: boolean
  intent: string
  langs: Set<string>
  role: string
  multiRole: boolean
  currentRank: string
  goalRank: string
  horizon: string
  focusItems: Set<string>
  nemesis: string | null
  otherNemesis: Set<string>
  pains: Set<string>
  formats: Set<string>
  rythme: string
}

// ── STEP 1 — Riot ─────────────────────────────────────────────────────────────

function StepRiot({ state, setState, nav }: { state: WizardState; setState: (p: Partial<WizardState>) => void; nav: NavProps }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const PLATFORMS = Object.entries(PLATFORM_LABELS).slice(0, 5)

  async function verify() {
    if (!state.gameName.trim() || !state.tagLine.trim()) return
    setLoading(true); setError(null)
    const res = await fetch('/api/riot/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameName: state.gameName, tagLine: state.tagLine, platform: state.platform }) })
    const data = await res.json() as { error?: string; tier?: string; rank?: string; topChamps?: string[] }
    if (!res.ok) { setError(data.error ?? 'Compte introuvable.') }
    else {
      setState({ riotVerified: true })
      if (typeof window !== 'undefined') localStorage.setItem('onb_riot', JSON.stringify({ gameName: state.gameName, tagLine: state.tagLine, platform: state.platform, ...data }))
    }
    setLoading(false)
  }

  return (
    <CoachShell {...nav} step={1} title="ON COMMENCE PAR TON RIOT ID" sub="On lie ton compte d'abord : rang, historique et maîtrise importés. Les étapes suivantes arrivent pré-remplies — tu n'as qu'à valider." canNext={state.riotVerified}>
      <Label>MÉTHODE DE LIAISON</Label>
      <div style={{ marginTop: 12, borderRadius: 16, padding: 20, background: `linear-gradient(135deg, ${ROSE}12, transparent)`, border: `1px solid ${ROSE}33` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `${ROSE}1a`, border: `1px solid ${ROSE}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ROSE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /></svg>
          </span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--text)', letterSpacing: '0.02em' }}>Connexion sécurisée via Riot</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-dim)', marginTop: 3 }}>RosterGG ne voit jamais ton mot de passe.</div>
          </div>
        </div>
        <button style={{ width: '100%', marginTop: 16, padding: 15, borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${ROSE}, ${ROSE2})`, color: '#1a0408', fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1a0408" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /></svg>
          Continuer avec Riot (prod)
        </button>
        <div style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-mute)', letterSpacing: '0.06em', textAlign: 'center' }}>
          — ou mode test ci-dessous —
        </div>
      </div>

      {/* Manual test mode */}
      <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 11px', borderRadius: 999, background: 'rgba(255,209,102,0.09)', border: '1px solid rgba(255,209,102,0.27)' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--gold)', letterSpacing: '0.12em' }}>MODE TEST</span>
      </div>
      <Label mt={12}>SERVEUR</Label>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {PLATFORMS.map(([value, label]) => (
          <span key={value} onClick={() => setState({ platform: value, riotVerified: false })} style={{ padding: '9px 16px', borderRadius: 10, cursor: 'pointer', background: state.platform === value ? `${ROSE}1f` : 'rgba(255,255,255,0.04)', border: `1px solid ${state.platform === value ? ROSE + '66' : 'var(--line)'}`, fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.08em', color: state.platform === value ? ROSE : 'var(--text-dim)' }}>{label}</span>
        ))}
      </div>
      <Label mt={18}>RIOT ID</Label>
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: 52, padding: '0 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${state.gameName ? ROSE + '44' : 'var(--line)'}` }}>
          <input type="text" value={state.gameName} onChange={e => setState({ gameName: e.target.value, riotVerified: false })} onKeyDown={e => e.key === 'Enter' && verify()} placeholder="NomInvocateur" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--text)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', height: 52, padding: '0 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--text-dim)' }}>#</span>
          <input type="text" value={state.tagLine} onChange={e => setState({ tagLine: e.target.value, riotVerified: false })} onKeyDown={e => e.key === 'Enter' && verify()} placeholder={PLATFORM_LABELS[state.platform] ?? 'TAG'} maxLength={5} style={{ width: 56, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--text)' }} />
        </div>
        <button onClick={verify} disabled={loading || !state.gameName.trim() || !state.tagLine.trim()} style={{ height: 52, padding: '0 18px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${ROSE}, ${ROSE2})`, color: '#1a0408', fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, opacity: loading || !state.gameName.trim() || !state.tagLine.trim() ? 0.5 : 1, flexShrink: 0 }}>
          {loading ? '…' : 'Vérifier'}
        </button>
      </div>
      {error && <div style={{ marginTop: 12, padding: '11px 15px', borderRadius: 11, background: 'rgba(255,61,110,0.08)', border: '1px solid rgba(255,61,110,0.25)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--rose)' }}>{error}</div>}
      {state.riotVerified && (
        <div style={{ marginTop: 18, borderRadius: 14, padding: 18, background: 'linear-gradient(135deg, rgba(0,255,157,0.06), transparent)', border: '1px solid rgba(0,255,157,0.23)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, var(--surface), var(--elevated))`, border: '2px solid var(--live)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--live)', boxShadow: '0 0 0 3px var(--bg), 0 0 12px rgba(0,255,157,0.3)' }}>
            {state.gameName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, color: 'var(--text)', letterSpacing: '0.02em' }}>{state.gameName.toUpperCase()} <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>#{state.tagLine.toUpperCase()}</span></div>
            <span className="rgg-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--live)', display: 'inline-block', marginRight: 6 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--live)', letterSpacing: '0.14em' }}>COMPTE VÉRIFIÉ</span>
          </div>
        </div>
      )}
    </CoachShell>
  )
}

// ── STEP 2 — Intent ───────────────────────────────────────────────────────────

function StepIntent({ state, setState, nav }: { state: WizardState; setState: (p: Partial<WizardState>) => void; nav: NavProps }) {
  return (
    <CoachShell {...nav} step={2} title="TU CHERCHES QUOI ?" sub="Une seule intention pour cadrer ton parcours. Le coaching a ses propres questions — on ne mélange pas avec le duo/flex.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <BigChoice radio accent="var(--cyan)" active={state.intent === 'duo'} onClick={() => setState({ intent: 'duo' })} title="Trouver un duo" desc="Un partenaire compatible pour ranked solo/duo" icon={<path d="M7 12l-3 3 3 3M17 12l3 3-3 3M14 4l-4 16" />} />
        <BigChoice radio accent="var(--violet)" active={state.intent === 'team'} onClick={() => setState({ intent: 'team' })} title="Rejoindre une équipe" desc="Intégrer un roster à 5 pour la Clash / Flex" icon={<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /></>} />
        <BigChoice radio accent={ROSE} active={state.intent === 'coach'} onClick={() => setState({ intent: 'coach' })} title="Coaching 1v1" desc="Progresser avec un spécialiste de ton rôle" icon={<><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6M16 16l4 4" /></>} />
      </div>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 9, padding: '12px 15px', borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid var(--line)' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-mute)' }}>Coaching et Duo/Flex ont des questions différentes — on ne te fait <b style={{ color: 'var(--text-dim)' }}>qu'un seul parcours</b>.</span>
      </div>
    </CoachShell>
  )
}

// ── STEP 3 — Langues ─────────────────────────────────────────────────────────

function StepLangs({ state, setState, nav }: { state: WizardState; setState: (p: Partial<WizardState>) => void; nav: NavProps }) {
  function toggle(code: string) {
    const next = new Set(state.langs)
    if (next.has(code) && next.size > 1) next.delete(code)
    else next.add(code)
    setState({ langs: next })
  }
  return (
    <CoachShell {...nav} step={3} title="DANS QUELLE LANGUE ?" sub="On te propose en priorité des coachs qui parlent tes langues — pour des sessions vocales fluides.">
      <Label>SÉLECTIONNE TES LANGUES</Label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 14 }}>
        {LANGS.map(({ code, name }) => {
          const on = state.langs.has(code)
          const c = LANG_COLORS[code] ?? ROSE
          return (
            <div key={code} onClick={() => toggle(code)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px', borderRadius: 13, cursor: 'pointer', background: on ? `color-mix(in srgb, ${c} 8%, transparent)` : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? c + '55' : 'var(--line)'}` }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, background: on ? `${c}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${on ? c + '66' : 'var(--line)'}`, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: on ? c : 'var(--text)', letterSpacing: '0.1em', flexShrink: 0 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: c, display: 'inline-block' }} />{code.toUpperCase()}
              </span>
              <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 14, color: on ? 'var(--text)' : 'var(--text-dim)', fontWeight: on ? 600 : 400 }}>{name}</span>
              {on && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6" /></svg>}
            </div>
          )
        })}
      </div>
    </CoachShell>
  )
}

// ── STEP 4 — Rôle à coacher ───────────────────────────────────────────────────

function StepRole({ state, setState, nav }: { state: WizardState; setState: (p: Partial<WizardState>) => void; nav: NavProps }) {
  const hasPrefill = Boolean(state.riotVerified)
  return (
    <CoachShell {...nav} step={4} title="SUR QUEL RÔLE ?" sub="Le rôle que tu veux faire progresser. On te matche avec des coachs spécialistes de ce poste.">
      {hasPrefill && <OnbPrefill>On a détecté <b style={{ color: 'var(--text)' }}>{state.role}</b> comme ton rôle principal. Change si tu veux coacher un autre poste.</OnbPrefill>}
      <RoleGrid selected={state.role} onSelect={(r) => setState({ role: r })} accent={ROSE} />
      <div onClick={() => setState({ multiRole: !state.multiRole })} style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid var(--line)', cursor: 'pointer' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>Ouvrir aux coachs multi-rôles</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-mute)', letterSpacing: '0.06em', marginTop: 3 }}>Élargit le choix au macro game général</div>
        </div>
        <div style={{ width: 44, height: 26, borderRadius: 999, padding: 3, background: state.multiRole ? ROSE : 'rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', boxShadow: state.multiRole ? `0 0 12px ${ROSE}66` : 'none', transition: 'all 0.2s' }}>
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: state.multiRole ? '#1a0408' : 'rgba(255,255,255,0.4)', marginLeft: state.multiRole ? 18 : 0, transition: 'margin 0.2s', flexShrink: 0 }} />
        </div>
      </div>
    </CoachShell>
  )
}

// ── STEP 5 — Niveau & objectif ────────────────────────────────────────────────

function StepGoal({ state, setState, nav }: { state: WizardState; setState: (p: Partial<WizardState>) => void; nav: NavProps }) {
  const ci = RANK_LADDER.findIndex(r => r[0] === state.currentRank)
  const gi = RANK_LADDER.findIndex(r => r[0] === state.goalRank)
  const delta = gi - ci
  const ok = delta > 0
  const curColor = RANK_COLORS[state.currentRank.toUpperCase()] ?? '#9aa2bf'
  const goalColor = RANK_COLORS[state.goalRank.toUpperCase()] ?? '#9aa2bf'
  return (
    <CoachShell {...nav} step={5} title="OÙ TU EN ES, OÙ TU VAS" sub="Ton point de départ et ton objectif réaliste. C'est ce qui cadre le plan du coach et le bon niveau d'expertise." canNext={ok}>
      {state.riotVerified && <OnbPrefill>Ton rang actuel est importé de Riot. Indique juste l'objectif que tu vises.</OnbPrefill>}
      <Label>TON RANG ACTUEL</Label>
      <RankLadder value={state.currentRank} onPick={(v) => setState({ currentRank: v })} />
      <Label mt={26}>TON OBJECTIF</Label>
      <RankLadder value={state.goalRank} onPick={(v) => setState({ goalRank: v })} dimBelow={ci + 1} />
      <div style={{ marginTop: 22, padding: '16px 20px', borderRadius: 16, background: ok ? `linear-gradient(120deg, ${ROSE}14, transparent)` : 'rgba(255,61,110,0.06)', border: `1px solid ${ok ? ROSE + '3a' : 'rgba(255,61,110,0.33)'}`, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: curColor }}>{RANK_LADDER[ci]?.[1] ?? '—'}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-mute)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: goalColor }}>{RANK_LADDER[gi]?.[1] ?? '—'}</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-dim)', textAlign: 'right' }}>
          {ok ? <>Montée de <b style={{ color: 'var(--text)' }}>{delta} palier{delta > 1 ? 's' : ''}</b> sur <b style={{ color: ROSE }}>{state.horizon}</b>.</> : <span style={{ color: 'var(--rose)' }}>Choisis un objectif au-dessus de ton rang actuel.</span>}
        </span>
      </div>
      <Label mt={24}>HORIZON</Label>
      <div style={{ display: 'flex', gap: 9, marginTop: 13 }}>
        {['Ce split', '3 mois', '6 mois', 'Pas pressé'].map(h => <Chip key={h} active={state.horizon === h} onClick={() => setState({ horizon: h })}>{h}</Chip>)}
      </div>
    </CoachShell>
  )
}

// ── STEP 6 — À travailler ─────────────────────────────────────────────────────

function StepImprove({ state, setState, nav }: { state: WizardState; setState: (p: Partial<WizardState>) => void; nav: NavProps }) {
  function toggle(item: string) {
    const next = new Set(state.focusItems)
    next.has(item) ? next.delete(item) : next.add(item)
    setState({ focusItems: next })
  }
  return (
    <CoachShell {...nav} step={6} title="TU VEUX BOSSER QUOI ?" sub="Tes points faibles prioritaires. On les matche aux spécialités déclarées des coachs (wave, roaming, vision…).">
      {FOCUS_GROUPS.map(([head, items]) => (
        <div key={head} style={{ marginBottom: 20 }}>
          <Label>{head}</Label>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 12 }}>
            {items.map(it => <Chip key={it} active={state.focusItems.has(it)} onClick={() => toggle(it)}>{it}</Chip>)}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, padding: '12px 16px', borderRadius: 12, background: `${ROSE}0d`, border: `1px solid ${ROSE}26` }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ROSE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6M16 16l4 4" /></svg>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-dim)' }}>Un matchup précis te détruit&nbsp;? On le cible juste après.</span>
      </div>
    </CoachShell>
  )
}

// ── STEP 7 — Matchup difficile ────────────────────────────────────────────────

function StepMatchup({ state, setState, nav }: { state: WizardState; setState: (p: Partial<WizardState>) => void; nav: NavProps }) {
  function toggleOther(key: string) {
    const next = new Set(state.otherNemesis)
    next.has(key) ? next.delete(key) : next.add(key)
    setState({ otherNemesis: next })
  }
  function togglePain(p: string) {
    const next = new Set(state.pains)
    next.has(p) ? next.delete(p) : next.add(p)
    setState({ pains: next })
  }
  const nem = state.nemesis ? CHAMPIONS_STATIC.find(c => c.id.toLowerCase() === state.nemesis) : null
  const nemColor = nem ? (CHAMP_CLASS_COLORS[nem.cls] ?? ROSE) : ROSE

  return (
    <CoachShell {...nav} step={7} title="CONTRE QUI TU GALÈRES ?" sub="Le matchup qui ruine tes games. On te branche en priorité sur un coach qui le main — celui qui sait exactement comment il te punit.">
      <OnbPrefill>On a pré-sélectionné les champions les plus joués <b style={{ color: 'var(--text)' }}>contre toi</b> ce split. Confirme ton vrai cauchemar.</OnbPrefill>

      {/* Nemesis banner */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '18px 20px', marginBottom: 20, background: nem ? `linear-gradient(110deg, ${nemColor}22, ${nemColor}08 60%, transparent)` : 'rgba(255,255,255,0.025)', border: `1px solid ${nem ? nemColor + '4a' : 'var(--line)'}` }}>
        <div style={{ position: 'absolute', top: -40, right: -20, width: 180, height: 180, background: `radial-gradient(circle, ${nemColor}2e, transparent 65%)`, filter: 'blur(30px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16 }}>
          {nem ? (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 72, height: 72, borderRadius: 14, overflow: 'hidden', border: `2px solid ${nemColor}`, boxShadow: `0 0 18px ${nemColor}99` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/champions/icon/${nem.id}`} alt={nem.name} width={72} height={72} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            </div>
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 14, border: `1.5px dashed var(--line-strong)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-mute)', letterSpacing: '0.1em', textAlign: 'center', lineHeight: 1.4 }}>CHOISIS<br />UN CHAMP</span>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: nemColor, letterSpacing: '0.2em' }}>TON NEMESIS</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)', letterSpacing: '0.02em', marginTop: 4, lineHeight: 1 }}>{nem ? nem.name.toUpperCase() : '—'}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-dim)', marginTop: 5 }}>{nem ? `${nem.cls[0].toUpperCase()}${nem.cls.slice(1)} · le matchup qu'on va casser` : 'Sélectionne-le ci-dessous'}</div>
          </div>
        </div>
      </div>

      <Label>CHOISIS-LE</Label>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        {NEMESIS_POOL.map(key => {
          const champ = CHAMPIONS_STATIC.find(c => c.id.toLowerCase() === key)
          if (!champ) return null
          const isNem = state.nemesis === key
          const isOther = state.otherNemesis.has(key)
          const color = CHAMP_CLASS_COLORS[champ.cls] ?? '#9aa2bf'
          return (
            <div key={key} onClick={() => setState({ nemesis: isNem ? null : key })} title="Clic = nemesis principal" style={{ position: 'relative', cursor: 'pointer', opacity: isNem || isOther ? 1 : 0.5, transition: 'opacity 0.15s' }}>
              <div style={{ width: 58, height: 58, borderRadius: 10, overflow: 'hidden', border: `2px solid ${isNem ? ROSE : isOther ? 'var(--line-strong)' : color + '44'}`, boxShadow: isNem ? `0 0 16px ${ROSE}88` : 'none' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/champions/icon/${champ.id}`} alt={champ.name} width={58} height={58} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
              <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 7.5, color: isNem ? ROSE : 'var(--text-mute)', textAlign: 'center', maxWidth: 58, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{champ.name}</div>
            </div>
          )
        })}
      </div>

      <Label mt={24}>QU'EST-CE QUI EST DUR ?</Label>
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 12 }}>
        {MATCHUP_PAINS.map(p => <Chip key={p} active={state.pains.has(p)} onClick={() => togglePain(p)}>{p}</Chip>)}
      </div>
    </CoachShell>
  )
}

// ── STEP 8 — Format ───────────────────────────────────────────────────────────

function StepFormat({ state, setState, nav }: { state: WizardState; setState: (p: Partial<WizardState>) => void; nav: NavProps }) {
  function toggleFmt(f: string) {
    const next = new Set(state.formats)
    next.has(f) ? next.delete(f) : next.add(f)
    setState({ formats: next })
  }
  const FORMAT_ITEMS = [
    { id: 'vod', title: 'VOD review', desc: 'Le coach décortique tes parties enregistrées, en différé', icon: <><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></> },
    { id: 'live', title: 'Live coaching', desc: 'En vocal pendant que tu joues, corrections en direct', icon: <><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4" /></> },
    { id: 'spar', title: '1v1 / Spar', desc: 'Affronte un spécialiste en lab pour casser ton matchup', icon: <><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6M16 16l4 4" /></> },
  ]
  return (
    <CoachShell {...nav} step={8} title="COMMENT TU PROGRESSES" sub="La façon dont tu veux bosser avec ton coach. On filtre les coachs sur les formats qu'ils proposent." nextLabel="Voir mes coachs" canNext={state.formats.size > 0}>
      <Label>FORMAT DE COACHING</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 13 }}>
        {FORMAT_ITEMS.map(({ id, title, desc, icon }) => (
          <BigChoice key={id} active={state.formats.has(id)} onClick={() => toggleFmt(id)} title={title} desc={desc} icon={icon} accent={ROSE} />
        ))}
      </div>
      <Label mt={26}>RYTHME</Label>
      <div style={{ display: 'flex', gap: 9, marginTop: 13 }}>
        {['Ponctuel', 'Régulier', 'Intensif'].map(r => <Chip key={r} active={state.rythme === r} onClick={() => setState({ rythme: r })}>{r}</Chip>)}
      </div>
    </CoachShell>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

type NavProps = { onBack: () => void; onNext: () => void; onJump: (n: number) => void }

// ── WIZARD CONTROLLER ─────────────────────────────────────────────────────────

export default function CoachingWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStep = (() => {
    const s = parseInt(searchParams.get('step') ?? '1', 10)
    return isNaN(s) || s < 1 || s > 8 ? 1 : s
  })()
  const [step, setStep] = useState(initialStep)
  const [state, _setState] = useState<WizardState>({
    platform: 'euw1', gameName: '', tagLine: '', riotVerified: false,
    intent: 'coach',
    langs: new Set(['fr']),
    role: 'MID', multiRole: false,
    currentRank: 'silver', goalRank: 'gold', horizon: '3 mois',
    focusItems: new Set(),
    nemesis: null, otherNemesis: new Set(), pains: new Set(),
    formats: new Set(['vod']), rythme: 'Régulier',
  })

  function setState(patch: Partial<WizardState>) {
    _setState(prev => ({ ...prev, ...patch }))
  }

  // Pre-fill from Riot data stored in localStorage (if user already verified in duo flow)
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('onb_riot') ?? '{}')
      if (data?.gameName) setState({ gameName: data.gameName, tagLine: data.tagLine, platform: data.platform ?? 'euw1', riotVerified: true })
      if (data?.tier) setState({ currentRank: data.tier.toLowerCase() })
    } catch { /* ignore */ }
  }, [])

  const nav: NavProps = {
    onBack: () => setStep(s => Math.max(1, s - 1)),
    onNext: () => {
      if (step === 8) {
        router.push('/onboarding/finish?dest=/training')
      } else {
        setStep(s => Math.min(8, s + 1))
      }
    },
    onJump: (n) => setStep(n),
  }

  const props = { state, setState, nav }
  switch (step) {
    case 1: return <StepRiot {...props} />
    case 2: return <StepIntent {...props} />
    case 3: return <StepLangs {...props} />
    case 4: return <StepRole {...props} />
    case 5: return <StepGoal {...props} />
    case 6: return <StepImprove {...props} />
    case 7: return <StepMatchup {...props} />
    case 8: return <StepFormat {...props} />
    default: return null
  }
}
