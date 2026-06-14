import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json([], { status: 200 })

  const { data } = await supabase
    .from('blocks')
    .select('blocked')
    .eq('blocker', user.id)

  // fetch display names separately (blocks has no FK alias for join)
  const ids = (data ?? []).map(b => b.blocked)
  if (ids.length === 0) return Response.json([])

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', ids)

  return Response.json(profiles ?? [])
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 })

  const { playerId } = await req.json()
  if (!playerId) return Response.json({ error: 'playerId required' }, { status: 400 })

  const { error } = await supabase
    .from('blocks')
    .upsert({ blocker: user.id, blocked: playerId })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
