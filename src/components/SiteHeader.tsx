import { useEffect, useState, useRef, useCallback } from 'react';
import { X, ChevronDown, Menu, LogIn } from '../lib/icons';
import { useAuth } from '../contexts/AuthContext';
import { useLiveStatus } from '../lib/hooks/useLiveStatus';
import { can } from '../lib/permissions';
import { ROLE_LEVELS } from '../types';
import type { Page } from '../lib/navigation';
import type { Theme } from '../types';
import { ThemeToggle } from './ThemeToggle';

const LOGO = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuHDznVSbj77TcRuf-r0to8rCYGPa9lZ75G4Zm7hbC__8gp8d56nTozKyHZyybWU9xdaBURMxftyiZF-i4Zdp8XT_bJYNT-WVQWu3r32FHqxjRzt9cCMpPuHJJZryUrKgHbCiFJYnLg0boUgp8ATuXf_zhlyEhW-QlPQVcfIXjf8lrX2G3JGtujmvo3YKp_c94RqPQf5g8LvIBM1zRCErGSOVjRIw8SQ4aH3aliCJ-EOhKBq-PO5S3pZoaMuTk7u2iKCU';

/* ─── Navigation structure ─────────────────────────────────────── */

interface NavItem {
  label: string;
  page?: Page;
  children?: { label: string; page: Page }[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'BIENVENUE', page: 'home' },
  { label: 'QUI SOMMES-NOUS', page: 'about' },
  {
    label: 'VIE DE L\'ÉGLISE',
    children: [
      { label: 'Nos activités', page: 'activities' },
      { label: 'Agenda', page: 'events' },
      { label: 'Communiqués', page: 'communiques' },
      { label: 'Annonces', page: 'annonces' },
      { label: 'Départements', page: 'departments' },
      { label: 'Nos extensions', page: 'extensions' },
    ],
  },
  {
    label: 'MÉDIA',
    children: [
      { label: 'Émissions', page: 'emissions' },
      { label: 'Prédications', page: 'predications' },
      { label: 'Galerie photos', page: 'media' },
    ],
  },
  { label: 'CONTACT', page: 'contact' },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', page: 'dashboard' },
  { label: 'Espace Pastoral', page: 'pastoral' },
  { label: 'Rapports', page: 'reports' },
  { label: 'Communication', page: 'communication' },
];

/* ─── Live Indicators ──────────────────────────────────────────── */

function LiveIndicators() {
  const { youtube, facebook } = useLiveStatus();
  if (!youtube && !facebook) return null;

  return (
    <div className="flex items-center gap-3">
      {youtube && (
        <a
          href="https://www.youtube.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400 hover:text-red-300 transition-colors"
          title="En direct sur YouTube"
        >
          <span className="live-dot" />
          <span className="hidden lg:inline">EN DIRECT</span>
        </a>
      )}
      {facebook && (
        <a
          href="https://www.facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          title="En direct sur Facebook"
        >
          <span className="live-dot" style={{ background: '#3B82F6' }} />
          <span className="hidden lg:inline">LIVE</span>
        </a>
      )}
    </div>
  );
}

/* ─── Desktop Dropdown ─────────────────────────────────────────── */

