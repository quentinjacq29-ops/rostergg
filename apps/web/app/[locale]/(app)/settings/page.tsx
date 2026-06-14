import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage({ params }: { params: { locale: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${params.locale}/login`)

  const [{ data: profile }, { data: ra }, { data: blocks }] = await Promise.all([
    supabase.from('profiles').select('display_name, profile_discoverable, show_online_status, allow_requests_from_all, notification_prefs').eq('id', user.id).maybeSingle(),
    supabase.from('riot_accounts').select('game_name, tag_line, platform').eq('profile_id', user.id).maybeSingle(),
    supabase.from('blocks').select('blocked, profiles!blocked(display_name)').eq('blocker', user.id),
  ])

  return (
    <SettingsClient
      locale={params.locale}
      email={user.email ?? ''}
      initialDisplayName={profile?.display_name ?? ra?.game_name ?? ''}
      initialDiscoverable={profile?.profile_discoverable ?? true}
      initialShowOnline={profile?.show_online_status ?? true}
      initialAllowAll={profile?.allow_requests_from_all ?? false}
      initialNotifPrefs={(profile?.notification_prefs as Record<string, Record<string, boolean>> | null) ?? {}}
      riotAccount={ra ?? null}
      blocks={(blocks ?? []) as unknown as { blocked: string; profiles: { display_name: string | null } | null }[]}
    />
  )
}
