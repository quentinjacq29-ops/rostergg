import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Seuls les champs autorisés (bio pour l'instant)
  const allowed: Record<string, unknown> = {}
  if ('bio' in body) {
    const bio = typeof body.bio === 'string' ? body.bio.trim().slice(0, 200) : null
    allowed.bio = bio || null
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'Aucun champ valide' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update(allowed)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
