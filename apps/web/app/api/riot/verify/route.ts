// Public endpoint — no auth required.
// Verifies a Riot ID and returns account data for onboarding step 1 preview.
// Does NOT save anything to the database; linking happens after signup.
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
  const body = await request.json() as { gameName: string; tagLine: string; platform: string }
  const { gameName, tagLine, platform } = body

  if (!gameName || !tagLine || !platform) {
    return NextResponse.json({ error: 'gameName, tagLine and platform are required' }, { status: 400 })
  }

  const region = PLATFORM_TO_REGION[platform]
  if (!region) return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })

  try {
    const account = await getAccountByRiotId(gameName, tagLine, region)
    if (!account) return NextResponse.json({ error: 'Compte introuvable. Vérifie le Riot ID et le serveur.' }, { status: 404 })

    const summoner = await getSummonerByPuuid(account.puuid, platform)
    if (!summoner) return NextResponse.json({ error: 'Summoner introuvable.' }, { status: 404 })

    const [entries, mastery, champMap] = await Promise.all([
      getLeagueEntries(account.puuid, platform),
      getChampionMastery(account.puuid, platform),
      getChampionMap(),
    ])

    const soloEntry = entries?.find(e => e.queueType === 'RANKED_SOLO_5x5')
    // Sort by last play time (most recently played first) — more relevant than total mastery points
    const topChamps = (mastery ?? [])
      .sort((a, b) => b.lastPlayTime - a.lastPlayTime)
      .slice(0, 5)
      .map(m => champMap.get(m.championId)?.key)
      .filter((k): k is string => Boolean(k))

    return NextResponse.json({
      success: true,
      puuid: account.puuid,
      gameName: account.gameName,
      tagLine: account.tagLine,
      platform,
      region,
      tier: soloEntry?.tier ?? null,
      rank: soloEntry?.rank ?? null,
      lp: soloEntry?.leaguePoints ?? null,
      level: summoner.summonerLevel ?? null,
      topChamps,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[riot/verify]', msg)
    if (msg.startsWith('RATE_LIMITED')) return NextResponse.json({ error: 'Riot API rate limited — réessaie dans quelques secondes.' }, { status: 429 })
    if (msg.includes('RIOT_API_KEY')) return NextResponse.json({ error: 'RIOT_API_KEY non configurée.' }, { status: 503 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
