// Supabase Edge Function — Sync Data Dragon champions
// Triggered by cron (daily) or manually
// Deploy: supabase functions deploy sync-champions

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const LOCALES = [
  { ddragon: 'fr_FR', key: 'fr' },
  { ddragon: 'en_US', key: 'en' },
]

serve(async () => {
  // Get latest patch version
  const versionsRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json')
  const versions = (await versionsRes.json()) as string[]
  const version = versions[0]

  // Fetch champion data per locale
  const localeData: Record<string, Record<string, { id: string; key: string; name: string; tags: string[] }>> = {}
  for (const { ddragon, key } of LOCALES) {
    const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/${ddragon}/champion.json`)
    const json = (await res.json()) as { data: Record<string, { id: string; key: string; name: string; tags: string[] }> }
    localeData[key] = json.data
  }

  // Build upsert rows
  const enData = localeData['en']
  const frData = localeData['fr']

  const rows = Object.values(enData).map((champ) => ({
    id: parseInt(champ.key),
    key: champ.id,
    name: { en: champ.name, fr: frData[champ.id]?.name ?? champ.name },
    roles: champ.tags,
    image_url: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ.id}.png`,
    patch: version,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('champions').upsert(rows, { onConflict: 'id' })
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ synced: rows.length, patch: version }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
