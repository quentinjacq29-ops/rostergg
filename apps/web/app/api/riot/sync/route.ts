import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import {
  getSummonerByPuuid,
  getLeagueEntries,
  getChampionMastery,
  getChampionMap,
} from '@/lib/riot/client'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch existing riot account
  const { data: riotAccount } = await supabase
    .from('riot_accounts')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  if (!riotAccount) return NextResponse.json({ error: 'No Riot account linked' }, { status: 404 })

  try {
    // 1. Sync summoner data (euw1)
    const summoner = await getSummonerByPuuid(riotAccount.puuid, riotAccount.platform)
    if (!summoner) return NextResponse.json({ error: 'Summoner not found on Riot servers.' }, { status: 404 })

    await supabase.from('riot_accounts').update({
      summoner_id: summoner.id,
      profile_icon_id: summoner.profileIconId,
      summoner_level: summoner.summonerLevel,
      last_synced_at: new Date().toISOString(),
    }).eq('id', riotAccount.id)

    // 2. Sync ranks
    const entries = await getLeagueEntries(riotAccount.puuid, riotAccount.platform)
    if (entries && entries.length > 0) {
      const { error: rankErr } = await supabase.from('ranks').upsert(
        entries.map((e) => ({
          riot_account_id: riotAccount.id,
          queue: e.queueType,
          tier: e.tier,
          division: e.rank,
          league_points: e.leaguePoints,
          wins: e.wins,
          losses: e.losses,
          synced_at: new Date().toISOString(),
        })),
        { onConflict: 'riot_account_id,queue' }
      )
      if (rankErr) console.error('[sync/ranks]', rankErr)
    }

    // 3. Sync mastery
    const mastery = await getChampionMastery(riotAccount.puuid, riotAccount.platform)
    if (mastery && mastery.length > 0) {
      const champMap = await getChampionMap()
      const { error: masteryErr } = await supabase.from('champion_mastery').upsert(
        mastery.map((m) => ({
          riot_account_id: riotAccount.id,
          champion_id: m.championId,
          champion_key: champMap.get(m.championId)?.key ?? null,
          mastery_level: m.championLevel,
          mastery_points: m.championPoints,
          synced_at: new Date().toISOString(),
        })),
        { onConflict: 'riot_account_id,champion_id' }
      )
      if (masteryErr) console.error('[sync/mastery]', masteryErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[riot/sync]', msg)
    if (msg.startsWith('RATE_LIMITED')) return NextResponse.json({ error: 'Rate limited, réessaie.' }, { status: 429 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
