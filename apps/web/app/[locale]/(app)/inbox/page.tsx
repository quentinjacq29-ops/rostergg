import { createClient } from '@/lib/supabase/server'
import InboxClient, { type PendingRequest, type Conversation } from '@/components/inbox/InboxClient'
import { redirect } from 'next/navigation'

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. Demandes reçues — avec profil complet de l'expéditeur
  const { data: rawPending } = await supabase
    .from('duo_requests')
    .select(`
      id, match_score, message, created_at,
      sender:profiles!from_profile(
        id, display_name, avatar_url,
        riot_accounts(game_name, tag_line, ranks(tier, division, league_points, wins, losses, queue)),
        matching_prefs(main_roles, looking_for_roles, champion_pool)
      )
    `)
    .eq('to_profile', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // 2. Conversations actives (duo_requests acceptées impliquant moi)
  const { data: rawAccepted } = await supabase
    .from('duo_requests')
    .select(`
      id, match_score, conversation_id, created_at,
      from_profile, to_profile,
      other_from:profiles!from_profile(
        id, display_name, avatar_url,
        riot_accounts(game_name, tag_line, ranks(tier, division, league_points, queue)),
        matching_prefs(main_roles, looking_for_roles, champion_pool)
      ),
      other_to:profiles!to_profile(
        id, display_name, avatar_url,
        riot_accounts(game_name, tag_line, ranks(tier, division, league_points, queue)),
        matching_prefs(main_roles, looking_for_roles, champion_pool)
      )
    `)
    .or(`from_profile.eq.${user.id},to_profile.eq.${user.id}`)
    .eq('status', 'accepted')
    .not('conversation_id', 'is', null)
    .order('created_at', { ascending: false })

  // Dernier message par conversation
  const convIds = (rawAccepted ?? []).map(r => r.conversation_id).filter(Boolean) as string[]
  const { data: lastMessages } = convIds.length > 0
    ? await supabase
        .from('messages')
        .select('conversation_id, body, sender_id, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const lastMsgMap: Record<string, { body: string; sender_id: string; created_at: string }> = {}
  for (const msg of lastMessages ?? []) {
    if (!lastMsgMap[msg.conversation_id]) {
      lastMsgMap[msg.conversation_id] = { body: msg.body, sender_id: msg.sender_id, created_at: msg.created_at }
    }
  }

  // Normaliser riot_accounts / matching_prefs (objet simple, pas tableau — PK unique)
  function normProfile(p: any) {
    if (!p) return null
    const ra  = p.riot_accounts   // single object
    const mp  = p.matching_prefs  // single object
    const soloRank = (ra?.ranks ?? []).find((r: any) => r.queue === 'RANKED_SOLO_5x5') ?? null
    return {
      id:          p.id ?? '',
      displayName: p.display_name ?? null,
      gameName:    ra?.game_name  ?? null,
      tagLine:     ra?.tag_line   ?? null,
      mainRole:    mp?.main_roles?.[0]          ?? null,
      lookingFor:  mp?.looking_for_roles?.[0]   ?? null,
      rankKey:     soloRank?.tier?.toLowerCase() ?? null,
      division:    soloRank?.division            ?? null,
      lp:          soloRank?.league_points       ?? null,
      wins:        soloRank?.wins                ?? null,
      losses:      soloRank?.losses              ?? null,
      champPool:   (mp?.champion_pool as Record<string, string[]>) ?? {},
    }
  }

  const pendingRequests: PendingRequest[] = (rawPending ?? []).map((r: any) => ({
    id:         r.id,
    matchScore: r.match_score,
    message:    r.message,
    createdAt:  r.created_at,
    sender:     normProfile(r.sender)!,
  }))

  const conversations: Conversation[] = (rawAccepted ?? []).map((r: any) => {
    const isFromMe = r.from_profile === user.id
    const raw      = isFromMe ? r.other_to : r.other_from
    const other    = normProfile(raw)!
    const lastMsg  = r.conversation_id ? lastMsgMap[r.conversation_id] : null
    return {
      requestId:      r.id,
      conversationId: r.conversation_id as string,
      matchScore:     r.match_score,
      other,
      lastMessage: lastMsg ?? null,
    }
  })

  return (
    <InboxClient
      userId={user.id}
      pendingRequests={pendingRequests}
      conversations={conversations}
    />
  )
}
