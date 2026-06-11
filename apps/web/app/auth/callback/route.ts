import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/duo'
  const dest = searchParams.get('dest') // passed from /onboarding/finish

  // ── PKCE flow (?code= présent) ──────────────────────────────────────────────
  if (code) {
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
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      let destination = next
      if (destination === '/duo') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: prefs } = await supabase
            .from('matching_prefs').select('profile_id')
            .eq('profile_id', user.id).maybeSingle()
          if (!prefs) destination = '/onboarding/1'
        }
      }
      const finalUrl = dest
        ? `${origin}/fr${destination}?dest=${encodeURIComponent(dest)}`
        : `${origin}/fr${destination}`
      return NextResponse.redirect(finalUrl)
    }
    return NextResponse.redirect(`${origin}/fr/login?error=auth_callback_failed`)
  }

  // ── Implicit flow (#access_token= dans le hash) ──────────────────────────
  // Le hash n'est jamais envoyé au serveur. On renvoie un mini-HTML qui
  // préserve le hash et redirige vers /fr/auth/callback (page Next.js client)
  // où setSession s'exécute dans le browser (cookies + localStorage).
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{background:#0a0c14;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:monospace;font-size:11px;color:#00e0ff;letter-spacing:.2em}</style>
</head><body>◢ CONNEXION EN COURS…
<script>
(function(){
  var h = window.location.hash;
  if (h) { window.location.replace('/fr/auth/callback' + h); }
  else { window.location.replace('/fr/login?error=no_token'); }
})();
</script></body></html>`

  return new Response(html, { headers: { 'Content-Type': 'text/html' } })
}
