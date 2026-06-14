'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const T = {
  bg: '#0a0c14', surface: '#0f121c', elevated: '#161a26',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f4f6ff', textDim: '#9aa2bf', textMute: '#5a607a',
  cyan: '#00e0ff', violet: '#8b5cf6', danger: '#ff3d6e',
  display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)',
}

type Tab = 'compte' | 'notifs' | 'confidentialite' | 'bloques' | 'langue'

const TABS: { id: Tab; label: string }[] = [
  { id: 'compte',          label: 'Compte'          },
  { id: 'notifs',          label: 'Notifications'   },
  { id: 'confidentialite', label: 'Confidentialité' },
  { id: 'bloques',         label: 'Bloqués'         },
  { id: 'langue',          label: 'Langue'          },
]

const NOTIF_TYPES = [
  { id: 'duo_request',  label: 'Demandes de duo'      },
  { id: 'duo_accepted', label: 'Duo accepté'           },
  { id: 'team_invite',  label: 'Invitations équipe'   },
  { id: 'system',       label: 'Notifications système' },
]

const LANGS = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English'  },
]

type Props = {
  locale:              string
  email:               string
  initialDisplayName:  string
  initialDiscoverable: boolean
  initialShowOnline:   boolean
  initialAllowAll:     boolean
  initialNotifPrefs:   Record<string, Record<string, boolean>>
  riotAccount:         { game_name: string; tag_line: string; platform: string } | null
  blocks:              { blocked: string; profiles: { display_name: string | null } | null }[]
}

