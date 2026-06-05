// Client-safe — only CDN URLs, no secrets

const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com/cdn'

export function championIconUrl(championKey: string, version = '15.10.1') {
  return `${DDRAGON_BASE}/${version}/img/champion/${championKey}.png`
}

export function profileIconUrl(iconId: number, version = '15.10.1') {
  return `${DDRAGON_BASE}/${version}/img/profileicon/${iconId}.png`
}

export const TIER_COLORS: Record<string, string> = {
  IRON: 'text-zinc-400',
  BRONZE: 'text-amber-700',
  SILVER: 'text-zinc-300',
  GOLD: 'text-yellow-400',
  PLATINUM: 'text-teal-400',
  EMERALD: 'text-emerald-400',
  DIAMOND: 'text-blue-400',
  MASTER: 'text-purple-400',
  GRANDMASTER: 'text-red-400',
  CHALLENGER: 'text-yellow-300',
}

export const PLATFORM_LABELS: Record<string, string> = {
  euw1: 'EUW',
  eun1: 'EUNE',
  na1: 'NA',
  kr: 'KR',
  br1: 'BR',
  la1: 'LAN',
  la2: 'LAS',
  oc1: 'OCE',
  tr1: 'TR',
  jp1: 'JP',
}
