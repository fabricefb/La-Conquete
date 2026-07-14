import { useEffect, useState } from 'react';
export type Theme = 'dark' | 'light';
const KEY = 'la-conquete-theme';
function get(): Theme { try { const s = localStorage.getItem(KEY); return s === 'light' || s === 'dark' ? s : 'dark'; } catch { return 'dark'; } }
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(get);
  useEffect(() => { document.documentElement.classList.remove('dark','light'); document.documentElement.classList.add(theme); localStorage.setItem(KEY, theme); }, [theme]);
  return { theme, toggle: () => setTheme(p => p === 'dark' ? 'light' : 'dark') };
}
