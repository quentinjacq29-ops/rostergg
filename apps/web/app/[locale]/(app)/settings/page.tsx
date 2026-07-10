import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export const metadata: Metadata = { robots: { index: false, follow: false } }

function rankLabel(tier: string | null, division: string | null): string | null {
  if (!tier) return null
  const t = tier.toUpperCase()
  return ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(t) ? t : `${t} ${division ?? ''}`.trim()
}

export default async function SettingsPage({ params }: { params: { locale: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${params.locale}/login`)

  const [{ data: profile }, { data: ra }, { data: blocks }] = await Promise.all([
    supabase.from('profiles').select('display_name, profile_discoverable, show_online_status, allow_requests_from_all, request_policy, notification_prefs').eq('id', user.id).maybeSingle(),
    supabase.from('riot_accounts').select('game_name, tag_line, platform, ranks(tier, division, queue)').eq('profile_id', user.id).maybeSingle(),
    supabase.from('blocks').select('blocked, profiles!blocked(display_name)').eq('blocker', user.id),
  ])

  const solo = (ra as any)?.ranks?.find((r: any) => r.queue === 'RANKED_SOLO_5x5') ?? null
  // Défaut produit : « Tout le monde » ; l'utilisateur opte pour « ma tranche d'elo » s'il veut.
  const policy = (profile as any)?.request_policy ?? 'all'

  return (
    <SettingsClient
      locale={params.locale}
      email={user.email ?? ''}
      initialDisplayName={profile?.display_name ?? (ra as any)?.game_name ?? ''}
      initialDiscoverable={profile?.profile_discoverable ?? true}
      initialShowOnline={profile?.show_online_status ?? true}
      initialRequestPolicy={policy}
      initialNotifPrefs={(profile?.notification_prefs as Record<string, Record<string, boolean>> | null) ?? {}}
      riotAccount={ra ? { game_name: (ra as any).game_name, tag_line: (ra as any).tag_line, platform: (ra as any).platform, rankLabel: rankLabel(solo?.tier, solo?.division) } : null}
      blocks={(blocks ?? []) as unknown as { blocked: string; profiles: { display_name: string | null } | null }[]}
    />
  )
}