export default function SettingsClient({
  locale, email, initialDisplayName, initialDiscoverable,
  initialShowOnline, initialAllowAll, initialNotifPrefs,
  riotAccount, blocks: initialBlocks,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('compte')

  // Compte
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [nameError,   setNameError]   = useState<string | null>(null)

  // Confidentialité
  const [discoverable, setDiscoverable] = useState(initialDiscoverable)
  const [showOnline,   setShowOnline]   = useState(initialShowOnline)
  const [allowAll,     setAllowAll]     = useState(initialAllowAll)
  const [privSaving,   setPrivSaving]   = useState(false)

  // Notifs
  const [notifPrefs, setNotifPrefs] = useState(initialNotifPrefs)
  const [notifSaving, setNotifSaving] = useState(false)

  // Bloqués
  const [blocks, setBlocks] = useState<{ blocked: string; profiles: { display_name: string | null } | null }[]>(initialBlocks)

  async function saveAccount() {
    if (!displayName.trim()) { setNameError('Le pseudo ne peut pas être vide'); return }
    setSaving(true); setNameError(null)
    const res = await fetch('/api/me/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: displayName.trim() }) })
    setSaving(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setNameError(d.error ?? 'Erreur'); return }
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/${locale}/login`)
  }

  async function unlinkRiot() {
    if (!confirm('Délier le compte Riot ? Vos rangs et mastery seront supprimés.')) return
    await fetch('/api/me/riot/unlink', { method: 'POST' })
    router.refresh()
  }

  async function savePrivacy(patch: Partial<{ profileDiscoverable: boolean; showOnlineStatus: boolean; allowRequestsFromAll: boolean }>) {
    setPrivSaving(true)
    await fetch('/api/me/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    setPrivSaving(false)
  }

  async function saveNotifPref(type: string, channel: string, value: boolean) {
    const next = { ...notifPrefs, [type]: { ...(notifPrefs[type] ?? {}), [channel]: value } }
    setNotifPrefs(next)
    setNotifSaving(true)
    await fetch('/api/me/settings/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
    setNotifSaving(false)
  }

  async function unblock(blockedId: string) {
    await fetch(`/api/me/blocks/${blockedId}`, { method: 'DELETE' })
    setBlocks(prev => prev.filter(b => b.blocked !== blockedId))
  }

  function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        onClick={() => onChange(!value)}
        style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', border: 'none', cursor: 'pointer', background: value ? T.cyan : T.lineStrong, transition: 'background .2s' }}
      >
        <span style={{ position: 'absolute', top: 3, left: value ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: value ? '#001018' : T.textMute, transition: 'left .2s' }} />
      </button>
    )
  }

  function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: `1px solid ${T.line}` }}>
        <div>
          <div style={{ fontFamily: T.body, fontSize: 14, fontWeight: 600, color: T.text }}>{label}</div>
          {desc && <div style={{ fontFamily: T.body, fontSize: 12, color: T.textMute, marginTop: 3 }}>{desc}</div>}
        </div>
        {children}
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: T.bg, color: T.text, fontFamily: T.body }}>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sub-nav */}
        <aside style={{ width: 220, flexShrink: 0, padding: '24px 12px', borderRight: `1px solid ${T.line}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 11, border: `1px solid ${tab === t.id ? T.violet + '55' : 'transparent'}`, background: tab === t.id ? `${T.violet}1a` : 'transparent', cursor: 'pointer', fontFamily: T.display, fontSize: 13, letterSpacing: '0.08em', color: tab === t.id ? T.text : T.textDim, textAlign: 'left' }}
            >
              {tab === t.id && <span style={{ width: 3, height: 16, borderRadius: 2, background: T.violet, boxShadow: `0 0 8px ${T.violet}`, flexShrink: 0 }} />}
              {t.label.toUpperCase()}
            </button>
          ))}

          <div style={{ flex: 1 }} />
          <div style={{ height: 1, background: T.line, margin: '8px 4px 12px' }} />
          <button
            onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 11, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', fontFamily: T.display, fontSize: 13, letterSpacing: '0.08em', color: T.danger, textAlign: 'left' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            SE DÉCONNECTER
          </button>
        </aside>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>

          {/* ── COMPTE ── */}
          {tab === 'compte' && (
            <div style={{ maxWidth: 560 }}>
              <h2 style={{ fontFamily: T.display, fontSize: 18, letterSpacing: '0.08em', color: T.text, marginBottom: 28 }}>COMPTE</h2>

              <Row label="Pseudo public" desc="Affiché partout. Différent du Riot ID.">
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    maxLength={32}
                    style={{ width: 180, padding: '8px 12px', borderRadius: 9, border: `1px solid ${nameError ? T.danger : T.lineStrong}`, background: T.surface, fontFamily: T.body, fontSize: 13, color: T.text, outline: 'none' }}
                  />
                  <button
                    onClick={saveAccount}
                    disabled={saving}
                    style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: saved ? '#00ff9d' : `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, color: '#001018', fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}
                  >
                    {saved ? 'SAUVÉ ✓' : saving ? '…' : 'SAUVER'}
                  </button>
                </div>
              </Row>
              {nameError && <div style={{ fontFamily: T.mono, fontSize: 11, color: T.danger, marginTop: -12, marginBottom: 8 }}>{nameError}</div>}

              <Row label="Email" desc="Utilisé pour la connexion">
                <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMute }}>{email}</span>
              </Row>

              <Row label="Compte Riot" desc={riotAccount ? `${riotAccount.game_name}#${riotAccount.tag_line} · ${riotAccount.platform.toUpperCase()}` : 'Aucun compte lié'}>
                {riotAccount ? (
                  <button
                    onClick={unlinkRiot}
                    style={{ padding: '8px 14px', borderRadius: 9, border: `1px solid ${T.danger}44`, background: `${T.danger}12`, color: T.danger, fontFamily: T.mono, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    DÉLIER
                  </button>
                ) : (
                  <button style={{ padding: '8px 14px', borderRadius: 9, border: `1px solid ${T.cyan}44`, background: `${T.cyan}12`, color: T.cyan, fontFamily: T.mono, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    LIER
                  </button>
                )}
              </Row>

              <div style={{ marginTop: 40, padding: 20, borderRadius: 14, border: `1px solid ${T.danger}44`, background: `${T.danger}08` }}>
                <div style={{ fontFamily: T.display, fontSize: 13, letterSpacing: '0.08em', color: T.danger, marginBottom: 10 }}>ZONE DANGEREUSE</div>
                <div style={{ fontFamily: T.body, fontSize: 13, color: T.textDim, marginBottom: 16 }}>Supprimer votre compte est irréversible. Toutes vos données seront effacées.</div>
                <button style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${T.danger}`, background: 'transparent', color: T.danger, fontFamily: T.mono, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  SUPPRIMER LE COMPTE
                </button>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {tab === 'notifs' && (
            <div style={{ maxWidth: 560 }}>
              <h2 style={{ fontFamily: T.display, fontSize: 18, letterSpacing: '0.08em', color: T.text, marginBottom: 8 }}>NOTIFICATIONS</h2>
              <div style={{ fontFamily: T.body, fontSize: 12.5, color: T.textMute, marginBottom: 28 }}>
                {notifSaving ? 'Sauvegarde…' : 'Choisissez comment vous souhaitez être notifié.'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', marginBottom: 8, borderBottom: `1px solid ${T.lineStrong}` }}>
                <span style={{ flex: 1 }} />
                <span style={{ width: 60, fontFamily: T.mono, fontSize: 9.5, color: T.textMute, letterSpacing: '0.1em', textAlign: 'center' }}>APPLI</span>
                <span style={{ width: 60, fontFamily: T.mono, fontSize: 9.5, color: T.textMute, letterSpacing: '0.1em', textAlign: 'center' }}>EMAIL</span>
              </div>

              {NOTIF_TYPES.map(nt => (
                <div key={nt.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${T.line}` }}>
                  <div style={{ flex: 1, fontFamily: T.body, fontSize: 13.5, color: T.text }}>{nt.label}</div>
                  <div style={{ width: 60, display: 'flex', justifyContent: 'center' }}>
                    <Toggle
                      value={notifPrefs[nt.id]?.inapp ?? true}
                      onChange={v => saveNotifPref(nt.id, 'inapp', v)}
                    />
                  </div>
                  <div style={{ width: 60, display: 'flex', justifyContent: 'center' }}>
                    <Toggle
                      value={notifPrefs[nt.id]?.email ?? false}
                      onChange={v => saveNotifPref(nt.id, 'email', v)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── CONFIDENTIALITÉ ── */}
          {tab === 'confidentialite' && (
            <div style={{ maxWidth: 560 }}>
              <h2 style={{ fontFamily: T.display, fontSize: 18, letterSpacing: '0.08em', color: T.text, marginBottom: 28 }}>CONFIDENTIALITÉ</h2>

              <Row label="Profil visible dans le feed" desc="Les autres joueurs peuvent vous trouver en cherchant un duo">
                <Toggle value={discoverable} onChange={v => { setDiscoverable(v); savePrivacy({ profileDiscoverable: v }) }} />
              </Row>
              <Row label="Afficher le statut en ligne" desc="Indique si vous êtes connecté">
                <Toggle value={showOnline} onChange={v => { setShowOnline(v); savePrivacy({ showOnlineStatus: v }) }} />
              </Row>
              <Row label="Accepter les demandes de tous" desc="Si désactivé, seuls vos matches peuvent vous contacter">
                <Toggle value={allowAll} onChange={v => { setAllowAll(v); savePrivacy({ allowRequestsFromAll: v }) }} />
              </Row>
              {privSaving && <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textMute, marginTop: 12 }}>Sauvegarde…</div>}
            </div>
          )}

          {/* ── BLOQUÉS ── */}
          {tab === 'bloques' && (
            <div style={{ maxWidth: 560 }}>
              <h2 style={{ fontFamily: T.display, fontSize: 18, letterSpacing: '0.08em', color: T.text, marginBottom: 28 }}>
                BLOQUÉS <span style={{ fontFamily: T.mono, fontSize: 13, color: T.textMute }}>({blocks.length})</span>
              </h2>

              {blocks.length === 0 && (
                <div style={{ fontFamily: T.body, fontSize: 13.5, color: T.textMute }}>Vous n'avez bloqué personne.</div>
              )}
              {blocks.map(b => (
                <div key={b.blocked} style={{ display: 'flex', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${T.line}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.textMute}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.mono, fontSize: 11, color: T.textDim, marginRight: 14 }}>
                    {(b.profiles?.display_name ?? '??').slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontFamily: T.body, fontSize: 13.5, color: T.text }}>{b.profiles?.display_name ?? b.blocked}</span>
                  <button
                    onClick={() => unblock(b.blocked)}
                    style={{ padding: '7px 14px', borderRadius: 9, border: `1px solid ${T.lineStrong}`, background: 'transparent', color: T.textDim, fontFamily: T.mono, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                  >
                    DÉBLOQUER
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── LANGUE ── */}
          {tab === 'langue' && (
            <div style={{ maxWidth: 560 }}>
              <h2 style={{ fontFamily: T.display, fontSize: 18, letterSpacing: '0.08em', color: T.text, marginBottom: 28 }}>LANGUE</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {LANGS.map(l => (
                  <button
                    key={l.code}
                    onClick={() => router.push(`/${l.code}/settings`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderRadius: 14, border: `1px solid ${locale === l.code ? T.cyan + '66' : T.line}`, background: locale === l.code ? `${T.cyan}12` : T.surface, cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: locale === l.code ? `${T.cyan}22` : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: locale === l.code ? T.cyan : T.textDim }}>
                      {l.code.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontFamily: T.body, fontSize: 14, fontWeight: 600, color: locale === l.code ? T.text : T.textDim }}>{l.label}</div>
                      {locale === l.code && <div style={{ fontFamily: T.mono, fontSize: 10, color: T.cyan, letterSpacing: '0.08em', marginTop: 2 }}>LANGUE ACTIVE</div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
