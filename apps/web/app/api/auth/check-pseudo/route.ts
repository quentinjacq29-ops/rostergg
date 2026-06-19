import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

// Normalise une chaîne pour comparaison : minuscules, sans accents, sans non-alphanum
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

// Distance de Levenshtein
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

// Profanité basique (liste minimale — en prod utiliser une lib dédiée)
const PROFANITY = ['fuck', 'shit', 'bitch', 'cunt', 'nigger', 'putain', 'connard', 'salope', 'merde']

function hasProfanity(s: string): boolean {
  const norm = normalize(s)
  return PROFANITY.some(p => norm.includes(p))
}

// Charset autorisé : lettres, chiffres, espaces, underscore, tiret, point
const CHARSET_RE = /^[a-zA-Z0-9 _\-.]{3,20}$/

// Seuil de proximité : si dist(normalize(pseudo), normalize(gameName)) ≤ threshold → refus
// threshold adaptatif : 20 % de la longueur du gameName (min 2)
function isTooClose(pseudo: string, gameName: string): boolean {
  const a = normalize(pseudo)
  const b = normalize(gameName)
  if (a === b) return true
  // Contient l'autre (substring)
  if (a.includes(b) || b.includes(a)) return true
  const threshold = Math.max(2, Math.floor(b.length * 0.2))
  return levenshtein(a, b) <= threshold
}

type Body = { displayName: string; gameName?: string }

export async function POST(req: NextRequest) {
  const { displayName, gameName } = await req.json() as Body

  if (!displayName) return NextResponse.json({ ok: false, reason: 'missing' })

  // 1. Charset + longueur
  if (!CHARSET_RE.test(displayName)) {
    return NextResponse.json({
      ok: false,
      reason: 'invalid_chars',
      message: 'Pseudo invalide — 3 à 20 caractères, lettres, chiffres, espaces, tirets et underscores uniquement.',
    })
  }

  // 2. Profanité
  if (hasProfanity(displayName)) {
    return NextResponse.json({ ok: false, reason: 'profanity', message: 'Pseudo refusé.' })
  }

  // 3. Trop proche du gameName Riot
  if (gameName && isTooClose(displayName, gameName)) {
    return NextResponse.json({
      ok: false,
      reason: 'too_close',
      message: 'Trop proche de ton Riot ID — choisis un pseudo distinct pour rester anonyme.',
    })
  }

  // 4. Unicité — accessible même sans session (onboarding pré-auth)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const query = supabase.from('profiles').select('id').ilike('display_name', displayName.trim())
  if (user) query.neq('id', user.id)
  const { data: existing } = await query.maybeSingle()

  if (existing) {
    const base = displayName.trim()
    const suggestions = [`${base}${Math.floor(Math.random() * 90 + 10)}`, `${base}_GG`, `x${base}`]
    return NextResponse.json({
      ok: false,
      reason: 'taken',
      message: 'Ce pseudo est déjà utilisé.',
      suggestions,
    })
  }

  return NextResponse.json({ ok: true })
}
