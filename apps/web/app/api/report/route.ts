import { createClient } from '@/lib/supabase/server'

const VALID_REASONS = ['toxic', 'cheat', 'boost', 'imperso', 'spam', 'other'] as const

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json()
  const { targetUserId, reason, details, context } = body

  if (!targetUserId) return Response.json({ error: 'targetUserId required' }, { status: 400 })
  if (!VALID_REASONS.includes(reason)) return Response.json({ error: 'invalid reason' }, { status: 400 })
  if (targetUserId === user.id) return Response.json({ error: 'cannot report yourself' }, { status: 400 })

  const { error } = await supabase.from('reports').insert({
    reporter: user.id,
    target:   targetUserId,
    reason,
    context:  { details: details ?? null, ...context },
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
