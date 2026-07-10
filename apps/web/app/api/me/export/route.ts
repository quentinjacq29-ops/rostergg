import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Export RGPD — renvoie une copie des données de l'utilisateur en JSON téléchargeable.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const [{ data: profile }, { data: riot }, { data: prefs }, { data: availability }, { data: blocks }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('riot_accounts').select('game_name, tag_line, platform, region, ranks(*), champion_mastery(*)').eq('profile_id', user.id).maybeSingle(),
    supabase.from('matching_prefs').select('*').eq('profile_id', user.id).maybeSingle(),
    supabase.from('availability').select('weekday, slot, intensity').eq('profile_id', user.id),
    supabase.from('blocks').select('blocked, created_at').eq('blocker', user.id),
  ])

  const payload = {
    export_format: 'rostergg-user-data-v1',
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile: profile ?? null,
    riot_account: riot ?? null,
    matching_prefs: prefs ?? null,
    availability: availability ?? [],
    blocks: blocks ?? [],
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rostergg-mes-donnees.json"',
      'Cache-Control': 'no-store',
    },
  })
}
