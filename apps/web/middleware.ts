import { createServerClient } from '@supabase/ssr'
import createIntlMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const handleI18n = createIntlMiddleware(routing)

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

// Routes UAT — toujours publiques (gate gérée dans la page/route elle-même)
const UAT_PUBLIC = [/^\/[a-z]{2}\/uat-login$/]

function isProtected(p: string) {
  return PROTECTED.some((r) => r.test(p))
}
function isAuthOnly(p: string) {
  return AUTH_ONLY.some((r) => r.test(p))
}

export async function middleware(request: NextRequest) {
  // 1. Apply next-intl locale routing
  const response = handleI18n(request)

  // 2. Skip Supabase auth if env vars are not configured (misconfigured deployment)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response
  }

  // 3. Refresh Supabase session & propagate cookies onto the same response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const locale = pathname.split('/')[1] || routing.defaultLocale

  // 4. Guard: unauthenticated → login
  if (!user && isProtected(pathname)) {
    const url = new URL(`/${locale}/login`, request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // 5. Guard: already logged in → skip auth pages (but not UAT)
  if (user && isAuthOnly(pathname) && !UAT_PUBLIC.some(r => r.test(pathname))) {
    return NextResponse.redirect(new URL(`/${locale}/duo`, request.url))
  }

  return response
}

export const config = {
  // Exclude api routes, auth callback, Next internals, and static files
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
}
