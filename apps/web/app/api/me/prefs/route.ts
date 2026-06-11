import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    bio,
    main_roles,
    looking_for_roles,
    playstyles,
    languages,
    voice_required,
    availability,
  } = body

  // ── Bio → profiles
  if (bio !== undefined) {
    await supabase.from('profiles').update({ bio: bio ?? null }).eq('id', user.id)
  }

  // ── Matching prefs (upsert)
  const prefsUpdate: Record<string, unknown> = { profile_id: user.id }
  if (main_roles        !== undefined) prefsUpdate.main_roles         = main_roles
  if (looking_for_roles !== undefined) prefsUpdate.looking_for_roles  = looking_for_roles
  if (playstyles        !== undefined) prefsUpdate.playstyles          = playstyles
  if (languages         !== undefined) prefsUpdate.languages           = languages
  if (voice_required    !== undefined) prefsUpdate.voice_required      = voice_required

  if (Object.keys(prefsUpdate).length > 1) {
    await supabase.from('matching_prefs').upsert(prefsUpdate, { onConflict: 'profile_id' })
  }

  // ── Availability (replace all)
  if (availability !== undefined) {
    await supabase.from('availability').delete().eq('profile_id', user.id)
    const rows = (availability as { weekday: number; slot: number; intensity: number }[])
      .filter(a => a.intensity > 0)
      .map(a => ({ profile_id: user.id, weekday: a.weekday, slot: a.slot, intensity: a.intensity }))
    if (rows.length > 0) await supabase.from('availability').insert(rows)
  }
  return NextResponse.json({ ok: true })
}
