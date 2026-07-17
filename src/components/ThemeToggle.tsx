import { Sun, Moon } from '../lib/icons';
import type { Theme } from '../types';

interface ThemeToggleProps { theme: Theme; onToggle: () => void; className?: string; }

export function ThemeToggle({ theme, onToggle, className = '' }: ThemeToggleProps) {
  return (
    <button onClick={onToggle} aria-label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
      className={`flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-all duration-300 hover:border-accent-400/40 hover:text-accent-400 ${className}`}>
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
