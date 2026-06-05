import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        void: '#06070b',
        bg: '#0a0c14',
        surface: '#0f121c',
        elevated: '#161a26',
        duo: '#00e0ff',
        teams: '#8b5cf6',
        training: '#ff3d6e',
        live: '#00ff9d',
        gold: '#ffd166',
        queue: '#ffb547',
        dim: '#9aa2bf',
        mute: '#5a607a',
        'role-top': '#ff6a4d',
        'role-jng': '#3ddc97',
        'role-mid': '#00e0ff',
        'role-adc': '#ffd166',
        'role-sup': '#b58dff',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
