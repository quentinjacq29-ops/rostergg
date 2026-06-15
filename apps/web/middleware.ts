import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const LOCALES = ['fr', 'en'] as const
const DEFAULT_LOCALE = 'fr'

// Routes requiring authentication (regex against full localized path)
const PROTECTED = [
  /^\/[a-z]{2}\/duo/,
  /^\/[a-z]{2}\/teams/,
  /^\/[a-z]{2}\/inbox/,
  /^\/[a-z]{2}\/training/,
  /^\/[a-z]{2}\/me/,
  /^\/[a-z]{2}\/u\//,
]

// Routes inaccessible when already logged in
const AUTH_ONLY = [/^\/[a-z]{2}\/login$/, /^\/[a-z]{2}\/signup$/]

function getPreferredLocale(request: NextRequest): string {
  const accept = request.headers.get('accept-language') ?? ''
  const preferred = accept.split(',')[0].split('-')[0].toLowerCase()
  return (LOCALES as readonly string[]).includes(preferred) ? preferred : DEFAULT_LOCALE
}

function isProtected(p: string) { return PROTECTED.some((r) => r.test(p)) }
function isAuthOnly(p: string)  { return AUTH_ONLY.some((r) => r.test(p)) }

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Locale prefix — redirect if missing
  const hasLocale = (LOCALES as readonly string[]).some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  )
  if (!hasLocale) {
    const locale = getPreferredLocale(request)
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname}`
    return NextResponse.redirect(url)
  }

  const response = NextResponse.next()

  // 2. Skip Supabase auth if env vars are not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response
  }

  // 3. Refresh Supabase session & propagate cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const locale = pathname.split('/')[1] || DEFAULT_LOCALE

  // 4. Guard: unauthenticated → login
  if (!user && isProtected(pathname)) {
    const url = new URL(`/${locale}/login`, request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // 5. Guard: already logged in → skip auth pages
  if (user && isAuthOnly(pathname)) {
    return NextResponse.redirect(new URL(`/${locale}/duo`, request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
}
