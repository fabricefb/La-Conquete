/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  /* Les délais sont composés à l'exécution (`reveal-delay-${i + 1}`) :
     sans safelist, Tailwind n'émet que les classes écrites en clair. */
  safelist: [
    'reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3', 'reveal-delay-4', 'reveal-delay-5',
    'evt-reveal-delay-1', 'evt-reveal-delay-2', 'evt-reveal-delay-3', 'evt-reveal-delay-4',
  ],
  darkMode: 'class',
  plugins: [],
  theme: {
    extend: {
      /* ═══════════════════════════════════════════════════════════
         PALETTE OFFICIELLE — Église Évangélique La Conquête
         ═══════════════════════════════════════════════════════════ */
      colors: {
        /* --- Bleu Conquête — Fond principal, Navigation, Texte d'autorité --- */
        'conquete': {
          50:  '#EEF1F8',
          100: '#D5DBED',
          200: '#ABB7DB',
          300: '#8193C9',
          400: '#576FB7',
          500: '#2D4BA5',
          600: '#1A3480',
          700: '#0F2147',  /* ← PRINCIPAL */
          800: '#0C1A39',
          900: '#09132B',
          950: '#060D1D',
        },
        /* --- Rouge Évangile — CTA, Accents, Alertes, Icônes actives --- */
        'evangile': {
          50:  '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#E3221F',  /* ← PRINCIPAL */
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
          950: '#450A0A',
        },
        /* --- Ciel Divin — Surfaces secondaires, Textes de lecture, Glassmorphism --- */
        'divin': {
          50:  '#F5F7FF',
          100: '#D8E3FB',  /* ← PRINCIPAL */
          200: '#B8CCF7',
          300: '#8FB0F0',
          400: '#6A96E8',
          500: '#4A7CDD',
          600: '#3A64BE',
          700: '#2D4E9A',
          800: '#1E3470',
          900: '#0F2147',
        },
        /* --- Blanc Cristal --- */
        'cristal': '#FFFFFF',

        /* ─── Legacy aliases — rebranched on the official palette so the brand
               values live in exactly one place. Do NOT add new usages: migrate to
               conquest / evangile / divin instead. Slated for removal in Phase 3. ─── */
        ink:   { 950:'#060D1D', 900:'#09132B', 800:'#0C1A39', 700:'#0F2147', 600:'#1A3480', 500:'#2D4BA5', 400:'#576FB7', 300:'#8193C9' },
        gold:  { 50:'#FEF2F2', 100:'#FEE2E2', 200:'#FECACA', 300:'#FCA5A5', 400:'#F87171', 500:'#EF4444', 600:'#E3221F', 700:'#B91C1C', 800:'#991B1B', 900:'#7F1D1D' },
        ember: { 400:'#F87171', 500:'#EF4444', 600:'#E3221F', 700:'#B91C1C' },
        sky:   { 50:'#F5F7FF', 100:'#D8E3FB', 200:'#B8CCF7', 300:'#8FB0F0', 400:'#6A96E8', 500:'#4A7CDD', 600:'#3A64BE', 700:'#2D4E9A', 800:'#1E3470', 900:'#0F2147' },

        /* --- Accent Bleu (nuances de bleu pour icônes, labels, hover) --- */
        'accent': {
          50:  'rgb(var(--accent-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--accent-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--accent-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--accent-300-rgb) / <alpha-value>)',
          400: 'rgb(var(--accent-400-rgb) / <alpha-value>)',
          500: 'rgb(var(--accent-500-rgb) / <alpha-value>)',
          600: 'rgb(var(--accent-600-rgb) / <alpha-value>)',
          700: 'rgb(var(--accent-700-rgb) / <alpha-value>)',
          800: 'rgb(var(--accent-800-rgb) / <alpha-value>)',
          900: 'rgb(var(--accent-900-rgb) / <alpha-value>)',
        },

        /* ─── CSS-variable-based semantic colors ─── */
        bg:            'rgb(var(--bg-rgb) / <alpha-value>)',
        'bg-elevated': 'rgb(var(--bg-elevated-rgb) / <alpha-value>)',
        'bg-card':     'rgb(var(--bg-card-rgb) / <alpha-value>)',
        'bg-card-hover':'rgb(var(--bg-card-hover-rgb) / <alpha-value>)',
        cream:         'rgb(var(--text-rgb) / <alpha-value>)',
        muted:         'rgb(var(--text-muted-rgb) / <alpha-value>)',
        line:          'rgb(var(--border-subtle-rgb) / var(--border-subtle-a))',
      },

      /* ═══════════════════════════════════════════════════════════
         TYPOGRAPHIE OFFICIELLE
         ═══════════════════════════════════════════════════════════ */
      fontFamily: {
        'headline': ['"Playfair Display"', 'Georgia', 'serif'],
        'display':  ['"Playfair Display"', 'Georgia', 'serif'],
        'body':     ['Poppins', 'system-ui', 'sans-serif'],
        'sans':     ['Poppins', 'system-ui', 'sans-serif'],
        /* `hero` = registre institutionnel des pages publiques : condensé,
           capitales, graisse unique. `display`/`headline` restent Playfair pour
           l'espace interne — ne pas les confondre. */
        'hero':     ['"Bebas Neue"', 'Oswald', 'Poppins', 'sans-serif'],
        /* `font-serif` is used ~90x across the public pages: bind it to the brand
           serif instead of letting Tailwind fall back to the ui-serif stack. */
        'serif':    ['"Playfair Display"', 'Georgia', 'serif'],
        'mono':     ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      fontSize: {
        'headline-xl': ['52px', { lineHeight: '60px', letterSpacing: '-0.025em', fontWeight: '700' }],
        'headline-lg': ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'headline-md': ['28px', { lineHeight: '36px', fontWeight: '600' }],
        'headline-sm': ['22px', { lineHeight: '30px', fontWeight: '600' }],
        'body-lg':  ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md':  ['16px', { lineHeight: '26px', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '20px', letterSpacing: '0.05em', fontWeight: '600' }],
      },

      /* ═══════════════════════════════════════════════════════════
         SPACING & LAYOUT
         ═══════════════════════════════════════════════════════════ */
      spacing: {
        'gutter':       '24px',
        'margin-mobile': '16px',
        'margin-desktop':'80px',
        'section-gap':  '96px',
        'xs':           '8px',
        'xl':           '64px',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      maxWidth: {
        '8xl': '1280px',
      },

      /* ═══════════════════════════════════════════════════════════
         ANIMATION TOKENS (durées & easings éditables depuis l'admin)
         ═══════════════════════════════════════════════════════════ */
      transitionDuration: {
        'reveal':   '900ms',
        'hover':    '300ms',
        'page':     '500ms',
        'marquee':  '30000ms',
      },
      transitionTimingFunction: {
        'reveal':   'cubic-bezier(0.22, 1, 0.36, 1)',
        'hover':    'cubic-bezier(0.22, 1, 0.36, 1)',
        'smooth':   'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      boxShadow: {
        'glass':    '0 8px 32px rgba(0, 0, 0, 0.12)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.18)',
        'glow-red': '0 0 40px rgba(227, 34, 31, 0.15), 0 0 80px rgba(227, 34, 31, 0.08)',
        'glow-blue':'0 0 40px rgba(15, 33, 71, 0.25), 0 0 80px rgba(15, 33, 71, 0.10)',
        'card':     '0 4px 24px rgba(100, 120, 180, 0.08)',
        'card-hover':'0 20px 50px rgba(0,0,0,0.3), 0 8px 20px rgba(74,124,221,0.08)',
      },
      backgroundImage: {
        'gradient-radial-red':  'radial-gradient(ellipse at center, rgba(227, 34, 31, 0.12) 0%, transparent 70%)',
        'gradient-radial-blue': 'radial-gradient(ellipse at center, rgba(15, 33, 71, 0.20) 0%, transparent 70%)',
      },
    },
  },
};