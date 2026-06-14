'use client'
import { useState } from 'react'

const T = {
  bg: '#0a0c14', surface: '#0f121c', elevated: '#161a26',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', danger: '#ff3d6e',
  body: 'var(--font-body)', mono: 'var(--font-mono)', display: 'var(--font-display)',
}

const REASONS = [
  { id: 'toxic',   label: 'Comportement toxique',      desc: 'Insultes, harcèlement, flaming' },
  { id: 'cheat',   label: 'Triche / exploit',           desc: 'Hack, bug exploit, script' },
  { id: 'boost',   label: 'Boosting',                   desc: 'Faux rang, compte boosté' },
  { id: 'imperso', label: 'Usurpation d\'identité',     desc: 'Faux pseudo, faux profil' },
  { id: 'spam',    label: 'Spam / pub',                 desc: 'Messages répétitifs, liens commerciaux' },
  { id: 'other',   label: 'Autre',                      desc: 'Préciser dans les détails' },
] as const
type Reason = typeof REASONS[number]['id']

type Props = {
  targetId:      string
  displayName:   string
  onClose:       () => void
}

export default function ReportModal({ targetId, displayName, onClose }: Props) {
  const [reason,   setReason]   = useState<Reason | null>(null)
  const [details,  setDetails]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function submit() {
    if (!reason) return
    setLoading(true); setError(null)
    const res = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId, reason, details: details.trim() || undefined }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur serveur')
    } else {
      setSuccess(true)
    }
  }

  return (
    <>
      {/* scrim */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,5,9,0.72)', backdropFilter: 'blur(3px)', zIndex: 399 }} onClick={onClose} />

      {/* modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 520, borderRadius: 20, overflow: 'hidden',
        background: T.elevated, border: `1px solid ${T.lineStrong}`,
        boxShadow: '0 48px 100px -24px rgba(0,0,0,0.9)', zIndex: 400,
      }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', borderBottom: `1px solid ${T.line}` }}>
          <div>
            <div style={{ fontFamily: T.display, fontSize: 16, color: T.danger, letterSpacing: '0.08em' }}>SIGNALER</div>
            <div style={{ fontFamily: T.body, fontSize: 12.5, color: T.textDim, marginTop: 3 }}>{displayName}</div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${T.line}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth={2.5} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {success ? (
          <div style={{ padding: '48px 22px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${T.danger}22`, border: `1px solid ${T.danger}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={T.danger} strokeWidth={2.5} strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <div style={{ fontFamily: T.display, fontSize: 15, color: T.text, letterSpacing: '0.08em' }}>SIGNALEMENT ENVOYÉ</div>
            <div style={{ fontFamily: T.body, fontSize: 12.5, color: T.textDim, marginTop: 8 }}>Notre équipe examinera ce signalement.</div>
            <button
              onClick={onClose}
              style={{ marginTop: 28, padding: '10px 32px', borderRadius: 10, border: 'none', background: `${T.danger}33`, color: T.danger, fontFamily: T.mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}
            >
              FERMER
            </button>
          </div>
        ) : (
          <div style={{ padding: '20px 22px 24px' }}>
            {/* reasons */}
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.14em', marginBottom: 10 }}>MOTIF *</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {REASONS.map(r => (
                <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 11, border: `1px solid ${reason === r.id ? T.danger + '66' : T.line}`, background: reason === r.id ? `${T.danger}0d` : T.surface, cursor: 'pointer' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${reason === r.id ? T.danger : T.lineStrong}`, background: reason === r.id ? T.danger : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {reason === r.id && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#0a0c14' }} />}
                  </div>
                  <input type="radio" name="reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} style={{ display: 'none' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: T.body, fontSize: 13.5, fontWeight: 700, color: reason === r.id ? T.text : T.textDim }}>{r.label}</div>
                    <div style={{ fontFamily: T.body, fontSize: 11.5, color: T.textMute, marginTop: 2 }}>{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* details */}
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.14em', marginBottom: 8 }}>DÉTAILS OPTIONNELS</div>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Décrivez le problème rencontré…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 11, border: `1px solid ${T.line}`, background: T.surface, resize: 'vertical', fontFamily: T.body, fontSize: 13, color: T.text, outline: 'none' }}
            />
            <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.textMute, textAlign: 'right', marginTop: 4 }}>{details.length}/500</div>

            {error && <div style={{ fontFamily: T.mono, fontSize: 11, color: T.danger, marginTop: 10 }}>{error}</div>}

            {/* footer */}
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button
                onClick={onClose}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${T.lineStrong}`, background: 'transparent', color: T.textDim, fontFamily: T.mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' }}
              >
                ANNULER
              </button>
              <button
                onClick={submit}
                disabled={!reason || loading}
                style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: reason ? `linear-gradient(135deg, ${T.danger}, #c0224f)` : T.line, color: reason ? '#fff' : T.textMute, fontFamily: T.mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', cursor: reason ? 'pointer' : 'default', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'ENVOI…' : 'ENVOYER LE SIGNALEMENT'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
