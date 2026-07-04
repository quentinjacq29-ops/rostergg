import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to_profile, message, match_score } = await req.json()
  if (!to_profile || typeof to_profile !== 'string') {
    return NextResponse.json({ error: 'to_profile requis' }, { status: 400 })
  }
  if (to_profile === user.id) {
    return NextResponse.json({ error: 'Cannot send request to yourself' }, { status: 400 })
  }

  // Vérifier qu'il n'existe pas déjà une demande pending entre les deux
  const { data: existing } = await supabase
    .from('duo_requests')
    .select('id, status')
    .or(`and(from_profile.eq.${user.id},to_profile.eq.${to_profile}),and(from_profile.eq.${to_profile},to_profile.eq.${user.id})`)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Une demande est déjà en attente', existing }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('duo_requests')
    .insert({
      from_profile: user.id,
      to_profile,
      match_score: match_score ?? null,
      message:     message?.trim() || null,
    })
    .select('id, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// Annuler une demande envoyée (par l'expéditeur, tant qu'elle est en attente)
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { error } = await supabase
    .from('duo_requests')
    .delete()
    .eq('id', id)
    .eq('from_profile', user.id)
    .eq('status', 'pending')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
