import { useEffect, useState } from 'react';
import { X, ChevronRight, Menu } from '../lib/icons';
import type { Page } from '../lib/navigation';
import type { Theme } from '../lib/theme';
import { ThemeToggle } from './ThemeToggle';

const LOGO = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuHDznVSbj77TcRuf-r0to8rCYGPa9lZ75G4Zm7hbC__8gp8d56nTozKyHZyybWU9xdaBURMxftyiZF-i4Zdp8XT_bJYNT-WVQWu3r32FHqxjRzt9cCMpPuHJJZryUrKgHbCiFJYnLg0boUgp8ATuXf_zhlyEhW-QlPQVcfIXjf8lrX2G3JGtujmvo3YKp_c94RqPQf5g8LvIBM1zRCErGSOVjRIw8SQ4aH3aliCJ-EOhKBq-PO5S3pZoaMuTk7u2iKCU';

const navLinks: { label: string; page: Page }[] = [
  { label: 'Accueil', page: 'home' },
  { label: 'Qui sommes-nous', page: 'about' },
  { label: 'Nos activités', page: 'activities' },
  { label: 'Agenda', page: 'events' },
  { label: 'Médias', page: 'media' },
  { label: 'Contact', page: 'contact' },
];

interface SiteHeaderProps {
  onNavigate: (page: Page) => void;
  activePage: Page;
  theme?: Theme;
  onToggleTheme?: () => void;
}

export function SiteHeader({ onNavigate, activePage, theme: themeProp, onToggleTheme: toggleProp }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fallback to DynamicTheme context if props not provided
  const [ctxTheme, setCtxTheme] = useState<Theme>('dark');
  const [ctxToggle] = useState<() => void>(() => {
    const next = ctxTheme === 'dark' ? 'light' : 'dark';
    setCtxTheme(next);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(next);
    try { localStorage.setItem('la-conquete-theme', next); } catch { /* */ }
  });

  const theme = themeProp ?? ctxTheme;
  const onToggleTheme = toggleProp ?? ctxToggle;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (drawerOpen) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const handleNav = (page: Page) => { onNavigate(page); setDrawerOpen(false); };

  return (
    <>
      <header className={`fixed left-0 right-0 top-0 z-40 transition-all duration-300 ${scrolled ? 'glass border-b border-line shadow-lg' : 'bg-bg/80 border-b border-transparent'}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button onClick={() => handleNav('home')} className="flex shrink-0 items-center gap-3 transition-opacity duration-200 hover:opacity-80">
            <img src={LOGO} alt="La Conquête" className="h-9 w-9 rounded-full object-cover" />
            <span className="hidden gold-text text-lg font-bold tracking-wide sm:block">La Conquête</span>
          </button>
          <nav className="hidden items-center gap-1 xl:flex">
            {navLinks.map((link) => (
              <button key={link.page} onClick={() => handleNav(link.page)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${activePage === link.page ? 'text-gold-300 bg-gold-400/10' : 'text-muted hover:text-cream hover:bg-white/5'}`}>
                {link.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} className="hidden sm:flex" />
            <button onClick={() => handleNav('contact')} className="btn-gold hidden px-4 py-2 text-sm xl:flex">Faire un don</button>
            <button onClick={() => setDrawerOpen(true)} aria-label="Ouvrir le menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-all duration-200 hover:border-gold-400/40 hover:text-gold-400 xl:hidden">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg xl:hidden">
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <button onClick={() => handleNav('home')} className="flex items-center gap-3">
              <img src={LOGO} alt="La Conquête" className="h-9 w-9 rounded-full object-cover" />
              <span className="gold-text text-lg font-bold tracking-wide">La Conquête</span>
            </button>
            <button onClick={() => setDrawerOpen(false)} aria-label="Fermer le menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-all duration-200 hover:border-gold-400/40 hover:text-gold-400">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6">
            {navLinks.map((link) => (
              <button key={link.page} onClick={() => handleNav(link.page)}
                className={`flex items-center justify-between rounded-xl px-4 py-4 text-base font-medium transition-all duration-200 ${activePage === link.page ? 'text-gold-300 bg-gold-400/10' : 'text-cream hover:bg-white/5'}`}>
                {link.label}
                <ChevronRight className={`h-4 w-4 ${activePage === link.page ? 'text-gold-400' : 'text-muted'}`} />
              </button>
            ))}
          </nav>
          <div className="border-t border-line px-4 py-6 flex items-center justify-between gap-4">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <button onClick={() => handleNav('contact')} className="btn-gold flex-1 py-3 text-sm">Faire un don</button>
          </div>
        </div>
      )}
    </>
  );
}