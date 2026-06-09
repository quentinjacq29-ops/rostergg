import { chromium } from 'playwright'

const SESSION = JSON.parse(process.env.SESSION_JSON)
const REF = 'oaigxafbggjecombncja'
const PORT = 3002

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1400 } })

const sessionStr = JSON.stringify(SESSION)
const chunks = []
for (let i = 0; i < sessionStr.length; i += 3600) chunks.push(sessionStr.slice(i, i + 3600))
const cookies = chunks.length === 1
  ? [{ name: `sb-${REF}-auth-token`, value: sessionStr, domain: 'localhost', path: '/', sameSite: 'Lax' }]
  : chunks.map((c, i) => ({ name: `sb-${REF}-auth-token.${i}`, value: c, domain: 'localhost', path: '/', sameSite: 'Lax' }))
await ctx.addCookies(cookies)

const page = await ctx.newPage()
await page.goto(`http://localhost:${PORT}/fr/duo`, { waitUntil: 'domcontentloaded', timeout: 20000 })
await page.waitForTimeout(5000)

const feedRows = page.locator('.rgg-feed-col > div:nth-child(2) > button')
const count = await feedRows.count()
console.log(`Cards: ${count}`)

// Card 0 = GRASPR (TOP/JNG, score 60, 2 pools)
await feedRows.nth(0).click()
await page.waitForTimeout(4000)

const txt = await page.evaluate(() => document.querySelector('.rgg-detail-pane')?.innerText?.substring(0, 800))
console.log('Detail text:\n', txt)

// Screenshot global
await page.screenshot({ path: 'scripts/shot-overview.png' })
console.log('Overview saved')

// Screenshot detail pane seul
const box = await page.locator('.rgg-detail-pane').boundingBox()
if (box) {
  await page.screenshot({ path: 'scripts/shot-detail.png', clip: box })
  console.log('Detail saved')
}

await browser.close()
