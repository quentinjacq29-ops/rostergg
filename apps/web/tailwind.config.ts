import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── Breakpoints RosterGG (défauts Tailwind INCHANGÉS) ──────────
      screens: {
        appfold: '760px',  // app shell : bottom-nav ↔ sidebar
        onb:     '880px',  // rail onboarding → bandeau haut
        auth:    '900px',  // auth 2col → 1col
        navfold: '680px',  // nav → hamburger (landing)
        hero:    '960px',  // fold hero landing
        railwide:'1080px', // sidebar icônes → pleine
      },
      // ── Couleurs (CSS vars — source unique dans globals.css :root) ──
      colors: {
        // Existants conservés tels quels (ne pas casser le code existant)
        void:    '#06070b',
        bg:      '#0a0c14',
        surface: '#0f121c',
        elevated:'#161a26',
        duo:     '#00e0ff',  // alias marque = --cyan
        teams:   '#8b5cf6',  // alias marque = --violet
        training:'#ff3d6e',  // alias marque = --danger
        live:    '#00ff9d',
        gold:    '#ffd166',
        queue:   '#ffb547',
        dim:     '#9aa2bf',
        mute:    '#5a607a',
        'role-top': '#ff6a4d',
        'role-jng': '#3ddc97',
        'role-mid': '#00e0ff',
        'role-adc': '#ffd166',
        'role-sup': '#b58dff',
        // Nouveaux tokens rgg.css (via CSS vars — synchronisés avec :root)
        danger:     'var(--danger)',
        diamond:    'var(--diamond)',
        'cyan-dim': 'var(--cyan-dim)',
        'violet-dim':'var(--violet-dim)',
        'role-fill': 'var(--r-fill)',
        'text-base': 'var(--text)',
        'text-dim':  'var(--text-dim)',
        'text-mute': 'var(--text-mute)',
        'line':      'var(--line)',
        'line-strong':'var(--line-strong)',
      },
      backgroundImage: {
        grad: 'linear-gradient(135deg, var(--cyan), var(--violet))',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'sans-serif'],
        body:    ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'ui-monospace', 'monospace'],
        sans:    ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
