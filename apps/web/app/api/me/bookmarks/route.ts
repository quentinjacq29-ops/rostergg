import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json([], { status: 200 })

  const { data } = await supabase
    .from('bookmarks')
    .select('target_id')
    .eq('user_id', user.id)

  return Response.json((data ?? []).map(b => b.target_id))
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 })

  const { playerId } = await req.json()
  if (!playerId) return Response.json({ error: 'playerId required' }, { status: 400 })

  const { error } = await supabase
    .from('bookmarks')
    .upsert({ user_id: user.id, target_id: playerId })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const playerId = searchParams.get('playerId')
  if (!playerId) return Response.json({ error: 'playerId required' }, { status: 400 })

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', user.id)
    .eq('target_id', playerId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
