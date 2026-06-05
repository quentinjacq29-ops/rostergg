import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntries,
  getChampionMastery,
  getChampionMap,
  PLATFORM_TO_REGION,
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

  const body = await request.json() as { gameName: string; tagLine: string; platform: string }
  const { gameName, tagLine, platform } = body

  if (!gameName || !tagLine || !platform) {
    return NextResponse.json({ error: 'gameName, tagLine and platform are required' }, { status: 400 })
  }

  const region = PLATFORM_TO_REGION[platform]
  if (!region) return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })

  try {
    // 1. Resolve PUUID
    const account = await getAccountByRiotId(gameName, tagLine, region)
    if (!account) return NextResponse.json({ error: 'Riot account not found. Check name and tag.' }, { status: 404 })

    // 2. Get summoner data
    const summoner = await getSummonerByPuuid(account.puuid, platform)
    if (!summoner) return NextResponse.json({ error: 'Summoner not found.' }, { status: 404 })

    // 3. Upsert riot_accounts
    const { data: riotAccount, error: riotErr } = await supabase
      .from('riot_accounts')
      .upsert(
        {
          profile_id: user.id,
          puuid: account.puuid,
          summoner_id: summoner.id,
          game_name: account.gameName,
          tag_line: account.tagLine,
          platform,
          region,
          profile_icon_id: summoner.profileIconId,
          summoner_level: summoner.summonerLevel,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id' }
      )
      .select()
      .single()

    if (riotErr) throw riotErr

    // 4. Upsert ranks
    const entries = await getLeagueEntries(account.puuid, platform)
    if (entries && entries.length > 0) {
      await supabase.from('ranks').upsert(
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
    }

    // 5. Upsert champion mastery
    const mastery = await getChampionMastery(account.puuid, platform)
    const champMap = await getChampionMap()
    if (mastery && mastery.length > 0) {
      await supabase.from('champion_mastery').upsert(
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
    }

    const soloEntry = entries?.find(e => e.queueType === 'RANKED_SOLO_5x5')

    // Top champion IDs (string keys like "Ahri") for pre-filling step 6
    const topChamps = (mastery ?? [])
      .sort((a, b) => b.lastPlayTime - a.lastPlayTime)
      .slice(0, 5)
      .map(m => champMap.get(m.championId)?.key)
      .filter((k): k is string => Boolean(k))

    return NextResponse.json({
      success: true,
      tier: soloEntry?.tier ?? null,
      rank: soloEntry?.rank ?? null,
      lp: soloEntry?.leaguePoints ?? null,
      level: summoner.summonerLevel ?? null,
      topChamps,
    })
  } catch (err) {
    const msg =
      err instanceof Error ? err.message :
      typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message) :
      String(err)

    console.error('[riot/link]', msg, err)

    if (msg.startsWith('RATE_LIMITED')) {
      return NextResponse.json({ error: 'Riot API rate limited — réessaie dans quelques secondes.' }, { status: 429 })
    }
    if (msg.includes('RIOT_API_KEY')) {
      return NextResponse.json({ error: 'RIOT_API_KEY not configured on server.' }, { status: 503 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
