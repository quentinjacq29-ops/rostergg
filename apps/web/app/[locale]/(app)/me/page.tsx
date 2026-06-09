import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MeClient from '@/components/me/MeClient'

type Props = { params: { locale: string } }

export default async function MePage({ params: { locale } }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const [
    { data: profile },
    { data: riotAccount },
    { data: prefs },
  ] = await Promise.all([
    supabase.from('profiles').select('display_name, bio').eq('id', user.id).single(),
    supabase.from('riot_accounts').select('id, game_name, tag_line, profile_icon_id, last_synced_at').eq('profile_id', user.id).maybeSingle(),
    supabase.from('matching_prefs').select('main_roles, looking_for_roles, champion_pool').eq('profile_id', user.id).maybeSingle(),
  ])

  // Solo/duo rank + champion pool (si compte Riot lié)
  let rankKey: string | null = null
  let division: string | null = null
  let lp: number | null = null
  const champPool: string[] = []

  if (riotAccount?.id) {
    const [{ data: soloRank }, { data: mastery }] = await Promise.all([
      supabase
        .from('ranks')
        .select('tier, division, league_points')
        .eq('riot_account_id', riotAccount.id)
        .eq('queue', 'RANKED_SOLO_5x5')
        .maybeSingle(),
      supabase
        .from('champion_mastery')
        .select('champion_key')
        .eq('riot_account_id', riotAccount.id)
        .order('mastery_points', { ascending: false })
        .limit(5),
    ])
    if (soloRank) {
      rankKey  = soloRank.tier?.toLowerCase() ?? null
      division = soloRank.division ?? null
      lp       = soloRank.league_points ?? null
    }
    for (const m of mastery ?? []) {
      if (m.champion_key) champPool.push(m.champion_key)
    }
  }

  return (
    <MeClient
      userId={user.id}
      displayName={profile?.display_name ?? null}
      gameName={riotAccount?.game_name ?? null}
      tagLine={riotAccount?.tag_line ?? null}
      rankKey={rankKey}
      division={division}
      lp={lp}
      mainRole={prefs?.main_roles?.[0] ?? null}
      lookingFor={prefs?.looking_for_roles?.[0] ?? null}
      bio={profile?.bio ?? null}
      champPool={champPool}
      lastSyncedAt={riotAccount?.last_synced_at ?? null}
      profileIconId={riotAccount?.profile_icon_id ?? null}
    />
  )
}
