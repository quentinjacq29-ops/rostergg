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

function checkBasicAuth(request: NextRequest): NextResponse | null {
  const user = process.env.BASIC_AUTH_USER
  const pass = process.env.BASIC_AUTH_PASSWORD
  if (!user || !pass) return null

  const header = request.headers.get('authorization') ?? ''
  if (header.startsWith('Basic ')) {
    const decoded = atob(header.slice(6))
    const colon = decoded.indexOf(':')
    if (colon !== -1 && decoded.slice(0, colon) === user && decoded.slice(colon + 1) === pass) {
      return null
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="RosterGG"' },
  })
}

export function middleware(request: NextRequest) {
  const auth = checkBasicAuth(request)
  if (auth) return auth

  const { pathname } = request.nextUrl

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

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
}
