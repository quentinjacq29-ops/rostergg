import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/duo'
  const dest = searchParams.get('dest') // passed from /onboarding/finish

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // For login (no explicit next), check if onboarding was completed
      let destination = next
      if (destination === '/duo') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: prefs } = await supabase
            .from('matching_prefs')
            .select('profile_id')
            .eq('profile_id', user.id)
            .maybeSingle()
          if (!prefs) destination = '/onboarding/1'
        }
      }
      // Append dest param if we're going through the saving page
      const finalUrl = dest
        ? `${origin}/fr${destination}?dest=${encodeURIComponent(dest)}`
        : `${origin}/fr${destination}`
      return NextResponse.redirect(finalUrl)
    }
  }

  return NextResponse.redirect(`${origin}/fr/login?error=auth_callback_failed`)
}
