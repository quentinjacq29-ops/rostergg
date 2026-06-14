import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 })

  const cursor = req.nextUrl.searchParams.get('cursor')

  let query = supabase
    .from('notifications')
    .select(`
      id, type, payload, read, created_at,
      actor:profiles!notifications_actor_id_fkey (
        id, display_name, avatar_url,
        riot_accounts ( game_name, profile_icon_id )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (cursor) query = query.lt('created_at', cursor)

  const { data: notifications, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  return Response.json({ notifications: notifications ?? [], unread_count: count ?? 0 })
}
