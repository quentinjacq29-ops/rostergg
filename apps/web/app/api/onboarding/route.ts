import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

type OnboardingBody = {
  step: number
  data: Record<string, unknown>
}

// Mapping UI step → API action (parcours DUO v2, 7 étapes) :
//   step 1  → displayName (pseudo public)
//   step 2  → intent (pas de write DB, crée la ligne matching_prefs)
//   step 3  → languages
//   step 4  → main_role + secondary_role → main_roles[] + playstyles[] + goals[] (fusion « Rôle & style »)
//   step 5  → looking_for_roles[]
//   step 6  → champion_pool { [role]: string[] }
//   step 7  → availability rows
//
// v2 : playstyles/goals saisis à l'étape 04 (« Rôle & style ») — éditables ensuite dans /me

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as OnboardingBody
  const { step, data } = body

  try {
    switch (step) {
      case 1: {
        // Pseudo public (displayName) — choisi en fin d'étape 1 après liaison Riot
        const { displayName } = data as { displayName: string }
        if (!displayName?.trim()) break
        await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('id', user.id)
        break
      }
      case 2: {
        // Intent (duo | team | coaching) — s'assurer que la ligne matching_prefs existe
        await supabase.from('matching_prefs').upsert(
          { profile_id: user.id },
          { onConflict: 'profile_id', ignoreDuplicates: true }
        )
        break
      }
      case 3: {
        const { languages } = data as { languages: string[] }
        await supabase.from('matching_prefs').upsert(
          { profile_id: user.id, languages },
          { onConflict: 'profile_id' }
        )
        break
      }
      case 4: {
        const { main_role, secondary_role, playstyles, goals } = data as { main_role: string; secondary_role: string | null; playstyles?: string[]; goals?: string[] }
        const main_roles = ([main_role, secondary_role]).filter(Boolean) as string[]
        const prefs: Record<string, unknown> = { profile_id: user.id, main_roles }
        if (playstyles !== undefined) prefs.playstyles = playstyles
        if (goals !== undefined) prefs.goals = goals
        await supabase.from('matching_prefs').upsert(prefs, { onConflict: 'profile_id' })
        break
      }
      case 5: {
        const { looking_for_roles } = data as { looking_for_roles: string[] }
        await supabase.from('matching_prefs').upsert(
          { profile_id: user.id, looking_for_roles },
          { onConflict: 'profile_id' }
        )
        break
      }
      case 6: {
        const { champion_pool } = data as { champion_pool: Record<string, string[]> }
        await supabase.from('matching_prefs').upsert(
          { profile_id: user.id, champion_pool: champion_pool ?? {} },
          { onConflict: 'profile_id' }
        )
        break
      }
      case 7: {
        const { availability } = data as { availability: Array<{ weekday: number; slot: number; intensity: number }> }
        await supabase.from('availability').delete().eq('profile_id', user.id)
        if (availability.length > 0) {
          await supabase.from('availability').insert(
            availability.map(row => ({ profile_id: user.id, ...row }))
          )
        }
        break
      }
      default:
        break
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[onboarding]', step, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
