// Lazy cache des dernières parties (Match-V5). Le détail d'une partie est permanent :
// on ne re-télécharge jamais une partie connue, on récupère seulement les nouvelles.
// Tout est best-effort : si la table n'existe pas / Riot échoue / rate-limit → on lit
// ce qu'on a en base (ou rien), la section profil se masque, le reste du profil rend.
import type { SupabaseClient } from '@supabase/supabase-js'
import { getMatchIdsByPuuid, getMatch, getChampionMap, PLATFORM_TO_REGION } from './client'

export type RecentMatch = {
  matchId: string
  championKey: string
  kills: number; deaths: number; assists: number
  cs: number
  win: boolean
  duration: number   // secondes
  gameEnd: string     // ISO
}

const SYNC_TTL_MS = 90 * 60 * 1000 // re-sync au plus toutes les 90 min

export async function getRecentMatches(
  admin: SupabaseClient,
  ra: { id: string; puuid: string | null; platform: string | null },
): Promise<RecentMatch[]> {
  // 1. Sync best-effort (throttlé)
  try {
    if (ra.puuid) {
      const { data: acc } = await admin.from('riot_accounts').select('last_match_sync').eq('id', ra.id).maybeSingle()
      const last = (acc as { last_match_sync?: string } | null)?.last_match_sync
      const lastMs = last ? new Date(last).getTime() : 0
      if (Date.now() - lastMs > SYNC_TTL_MS) await syncMatches(admin, ra)
    }
  } catch { /* sync best-effort (Riot indispo / rate-limit) → on lit le cache */ }

  // 2. Lecture du cache
  try {
    const { data } = await admin
      .from('match_history')
      .select('match_id, champion_key, kills, deaths, assists, cs, win, duration, game_end')
      .eq('riot_account_id', ra.id)
      .not('champion_key', 'is', null)
      .order('game_end', { ascending: false })
      .limit(5)
    return (data ?? []).map((m: Record<string, unknown>) => ({
      matchId: m.match_id as string,
      championKey: m.champion_key as string,
      kills: m.kills as number, deaths: m.deaths as number, assists: m.assists as number,
      cs: m.cs as number, win: m.win as boolean, duration: m.duration as number,
      gameEnd: m.game_end as string,
    }))
  } catch { return [] }
}

async function syncMatches(admin: SupabaseClient, ra: { id: string; puuid: string | null; platform: string | null }) {
  const region = PLATFORM_TO_REGION[ra.platform ?? 'euw1'] ?? 'europe'
  const ids = await getMatchIdsByPuuid(ra.puuid!, region, 5)
  if (!ids?.length) { await touch(admin, ra.id); return }

  // ne récupère QUE les parties pas encore en base
  const { data: existing } = await admin.from('match_history').select('match_id').eq('riot_account_id', ra.id).in('match_id', ids)
  const have = new Set((existing ?? []).map((r: { match_id: string }) => r.match_id))
  const toFetch = ids.filter(id => !have.has(id))

  if (toFetch.length) {
    const champMap = await getChampionMap().catch(() => new Map<number, { key: string; name: string }>())
    const rows: Record<string, unknown>[] = []
    for (const id of toFetch) {
      const m = await getMatch(id, region).catch(() => null)
      if (!m) continue
      const p = m.info.participants.find(x => x.puuid === ra.puuid)
      if (!p) continue
      rows.push({
        riot_account_id: ra.id,
        match_id: id,
        champion_id: p.championId,
        champion_key: champMap.get(p.championId)?.key ?? p.championName,
        kills: p.kills, deaths: p.deaths, assists: p.assists,
        cs: p.totalMinionsKilled + p.neutralMinionsKilled,
        win: p.win,
        duration: m.info.gameDuration,
        game_end: new Date(m.info.gameEndTimestamp ?? m.info.gameCreation).toISOString(),
      })
    }
    if (rows.length) await admin.from('match_history').upsert(rows, { onConflict: 'riot_account_id,match_id' })
  }
  await touch(admin, ra.id)
}

async function touch(admin: SupabaseClient, id: string) {
  await admin.from('riot_accounts').update({ last_match_sync: new Date().toISOString() }).eq('id', id)
}
