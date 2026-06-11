import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { access_token, refresh_token } = await req.json()

  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: 'missing tokens' }, { status: 400 })
  }

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

  const { error } = await supabase.auth.setSession({ access_token, refresh_token })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  // Vérifie si l'onboarding est complété pour choisir la destination
  const { data: { user } } = await supabase.auth.getUser()
  let redirect = '/fr/duo'
  if (user) {
    const { data: prefs } = await supabase
      .from('matching_prefs').select('profile_id')
      .eq('profile_id', user.id).maybeSingle()
    if (!prefs) redirect = '/fr/onboarding/1'
  }

  return NextResponse.json({ redirect })
}
