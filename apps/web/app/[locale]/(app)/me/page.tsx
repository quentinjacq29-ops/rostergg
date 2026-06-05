import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { championIconUrl, profileIconUrl, TIER_COLORS, PLATFORM_LABELS } from '@/lib/riot/assets'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import RiotLinkForm from '@/components/RiotLinkForm'
import RiotSyncButton from '@/components/RiotSyncButton'

type Props = { params: { locale: string } }

export default async function MePage({ params: { locale } }: Props) {
  const t = await getTranslations('profile')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const [{ data: profile }, { data: riotAccount }] = await Promise.all([
    supabase.from('profiles').select('display_name, avatar_url, subscription_status').eq('id', user.id).single(),
    supabase.from('riot_accounts').select('*').eq('profile_id', user.id).maybeSingle(),
  ])

  const [ranks, mastery] = riotAccount
    ? await Promise.all([
        supabase.from('ranks').select('*').eq('riot_account_id', riotAccount.id).order('queue'),
        supabase.from('champion_mastery').select('*').eq('riot_account_id', riotAccount.id).order('mastery_points', { ascending: false }).limit(10),
      ]).then((r) => [r[0].data, r[1].data])
    : [null, null]

  const soloRank = ranks?.find((r: { queue: string }) => r.queue === 'RANKED_SOLO_5x5')
  const flexRank = ranks?.find((r: { queue: string }) => r.queue === 'RANKED_FLEX_SR')

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
          <LanguageSwitcher />
        </div>

        {/* Profile card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-400 overflow-hidden shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (profile?.display_name ?? user.email ?? '?')[0].toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{profile?.display_name ?? user.email}</p>
            <p className="text-sm text-zinc-500 truncate">{user.email}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
            profile?.subscription_status === 'premium'
              ? 'bg-violet-500/20 text-violet-300'
              : 'bg-zinc-800 text-zinc-400'
          }`}>
            {profile?.subscription_status === 'premium' ? 'Premium' : 'Free'}
          </span>
        </div>

        {/* Riot account */}
        {riotAccount ? (
          <>
            {/* Riot ID + icon */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-center gap-4">
                <img
                  src={profileIconUrl(riotAccount.profile_icon_id ?? 1)}
                  alt=""
                  className="h-14 w-14 rounded-full border-2 border-zinc-700"
                />
                <div className="flex-1">
                  <p className="font-semibold text-white">
                    {riotAccount.game_name}
                    <span className="text-zinc-500 font-normal ml-1">#{riotAccount.tag_line}</span>
                  </p>
                  <p className="text-sm text-zinc-500">
                    {PLATFORM_LABELS[riotAccount.platform] ?? riotAccount.platform}
                    {riotAccount.summoner_level ? ` · Niveau ${riotAccount.summoner_level}` : ''}
                  </p>
                </div>
                <RiotSyncButton />
              </div>

              {/* Ranks */}
              {(soloRank || flexRank) && (
                <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-2 gap-3">
                  {[soloRank, flexRank].map((rank, i) => rank ? (
                    <div key={i} className="bg-zinc-800/60 rounded-lg p-3">
                      <p className="text-xs text-zinc-500 mb-1">
                        {rank.queue === 'RANKED_SOLO_5x5' ? 'Solo/Duo' : 'Flex'}
                      </p>
                      <p className={`font-bold ${TIER_COLORS[rank.tier] ?? 'text-white'}`}>
                        {rank.tier} {rank.division}
                      </p>
                      <p className="text-sm text-zinc-400">{rank.league_points} LP</p>
                      <p className="text-xs text-zinc-600 mt-1">
                        {rank.wins}W {rank.losses}L
                        {rank.wins + rank.losses > 0 && (
                          <span className="ml-1 text-zinc-500">
                            ({Math.round((rank.wins / (rank.wins + rank.losses)) * 100)}%)
                          </span>
                        )}
                      </p>
                    </div>
                  ) : null)}
                </div>
              )}
            </div>

            {/* Champion pool */}
            {mastery && mastery.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <h2 className="text-sm font-semibold text-zinc-400 mb-4">{t('champPool')}</h2>
                <div className="flex flex-wrap gap-3">
                  {mastery.map((m: { champion_id: number; champion_key: string | null; mastery_level: number; mastery_points: number }) => (
                    <div key={m.champion_id} className="flex flex-col items-center gap-1.5 group">
                      <div className="relative">
                        {m.champion_key ? (
                          <img
                            src={championIconUrl(m.champion_key)}
                            alt={m.champion_key}
                            className="h-12 w-12 rounded-lg border border-zinc-700 group-hover:border-duo transition-colors"
                            />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-600">
                            ?
                          </div>
                        )}
                        <span className={`absolute -bottom-1 -right-1 text-[10px] font-bold px-1 rounded-sm ${
                          m.mastery_level >= 7 ? 'bg-yellow-500 text-zinc-950' :
                          m.mastery_level >= 5 ? 'bg-purple-500 text-white' :
                          'bg-zinc-700 text-zinc-300'
                        }`}>
                          {m.mastery_level}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500">{m.champion_key ?? '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Riot link form */
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-5">
            <div>
              <h2 className="font-semibold text-white">{t('riotLink.title')}</h2>
              <p className="text-sm text-zinc-500 mt-1">{t('riotLink.subtitle')}</p>
            </div>
            <RiotLinkForm />
          </div>
        )}

      </div>
    </main>
  )
}
