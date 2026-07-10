import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import DuoFeed from '@/components/duo/DuoFeed'

// Écran connecté → jamais indexé (cf. handoff /duo §5)
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function DuoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let initialPrefs = null
  let showOnline = true
  if (user) {
    const [{ data }, { data: prof }] = await Promise.all([
      supabase.from('matching_prefs').select('looking_for_roles, rank_floor, regions').eq('profile_id', user.id).maybeSingle(),
      supabase.from('profiles').select('show_online_status').eq('id', user.id).maybeSingle(),
    ])
    if (data) {
      initialPrefs = {
        looking_for_roles: data.looking_for_roles ?? [],
        rank_floor: data.rank_floor ?? null,
        region: data.regions?.[0] ?? null,
      }
    }
    showOnline = prof?.show_online_status ?? true
  }

  return (
    <DuoFeed
      userId={user?.id ?? null}
      initialPrefs={initialPrefs}
      showOnline={showOnline}
    />
  )
}
