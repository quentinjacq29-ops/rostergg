'use client'

import OnbShell from './OnbShell'

const TEAM_STEPS = ['Compte Riot', 'Tu cherches quoi', 'Langues', 'Tes rôles', 'Champion pool', 'Ce que tu cherches', 'Disponibilités'] as const

const FORMATS = [
  { id: 'clash',  title: 'Clash',         desc: 'Tournois week-end officiels',        icon: <><path d="M6 9H4.5a2.5 2.5 0 010-5H6" /><path d="M18 9h1.5a2.5 2.5 0 000-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0012 0V2z" /></> },
  { id: 'flex',   title: 'Ranked Flex',   desc: 'Grimper en file flex à 5',           icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /></> },
  { id: 'scrims', title: 'Scrims',        desc: "Matchs d'entraînement vs autres teams", icon: <><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6M16 16l4 4" /></> },
  { id: 'compet', title: 'Compétitif',    desc: 'Ligues amateurs / semi-pro',          icon: <><path d="M6 9H4.5a2.5 2.5 0 010-5H6" /><path d="M18 9h1.5a2.5 2.5 0 000-5H18" /><path d="M4 22h16M10 14.66V17M14 14.66V17" /><path d="M18 2H6v7a6 6 0 0012 0V2z" /></> },
] as const

const COMMITMENTS = [
  { id: 'casual',   label: 'Casual',    hint: '1-2 soirs / sem' },
  { id: 'regular',  label: 'Régulier',  hint: '3-4 soirs / sem' },
  { id: 'tryhard',  label: 'Tryhard',   hint: 'Quasi tous les jours' },
] as const

const GOALS = [
  { id: 'fun',       label: 'Jouer pour le fun' },
  { id: 'progresser',label: 'Progresser ensemble' },
  { id: 'gagner',    label: 'Gagner des tournois' },
  { id: 'proscene',  label: 'Viser la scène compétitive' },
] as const

type TeamFitData = { formats: string[]; commitment: string; goal: string }

type Props = {
  step: number
  locale: string
  data: TeamFitData
  onChange: (d: TeamFitData) => void
  onContinue: () => void
  onBack: () => void
}

export { TEAM_STEPS }
export type { TeamFitData }

export default function TeamFitStep({ step, locale, data, onChange, onContinue, onBack }: Props) {
  function toggleFormat(id: string) {
    const next = data.formats.includes(id)
      ? data.formats.filter(x => x !== id)
      : [...data.formats, id]
    onChange({ ...data, formats: next })
  }

  return (
    <OnbShell
      step={step}
      steps={TEAM_STEPS}
      title="CE QUE TU CHERCHES"
      sub="Le type d'équipe qui te correspond — on te fait remonter chez les rosters qui recrutent pile ça."
      onContinue={onContinue}
      continueDisabled={data.formats.length === 0}
      continueAccent="var(--violet)"
      locale={locale}
    >
      {/* Format */}
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em' }}>FORMAT DE JEU · PLUSIEURS POSSIBLES</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 13 }}>
        {FORMATS.map(({ id, title, desc, icon }) => {
          const on = data.formats.includes(id)
          return (
            <div key={id} onClick={() => toggleFormat(id)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '15px 16px', borderRadius: 14, cursor: 'pointer', background: on ? 'rgba(139,92,246,0.11)' : 'rgba(255,255,255,0.025)', border: `1px solid ${on ? 'rgba(139,92,246,0.4)' : 'var(--line)'}`, boxShadow: on ? '0 8px 20px -12px var(--violet)' : 'none', transition: 'all 0.15s ease' }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, background: on ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${on ? 'rgba(139,92,246,0.33)' : 'var(--line)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={on ? 'var(--violet)' : 'var(--text-dim)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text)', letterSpacing: '0.02em' }}>{title}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>{desc}</div>
              </div>
              {on && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6" /></svg>}
            </div>
          )
        })}
      </div>

      {/* Commitment */}
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em', display: 'block', marginTop: 24 }}>NIVEAU D'ENGAGEMENT</label>
      <div style={{ display: 'flex', gap: 9, marginTop: 13 }}>
        {COMMITMENTS.map(({ id, label, hint }) => {
          const on = data.commitment === id
          return (
            <div key={id} onClick={() => onChange({ ...data, commitment: id })} style={{ flex: 1, textAlign: 'center', padding: '14px 10px', borderRadius: 12, cursor: 'pointer', background: on ? 'rgba(139,92,246,0.11)' : 'rgba(255,255,255,0.04)', border: `1px solid ${on ? 'rgba(139,92,246,0.4)' : 'var(--line)'}`, transition: 'all 0.15s ease' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: on ? 'var(--violet)' : 'var(--text-dim)', letterSpacing: '0.03em' }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-mute)', letterSpacing: '0.04em', marginTop: 4 }}>{hint}</div>
            </div>
          )
        })}
      </div>

      {/* Goal */}
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.18em', display: 'block', marginTop: 24 }}>OBJECTIF PRINCIPAL</label>
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 13 }}>
        {GOALS.map(({ id, label }) => {
          const on = data.goal === id
          return (
            <span key={id} onClick={() => onChange({ ...data, goal: id })} style={{ padding: '11px 16px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', background: on ? 'rgba(255,209,102,0.11)' : 'rgba(255,255,255,0.04)', border: `1px solid ${on ? 'rgba(255,209,102,0.33)' : 'var(--line)'}`, color: on ? 'var(--gold)' : 'var(--text-dim)', transition: 'all 0.15s ease' }}>{label}</span>
          )
        })}
      </div>
    </OnbShell>
  )
}
