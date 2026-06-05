// Server-side only — RIOT_API_KEY never exposed to the client
import https from 'node:https'

// Bypasses TLS cert validation issues in dev/corporate proxy environments
const riotAgent = new https.Agent({ rejectUnauthorized: false })

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

export type RiotAccount = { puuid: string; gameName: string; tagLine: string }
export type RiotSummoner = { id: string; accountId: string; profileIconId: number; puuid: string; summonerLevel: number }
export type RiotLeagueEntry = { queueType: string; tier: string; rank: string; leaguePoints: number; wins: number; losses: number }
export type RiotMasteryEntry = { championId: number; championLevel: number; championPoints: number; lastPlayTime: number }

function httpsGet<T>(url: string, headers: Record<string, string> = {}): Promise<{ status: number; data: T; retryAfter?: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { agent: riotAgent, headers }, (res) => {
      let raw = ''
      res.on('data', (chunk: string) => { raw += chunk })
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode ?? 0,
            data: raw ? JSON.parse(raw) : null,
            retryAfter: res.headers['retry-after'] as string | undefined,
          })
        } catch {
          reject(new Error(`JSON parse error for ${url}`))
        }
      })
    })
    req.on('error', reject)
  })
}

async function riotFetch<T>(url: string): Promise<T | null> {
  const key = process.env.RIOT_API_KEY
  if (!key) throw new Error('RIOT_API_KEY not configured')

  const { status, data, retryAfter } = await httpsGet<T>(url, { 'X-Riot-Token': key })

  if (status === 404) return null
  if (status === 429) throw new Error(`RATE_LIMITED:${retryAfter ?? '1'}`)
  if (status < 200 || status >= 300) {
    console.error(`[riot] ${status} for ${url}`, JSON.stringify(data).slice(0, 200))
    throw new Error(`RIOT_API_ERROR:${status}`)
  }

  return data
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
  const { data: versions } = await httpsGet<string[]>('https://ddragon.leagueoflegends.com/api/versions.json')
  const version = versions[0]

  const { data } = await httpsGet<{ data: Record<string, { key: string; name: string; id: string }> }>(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`
  )

  const map = new Map<number, { key: string; name: string }>()
  for (const champ of Object.values(data.data)) {
    map.set(parseInt(champ.key), { key: champ.id, name: champ.name })
  }
  return map
}

export async function getDDragonVersion(): Promise<string> {
  const { data: versions } = await httpsGet<string[]>('https://ddragon.leagueoflegends.com/api/versions.json')
  return versions[0]
}
