'use client'
import { useState } from 'react'
import { getChamp } from '@/lib/lol/champs'

const DD_VERSION = '15.10.1'

// Tuile champion : image Data Dragon avec fallback tuile colorée (initiales + classe)
// champKey = clé DD exacte (ex: "Aatrox", "JarvanIV", "AurelionSol")
export default function ChampionTile({ champKey, size = 48, ring = false }: {
  champKey: string
  size?: number
  ring?: boolean
}) {
  const { name, cls, tag, color } = getChamp(champKey)
  const [imgFailed, setImgFailed] = useState(false)

  const imgUrl = `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/champion/${champKey}.png`

  return (
    <div
      title={name}
      style={{
        width: size, height: size, borderRadius: 10, flexShrink: 0,
        background: `linear-gradient(160deg, ${color}33, #161a26)`,
        border: `1px solid ${imgFailed ? color + '55' : color + '80'}`,
        overflow: 'hidden', position: 'relative',
        boxShadow: ring ? `0 0 0 2px ${color}, 0 0 14px ${color}66` : 'none',
      }}
    >
      {!imgFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgUrl}
          alt={name}
          onError={() => setImgFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        // Fallback : tuile colorée avec initiales (port maquette components.jsx)
        <>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 30% 20%, ${color}40, transparent 60%)` }} />
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.42, color: '#f4f6ff', position: 'relative', letterSpacing: '0.04em' }}>
              {tag}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: size * 0.16, color, position: 'relative', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {cls.slice(0, 3)}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
