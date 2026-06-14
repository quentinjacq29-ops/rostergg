import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

const ADJECTIVES = [
  'Midnight', 'Silent', 'Shadow', 'Golden', 'Arctic', 'Neon', 'Iron', 'Storm',
  'Cosmic', 'Swift', 'Lunar', 'Crimson', 'Frost', 'Ember', 'Void', 'Eternal',
  'Wild', 'Dark', 'Brave', 'Steel', 'Solar', 'Electric', 'Rapid', 'Blazing',
]

const NOUNS = [
  'Roam', 'Blade', 'Hawk', 'Wolf', 'Nova', 'Peak', 'Flash', 'Carry',
  'Rush', 'Drift', 'Echo', 'Forge', 'Pulse', 'Flare', 'Shift', 'Mark',
  'Hunt', 'Call', 'Lane', 'Rift', 'Ward', 'Climb', 'Gank', 'Push',
]

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]
}

// Génère un pseudo à partir d'une graine (basée sur le gameName ou aléatoire)
function generateSuggestion(seed?: string): string {
  let n = seed
    ? seed.split('').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0)
    : Math.floor(Math.random() * 1e9)
  // Forcer la variabilité avec un offset aléatoire
  n = (n + Math.floor(Math.random() * 1000)) >>> 0
  const adj  = pick(ADJECTIVES, n)
  const noun = pick(NOUNS, n + 7)
  return `${adj}${noun}`
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const seed = req.nextUrl.searchParams.get('seed') ?? undefined

  // Générer jusqu'à 5 candidats, retourner le premier non pris
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateSuggestion(seed ? `${seed}_${attempt}` : undefined)
    const { data: taken } = await supabase
      .from('profiles')
      .select('id')
      .ilike('display_name', candidate)
      .maybeSingle()
    if (!taken) return NextResponse.json({ suggestion: candidate })
  }

  // Fallback avec un suffixe numérique aléatoire
  const base = generateSuggestion(seed)
  return NextResponse.json({ suggestion: `${base}${Math.floor(Math.random() * 900 + 100)}` })
}
