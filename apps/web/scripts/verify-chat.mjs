import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

// charge .env.local
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter(l => l.includes('=') && !l.trimStart().startsWith('#'))
  .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }))

const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const EMAIL = process.argv[2] || 'leeflow@test.rostergg'
const BASE = 'http://localhost:3006'

const supabase = createClient(SB_URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } })
async function freshLink() {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink', email: EMAIL, options: { redirectTo: `${BASE}/fr/auth/callback` },
  })
  if (error || !data.properties?.action_link) { console.error('link error', error); process.exit(1) }
  return data.properties.action_link
}

const browser = await chromium.launch()

async function shot(width, height, tag) {
  const link = await freshLink() // magic link à usage unique → un par contexte
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await page.goto(link, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.goto(`${BASE}/fr/inbox`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  // ouvrir la 1re conversation (lecture seule : on clique une ligne de liste, pas un contrôle d'édition)
  const row = page.locator('text=/Durix|test/').first()
  if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(1200) }
  await page.screenshot({ path: `scripts/out-chat-${tag}.png`, fullPage: false })
  console.log('shot', tag, 'saved')
  await ctx.close()
}

await shot(481, 860, 'mobile')
await shot(1440, 900, 'desktop')
await browser.close()
console.log('done')
