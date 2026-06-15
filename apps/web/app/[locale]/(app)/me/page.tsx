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
    { data: availability },
  ] = await Promise.all([
    supabase.from('profiles').select('display_name, bio').eq('id', user.id).single(),
    supabase.from('riot_accounts').select('id, game_name, tag_line, profile_icon_id, last_synced_at').eq('profile_id', user.id).maybeSingle(),
    supabase.from('matching_prefs').select('main_roles, looking_for_roles, champion_pool, playstyles, languages, voice_required').eq('profile_id', user.id).maybeSingle(),
    supabase.from('availability').select('weekday, slot, intensity').eq('profile_id', user.id),
  ])

  let rankKey: string | null = null
  let division: string | null = null
  let lp: number | null = null
  let masteryKeys: string[] = []

  if (riotAccount?.id) {
    const [{ data: soloRank }, { data: mastery }] = await Promise.all([
      supabase.from('ranks').select('tier, division, league_points').eq('riot_account_id', riotAccount.id).eq('queue', 'RANKED_SOLO_5x5').maybeSingle(),
      supabase.from('champion_mastery').select('champion_key').eq('riot_account_id', riotAccount.id).order('mastery_points', { ascending: false }).limit(5),
    ])
    if (soloRank) { rankKey = soloRank.tier?.toLowerCase() ?? null; division = soloRank.division ?? null; lp = soloRank.league_points ?? null }
    masteryKeys = (mastery ?? []).map(m => m.champion_key).filter(Boolean) as string[]
  }

  // champion_pool depuis matching_prefs (édité par le user).
  // Si vide (premier chargement après onboarding ou compte sans pool),
  // on initialise depuis la mastery Riot sur le rôle principal.
  const rawPool = prefs?.champion_pool
  const savedPool: Record<string, string[]> =
    rawPool !== null && rawPool !== undefined && !Array.isArray(rawPool) && typeof rawPool === 'object'
      ? (rawPool as Record<string, string[]>)
      : {}
  const mainRoles = (prefs?.main_roles as string[]) ?? []
  const champPool: Record<string, string[]> =
    Object.keys(savedPool).length > 0
      ? savedPool
      : masteryKeys.length > 0 && mainRoles[0]
        ? { [mainRoles[0]]: masteryKeys }
        : {}

  const lookingForRoles = (prefs?.looking_for_roles as string[]) ?? []
  const playstyles      = (prefs?.playstyles as string[])        ?? []
  const languages       = (prefs?.languages as string[])         ?? []

  return (
    <MeClient
      userId={user.id}
      displayName={profile?.display_name ?? null}
      gameName={riotAccount?.game_name ?? null}
      tagLine={riotAccount?.tag_line ?? null}
      rankKey={rankKey}
      division={division}
      lp={lp}
      mainRoles={mainRoles}
      secondaryRole={mainRoles[1] ?? null}
      lookingForRoles={lookingForRoles}
      bio={profile?.bio ?? null}
      playstyles={playstyles}
      languages={languages}
      voiceRequired={prefs?.voice_required ?? false}
      availability={(availability ?? []) as { weekday: number; slot: number; intensity: number }[]}
      champPool={champPool}
      lastSyncedAt={riotAccount?.last_synced_at ?? null}
      profileIconId={riotAccount?.profile_icon_id ?? null}
    />
  )
}
