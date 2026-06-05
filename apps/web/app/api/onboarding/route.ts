import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

type OnboardingBody = {
  step: number
  data: Record<string, unknown>
}

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
        // intents — informational only, no DB write needed
        break
      }
      case 2: {
        const { languages } = data as { languages: string[] }
        await supabase.from('matching_prefs').upsert(
          { profile_id: user.id, languages },
          { onConflict: 'profile_id' }
        )
        break
      }
      case 3: {
        const { main_role, secondary_role } = data as { main_role: string; secondary_role: string | null }
        await supabase.from('matching_prefs').upsert(
          { profile_id: user.id, main_roles: [main_role], looking_for_roles: secondary_role ? [secondary_role] : [] },
          { onConflict: 'profile_id' }
        )
        break
      }
      case 4: {
        const { looking_for_roles } = data as { looking_for_roles: string[] }
        await supabase.from('matching_prefs').upsert(
          { profile_id: user.id, looking_for_roles },
          { onConflict: 'profile_id' }
        )
        break
      }
      case 5: {
        // champion_pool — stored as a note in matching_prefs or skipped (mastery is synced from Riot)
        break
      }
      case 6: {
        const { playstyles, goals } = data as { playstyles: string[]; goals: string[] }
        await supabase.from('matching_prefs').upsert(
          { profile_id: user.id, playstyles, goals },
          { onConflict: 'profile_id' }
        )
        break
      }
      case 7: {
        const { availability } = data as { availability: Array<{ weekday: number; slot: number; intensity: number }> }
        // Delete all existing slots then insert new ones
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