function DesktopDropdown({
  item,
  activePage,
  onNavigate,
}: {
  item: NavItem & { children: NonNullable<NavItem['children']> };
  activePage: Page;
  onNavigate: (page: Page) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const isActive = item.children.some(c => c.page === activePage);

  const handleEnter = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  }, []);

  const handleLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        className={`nav-item-zoom flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'text-gold-300 bg-gold-400/10'
            : 'text-muted hover:text-cream hover:bg-white/5'
        }`}
      >
        {item.label}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      <div
        className={`absolute left-0 top-full pt-2 transition-all duration-200 ${
          open
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
      >
        <div className="glass rounded-xl p-2 min-w-[220px] shadow-xl shadow-black/30">
          {item.children.map(child => (
            <button
              key={child.page}
              onClick={() => { onNavigate(child.page); setOpen(false); }}
              className={`nav-item-zoom w-full text-left rounded-lg px-4 py-2.5 text-sm transition-all duration-200 ${
                activePage === child.page
                  ? 'text-gold-300 bg-gold-400/10'
                  : 'text-cream/80 hover:text-cream hover:bg-white/5'
              }`}
            >
              {child.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Mobile Accordion ─────────────────────────────────────────── */

function MobileAccordion({
  item,
  activePage,
  onNavigate,
}: {
  item: NavItem & { children: NonNullable<NavItem['children']> };
  activePage: Page;
  onNavigate: (page: Page) => void;
}) {
  const [open, setOpen] = useState(false);
  const isActive = item.children.some(c => c.page === activePage);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between rounded-xl px-4 py-4 text-base font-medium transition-all duration-200 ${
          isActive || open ? 'text-gold-300 bg-gold-400/10' : 'text-cream hover:bg-white/5'
        }`}
      >
        {item.label}
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="pl-4 pb-2 flex flex-col gap-0.5">
          {item.children.map(child => (
            <button
              key={child.page}
              onClick={() => onNavigate(child.page)}
              className={`text-left rounded-lg px-4 py-3 text-sm transition-all duration-200 ${
                activePage === child.page
                  ? 'text-gold-300 bg-gold-400/10'
                  : 'text-muted hover:text-cream hover:bg-white/5'
              }`}
            >
              {child.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Header Component ────────────────────────────────────── */

interface SiteHeaderProps {
  onNavigate: (page: Page) => void;
  activePage: Page;
  theme?: Theme;
  onToggleTheme?: () => void;
}

export function SiteHeader({ onNavigate, activePage, theme: themeProp, onToggleTheme: toggleProp }: SiteHeaderProps) {
  const { user, profile } = useAuth();
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
      {/* ═══ Desktop / Tablet Header ═══ */}
      <header className={`fixed left-0 right-0 top-0 z-40 transition-all duration-300 ${
        scrolled ? 'glass border-b border-line shadow-lg' : 'bg-bg/80 border-b border-transparent'
      }`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo + Title (2 lines) */}
          <button onClick={() => handleNav('home')} className="flex shrink-0 items-center gap-3 transition-opacity duration-200 hover:opacity-80">
            <img src={LOGO} alt="La Conquête" className="h-10 w-10 rounded-full object-cover" />
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="gold-text text-sm font-bold tracking-wide">Église Évangélique</span>
              <span className="gold-text text-base font-bold tracking-wider">La Conquête</span>
            </div>
          </button>

          {/* Live indicators (next to nav) */}
          <div className="hidden xl:flex items-center">
            <LiveIndicators />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-0.5 xl:flex">
            {/* Admin items — only for dept leaders and above */}
            {profile && can(profile, ROLE_LEVELS.DEPT_LEADER) && ADMIN_ITEMS.map(item => (
              <button
                key={item.page}
                onClick={() => handleNav(item.page!)}
                className={`nav-item-zoom rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  activePage === item.page
                    ? 'text-gold-300 bg-gold-400/10'
                    : 'text-muted hover:text-cream hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}

            {/* Divider between admin and public nav */}
            {profile && can(profile, ROLE_LEVELS.DEPT_LEADER) && <div className="mx-1.5 h-5 w-px bg-line" />}

            {/* Public nav items */}
            {NAV_ITEMS.map(item => {
              if (item.children) {
                return (
                  <DesktopDropdown
                    key={item.label}
                    item={item as NavItem & { children: NonNullable<NavItem['children']> }}
                    activePage={activePage}
                    onNavigate={handleNav}
                  />
                );
              }
              return (
                <button
                  key={item.page}
                  onClick={() => handleNav(item.page!)}
                  className={`nav-item-zoom rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    activePage === item.page
                      ? 'text-gold-300 bg-gold-400/10'
                      : 'text-muted hover:text-cream hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} className="hidden sm:flex" />
            {!user && (
              <button
                onClick={() => handleNav('connexion')}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted transition-all duration-200 hover:border-gold-400/40 hover:text-gold-400 lg:flex"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden xl:inline">Se connecter</span>
              </button>
            )}
            <button
              onClick={() => handleNav('contact')}
              className="btn-gold hidden px-4 py-2 text-sm lg:flex"
            >
              Faire un don
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Ouvrir le menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-all duration-200 hover:border-gold-400/40 hover:text-gold-400 xl:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ═══ Mobile Drawer ═══ */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg xl:hidden">
          {/* Drawer header */}
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <button onClick={() => handleNav('home')} className="flex items-center gap-3">
              <img src={LOGO} alt="La Conquête" className="h-10 w-10 rounded-full object-cover" />
              <div className="flex flex-col leading-tight">
                <span className="gold-text text-sm font-bold tracking-wide">Église Évangélique</span>
                <span className="gold-text text-base font-bold tracking-wider">La Conquête</span>
              </div>
            </button>
            <div className="flex items-center gap-2">
              <LiveIndicators />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Fermer le menu"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-all duration-200 hover:border-gold-400/40 hover:text-gold-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Drawer nav */}
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6">
            {/* Admin items */}
            {user && (
              <>
                {ADMIN_ITEMS.map(item => (
                  <button
                    key={item.page}
                    onClick={() => handleNav(item.page!)}
                    className={`flex items-center justify-between rounded-xl px-4 py-4 text-base font-medium transition-all duration-200 ${
                      activePage === item.page
                        ? 'text-gold-300 bg-gold-400/10'
                        : 'text-cream hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <div className="mx-4 my-2 h-px bg-line" />
              </>
            )}

            {/* Public nav */}
            {NAV_ITEMS.map(item => {
              if (item.children) {
                return (
                  <MobileAccordion
                    key={item.label}
                    item={item as NavItem & { children: NonNullable<NavItem['children']> }}
                    activePage={activePage}
                    onNavigate={handleNav}
                  />
                );
              }
              return (
                <button
                  key={item.page}
                  onClick={() => handleNav(item.page!)}
                  className={`flex items-center justify-between rounded-xl px-4 py-4 text-base font-medium transition-all duration-200 ${
                    activePage === item.page
                      ? 'text-gold-300 bg-gold-400/10'
                      : 'text-cream hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Drawer footer */}
          <div className="border-t border-line px-4 py-6 flex items-center justify-between gap-4">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            {!user && (
              <button
                onClick={() => handleNav('connexion')}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-line px-4 py-3 text-sm font-medium text-muted transition-all duration-200 hover:border-gold-400/40 hover:text-gold-400"
              >
                <LogIn className="h-4 w-4" />
                Se connecter
              </button>
            )}
            <button onClick={() => handleNav('contact')} className="btn-gold flex-1 py-3 text-sm">
              Faire un don
            </button>
          </div>
        </div>
      )}
    </>
  );
}