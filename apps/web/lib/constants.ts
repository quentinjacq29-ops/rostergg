export const ROLES = {
  TOP: { c: '#ff6a4d', name: 'TOP', short: 'T' },
  JNG: { c: '#3ddc97', name: 'JUNGLE', short: 'J' },
  MID: { c: '#00e0ff', name: 'MID', short: 'M' },
  ADC: { c: '#ffd166', name: 'ADC', short: 'A' },
  SUP: { c: '#b58dff', name: 'SUPPORT', short: 'S' },
} as const

export type Role = keyof typeof ROLES

export const RANK_COLORS: Record<string, string> = {
  IRON: '#5a4a3a',
  BRONZE: '#a06a3a',
  SILVER: '#b8c3d6',
  GOLD: '#ffd166',
  PLATINUM: '#5be0d4',
  EMERALD: '#3ddc97',
  DIAMOND: '#7cc6ff',
  MASTER: '#c98bff',
  GRANDMASTER: '#ff5577',
  CHALLENGER: '#ffe27a',
}

export const CHAMP_CLASS_COLORS: Record<string, string> = {
  assassin: '#ff5577',
  fighter: '#ff8a3d',
  mage: '#7c5cff',
  marksman: '#ffd166',
  support: '#3ddc97',
  tank: '#5fa8ff',
}

export const ONB_STEPS = [
  'Compte Riot',
  'Tu cherches quoi',
  'Langues',
  'Rôle principal',
  'Rôle recherché',
  'Champion pool',
  'Style de jeu',
  'Disponibilités',
] as const

export const PLATFORMS = ['EUW', 'EUNE', 'NA', 'KR', 'BR', 'LAN', 'LAS', 'OCE', 'TR', 'JP'] as const

export const LANGS = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
] as const
