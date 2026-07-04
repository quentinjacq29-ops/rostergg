import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ddragon.leagueoflegends.com' },
    ],
  },
  experimental: {
    // Pas de cache client sur les pages dynamiques : chaque navigation refetch
    // les données fraîches (sinon /me et /duo affichent des prefs périmées après
    // édition — le Router Cache servait une version en cache).
    staleTimes: { dynamic: 0, static: 0 },
  },
}

export default withNextIntl(nextConfig)
// v2
