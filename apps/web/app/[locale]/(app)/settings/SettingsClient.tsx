'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const T = {
  bg: '#0a0c14', surface: '#0f121c', elevated: '#161a26', void: '#06070b',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6', live: '#00ff9d', danger: '#ff3d6e', diamond: '#7cc6ff',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

// Types de notifications (× 3 canaux : in-app / e-mail / push nav.)
const NOTIF_TYPES = [
  { id: 'duo_request',  label: 'Demandes de duo reçues' },
  { id: 'duo_accepted', label: 'Demande acceptée' },
  { id: 'team_invite',  label: "Invitations d'équipe" },
  { id: 'message',      label: 'Nouveaux messages' },
  { id: 'news',         label: 'Actus & nouveautés' },
]
const CHANNELS = [
  { id: 'inapp', label: 'In-app' },
  { id: 'email', label: 'E-mail' },
  { id: 'push',  label: 'Push nav.' },
]
const LANGS = [{ code: 'fr', label: 'Français' }, { code: 'en', label: 'English' }]
const REQUEST_POLICY: Record<string, { label: string; sub?: string }> = {
  all:       { label: 'Tout le monde' },
  elo_range: { label: "Ma tranche d'elo", sub: 'Seuls les joueurs des divisions avec qui tu peux jouer en ranked (tiers adjacents ±1).' },
  none:      { label: 'Personne (profil en pause)' },
}

type Props = {
  locale: string
  email: string
  initialDisplayName: string
  initialDiscoverable: boolean
  initialShowOnline: boolean
  initialRequestPolicy: string
  initialNotifPrefs: Record<string, Record<string, boolean>>
  riotAccount: { game_name: string; tag_line: string; platform: string; rankLabel: string | null } | null
  blocks: { blocked: string; profiles: { display_name: string | null } | null }[]
}

// ── Sous-composants (port maquette) ──────────────────────────────────────────
function SGroup({ label, note, right, children }: { label: string; note?: string; right?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: note ? 4 : 12 }}>
        <span style={{ fontFamily: T.mono, fontSize: 10, color: T.cyan, letterSpacing: '0.22em' }}>◢ {label}</span>
        {right && <span style={{ marginLeft: 'auto', fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.1em' }}>{right}</span>}
      </div>
      {note && <div style={{ fontFamily: T.body, fontSize: 12, color: T.textMute, lineHeight: 1.5, margin: '0 0 12px' }}>{note}</div>}
      <div style={{ borderRadius: 16, background: 'rgba(255,255,255,0.022)', border: `1px solid ${T.line}`, overflow: 'hidden' }}>{children}</div>
    </div>
  )
}

function SToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <span onClick={onClick} style={{ width: 46, height: 27, borderRadius: 999, padding: 3, flexShrink: 0, background: on ? T.cyan : 'rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', boxShadow: on ? `0 0 12px ${T.cyan}55` : 'none' }}>
      <span style={{ width: 21, height: 21, borderRadius: '50%', background: on ? '#001018' : T.textDim, marginLeft: on ? 19 : 0, transition: 'margin .15s' }} />
    </span>
  )
}

function SRow({ title, sub, value, action, actionColor, danger, onAction, toggle, on, onToggle, last }: {
  title: string; sub?: string; value?: string; action?: string; actionColor?: string; danger?: boolean
  onAction?: () => void; toggle?: boolean; on?: boolean; onToggle?: () => void; last?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', minHeight: 44, borderBottom: last ? 'none' : `1px solid ${T.line}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: T.body, fontSize: 14.5, fontWeight: 500, color: danger ? T.danger : T.text }}>{title}</div>
        {value && <div style={{ fontFamily: T.mono, fontSize: 11.5, color: T.cyan, letterSpacing: '0.04em', marginTop: 4, wordBreak: 'break-word' }}>{value}</div>}
        {sub && <div style={{ fontFamily: T.body, fontSize: 12, color: T.textMute, marginTop: 4, lineHeight: 1.45 }}>{sub}</div>}
      </div>
      {toggle && <SToggle on={!!on} onClick={onToggle ?? (() => {})} />}
      {(action || onAction) && (
        <span onClick={onAction} style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em', color: actionColor || T.cyan, textTransform: 'uppercase', cursor: onAction ? 'pointer' : 'default', whiteSpace: 'nowrap', flexShrink: 0, minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>{action}</span>
      )}
    </div>
  )
}

