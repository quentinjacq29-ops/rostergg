import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { CHAMPIONS_STATIC } from '@/lib/champions-data'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return Response.json({ players: [], teams: [], champions: [] })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const viewerId = user?.id ?? '00000000-0000-0000-0000-000000000000'

  const like = `%${q}%`

  const [profilesRes, riotRes, teamsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select(`
        id, display_name,
        riot_accounts ( game_name, tag_line, platform, profile_icon_id ),
        matching_prefs ( main_roles ),
        ranks ( tier, division, league_points, queue )
      `)
      .ilike('display_name', like)
      .neq('id', viewerId)
      .limit(6),

    supabase
      .from('riot_accounts')
      .select(`
        profile_id,
        game_name, tag_line, platform, profile_icon_id,
        profiles ( id, display_name, matching_prefs ( main_roles ) ),
        ranks ( tier, division, league_points, queue )
      `)
      .ilike('game_name', like)
      .neq('profile_id', viewerId)
      .limit(6),

    supabase
      .from('teams')
      .select('id, name, tag, crest')
      .or(`name.ilike.${like},tag.ilike.${like}`)
      .limit(5),
  ])

  // merge + deduplicate players
  const playerMap = new Map<string, any>()

  for (const p of profilesRes.data ?? []) {
    const ra = Array.isArray(p.riot_accounts) ? p.riot_accounts[0] : p.riot_accounts
    const rank = (Array.isArray(p.ranks) ? p.ranks : []).find((r: any) => r.queue === 'RANKED_SOLO_5x5')
    playerMap.set(p.id, {
      id:          p.id,
      displayName: p.display_name,
      gameName:    ra?.game_name ?? null,
      platform:    ra?.platform  ?? null,
      iconId:      ra?.profile_icon_id ?? null,
      role:        (p.matching_prefs as any)?.main_roles?.[0] ?? null,
      rank:        rank ? `${rank.tier} ${rank.division ?? ''}`.trim() : null,
    })
  }

  for (const r of riotRes.data ?? []) {
    const pid = (r.profiles as any)?.id
    if (!pid || playerMap.has(pid)) continue
    const ranks = Array.isArray(r.ranks) ? r.ranks : []
    const rank = ranks.find((rk: any) => rk.queue === 'RANKED_SOLO_5x5')
    playerMap.set(pid, {
      id:          pid,
      displayName: (r.profiles as any)?.display_name ?? r.game_name,
      gameName:    r.game_name,
      platform:    r.platform,
      iconId:      r.profile_icon_id,
      role:        (r.profiles as any)?.matching_prefs?.main_roles?.[0] ?? null,
      rank:        rank ? `${rank.tier} ${rank.division ?? ''}`.trim() : null,
    })
  }

  const champions = CHAMPIONS_STATIC
    .filter(c => c.name.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 3)
    .map(c => ({ id: c.id, name: c.name, cls: c.cls }))

  return Response.json({
    players:   Array.from(playerMap.values()).slice(0, 5),
    teams:     teamsRes.data ?? [],
    champions,
  })
}
