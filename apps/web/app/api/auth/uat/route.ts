import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntries,
  getChampionMastery,
  getChampionMap,
  PLATFORM_TO_REGION,
} from '@/lib/riot/client'

// ── Guard ─────────────────────────────────────────────────────────────────────
// Strictement réservé aux environnements de test.
// En prod (NODE_ENV=production), cette route est désactivée quelle que soit la variable.
function isEnabled() {
  return (
    process.env.ENABLE_UAT_LOGIN === 'true' &&
    process.env.NODE_ENV !== 'production'
  )
}

// Admin Supabase — service role uniquement côté serveur
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  if (!isEnabled()) {
    return NextResponse.json({ error: 'UAT login disabled' }, { status: 404 })
  }

  let body: { email?: string; riotId?: string; platform?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, riotId, platform = 'euw1' } = body
  if (!email || !riotId) {
    return NextResponse.json({ error: 'email and riotId are required' }, { status: 400 })
  }

  const [gameName, tagLine] = riotId.includes('#') ? riotId.split('#') : [riotId, platform.toUpperCase()]
  if (!gameName || !tagLine) {
    return NextResponse.json({ error: 'riotId must be in format gameName#tag' }, { status: 400 })
  }

  const region = PLATFORM_TO_REGION[platform] ?? 'europe'
  const supabase = adminClient()

  // 1 — Résolution PUUID via Account-V1 — BEST-EFFORT.
  // Ne bloque pas si Riot est indispo ou si le Riot ID n'existe plus : pour un
  // compte déjà seedé en base, on peut se connecter sans re-résoudre.
  let riotAccount = null
  try {
    riotAccount = await getAccountByRiotId(gameName, tagLine, region)
  } catch { /* réseau/Riot indispo → login sans enrichissement (si compte existant) */ }

  // 2 — Magic link (crée/trouve le user par email)
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3006'
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${origin}/fr/auth/callback` },
  })
  if (linkError || !linkData.properties?.action_link) {
    return NextResponse.json({ error: linkError?.message ?? 'Failed to generate link' }, { status: 500 })
  }

  // 3 — UID Supabase créé/trouvé
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const userId = listData?.users?.find(u => u.email === email)?.id
  if (!userId) {
    return NextResponse.json({ error: 'User not found after magic link generation' }, { status: 500 })
  }

  // 4 — Enrichissement si Riot résolu ; sinon on autorise le login d'un compte existant.
  let solo = null
  if (riotAccount) {
    const [summoner, champMap] = await Promise.all([
      getSummonerByPuuid(riotAccount.puuid, platform).catch(() => null),
      getChampionMap().catch(() => new Map<number, { key: string; name: string }>()),
    ])
    const [leagues, masteries] = await Promise.all([
      summoner ? getLeagueEntries(riotAccount.puuid, platform).catch(() => []) : Promise.resolve([]),
      summoner ? getChampionMastery(riotAccount.puuid, platform, 15).catch(() => []) : Promise.resolve([]),
    ])
    solo = leagues?.find(l => l.queueType === 'RANKED_SOLO_5x5') ?? null

    await supabase.from('profiles').upsert({
      id: userId, display_name: riotAccount.gameName, updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    const raUpsert = await supabase.from('riot_accounts').upsert({
      profile_id: userId, puuid: riotAccount.puuid, game_name: riotAccount.gameName, tag_line: riotAccount.tagLine,
      platform, region, profile_icon_id: summoner?.profileIconId ?? null, updated_at: new Date().toISOString(),
    }, { onConflict: 'profile_id' }).select('id').maybeSingle()

    const riotAccountId = raUpsert.data?.id
    if (riotAccountId) {
      if (solo) {
        await supabase.from('ranks').upsert({
          riot_account_id: riotAccountId, queue: 'RANKED_SOLO_5x5', tier: solo.tier, division: solo.rank,
          league_points: solo.leaguePoints, wins: solo.wins, losses: solo.losses, updated_at: new Date().toISOString(),
        }, { onConflict: 'riot_account_id,queue' })
      }
      if (masteries?.length) {
        const rows = masteries.map(m => ({
          riot_account_id: riotAccountId, champion_id: m.championId,
          champion_key: champMap.get(m.championId)?.key ?? String(m.championId),
          mastery_level: m.championLevel, mastery_points: m.championPoints, updated_at: new Date().toISOString(),
        }))
        await supabase.from('champion_mastery').upsert(rows, { onConflict: 'riot_account_id,champion_id' })
      }
    }
  } else {
    // Riot non résolu → login seulement si un compte est déjà lié à ce user.
    const { data: existingRa } = await supabase.from('riot_accounts').select('id').eq('profile_id', userId).maybeSingle()
    if (!existingRa) {
      return NextResponse.json({ error: `Riot ID "${gameName}#${tagLine}" introuvable (et aucun compte existant pour ${email})` }, { status: 404 })
    }
  }

  return NextResponse.json({
    ok: true,
    magicLink: linkData.properties.action_link,
    resolved: riotAccount
      ? { gameName: riotAccount.gameName, tagLine: riotAccount.tagLine, puuid: riotAccount.puuid, rank: solo ? `${solo.tier} ${solo.rank} · ${solo.leaguePoints} LP` : 'UNRANKED' }
      : { gameName, tagLine, note: 'login compte existant (sans re-sync Riot)' },
  })
}
