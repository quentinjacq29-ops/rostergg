// Supabase Edge Function — Refresh ranks + mastery for active accounts
// Triggered by cron (every 6h)
// Deploy: supabase functions deploy sync-ranks

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RIOT_API_KEY = Deno.env.get('RIOT_API_KEY')!

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

async function riotGet(url: string) {
  const res = await fetch(url, { headers: { 'X-Riot-Token': RIOT_API_KEY } })
  if (res.status === 429) throw new Error(`RATE_LIMITED:${res.headers.get('Retry-After')}`)
  if (!res.ok) return null
  return res.json()
}

serve(async () => {
  const sixHoursAgo = new Date(Date.now() - 6 * 3600_000).toISOString()

  // Get accounts that haven't been synced in the last 6h
  const { data: accounts, error } = await supabase
    .from('riot_accounts')
    .select('id, puuid, summoner_id, platform')
    .or(`last_synced_at.is.null,last_synced_at.lt.${sixHoursAgo}`)
    .limit(50) // process 50 at a time to stay within rate limits

  if (error || !accounts?.length) {
    return new Response(JSON.stringify({ synced: 0 }), { headers: { 'Content-Type': 'application/json' } })
  }

  let synced = 0
  for (const account of accounts) {
    try {
      // Refresh ranks
      const entries = await riotGet(
        `https://${account.platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${account.summoner_id}`
      ) as Array<{ queueType: string; tier: string; rank: string; leaguePoints: number; wins: number; losses: number }> | null

      if (entries) {
        await supabase.from('ranks').upsert(
          entries.map((e) => ({
            riot_account_id: account.id,
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

      await supabase
        .from('riot_accounts')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', account.id)

      synced++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.startsWith('RATE_LIMITED')) break // stop on rate limit
      console.error(`sync-ranks: failed for ${account.id}:`, msg)
    }
  }

  return new Response(JSON.stringify({ synced }), { headers: { 'Content-Type': 'application/json' } })
})
