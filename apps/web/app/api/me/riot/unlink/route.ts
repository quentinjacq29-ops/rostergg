import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 })

  // Supprime le compte Riot lié (cascade supprime ranks + mastery)
  const { error } = await supabase
    .from('riot_accounts')
    .delete()
    .eq('profile_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
