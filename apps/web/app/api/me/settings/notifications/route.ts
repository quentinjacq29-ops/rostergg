import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 })

  const prefs = await req.json()
  // prefs = { duo_request: { inapp, email }, duo_accepted: { inapp, email }, ... }

  const { error } = await supabase
    .from('profiles')
    .update({ notification_prefs: prefs })
    .eq('id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
