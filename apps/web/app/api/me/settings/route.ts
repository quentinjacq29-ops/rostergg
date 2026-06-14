import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 })

  const [{ data: profile }, { data: ra }] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, profile_discoverable, show_online_status, allow_requests_from_all, notification_prefs')
      .eq('id', user.id)
      .single(),
    supabase
      .from('riot_accounts')
      .select('game_name, tag_line, platform, last_synced_at')
      .eq('profile_id', user.id)
      .maybeSingle(),
  ])

  return Response.json({
    displayName:         profile?.display_name      ?? null,
    email:               user.email                 ?? null,
    riotId:              ra ? `${ra.game_name}#${ra.tag_line}` : null,
    platform:            ra?.platform               ?? null,
    lastSynced:          ra?.last_synced_at         ?? null,
    profileDiscoverable: profile?.profile_discoverable    ?? true,
    showOnlineStatus:    profile?.show_online_status      ?? true,
    allowRequestsFromAll:profile?.allow_requests_from_all ?? false,
    notificationPrefs:   profile?.notification_prefs      ?? {},
  })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json()
  const update: Record<string, unknown> = {}

  if (body.displayName              !== undefined) update.display_name             = String(body.displayName).slice(0, 32)
  if (body.profileDiscoverable      !== undefined) update.profile_discoverable     = Boolean(body.profileDiscoverable)
  if (body.showOnlineStatus         !== undefined) update.show_online_status       = Boolean(body.showOnlineStatus)
  if (body.allowRequestsFromAll     !== undefined) update.allow_requests_from_all  = Boolean(body.allowRequestsFromAll)

  if (Object.keys(update).length === 0) return Response.json({ ok: true })

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
