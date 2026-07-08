'use client'
// QA promo v3 — inventaire responsive « à la carte » (port fidèle de promo-tiers.jsx).
// L'app duo n'est jamais déformée ; selon la largeur on AJOUTE/RETIRE des slots IAB
// standards (billboard 970×90 + 0/1/2× 300×600 + skin). Placeholders nus par palier.
// Statique : aucun adserver, aucun tracking. `appSlot` = l'app réelle (AppShell+DuoFeed).
import { useEffect, useState, type ReactNode } from 'react'

const T = {
  line: 'rgba(255,255,255,0.06)', textMute: '#5a607a',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

const PAD = 18, GAP = 16, GUT_GAP = 10, ADSLOT = 300, APP_NATIVE = 1440
const BB_W = 970, BB_H = 90, BB_BAND = BB_H + 26

const stripe = (a: string, b: string) => `repeating-linear-gradient(135deg, ${a} 0 8px, ${b} 8px 16px)`
const NU_BG = stripe('rgba(255,255,255,0.05)', 'rgba(255,255,255,0.015)')
const NU_BORDER = '1px dashed rgba(255,255,255,0.28)'

type Tier = { W: number; H: number; gutters: 0 | 1 | 2; skin: boolean; kind: string }
const TIERS: Record<string, Tier> = {
  '13': { W: 1440, H: 900,  gutters: 0, skin: false, kind: '13–14" · LAPTOP' },
  '15': { W: 1600, H: 940,  gutters: 1, skin: false, kind: '15–16" · LAPTOP' },
  '24': { W: 1920, H: 1080, gutters: 1, skin: false, kind: '24" · MONITEUR 1080p' },
  '27': { W: 2560, H: 1440, gutters: 2, skin: false, kind: '27–32" · QHD / 4K' },
  '34': { W: 3440, H: 1440, gutters: 2, skin: true,  kind: '34" · ULTRAWIDE' },
}

// Inventaire selon la largeur CSS réelle (3 seuils : 1er 300×600, 2e, skin)
function invForWidth(w: number): { gutters: 0 | 1 | 2; skin: boolean } {
  if (w < 1520) return { gutters: 0, skin: false }
  if (w < 2140) return { gutters: 1, skin: false }
  if (w < 3000) return { gutters: 2, skin: false }
  return { gutters: 2, skin: true }
}

function AdIcon({ s = 24 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 15l5-5 4 4 3-3 6 6" /><circle cx="8.5" cy="8.5" r="1.5" /></svg>
}

function BillboardNu() {
  const compact = BB_H < 160
  return (
    <a href="https://example.com/?ad=billboard" target="_blank" rel="noopener noreferrer sponsored" style={{ display: 'block', textDecoration: 'none', flexShrink: 0 }}>
      <div style={{ position: 'relative', width: '100%', height: BB_BAND, borderRadius: 14, background: 'rgba(255,255,255,0.015)', border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ position: 'absolute', top: 8, left: 14, fontFamily: T.mono, fontSize: 8.5, letterSpacing: '0.16em', color: T.textMute }}>PUBLICITÉ · {BB_W}×{BB_H}</span>
        <div style={{ width: BB_W, height: BB_H, borderRadius: 12, border: NU_BORDER, background: NU_BG, display: 'flex', flexDirection: compact ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <AdIcon s={compact ? 20 : 24} />
          <span style={{ fontFamily: T.display, fontSize: compact ? 18 : 24, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.06em' }}>{BB_W} × {BB_H}</span>
          <span style={{ fontFamily: T.mono, fontSize: 9.5, color: 'rgba(255,255,255,0.42)', letterSpacing: '0.16em' }}>EMPLACEMENT PUB</span>
        </div>
      </div>
    </a>
  )
}

// Pavé 300×600 (collé à l'app). `scale` le rétrécit si la hauteur manque (ratio 1:2 gardé).
function HalfPageNu({ skin = false, scale = 1 }: { skin?: boolean; scale?: number }) {
  const ad = (
    <div style={{ width: 300, height: 600, transformOrigin: 'top center', transform: scale < 1 ? `scale(${scale})` : undefined, position: 'relative', borderRadius: 12, border: NU_BORDER, background: NU_BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, flexShrink: 0 }}>
      <AdIcon s={26} />
      <span style={{ fontFamily: T.display, fontSize: 22, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.08em' }}>300 × 600</span>
      <span style={{ fontFamily: T.mono, fontSize: 10, color: 'rgba(255,255,255,0.42)', letterSpacing: '0.18em' }}>EMPLACEMENT PUB</span>
    </div>
  )
  const w = Math.round(300 * scale)
  const h = Math.round(600 * scale)
  const inner = <div style={{ width: w, height: h, overflow: 'hidden', flexShrink: 0 }}>{ad}</div>
  if (!skin) {
    return (
      <a href="https://example.com/?ad=halfpage" target="_blank" rel="noopener noreferrer sponsored" style={{ width: w, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <span style={{ fontFamily: T.mono, fontSize: 8.5, letterSpacing: '0.16em', color: T.textMute }}>PUBLICITÉ</span>
        {inner}
      </a>
    )
  }
  // habillage / skin : mur de marque (placeholder neutre) autour du 300×600
  return (
    <a href="https://example.com/?ad=skin" target="_blank" rel="noopener noreferrer sponsored" style={{ width: w + 24, flexShrink: 0, position: 'relative', overflow: 'hidden', borderRadius: 16, background: 'linear-gradient(210deg, #0a0c14 0%, #241006 60%, rgba(255,61,110,0.22) 130%)', border: `1px solid ${T.line}`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 20, textDecoration: 'none' }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 8, background: stripe('#ff8a3d', '#0a0c14'), opacity: 0.85 }} />
      <span style={{ position: 'relative', fontFamily: T.mono, fontSize: 8.5, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>PUBLICITÉ · SKIN</span>
      {inner}
    </a>
  )
}

// Rend un palier à des dimensions W×H données (app scalée seulement si l'espace manque).
function TierFrame({ W, H, gutters, skin, appSlot }: { W: number; H: number; gutters: 0 | 1 | 2; skin: boolean; appSlot: ReactNode }) {
  const rowH = H - PAD * 2 - BB_BAND - GAP
  const hScale = Math.max(0.15, Math.min(1, (rowH - 30) / 600))        // pavé : rétréci si hauteur courte
  const gutRenderW = Math.round(300 * hScale) + (skin ? 24 : 0)
  const avail = W - PAD * 2 - gutters * (gutRenderW + GUT_GAP)
  const appW = Math.min(APP_NATIVE, avail)                              // app : pleine taille si ça rentre
  const scale = appW / APP_NATIVE
  const appNativeH = scale > 0 ? rowH / scale : rowH
  return (
    <div style={{ width: W, height: H, background: '#070810', fontFamily: T.body, display: 'flex', flexDirection: 'column', gap: GAP, padding: PAD, boxSizing: 'border-box', overflow: 'hidden' }}>
      <BillboardNu />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: GUT_GAP, justifyContent: 'center', alignItems: 'stretch' }}>
        {gutters === 2 && <HalfPageNu scale={hScale} />}
        <div style={{ width: appW, flexShrink: 0, position: 'relative', overflow: 'hidden', borderRadius: 16, border: `1px solid ${T.line}` }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: APP_NATIVE, height: appNativeH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            {appSlot}
          </div>
        </div>
        {gutters >= 1 && <HalfPageNu skin={skin} scale={hScale} />}
      </div>
    </div>
  )
}

export default function PromoResponsive({ appSlot, forcedTier }: { appSlot: ReactNode; forcedTier?: string }) {
  const [win, setWin] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    const on = () => setWin({ w: window.innerWidth, h: window.innerHeight })
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  if (!win) return null

  // Palier forcé (?tier=…) → rendu à la largeur de design, mis à l'échelle pour tenir
  // dans la fenêtre (QA : on voit le palier entier, proportions exactes).
  const t = forcedTier && TIERS[forcedTier] ? TIERS[forcedTier] : null
  if (t) {
    const fit = Math.min(1, win.w / t.W, win.h / t.H)
    return (
      <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden', background: '#04050a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ transform: `scale(${fit})`, transformOrigin: 'center', flexShrink: 0 }}>
          <TierFrame W={t.W} H={t.H} gutters={t.gutters} skin={t.skin} appSlot={appSlot} />
        </div>
      </div>
    )
  }

  // Responsive live : inventaire selon la largeur réelle, l'app remplit la fenêtre
  const inv = invForWidth(win.w)
  return <TierFrame W={win.w} H={win.h} gutters={inv.gutters} skin={inv.skin} appSlot={appSlot} />
}
