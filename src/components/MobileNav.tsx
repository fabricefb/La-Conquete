import { Home, Calendar, Play, Mail } from '../lib/icons';
import type { Page } from '../lib/navigation';

interface MobileNavProps { onNavigate: (page: Page) => void; active: Page; theme?: string; onToggleTheme?: () => void; }

export function MobileNav({ onNavigate, active }: MobileNavProps) {
  const items = [
    { key: 'home' as Page, label: 'Accueil', icon: Home },
    { key: 'events' as Page, label: 'Agenda', icon: Calendar },
    { key: 'media' as Page, label: 'Médias', icon: Play },
    { key: 'contact' as Page, label: 'Contact', icon: Mail },
  ];
  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 flex h-16 items-center justify-around rounded-full glass px-2 shadow-2xl xl:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;
        return (
          <button key={item.key} onClick={() => onNavigate(item.key)}
            className={`relative flex flex-col items-center gap-0.5 transition-all duration-300 ${isActive ? 'text-gold-300' : 'text-muted'}`}
            aria-label={item.label}>
            <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[9px] font-semibold uppercase tracking-tight">{item.label}</span>
            {isActive && <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-gold-400 animate-pulse-gold" />}
          </button>
        );
      })}
    </nav>
  );
}