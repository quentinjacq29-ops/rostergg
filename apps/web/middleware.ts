import { type NextRequest, NextResponse } from 'next/server'

const LOCALES = ['fr', 'en'] as const
const DEFAULT_LOCALE = 'fr'

const PROTECTED = [
  /^\/[a-z]{2}\/duo/,
  /^\/[a-z]{2}\/teams/,
  /^\/[a-z]{2}\/inbox/,
  /^\/[a-z]{2}\/training/,
  /^\/[a-z]{2}\/me/,
  /^\/[a-z]{2}\/u\//,
]

const AUTH_ONLY = [/^\/[a-z]{2}\/login$/, /^\/[a-z]{2}\/signup$/]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect to default locale if no locale prefix
  const hasLocale = (LOCALES as readonly string[]).some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  )
  if (!hasLocale) {
    const accept = request.headers.get('accept-language') ?? ''
    const preferred = accept.split(',')[0].split('-')[0].toLowerCase()
    const locale = (LOCALES as readonly string[]).includes(preferred) ? preferred : DEFAULT_LOCALE
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname}`
    return NextResponse.redirect(url)
  }

  // Auth guards handled server-side in page.tsx (redirect to login)
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
}
