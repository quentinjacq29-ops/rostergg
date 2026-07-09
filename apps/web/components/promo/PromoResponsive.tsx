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

// ── Habillage grand écran (takeover) — port de promo-habillage.jsx ────────────
const HB_TOP = 130, HB_PAD = 22, HB_O1 = '#ff8a3d', HB_O2 = '#ff3d6e', HB_GOLD = '#ffd166', HB_INK = '#0a0c14'
const hbStripe = (a: string, b: string) => `repeating-linear-gradient(135deg, ${a} 0 10px, ${b} 10px 20px)`

function HbSafe() {
  return (
    <div style={{ width: 300, height: 600, borderRadius: 10, border: '1px dashed rgba(255,255,255,0.4)', background: 'rgba(10,12,20,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <AdIcon s={24} />
      <span style={{ fontFamily: T.display, fontSize: 20, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.06em' }}>300 × 600</span>
      <span style={{ fontFamily: T.mono, fontSize: 9.5, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.16em' }}>ZONE SÛRE · CLIC</span>
    </div>
  )
}

function HbWall({ side, wallW }: { side: 'left' | 'right'; wallW: number }) {
  const isLeft = side === 'left'
  return (
    <div style={{ position: 'absolute', top: HB_TOP, bottom: 0, [isLeft ? 'left' : 'right']: 0, width: wallW, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 44 }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, [isLeft ? 'right' : 'left']: 0, width: 10, background: hbStripe(HB_O1, HB_INK), opacity: 0.8 }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.06, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', transform: 'rotate(-14deg) scale(1.5)', pointerEvents: 'none' }}>
        {Array.from({ length: 9 }).map((_, i) => <div key={i} style={{ fontFamily: T.display, fontSize: 40, color: HB_GOLD, whiteSpace: 'nowrap', textAlign: 'center', letterSpacing: '0.1em' }}>MARQUE · ANNONCEUR</div>)}
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 34 }}>
        <div style={{ width: 58, height: 58, borderRadius: 15, background: `linear-gradient(135deg, ${HB_O1}, ${HB_O2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 26px ${HB_O1}aa` }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={HB_INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h6l-1 8 9-12h-6z" /></svg>
        </div>
        <span style={{ fontFamily: T.mono, fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.18em' }}>MUR {isLeft ? 'GAUCHE' : 'DROIT'} · SKIN</span>
      </div>
      <HbSafe />
    </div>
  )
}

function HabillageFrame({ W, H, appSlot }: { W: number; H: number; appSlot: ReactNode }) {
  const wallW = (W - APP_NATIVE) / 2 - HB_PAD
  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', fontFamily: T.body, background: `radial-gradient(1400px 800px at 50% -10%, ${HB_O2}2e, transparent 60%), radial-gradient(1000px 700px at 0% 120%, ${HB_O1}22, transparent 55%), linear-gradient(180deg, #120a08 0%, #0a0b12 55%)` }}>
      {/* Surface skin cliquable (bandeau + murs) — l'app est posée par-dessus, hors du lien */}
      <a href="https://example.com/?ad=habillage" target="_blank" rel="noopener noreferrer sponsored" style={{ position: 'absolute', inset: 0, zIndex: 1, textDecoration: 'none', display: 'block' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, background: hbStripe('rgba(255,255,255,0.5)', 'transparent'), pointerEvents: 'none' }} />
        {/* Bandeau haut */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HB_TOP, display: 'flex', alignItems: 'center', gap: 26, padding: `0 ${HB_PAD + 20}px`, boxSizing: 'border-box', borderBottom: `1px solid ${HB_O1}44`, background: `linear-gradient(100deg, ${HB_INK} 0%, #2a1206 44%, ${HB_O2}44 130%)` }}>
          <div style={{ width: 66, height: 66, borderRadius: 16, flexShrink: 0, background: `linear-gradient(135deg, ${HB_O1}, ${HB_O2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 26px ${HB_O1}aa` }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={HB_INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h6l-1 8 9-12h-6z" /></svg>
          </div>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.24em', color: HB_GOLD, opacity: 0.9 }}>HABILLAGE · BANDEAU HAUT</div>
            <div style={{ fontFamily: T.display, fontSize: 40, color: '#fff', lineHeight: 1.02, marginTop: 4 }}>VISUEL <span style={{ color: HB_GOLD }}>ANNONCEUR</span></div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: 'rgba(255,255,255,0.42)', letterSpacing: '0.14em' }}>ZONE HAUTE PLEINE LARGEUR</span>
            <div style={{ padding: '15px 24px', borderRadius: 12, background: `linear-gradient(135deg, ${HB_O1}, ${HB_O2})`, color: HB_INK, fontFamily: T.display, fontSize: 17, letterSpacing: '0.04em' }}>EN SAVOIR PLUS →</div>
          </div>
          <span style={{ position: 'absolute', top: 9, left: 16, fontFamily: T.mono, fontSize: 8.5, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.55)' }}>PUBLICITÉ · HABILLAGE (SKIN)</span>
        </div>
        <HbWall side="left" wallW={wallW} />
        <HbWall side="right" wallW={wallW} />
      </a>
      {/* WELL — l'app posée au centre (par-dessus le skin, hors du lien) */}
      <div style={{ position: 'absolute', top: HB_TOP + HB_PAD, left: '50%', transform: 'translateX(-50%)', width: APP_NATIVE, height: H - HB_TOP - HB_PAD * 2, zIndex: 2, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 120px -30px rgba(0,0,0,0.9)' }}>
        {appSlot}
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
    // Le palier 34 (ultrawide) = habillage takeover complet (murs symétriques + bandeau)
    const frame = t.skin
      ? <HabillageFrame W={t.W} H={t.H} appSlot={appSlot} />
      : <TierFrame W={t.W} H={t.H} gutters={t.gutters} skin={false} appSlot={appSlot} />
    return (
      <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden', background: '#04050a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ transform: `scale(${fit})`, transformOrigin: 'center', flexShrink: 0 }}>{frame}</div>
      </div>
    )
  }

  // Responsive live : inventaire selon la largeur réelle, l'app remplit la fenêtre
  const inv = invForWidth(win.w)
  if (inv.skin) return <HabillageFrame W={win.w} H={win.h} appSlot={appSlot} />
  return <TierFrame W={win.w} H={win.h} gutters={inv.gutters} skin={false} appSlot={appSlot} />
}
