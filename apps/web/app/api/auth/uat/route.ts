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

  // 1 — Résolution PUUID via Account-V1
  let riotAccount
  try {
    riotAccount = await getAccountByRiotId(gameName, tagLine, region)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Riot API: ${msg}` }, { status: 502 })
  }
  if (!riotAccount) {
    return NextResponse.json({ error: `Riot ID "${gameName}#${tagLine}" introuvable` }, { status: 404 })
  }

  // 2 — Rang + mastery en parallèle
  const [summoner, champMap] = await Promise.all([
    getSummonerByPuuid(riotAccount.puuid, platform).catch(() => null),
    getChampionMap().catch(() => new Map<number, { key: string; name: string }>()),
  ])
  const [leagues, masteries] = await Promise.all([
    summoner ? getLeagueEntries(riotAccount.puuid, platform).catch(() => []) : Promise.resolve([]),
    summoner ? getChampionMastery(riotAccount.puuid, platform, 15).catch(() => []) : Promise.resolve([]),
  ])

  const solo = leagues?.find(l => l.queueType === 'RANKED_SOLO_5x5') ?? null

  // 3 — Magic link (crée le user si absent)
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3006'
  // Redirige vers /fr/auth/callback (page client) pour que setSession
  // s'exécute dans le browser et pose cookies + localStorage en même temps
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${origin}/fr/auth/callback` },
  })
  if (linkError || !linkData.properties?.action_link) {
    return NextResponse.json({ error: linkError?.message ?? 'Failed to generate link' }, { status: 500 })
  }

  // 4 — Récupère l'UID Supabase créé/trouvé (listUsers filtre par email)
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const userId = listData?.users?.find(u => u.email === email)?.id
  if (!userId) {
    return NextResponse.json({ error: 'User not found after magic link generation' }, { status: 500 })
  }

  // 5 — Upsert profil + riot_account
  await supabase.from('profiles').upsert({
    id: userId,
    display_name: riotAccount.gameName,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })

  const raUpsert = await supabase.from('riot_accounts').upsert({
    profile_id: userId,
    puuid: riotAccount.puuid,
    game_name: riotAccount.gameName,
    tag_line: riotAccount.tagLine,
    platform,
    region,
    profile_icon_id: summoner?.profileIconId ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'profile_id' }).select('id').maybeSingle()

  const riotAccountId = raUpsert.data?.id
  if (riotAccountId) {
    // Upsert rank
    if (solo) {
      await supabase.from('ranks').upsert({
        riot_account_id: riotAccountId,
        queue: 'RANKED_SOLO_5x5',
        tier: solo.tier,
        division: solo.rank,
        league_points: solo.leaguePoints,
        wins: solo.wins,
        losses: solo.losses,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'riot_account_id,queue' })
    }

    // Upsert mastery (top 15)
    if (masteries?.length) {
      const rows = masteries.map(m => ({
        riot_account_id: riotAccountId,
        champion_id: m.championId,
        champion_key: champMap.get(m.championId)?.key ?? String(m.championId),
        mastery_level: m.championLevel,
        mastery_points: m.championPoints,
        updated_at: new Date().toISOString(),
      }))
      await supabase.from('champion_mastery').upsert(rows, { onConflict: 'riot_account_id,champion_id' })
    }
  }

  return NextResponse.json({
    ok: true,
    magicLink: linkData.properties.action_link,
    resolved: {
      gameName: riotAccount.gameName,
      tagLine: riotAccount.tagLine,
      puuid: riotAccount.puuid,
      rank: solo ? `${solo.tier} ${solo.rank} · ${solo.leaguePoints} LP` : 'UNRANKED',
    },
  })
}
