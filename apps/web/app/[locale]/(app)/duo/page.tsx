import { createClient } from '@/lib/supabase/server'
import DuoFeed from '@/components/duo/DuoFeed'

export default async function DuoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let initialPrefs = null
  if (user) {
    const { data } = await supabase
      .from('matching_prefs')
      .select('looking_for_roles, rank_floor, regions')
      .eq('profile_id', user.id)
      .maybeSingle()
    if (data) {
      initialPrefs = {
        looking_for_roles: data.looking_for_roles ?? [],
        rank_floor: data.rank_floor ?? null,
        region: data.regions?.[0] ?? null,
      }
    }
  }

  return (
    <DuoFeed
      userId={user?.id ?? null}
      initialPrefs={initialPrefs}
    />
  )
}
