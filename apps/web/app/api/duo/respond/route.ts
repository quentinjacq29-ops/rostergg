import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { request_id, action } = await req.json()
  if (!request_id || !['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'request_id et action (accept|decline) requis' }, { status: 400 })
  }

  if (action === 'accept') {
    const { data: convId, error } = await supabase.rpc('accept_duo_request', {
      p_request_id: request_id,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ conversation_id: convId })
  }

  // decline
  const { error } = await supabase.rpc('decline_duo_request', {
    p_request_id: request_id,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ status: 'declined' })
}
