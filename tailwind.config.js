/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: { 950:'#050810',900:'#0a0f1c',800:'#0f1626',700:'#151f33',600:'#1c2942',500:'#243453',400:'#2e4267',300:'#3a5380' },
        gold: { 50:'#fdf8ed',100:'#faedcf',200:'#f5d99e',300:'#efc06a',400:'#e8a73c',500:'#d4881a',600:'#b56a0f',700:'#915010',800:'#763f12',900:'#623412' },
        ember: { 400:'#ff6b5c',500:'#f23c2e',600:'#d11a0c',700:'#a8130a' },
        bg: 'rgb(var(--bg-rgb) / <alpha-value>)',
        'bg-elevated': 'rgb(var(--bg-elevated-rgb) / <alpha-value>)',
        'bg-card': 'rgb(var(--bg-card-rgb) / <alpha-value>)',
        'bg-card-hover': 'rgb(var(--bg-card-hover-rgb) / <alpha-value>)',
        cream: 'rgb(var(--text-rgb) / <alpha-value>)',
        muted: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
        line: 'rgb(var(--border-subtle-rgb) / var(--border-subtle-a))',
      },
      fontFamily: { display:['"Cormorant Garamond"','serif'], sans:['"Inter"','system-ui','sans-serif'] },
      borderRadius: { '4xl':'2rem','5xl':'2.5rem' },
    },
  },
  plugins: [],
};
