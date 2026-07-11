/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: { 950:'#050810',900:'#080d1a',800:'#0c1322',700:'#0f2147',600:'#162d5e',500:'#1e3a75',400:'#2a4d94',300:'#3a62b3' },
        gold: { 50:'#fef2f2',100:'#fee2e2',200:'#fca5a5',300:'#f87171',400:'#ef4444',500:'#E3221F',600:'#c91916',700:'#a31311',800:'#7f100f',900:'#5c0c0b' },
        ember: { 400:'#ff7b6b',500:'#f23c2e',600:'#b9170d',700:'#8c110a' },
        sky: { 50:'#f0f4ff',100:'#D8E3FB',200:'#b8ccf7',300:'#8fb0f0',400:'#6a96e8',500:'#4a7cdd',600:'#3a64be',700:'#2d4e9a',800:'#1e3470',900:'#0f2147' },
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