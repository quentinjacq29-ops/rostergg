// Supabase Edge Function — Riot API Proxy
// Deno runtime — RIOT_API_KEY kept server-side
// Deploy: supabase functions deploy riot-proxy

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RIOT_API_KEY = Deno.env.get('RIOT_API_KEY')!

const PLATFORM_TO_REGION: Record<string, string> = {
  euw1: 'europe', na1: 'americas', kr: 'asia', eun1: 'europe',
  br1: 'americas', la1: 'americas', la2: 'americas', oc1: 'sea', tr1: 'europe', jp1: 'asia',
}

// Simple in-memory cache (per function instance)
const cache = new Map<string, { data: unknown; expiresAt: number }>()

function getCache(key: string) {
  const e = cache.get(key)
  if (e && e.expiresAt > Date.now()) return e.data
  cache.delete(key)
  return null
}

function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs })
}

const CACHE_TTL: Record<string, number> = {
  '/riot/account': 7 * 86400_000,
  '/lol/summoner': 86400_000,
  '/lol/league': 3600_000,
  '/lol/match/v5/matches': 60_000,
  '/lol/champion-mastery': 12 * 3600_000,
  '/lol/spectator': 60_000,
  default: 300_000,
}

function getTtl(endpoint: string): number {
  for (const [prefix, ttl] of Object.entries(CACHE_TTL)) {
    if (endpoint.startsWith(prefix)) return ttl
  }
  return CACHE_TTL.default
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } })
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  // Auth check
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { endpoint, platform, region } = await req.json() as {
    endpoint: string
    platform?: string
    region?: string
  }

  // Determine base URL (platform vs regional routing)
  const isRegional = endpoint.startsWith('/riot/account') || endpoint.startsWith('/lol/match/v5')
  const resolvedRegion = region ?? (platform ? PLATFORM_TO_REGION[platform] : 'europe')
  const resolvedPlatform = platform ?? 'euw1'
  const base = isRegional
    ? `https://${resolvedRegion}.api.riotgames.com`
    : `https://${resolvedPlatform}.api.riotgames.com`

  const url = `${base}${endpoint}`
  const cached = getCache(url)
  if (cached) return new Response(JSON.stringify(cached), { headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' } })

  const riotRes = await fetch(url, { headers: { 'X-Riot-Token': RIOT_API_KEY } })

  if (riotRes.status === 429) {
    return new Response(JSON.stringify({ error: 'rate_limited', retryAfter: riotRes.headers.get('Retry-After') }), { status: 429 })
  }
  if (!riotRes.ok) {
    return new Response(JSON.stringify({ error: `riot_${riotRes.status}` }), { status: riotRes.status })
  }

  const data = await riotRes.json()
  setCache(url, data, getTtl(endpoint))

  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' } })
})