function SChanRow({ title, prefs, onToggle, last }: { title: string; prefs: Record<string, boolean>; onToggle: (ch: string, v: boolean) => void; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 18px', borderBottom: last ? 'none' : `1px solid ${T.line}`, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 140px', minWidth: 0, fontFamily: T.body, fontSize: 14, color: T.text }}>{title}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {CHANNELS.map(c => {
          const on = !!prefs[c.id]
          return (
            <span key={c.id} onClick={() => onToggle(c.id, !on)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 11px', borderRadius: 9, minHeight: 36, background: on ? `${T.cyan}1a` : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? T.cyan + '55' : T.line}`, color: on ? T.cyan : T.textMute, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.04em', cursor: 'pointer' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: on ? T.cyan : T.textMute, boxShadow: on ? `0 0 6px ${T.cyan}` : 'none' }} />{c.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function ConfirmModal({ title, riotId, lines, note, cancelLabel, confirmLabel, confirming, onClose, onConfirm }: {
  title: string; riotId?: string; lines: React.ReactNode[]; note?: React.ReactNode; cancelLabel: string; confirmLabel: string
  confirming?: boolean; onClose: () => void; onConfirm: () => void
}) {
  const Cross = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.danger} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M18 6L6 18M6 6l12 12" /></svg>
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(4,5,9,0.72)', backdropFilter: 'blur(3px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 460, borderRadius: 20, padding: 28, background: `linear-gradient(180deg, ${T.elevated}, ${T.surface})`, border: `1px solid ${T.lineStrong}`, boxShadow: '0 40px 100px -30px rgba(0,0,0,0.8)', maxHeight: '90vh', overflowY: 'auto' }}>
        <span style={{ width: 54, height: 54, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${T.danger}24`, border: `1px solid ${T.danger}55`, color: T.danger }}>
          <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>
        </span>
        <div style={{ fontFamily: T.display, fontSize: 24, color: T.text, letterSpacing: '0.02em', marginTop: 16 }}>{title}</div>
        {riotId && <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim, letterSpacing: '0.06em', marginTop: 7 }}>{riotId}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
          {lines.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', fontFamily: T.body, fontSize: 13.5, color: T.textDim, lineHeight: 1.45 }}><Cross />{t}</div>
          ))}
        </div>
        {note && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 18, padding: '13px 15px', borderRadius: 13, background: `${T.live}12`, border: `1px solid ${T.live}30`, fontFamily: T.body, fontSize: 12.5, color: T.textDim, lineHeight: 1.45 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M20 6L9 17l-5-5" /></svg>
            <span>{note}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, height: 50, borderRadius: 13, border: `1px solid ${T.lineStrong}`, background: 'transparent', color: T.text, fontFamily: T.display, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>{cancelLabel}</button>
          <button onClick={onConfirm} disabled={confirming} style={{ flex: 1.4, height: 50, borderRadius: 13, border: 'none', background: T.danger, color: '#fff', fontFamily: T.display, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: confirming ? 'default' : 'pointer', opacity: confirming ? 0.6 : 1, boxShadow: `0 12px 30px -12px ${T.danger}` }}>{confirming ? '…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export default function SettingsClient({
  locale, email, initialDisplayName, initialDiscoverable, initialShowOnline,
  initialRequestPolicy, initialNotifPrefs, riotAccount, blocks: initialBlocks,
}: Props) {
  const router = useRouter()

  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [editingName, setEditingName] = useState(false)
  const [nameErr, setNameErr] = useState<string | null>(null)
  const [discoverable, setDiscoverable] = useState(initialDiscoverable)
  const [showOnline, setShowOnline] = useState(initialShowOnline)
  const [requestPolicy] = useState(initialRequestPolicy in REQUEST_POLICY ? initialRequestPolicy : 'elo_range')
  const [notifPrefs, setNotifPrefs] = useState(initialNotifPrefs)
  const [blocks, setBlocks] = useState(initialBlocks)
  const [modal, setModal] = useState<null | 'unlink' | 'delete'>(null)
  const [busy, setBusy] = useState(false)

  const initials = (riotAccount?.game_name ?? displayName ?? '?').slice(0, 2).toUpperCase()

  async function saveDisplayName() {
    if (!displayName.trim()) { setNameErr('Le pseudo ne peut pas être vide'); return }
    setNameErr(null); setEditingName(false)
    const res = await fetch('/api/me/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: displayName.trim() }) })
    if (!res.ok) { const d = await res.json().catch(() => ({})); setNameErr(d.error ?? 'Erreur'); setEditingName(true) }
  }
  function savePrivacy(patch: Record<string, boolean>) {
    fetch('/api/me/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
  }
  function saveNotif(type: string, ch: string, v: boolean) {
    const next = { ...notifPrefs, [type]: { ...(notifPrefs[type] ?? {}), [ch]: v } }
    setNotifPrefs(next)
    fetch('/api/me/settings/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
  }
  async function unblock(id: string) {
    await fetch(`/api/me/blocks/${id}`, { method: 'DELETE' })
    setBlocks(prev => prev.filter(b => b.blocked !== id))
  }
  async function handleLogout() {
    await createClient().auth.signOut()
    router.push(`/${locale}/login`)
  }
  async function confirmUnlink() {
    setBusy(true)
    await fetch('/api/me/riot/unlink', { method: 'POST' })
    setBusy(false); setModal(null); router.refresh()
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, color: T.text, fontFamily: T.body }}>
      {/* Topbar mobile */}
      <div className="rgg-set-topbar" style={{ position: 'sticky', top: 0, zIndex: 40, alignItems: 'center', padding: '13px 16px', background: 'rgba(8,10,16,0.92)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${T.line}` }}>
        <h1 style={{ margin: 0, fontFamily: T.display, fontSize: 19, letterSpacing: '0.03em' }}>PARAMÈTRES</h1>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div className="rgg-set-grid">
          {/* ── COLONNE GAUCHE : identité compte (sticky desktop) ── */}
          <div className="rgg-set-side">
            <div style={{ width: '100%', boxSizing: 'border-box', borderRadius: 18, padding: 22, background: `linear-gradient(160deg, ${T.surface}, ${T.void})`, border: `1px solid ${T.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#2a3350,#121626)', boxShadow: `0 0 0 2px ${T.diamond}`, fontFamily: T.display, fontSize: 20, color: T.text }}>{initials}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: T.display, fontSize: 21, color: T.text, letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{riotAccount?.game_name ?? displayName ?? '—'}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.textDim, letterSpacing: '0.06em', marginTop: 3 }}>{riotAccount ? `#${riotAccount.tag_line}${riotAccount.rankLabel ? ' · ' + riotAccount.rankLabel : ''}` : 'Aucun compte Riot'}</div>
                </div>
              </div>
              {riotAccount && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 18, padding: '13px 15px', borderRadius: 13, background: `${T.live}12`, border: `1px solid ${T.live}3a` }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.live} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: T.display, fontSize: 13, color: T.text, letterSpacing: '0.04em' }}>RIOT ID CONNECTÉ</div>
                    <div style={{ fontFamily: T.mono, fontSize: 9, color: T.live, letterSpacing: '0.08em', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{riotAccount.game_name}#{riotAccount.tag_line} · SYNC AUTO</div>
                  </div>
                  <span onClick={() => setModal('unlink')} style={{ padding: '9px 12px', borderRadius: 9, minHeight: 44, display: 'inline-flex', alignItems: 'center', border: `1px solid ${T.lineStrong}`, color: T.textDim, fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.06em', cursor: 'pointer', flexShrink: 0 }}>DÉLIER</span>
                </div>
              )}
            </div>

            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', height: 50, borderRadius: 13, background: `${T.danger}1a`, border: `1px solid ${T.danger}55`, color: T.danger, fontFamily: T.display, fontSize: 14, letterSpacing: '0.08em', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>SE DÉCONNECTER
            </button>
            <div style={{ textAlign: 'center', fontFamily: T.mono, fontSize: 10, color: T.textMute, letterSpacing: '0.14em' }}>ROSTERGG · v1.0.0</div>
          </div>

          {/* ── COLONNE DROITE : réglages ── */}
          <div>
            <SGroup label="COMPTE & RIOT ID">
              {editingName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderBottom: `1px solid ${T.line}` }}>
                  <input autoFocus value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={20} onKeyDown={e => e.key === 'Enter' && saveDisplayName()} style={{ flex: 1, minWidth: 0, height: 40, padding: '0 12px', borderRadius: 9, border: `1px solid ${nameErr ? T.danger : T.lineStrong}`, background: T.surface, fontFamily: T.body, fontSize: 14, color: T.text, outline: 'none' }} />
                  <span onClick={saveDisplayName} style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em', color: T.live, textTransform: 'uppercase', cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>Enregistrer</span>
                </div>
              ) : (
                <SRow title="Pseudo public (DuoFind)" value={displayName || '—'} action="Modifier" onAction={() => setEditingName(true)} />
              )}
              {nameErr && <div style={{ fontFamily: T.mono, fontSize: 11, color: T.danger, padding: '0 18px 10px' }}>{nameErr}</div>}
              <SRow title="Adresse e-mail" value={email} action="Vérifiée" actionColor={T.live} />
              <SRow title="Serveur principal" value={riotAccount ? `${riotAccount.platform.toUpperCase()} · ${platformName(riotAccount.platform)}` : '—'} last />
            </SGroup>

            <SGroup label="VISIBILITÉ DU PROFIL">
              <SRow title="Profil visible dans le feed Duo" toggle on={discoverable} onToggle={() => { const v = !discoverable; setDiscoverable(v); savePrivacy({ profileDiscoverable: v }) }} />
              <SRow title="Afficher mon statut en ligne" toggle on={showOnline} onToggle={() => { const v = !showOnline; setShowOnline(v); savePrivacy({ showOnlineStatus: v }) }} last />
            </SGroup>

            <SGroup label="NOTIFICATIONS" note="« Push nav. » = notifications du navigateur (l'activation demandera l'autorisation de ton navigateur).">
              {NOTIF_TYPES.map((nt, i) => (
                <SChanRow key={nt.id} title={nt.label} prefs={notifPrefs[nt.id] ?? {}} onToggle={(ch, v) => saveNotif(nt.id, ch, v)} last={i === NOTIF_TYPES.length - 1} />
              ))}
            </SGroup>

            <SGroup label="CONFIDENTIALITÉ">
              <SRow title="Qui peut m'envoyer une demande" value={REQUEST_POLICY[requestPolicy]?.label} sub={REQUEST_POLICY[requestPolicy]?.sub} />
              <SRow title="Exporter mes données" sub="Télécharge une copie de tes données (RGPD)" action="Exporter" onAction={() => { window.location.href = '/api/me/export' }} />
              <SRow title="Supprimer mon compte" sub="Action définitive et irréversible" danger action="Supprimer" actionColor={T.danger} onAction={() => setModal('delete')} last />
            </SGroup>

            <SGroup label="JOUEURS BLOQUÉS" right={String(blocks.length)}>
              {blocks.length === 0
                ? <div style={{ padding: '16px 18px', fontFamily: T.body, fontSize: 13.5, color: T.textMute }}>Tu n&apos;as bloqué personne.</div>
                : blocks.map((b, i) => (
                  <div key={b.blocked} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 18px', borderBottom: i === blocks.length - 1 ? 'none' : `1px solid ${T.line}` }}>
                    <span style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', boxShadow: `0 0 0 2px ${T.lineStrong}`, fontFamily: T.display, fontSize: 13, color: T.textDim }}>{(b.profiles?.display_name ?? '??').slice(0, 2).toUpperCase()}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: T.body, fontSize: 14, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.profiles?.display_name ?? b.blocked}</div>
                    </div>
                    <span onClick={() => unblock(b.blocked)} style={{ padding: '10px 13px', borderRadius: 9, minHeight: 44, display: 'inline-flex', alignItems: 'center', border: `1px solid ${T.lineStrong}`, color: T.textDim, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer', flexShrink: 0 }}>DÉBLOQUER</span>
                  </div>
                ))}
            </SGroup>

            <SGroup label="LANGUE & RÉGION">
              {LANGS.map((l, i) => (
                <SRow key={l.code} title={l.label} value={locale === l.code ? 'Langue active' : undefined} action={locale === l.code ? undefined : 'Choisir'} onAction={locale === l.code ? undefined : () => router.push(`/${l.code}/settings`)} last={i === LANGS.length - 1} />
              ))}
            </SGroup>
          </div>
        </div>
      </div>

      {modal === 'unlink' && riotAccount && (
        <ConfirmModal
          title="Délier ton compte Riot ?"
          riotId={`${riotAccount.game_name}#${riotAccount.tag_line} · actuellement lié & vérifié`}
          lines={[
            <>Tu <b style={{ color: T.text }}>disparais du feed Duo</b> — sans Riot lié, plus de matching.</>,
            <>Ton <b style={{ color: T.text }}>rang, ton pool et tes stats</b> synchronisés sont retirés.</>,
            <>Tu perds ton <b style={{ color: T.text }}>badge Vérifié</b>.</>,
          ]}
          note={<>Ton compte, tes conversations et ton pseudo sont conservés. Tu pourras <b style={{ color: T.text }}>relier un compte Riot</b> plus tard.</>}
          cancelLabel="Annuler" confirmLabel={`Délier ${riotAccount.game_name}#${riotAccount.tag_line}`}
          confirming={busy} onClose={() => setModal(null)} onConfirm={confirmUnlink}
        />
      )}
      {modal === 'delete' && (
        <ConfirmModal
          title="Supprimer ton compte ?"
          lines={[
            <>Ton <b style={{ color: T.text }}>profil, tes conversations, tes duos</b> et toutes tes données sont <b style={{ color: T.text }}>effacés définitivement</b>.</>,
            <>Cette action est <b style={{ color: T.text }}>irréversible</b> — aucune récupération possible.</>,
          ]}
          cancelLabel="Annuler" confirmLabel="Supprimer définitivement"
          confirming={busy} onClose={() => setModal(null)}
          onConfirm={async () => { setBusy(true); const r = await fetch('/api/me/delete', { method: 'POST' }); if (r.ok) { await createClient().auth.signOut(); router.push(`/${locale}/login`) } else { setBusy(false) } }}
        />
      )}
    </div>
  )
}

function platformName(p: string): string {
  const M: Record<string, string> = { euw1: 'Europe Ouest', eun1: 'Europe Nord & Est', na1: 'Amérique du Nord', kr: 'Corée', br1: 'Brésil' }
  return M[p] ?? p.toUpperCase()
}
