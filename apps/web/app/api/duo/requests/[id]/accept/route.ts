import { createClient } from '@/lib/supabase/server'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: convId, error } = await supabase.rpc('accept_duo_request', { p_request_id: params.id })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ conversation_id: convId })
}
