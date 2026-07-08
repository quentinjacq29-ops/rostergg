'use client'
// QA promo — variante « 13" avec gouttière ». Port fidèle de la maquette
// desktop/promo-13-gutter.jsx. Statique : placeholders annonceurs fictifs, aucun
// adserver, aucun tracking. Les bannières sont cliquables (redirection placeholder).
// L'app duo (AppShell + DuoFeed) est passée via `appSlot` et mise à l'échelle dans
// le well (scale = wellWidth / 1440) — jamais compressée ni coupée.
import { useEffect, useRef, useState, type ReactNode } from 'react'

const T = {
  line: 'rgba(255,255,255,0.06)', textMute: '#5a607a',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

const APP_NATIVE = 1440
const BILLB_H = 150
const PAD = 16
const GAP = 14

const INK = '#0a0c14', O1 = '#ff8a3d', O2 = '#ff3d6e', GOLD = '#ffd166'
const stripe = (a: string, b: string) => `repeating-linear-gradient(135deg, ${a} 0 8px, ${b} 8px 16px)`

// URLs placeholder (annonceurs fictifs) — aucune vraie marque, aucun tracking
const AD_URL_BILLBOARD = 'https://example.com/?ad=ascend-energy'
const AD_URL_HALFPAGE  = 'https://example.com/?ad=riftborn'

// ── Billboard (haut, pleine largeur, ratio 970×250) ──────────────────────────
function AdBillboard13() {
  return (
    <a href={AD_URL_BILLBOARD} target="_blank" rel="noopener noreferrer sponsored" style={{ display: 'block', textDecoration: 'none', flexShrink: 0 }}>
      <div style={{
        position: 'relative', width: '100%', height: BILLB_H, borderRadius: 16, overflow: 'hidden',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 22, padding: '0 26px', boxSizing: 'border-box',
        background: `linear-gradient(100deg, ${INK} 0%, #2a1206 42%, ${O2}44 128%)`, border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 8, background: stripe(O1, INK), opacity: 0.9 }} />
        <div style={{ width: 60, height: 60, borderRadius: 14, flexShrink: 0, background: `linear-gradient(135deg, ${O1}, ${O2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 22px ${O1}aa` }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h6l-1 8 9-12h-6z" /></svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.22em', color: GOLD, opacity: 0.9 }}>ASCEND ENERGY</div>
          <div style={{ fontFamily: T.display, fontSize: 34, letterSpacing: '0.01em', color: '#fff', lineHeight: 1.05, marginTop: 3 }}>FUEL THE <span style={{ color: GOLD }}>CLIMB.</span></div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <span style={{ fontFamily: T.mono, fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.14em' }}>[ VISUEL ANNONCEUR · 970×250 ]</span>
          <div style={{ padding: '14px 22px', borderRadius: 11, background: `linear-gradient(135deg, ${O1}, ${O2})`, color: INK, fontFamily: T.display, fontSize: 16, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8 }}>
            -20% CODE ROSTER
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </div>
        </div>
        <span style={{ position: 'absolute', top: 9, right: 14, fontFamily: T.mono, fontSize: 8, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.55)' }}>PUBLICITÉ · BILLBOARD</span>
      </div>
    </a>
  )
}

// ── Pavé 300×600 — placeholder nu (toute la boîte = l'emplacement pub), cliquable
function AdHalfPage13() {
  return (
    <a href={AD_URL_HALFPAGE} target="_blank" rel="noopener noreferrer sponsored" style={{
      position: 'relative', width: 300, height: 600, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', flexShrink: 0, textDecoration: 'none',
      border: '1px dashed rgba(255,255,255,0.28)',
      background: stripe('rgba(255,255,255,0.05)', 'rgba(255,255,255,0.015)'),
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
    }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 15l5-5 4 4 3-3 6 6" /><circle cx="8.5" cy="8.5" r="1.5" /></svg>
      <span style={{ fontFamily: T.display, fontSize: 22, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.08em' }}>300 × 600</span>
      <span style={{ fontFamily: T.mono, fontSize: 10, color: 'rgba(255,255,255,0.42)', letterSpacing: '0.18em' }}>EMPLACEMENT PUB</span>
    </a>
  )
}

// ── Gouttière = pavé 300×600, ratio 1:2 verrouillé, scale-to-fit en hauteur.
// La colonne épouse EXACTEMENT la largeur du pavé (aucun espace horizontal perdu) ;
// tout l'espace récupéré revient au well (l'app). Sur écran court, le pavé est mis
// à l'échelle et la gouttière rétrécit d'autant.
function GutterSlot() {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const compute = () => {
      const availH = el.clientHeight - 26 // − label « PUBLICITÉ » + gap
      setScale(Math.max(0.15, Math.min(1, availH / 600)))
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const w = Math.round(300 * scale)
  const h = Math.round(600 * scale)
  return (
    <div ref={ref} style={{ flexShrink: 0, minHeight: 0, width: w, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: T.mono, fontSize: 8.5, letterSpacing: '0.16em', color: T.textMute, flexShrink: 0 }}>PUBLICITÉ</span>
      <div style={{ width: w, height: h, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <AdHalfPage13 />
        </div>
      </div>
    </div>
  )
}

// ── Well : mesure la largeur dispo et met l'app à l'échelle (scale = w/1440) ──
function PromoFrame({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [d, setD] = useState({ scale: 1, innerH: 0, ready: false })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const compute = () => {
      const w = el.clientWidth, h = el.clientHeight
      const scale = w / APP_NATIVE
      setD({ scale, innerH: scale > 0 ? h / scale : 0, ready: true })
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden', borderRadius: 16, border: `1px solid ${T.line}` }}>
      {d.ready && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: APP_NATIVE, height: d.innerH, transform: `scale(${d.scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── Layout complet ───────────────────────────────────────────────────────────
export default function PromoGutter13({ appSlot }: { appSlot: ReactNode }) {
  return (
    <div style={{
      width: '100%', height: '100dvh', boxSizing: 'border-box', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: GAP, padding: PAD,
      background: INK, fontFamily: T.body, backgroundImage: `linear-gradient(135deg, ${INK} 60%, ${O2}22 130%)`,
    }}>
      <AdBillboard13 />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: GAP }}>
        {/* WELL — app scalée */}
        <PromoFrame>{appSlot}</PromoFrame>
        {/* GOUTTIÈRE droite — colonne qui épouse la largeur du pavé, zéro vide */}
        <GutterSlot />
      </div>
    </div>
  )
}
