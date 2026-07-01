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

  // 2. Conversations actives
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

  const convIds = (rawAccepted ?? []).map(r => r.conversation_id).filter(Boolean) as string[]

  // 3. Dernier message + unread par conversation (en parallèle)
  const [{ data: lastMessages }, { data: memberRows }] = await Promise.all([
    convIds.length > 0
      ? supabase
          .from('messages')
          .select('conversation_id, body, sender_id, created_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    convIds.length > 0
      ? supabase
          .from('conversation_members')
          .select('conversation_id, last_read_at')
          .eq('profile_id', user.id)
          .in('conversation_id', convIds)
      : Promise.resolve({ data: [] }),
  ])

  // Unread par conv : messages après last_read_at de l'utilisateur, envoyés par l'autre
  const lastReadMap: Record<string, string | null> = {}
  for (const row of memberRows ?? []) {
    lastReadMap[row.conversation_id] = row.last_read_at ?? null
  }

  const unreadCountMap: Record<string, number> = {}
  for (const msg of lastMessages ?? []) {
    if (msg.sender_id === user.id) continue
    const lastRead = lastReadMap[msg.conversation_id]
    if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) {
      unreadCountMap[msg.conversation_id] = (unreadCountMap[msg.conversation_id] ?? 0) + 1
    }
  }

  const lastMsgMap: Record<string, { body: string; sender_id: string; created_at: string }> = {}
  for (const msg of lastMessages ?? []) {
    if (!lastMsgMap[msg.conversation_id]) {
      lastMsgMap[msg.conversation_id] = { body: msg.body, sender_id: msg.sender_id, created_at: msg.created_at }
    }
  }

  // 4. Profil current user (mainRole + displayName pour le rail et l'invite-to-lobby)
  const { data: myPrefs } = await supabase
    .from('matching_prefs')
    .select('main_roles')
    .eq('profile_id', user.id)
    .maybeSingle()

  const { data: myRiot } = await supabase
    .from('riot_accounts')
    .select('game_name')
    .eq('profile_id', user.id)
    .maybeSingle()

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const currentUserRole = myPrefs?.main_roles?.[0] ?? null
  const currentUserName = myRiot?.game_name ?? myProfile?.display_name ?? 'Moi'

  // ── Helpers ──────────────────────────────────────────────────────────

  function normProfile(p: any) {
    if (!p) return null
    const ra = p.riot_accounts
    const mp = p.matching_prefs
    const soloRank = (ra?.ranks ?? []).find((r: any) => r.queue === 'RANKED_SOLO_5x5') ?? null
    return {
      id:          p.id ?? '',
      displayName: p.display_name ?? null,
      gameName:    ra?.game_name  ?? null,
      tagLine:     ra?.tag_line   ?? null,
      mainRole:    mp?.main_roles?.[0]        ?? null,
      lookingFor:  mp?.looking_for_roles?.[0] ?? null,
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
    const other    = normProfile(isFromMe ? r.other_to : r.other_from)!
    const lastMsg  = r.conversation_id ? lastMsgMap[r.conversation_id] : null
    return {
      requestId:      r.id,
      conversationId: r.conversation_id as string,
      matchScore:     r.match_score,
      unreadCount:    unreadCountMap[r.conversation_id] ?? 0,
      other,
      lastMessage: lastMsg ?? null,
      // pour le tri par récence : dernier message sinon date d'acceptation
      _sortAt: (lastMsg?.created_at ?? r.created_at) as string,
    } as Conversation & { _sortAt: string }
  })

  // Tri par récence (conversation la plus active en tête)
  conversations.sort((a, b) =>
    new Date((b as any)._sortAt).getTime() - new Date((a as any)._sortAt).getTime()
  )

  return (
    <InboxClient
      userId={user.id}
      currentUserRole={currentUserRole}
      currentUserName={currentUserName}
      pendingRequests={pendingRequests}
      conversations={conversations}
    />
  )
}
