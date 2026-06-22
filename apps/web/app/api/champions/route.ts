import { NextResponse } from 'next/server'
import { getDDragonVersion } from '@/lib/riot/client'
import https from 'node:https'

// Servie à la demande (jamais prérendue au build) — dépend d'un fetch DDragon externe
export const dynamic = 'force-dynamic'

type DDragonChamp = {
  id: string
  key: string
  name: string
  tags: string[]
}

type DDragonResponse = {
  data: Record<string, DDragonChamp>
}

function httpsGetRaw<T>(url: string): Promise<T> {
  const agent = new https.Agent({ rejectUnauthorized: false })
  return new Promise((resolve, reject) => {
    const req = https.get(url, { agent }, (res) => {
      let raw = ''
      res.on('data', (chunk: string) => { raw += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(raw)) }
        catch { reject(new Error('JSON parse error')) }
      })
    })
    req.on('error', reject)
  })
}

export type ChampionEntry = {
  id: string     // Data Dragon id, used for image URL  e.g. "Ahri"
  key: string    // numeric string key e.g. "103"
  name: string   // display name e.g. "Ahri"
  cls: string    // primary class lowercase e.g. "mage"
  version: string
}

let cache: { data: ChampionEntry[]; ts: number } | null = null
const CACHE_TTL = 1000 * 60 * 60 // 1 hour

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }

  const version = await getDDragonVersion()
  const raw = await httpsGetRaw<DDragonResponse>(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/fr_FR/champion.json`
  )

  const TAG_TO_CLASS: Record<string, string> = {
    Fighter: 'fighter', Mage: 'mage', Assassin: 'assassin',
    Marksman: 'marksman', Support: 'support', Tank: 'tank',
  }

  const champs: ChampionEntry[] = Object.values(raw.data)
    .map(c => ({
      id: c.id,
      key: c.key,
      name: c.name,
      cls: TAG_TO_CLASS[c.tags[0]] ?? 'fighter',
      version,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  cache = { data: champs, ts: Date.now() }
  return NextResponse.json(champs)
}
