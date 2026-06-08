// Server-side only — RIOT_API_KEY never exposed to the client
// Utilise le fetch global Next.js (undici) pour traverser les proxies corporate (Zscaler)

export const PLATFORM_TO_REGION: Record<string, string> = {
  euw1: 'europe',
  na1: 'americas',
  kr: 'asia',
  eun1: 'europe',
  br1: 'americas',
  la1: 'americas',
  la2: 'americas',
  oc1: 'sea',
  tr1: 'europe',
  jp1: 'asia',
}

export type RiotPlatform = keyof typeof PLATFORM_TO_REGION

export type RiotAccount      = { puuid: string; gameName: string; tagLine: string }
export type RiotSummoner      = { id: string; accountId: string; profileIconId: number; puuid: string; summonerLevel: number }
export type RiotLeagueEntry   = { queueType: string; tier: string; rank: string; leaguePoints: number; wins: number; losses: number }
export type RiotMasteryEntry  = { championId: number; championLevel: number; championPoints: number; lastPlayTime: number }

async function riotFetch<T>(url: string): Promise<T | null> {
  const key = process.env.RIOT_API_KEY
  if (!key) throw new Error('RIOT_API_KEY not configured')

  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'X-Riot-Token': key, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(12000),
      // @ts-ignore — Next.js / undici accepts this to bypass TLS issues in dev
      ...(process.env.NODE_ENV !== 'production' ? { dispatcher: undefined } : {}),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('ECONNRESET') || msg.includes('fetch failed') || msg.includes('timeout')) {
      throw new Error(
        'Impossible de joindre l\'API Riot (réseau bloqué — désactive Zscaler ou teste depuis Vercel).'
      )
    }
    throw err
  }

  if (res.status === 404) return null
  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after') ?? '1'
    throw new Error(`RATE_LIMITED:${retryAfter}`)
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('Clé API Riot invalide ou expirée — génère une nouvelle clé sur developer.riotgames.com')
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[riot] ${res.status} for ${url}`, body.slice(0, 200))
    throw new Error(`RIOT_API_ERROR:${res.status}`)
  }

  return res.json() as Promise<T>
}

// Fallback pour Data Dragon qui n'a pas besoin de la clé API
async function ddFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`DDragon error ${res.status} for ${url}`)
  return res.json() as Promise<T>
}

export function getAccountByRiotId(gameName: string, tagLine: string, region: string) {
  return riotFetch<RiotAccount>(
    `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
  )
}

export function getSummonerByPuuid(puuid: string, platform: string) {
  return riotFetch<RiotSummoner>(
    `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`
  )
}

export function getLeagueEntries(puuid: string, platform: string) {
  return riotFetch<RiotLeagueEntry[]>(
    `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`
  )
}

export function getChampionMastery(puuid: string, platform: string, count = 10) {
  return riotFetch<RiotMasteryEntry[]>(
    `https://${platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=${count}`
  )
}

export async function getChampionMap(): Promise<Map<number, { key: string; name: string }>> {
  const versions = await ddFetch<string[]>('https://ddragon.leagueoflegends.com/api/versions.json')
  const version  = versions[0]
  const json     = await ddFetch<{ data: Record<string, { key: string; name: string; id: string }> }>(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`
  )
  const map = new Map<number, { key: string; name: string }>()
  for (const champ of Object.values(json.data)) {
    map.set(parseInt(champ.key), { key: champ.id, name: champ.name })
  }
  return map
}

export async function getDDragonVersion(): Promise<string> {
  const versions = await ddFetch<string[]>('https://ddragon.leagueoflegends.com/api/versions.json')
  return versions[0]
}
