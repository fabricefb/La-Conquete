import { Home, Calendar, Play, Mail, User } from '../lib/icons';
import type { Page } from '../lib/navigation';

interface MobileNavProps { onNavigate: (page: Page) => void; active: Page; }

// Map new/admin page names to the closest bottom-nav tab for active state highlighting
const ACTIVE_ALIAS: Partial<Record<Page, Page>> = {
  emissions: 'media',
  predications: 'media',
  departments: 'home',
  pastoral: 'dashboard',
  communication: 'dashboard',
  reports: 'dashboard',
  crm: 'dashboard',
  about: 'home',
  activities: 'home',
  connexion: 'home',
  annonces: 'home',
  communiques: 'home',
  extensions: 'home',
  admin: 'dashboard',
};

export function MobileNav({ onNavigate, active }: MobileNavProps) {
  const items = [
    { key: 'home' as Page, label: 'Accueil', icon: Home },
    { key: 'dashboard' as Page, label: 'Profil', icon: User },
    { key: 'events' as Page, label: 'Agenda', icon: Calendar },
    { key: 'media' as Page, label: 'Médias', icon: Play },
    { key: 'contact' as Page, label: 'Contact', icon: Mail },
  ];

  // Resolve the active key through the alias map
  const resolvedActive = ACTIVE_ALIAS[active] ?? active;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around glass px-2 xl:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = resolvedActive === item.key;
          return (
            <button key={item.key} onClick={() => onNavigate(item.key)}
              className={`relative flex flex-col items-center gap-0.5 transition-all duration-300 ${isActive ? 'text-accent-300' : 'text-muted'}`}
              aria-label={item.label}>
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[9px] font-semibold uppercase tracking-tight">{item.label}</span>
              {isActive && <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-evangile-600 animate-pulse-gold" />}
            </button>
          );
        })}
      </nav>
      {/* Espaceur pour éviter que le contenu soit caché par la barre fixe */}
      <div className="h-16 xl:hidden" />
    </>
  );
}