import { type NextRequest, NextResponse } from 'next/server'
import https from 'node:https'
import { getDDragonVersion } from '@/lib/riot/client'

const agent = new https.Agent({ rejectUnauthorized: false })

function fetchBinary(url: string): Promise<{ status: number; buffer: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { agent }, res => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve({
        status: res.statusCode ?? 0,
        buffer: Buffer.concat(chunks),
        contentType: (res.headers['content-type'] as string) ?? 'image/png',
      }))
    })
    req.on('error', reject)
  })
}

// Cache version in memory — refreshed at module load
let cachedVersion: string | null = null

async function getVersion() {
  if (!cachedVersion) cachedVersion = await getDDragonVersion()
  return cachedVersion
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  if (!id || !/^[a-zA-Z0-9]+$/.test(id)) {
    return new NextResponse(null, { status: 400 })
  }

  try {
    const version = await getVersion()
    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${id}.png`
    const { status, buffer, contentType } = await fetchBinary(url)

    if (status !== 200) return new NextResponse(null, { status: 404 })

    return new NextResponse(buffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    })
  } catch {
    return new NextResponse(null, { status: 502 })
  }
}
