import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  X, ChevronDown, Menu, LogIn, LogOut, User, Bell, Shield, Eye, Newspaper,
  Church, BookOpen, Users, Heart, Music, Video, Image, Radio,
  Calendar, MapPin, HandHeart, Mic, Building2, MonitorPlay,
} from '../lib/icons';
import { useAuth } from '../contexts/AuthContext';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { useLiveStatus } from '../lib/hooks/useLiveStatus';
import { getFullRoleLabel, getRoleBadgeClass } from '../lib/permissions';
import type { Page } from '../lib/navigation';
import { ThemeToggle } from './ThemeToggle';
import { db, buildSettingsMap } from '../lib/supabase';

// Default logo — overridable via Supabase site_settings (key: site_logo_url)
const DEFAULT_LOGO = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuHDznVSbj77TcRuf-r0to8rCYGPa9lZ75G4Zm7hbC__8gp8d56nTozKyHZyybWU9xdaBURMxftyiZF-i4Zdp8XT_bJYNT-WVQWu3r32FHqxjRzt9cCMpPuHJJZryUrKgHbCiFJYnLg0boUgp8ATuXf_zhlyEhW-QlPQVcfIXjf8lrX2G3JGtujmvo3YKp_c94RqPQf5g8LvIBM1zRCErGSOVjRIw8SQ4aH3aliCJ-EOhKBq-PO5S3pZoaMuTk7u2iKCU';

/* ═══════════════════════════════════════════════════════════════════
   Navigation Data — 7 main items with mega menu support
   ═══════════════════════════════════════════════════════════════════ */

interface SubMenuItem {
  label: string;
  page?: Page;
  icon?: React.FC<{ className?: string }>;
  tag?: string;  // optional badge like "Bientôt"
}

interface MegaColumn {
  title?: string;
  items: SubMenuItem[];
}

interface MegaImage {
  src: string;
  alt: string;
  link?: string;
  settingKey?: string; // site_settings key to override src
}

interface NavItem {
  label: string;
  page?: Page;
  mega?: {
    columns: MegaColumn[];
    image: MegaImage;
  };
}

// Default mega menu images — overridable via site_settings keys:
//   mega_menu_image_about, mega_menu_image_vie_eglise, mega_menu_image_media
const DEFAULT_VISION_IMAGE = 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=400&h=300&fit=crop';
const DEFAULT_MEDIA_IMAGE = 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=300&fit=crop';
const DEFAULT_VIE_EGLISE_IMAGE = 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=400&h=300&fit=crop';

const NAV_ITEMS: NavItem[] = [
  /* 1. Accueil */
  { label: 'Accueil', page: 'home' },

  /* 2. À Propos */
  {
    label: 'À Propos',
    mega: {
      columns: [
        {
          title: 'Qui sommes-nous',
          items: [
            { label: 'Notre histoire', page: 'about', icon: Church },
            { label: 'Notre vision', page: 'vision', icon: Eye },
            { label: 'Notre foi', page: 'about', icon: BookOpen },
            { label: 'Équipe pastorale', page: 'pasteurs', icon: Shield },
          ],
        },
        {
          title: 'Communauté',
          items: [
            { label: 'Extensions', page: 'extensions', icon: MapPin },
            { label: 'Nos valeurs', page: 'vision', icon: Heart },
            { label: 'Partenariats', icon: HandHeart, tag: 'Bientôt' },
          ],
        },
        {
          title: 'Vie spirituelle',
          items: [
            { label: 'Enseignements', page: 'enseignements', icon: BookOpen },
            { label: 'Prédications', page: 'predications', icon: Mic },
            { label: 'Blog', page: 'blog', icon: Newspaper },
          ],
        },
      ],
      image: { src: DEFAULT_VISION_IMAGE, alt: 'À propos de La Conquête', settingKey: 'mega_menu_image_about' },
    },
  },

  /* 3. Vie de l'Église */
  {
    label: 'Vie de l\'Église',
    mega: {
      columns: [
        {
          title: 'Culte & Rassemblements',
          items: [
            { label: 'Horaires de culte', page: 'culte', icon: Calendar },
            { label: 'Événements', page: 'events', icon: Calendar },
            { label: 'Jeunesse', page: 'jeunesse', icon: Heart },
          ],
        },
        {
          title: 'Ministères',
          items: [
            { label: 'Tous les ministères', page: 'ministeres', icon: Building2 },
            { label: 'Louange & Adoration', page: 'ministeres', icon: Music },
            { label: 'Évangélisation', page: 'ministeres', icon: Radio },
            { label: 'Diaconie', page: 'ministeres', icon: HandHeart },
          ],
        },
        {
          title: 'Groupes',
          items: [
            { label: 'Hommes', page: 'ministeres', icon: Users },
            { label: 'Femmes', page: 'ministeres', icon: Heart },
            { label: 'Enfants', page: 'ministeres', icon: Users },
            { label: 'Couples & Familles', page: 'ministeres', icon: Heart },
          ],
        },
      ],
      image: { src: DEFAULT_VIE_EGLISE_IMAGE, alt: 'Vie de l\'église La Conquête', settingKey: 'mega_menu_image_vie_eglise' },
    },
  },

  /* 4. Média */
  {
    label: 'Média',
    mega: {
      columns: [
        {
          title: 'Contenus',
          items: [
            { label: 'Toutes les vidéos', page: 'media', icon: Video },
            { label: 'Émissions', page: 'emissions', icon: Radio },
            { label: 'En direct', page: 'media', icon: MonitorPlay },
            { label: 'Photos', page: 'media', icon: Image, tag: 'Bientôt' },
          ],
        },
        {
          title: 'Ressources',
          items: [
            { label: 'Enseignements', page: 'enseignements', icon: BookOpen },
            { label: 'Blog', page: 'blog', icon: Newspaper },
            { label: 'Téléchargements', icon: BookOpen, tag: 'Bientôt' },
          ],
        },
        { title: '', items: [] },
      ],
      image: { src: DEFAULT_MEDIA_IMAGE, alt: 'Médias La Conquête', settingKey: 'mega_menu_image_media' },
    },
  },

  /* 5. Contact */
  { label: 'Contact', page: 'contact' },

  /* 6. Don */
  { label: 'Don', page: 'dons' },
];

const ADMIN_PAGES: Page[] = ['admin', 'dashboard', 'pastoral', 'reports', 'communication', 'crm', 'annonces', 'communiques'];

/** Build compact display name for logged-in user: "FirstName emailSuffix" */
function getLoggedInDisplayName(profile: any): string {
  const fullName = profile?.full_name || '';
  const email = profile?.email || '';
  const firstName = fullName.split(' ')[0] || '';
  const emailLocal = email.split('@')[0] || '';
  if (!firstName) return emailLocal || 'Membre';
  const suffix =
    emailLocal.length > firstName.length &&
    emailLocal.toLowerCase().startsWith(firstName.toLowerCase())
      ? emailLocal.slice(firstName.length)
      : '';
  return suffix ? `${firstName} ${suffix}` : firstName;
}

/* ─── Live Indicators ──────────────────────────────────────────── */

function LiveIndicators() {
  const { youtube, facebook } = useLiveStatus();
  if (!youtube && !facebook) return null;

  return (
    <div className="flex items-center gap-3">
      {youtube && (
        <a
          href="https://www.youtube.com/@LaConquete"
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
          href="https://www.facebook.com/LaConqueteEglise"
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

/* ═══════════════════════════════════════════════════════════════════
   MEGA MENU — Desktop 3-column + image
   ═══════════════════════════════════════════════════════════════════ */

function MegaMenu({
  item,
  activePage,
  onNavigate,
  onClose,
  settingsMap,
}: {
  item: NavItem & { mega: NonNullable<NavItem['mega']> };
  activePage: Page;
  onNavigate: (page: Page) => void;
  onClose: () => void;
  settingsMap?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const isActive = item.mega.columns.some(col =>
    col.items.some(sub => sub.page === activePage)
  );

  const handleEnter = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  }, []);

  const handleLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 250);
  }, []);

  const handleItemClick = (sub: SubMenuItem) => {
    if (sub.page) {
      onNavigate(sub.page);
    }
    setOpen(false);
    onClose();
  };

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    if (open) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open]);

  return (
    <div ref={ref} className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {/* Trigger button */}
      <button
        className={`nav-item-zoom flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'text-accent-400 bg-accent-400/10'
            : 'text-muted hover:text-cream hover:bg-white/5'
        }`}
      >
        {item.label}
        <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Mega panel — FULL WIDTH */}
      <div
        className={`fixed left-0 right-0 top-16 z-30 transition-all duration-300 ${
          open
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-3 opacity-0'
        }`}
      >
        <div className="glass border-t border-white/[0.06] shadow-2xl shadow-black/50">
          <div className="mx-auto max-w-[1400px] flex min-h-[280px]">
            {/* Nav columns */}
            <div className="flex-1 grid grid-cols-3 gap-0 divide-x divide-white/[0.06] p-5">
              {item.mega.columns.map((col, ci) => (
                <div key={ci} className="px-4 py-3">
                  {col.title && (
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-accent-500/70 mb-3 px-1">
                      {col.title}
                    </p>
                  )}
                  <div className="flex flex-col gap-0.5">
                    {col.items.map((sub, si) => {
                      const Icon = sub.icon;
                      const disabled = !sub.page;
                      return (
                        <button
                          key={si}
                          onClick={() => !disabled && handleItemClick(sub)}
                          disabled={disabled}
                          className={`group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all duration-200 ${
                            disabled
                              ? 'opacity-40 cursor-default'
                              : activePage === sub.page
                                ? 'text-accent-400 bg-accent-400/10'
                                : 'text-cream/70 hover:text-cream hover:bg-white/[0.06] cursor-pointer'
                          }`}
                        >
                          {Icon && (
                            <Icon className="w-4 h-4 shrink-0 text-muted group-hover:text-accent-500 transition-colors" />
                          )}
                          <span className="text-[13px] font-medium leading-tight">{sub.label}</span>
                          {sub.tag && (
                            <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-accent-400/10 text-accent-400">
                              {sub.tag}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Image panel — defines mega menu HEIGHT */}
            <div className="hidden lg:block w-[320px] xl:w-[380px] shrink-0 relative">
              <img
                src={item.mega.image.settingKey && settingsMap?.[item.mega.image.settingKey]
                  ? settingsMap[item.mega.image.settingKey]
                  : item.mega.image.src}
                alt={item.mega.image.alt}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest mb-1">
                  Église Évangélique
                </p>
                <p className="text-white text-sm font-bold leading-snug">
                  LA CONQUÊTE
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MOBILE MEGA ACCORDION — grouped sub-items for mobile
   ═══════════════════════════════════════════════════════════════════ */

function MobileMegaAccordion({
  item,
  activePage,
  onNavigate,
}: {
  item: NavItem & { mega: NonNullable<NavItem['mega']> };
  activePage: Page;
  onNavigate: (page: Page) => void;
}) {
  const [open, setOpen] = useState(false);
  const isActive = item.mega.columns.some(col =>
    col.items.some(sub => sub.page === activePage)
  );

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between rounded-xl px-4 py-4 text-base font-medium transition-all duration-200 ${
          isActive || open ? 'text-accent-400 bg-accent-400/10' : 'text-cream hover:bg-white/5'
        }`}
      >
        {item.label}
        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="pb-2 pl-2 space-y-3">
          {item.mega.columns.filter(c => c.items.length > 0).map((col, ci) => (
            <div key={ci}>
              {col.title && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-accent-500/60 px-4 mb-1.5">
                  {col.title}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {col.items.map((sub, si) => {
                  const Icon = sub.icon;
                  const disabled = !sub.page;
                  return (
                    <button
                      key={si}
                      onClick={() => !disabled && onNavigate(sub.page!)}
                      disabled={disabled}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-all duration-200 ${
                        disabled
                          ? 'opacity-30 cursor-default'
                          : activePage === sub.page
                            ? 'text-accent-400 bg-accent-400/10'
                            : 'text-muted hover:text-cream hover:bg-white/5'
                      }`}
                    >
                      {Icon && <Icon className="w-4 h-4 shrink-0" />}
                      <span>{sub.label}</span>
                      {sub.tag && (
                        <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-accent-400/10 text-accent-400">
                          {sub.tag}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── User Avatar ────────────────────────────────────────────── */
function UserAvatar({ name, size = 'sm' }: { name?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' }[size];
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  return (
    <div className={`${s} rounded-full bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center font-bold text-white shrink-0`}>
      {initials}
    </div>
  );
}

/* ─── Desktop User Menu ────────────────────────────────────────── */
function DesktopUserMenu({
  profile,
  onNavigate,
  onSignOut,
}: {
  profile: any;
  onNavigate: (page: Page) => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const roleLabel = getFullRoleLabel(profile);
  const badgeClass = getRoleBadgeClass(profile);
  const displayName = getLoggedInDisplayName(profile);

  const handleEnter = useCallback(() => { clearTimeout(timeoutRef.current); setOpen(true); }, []);
  const handleLeave = useCallback(() => { timeoutRef.current = setTimeout(() => setOpen(false), 200); }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button className="flex items-center gap-2.5 rounded-full border border-line pl-1 pr-3 py-1 transition-all duration-200 hover:border-accent-400/40 hover:bg-white/5">
        <UserAvatar name={displayName} />
        <div className="hidden lg:flex flex-col items-start leading-tight">
          <span className="text-xs font-medium text-cream truncate max-w-[100px]">{displayName}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none ${badgeClass}`}>
            {roleLabel}
          </span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`absolute right-0 top-full pt-2 transition-all duration-200 ${
        open ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
      }`}>
        <div className="glass rounded-xl p-2 min-w-[220px] shadow-xl shadow-black/30">
          <div className="px-3 py-2.5 mb-1 border-b border-line">
            <p className="text-sm font-medium text-cream truncate">{displayName}</p>
            <p className="text-xs text-muted truncate">{profile?.email}</p>
            <span className={`inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
              <Shield className="inline h-3 w-3 mr-1 -mt-0.5" />{roleLabel}
            </span>
          </div>
          <button onClick={() => { onNavigate('dashboard'); setOpen(false); }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-cream/80 hover:text-cream hover:bg-white/5 transition-colors">
            <User className="h-4 w-4 text-muted" /> Mon profil
          </button>
          {profile?.is_admin && (
            <button onClick={() => { onNavigate('admin'); setOpen(false); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-cream/80 hover:text-cream hover:bg-white/5 transition-colors">
              <Shield className="h-4 w-4 text-accent-500" /> Administration
            </button>
          )}
          <button onClick={() => { onNavigate('dashboard'); setOpen(false); }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-cream/80 hover:text-cream hover:bg-white/5 transition-colors">
            <Bell className="h-4 w-4 text-muted" /> Notifications
          </button>
          <div className="my-1 h-px bg-line" />
          <button onClick={() => { onSignOut(); setOpen(false); }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
            <LogOut className="h-4 w-4" /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN HEADER COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

interface SiteHeaderProps {
  onNavigate: (page: Page) => void;
  activePage?: Page;
  topOffset?: string;
}

export function SiteHeader({ onNavigate, activePage, topOffset }: SiteHeaderProps) {
  const { user, profile, signOut } = useAuth();
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});

  // Fetch site_settings for dynamic mega menu images & logo
  useEffect(() => {
    let cancelled = false;
    db.getSettings().then((settings) => {
      if (cancelled) return;
      setSettingsMap(buildSettingsMap(settings));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Dynamic logo from settings
  const logoUrl = settingsMap['site_logo_url'] || DEFAULT_LOGO;

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

  /* ── Desktop nav item renderer ── */
  const renderDesktopItem = (item: NavItem) => {
    if (item.mega) {
      return (
        <MegaMenu
          key={item.label}
          item={item as NavItem & { mega: NonNullable<NavItem['mega']> }}
          activePage={activePage as Page}
          onNavigate={handleNav}
          onClose={() => {}}
          settingsMap={settingsMap}
        />
      );
    }
    return (
      <button
        key={item.page}
        onClick={() => handleNav(item.page!)}
        className={`nav-item-zoom rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
          activePage === item.page
            ? 'text-accent-400 bg-accent-400/10'
            : 'text-muted hover:text-cream hover:bg-white/5'
        }`}
      >
        {item.label}
      </button>
    );
  };

  /* ── Mobile nav item renderer ── */
  const renderMobileItem = (item: NavItem) => {
    if (item.mega) {
      return (
        <MobileMegaAccordion
          key={item.label}
          item={item as NavItem & { mega: NonNullable<NavItem['mega']> }}
          activePage={activePage as Page}
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
            ? 'text-accent-400 bg-accent-400/10'
            : 'text-cream hover:bg-white/5'
        }`}
      >
        {item.label}
      </button>
    );
  };

  return (
    <>
      {/* ═════════════ Desktop / Tablet Header ═════════════ */}
      <header className={`fixed left-0 right-0 ${topOffset || 'top-0'} z-40 transition-all duration-300 ${
        scrolled ? 'glass border-b border-line shadow-lg' : 'bg-bg/80 border-b border-transparent'
      }`}>
        <div className="mx-auto flex h-16 max-w-8xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* LEFT: Logo */}
          <button onClick={() => handleNav('home')} className="flex shrink-0 items-center gap-3 transition-opacity duration-200 hover:opacity-80">
            <img src={logoUrl} alt="La Conquête" className="h-11 w-11 rounded-full object-contain ring-2 ring-accent-500/30 bg-white/5 p-0.5" />
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="brand-text text-[11px] font-medium tracking-wide lowercase">église évangélique</span>
              <span className="brand-text text-sm font-extrabold tracking-widest uppercase">LA CONQUÊTE</span>
            </div>
          </button>

          {/* RIGHT: Desktop Navigation + Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <nav className="hidden items-center gap-0.5 lg:flex">
              {NAV_ITEMS.map(renderDesktopItem)}
            </nav>

            <div className="hidden lg:block w-px h-6 bg-line/50 mx-0.5" />

            <ThemeToggle theme={colorMode} onToggle={toggleColorMode} className="hidden sm:flex" />

            {/* Mobile: compact connexion icon always visible */}
            {user && profile ? (
              <button
                onClick={() => handleNav('dashboard')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-all duration-200 hover:border-accent-400/40 hover:text-accent-500 lg:hidden"
                aria-label="Mon profil"
              >
                <User className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => handleNav('connexion')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-all duration-200 hover:border-accent-400/40 hover:text-accent-500 lg:hidden"
                aria-label="Connexion"
              >
                <LogIn className="h-4 w-4" />
              </button>
            )}

            {/* Desktop: full connexion button or user menu (lg+) */}
            {user && profile ? (
              <div className="hidden lg:block">
                <DesktopUserMenu profile={profile} onNavigate={handleNav} onSignOut={signOut} />
              </div>
            ) : (
              <button
                onClick={() => handleNav('connexion')}
                className="hidden lg:flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted transition-all duration-200 hover:border-accent-400/40 hover:text-accent-500"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden lg:inline">Connexion</span>
              </button>
            )}

            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Ouvrir le menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-all duration-200 hover:border-accent-400/40 hover:text-accent-500 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ═════════════ Mobile Drawer ═════════════ */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-bg lg:hidden drawer-enter">
          {/* Drawer header */}
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <button onClick={() => handleNav('home')} className="flex items-center gap-2.5">
              <img src={logoUrl} alt="La Conquête" className="h-11 w-11 rounded-full object-contain ring-2 ring-accent-500/30 bg-white/5 p-0.5" />
              <div className="flex flex-col leading-tight">
                <span className="brand-text text-[11px] font-medium tracking-wide lowercase">église évangélique</span>
                <span className="brand-text text-sm font-extrabold tracking-widest uppercase">LA CONQUÊTE</span>
              </div>
            </button>
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Fermer le menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-all duration-200 hover:border-accent-400/40 hover:text-accent-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Drawer nav */}
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6">
            {/* User card */}
            {user && profile && (
              <>
                <div className="flex items-center gap-3 rounded-2xl border border-line bg-white/[0.03] p-4 mb-2 overflow-hidden">
                  <UserAvatar name={profile.full_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-cream truncate">
                      {getLoggedInDisplayName(profile)}
                    </p>
                    <p className="text-xs text-muted truncate">{profile.email}</p>
                    <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${getRoleBadgeClass(profile)}`}>
                      <Shield className="inline h-3 w-3 mr-1 -mt-0.5" />{getFullRoleLabel(profile)}
                    </span>
                  </div>
                  <button
                    onClick={signOut}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted hover:border-red-400/40 hover:text-red-400 transition-colors"
                    title="Se déconnecter"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
                <div className="mx-4 my-2 h-px bg-line" />
              </>
            )}

            {/* Main nav items */}
            {NAV_ITEMS.map(renderMobileItem)}

            {/* User section for logged-in users */}
            {user && profile && (
              <>
                <div className="mx-4 my-4 h-px bg-line" />
                {profile?.is_admin && (
                  <button
                    onClick={() => handleNav('admin')}
                    className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-cream/80 hover:text-cream hover:bg-white/5 transition-colors"
                  >
                    <Shield className="h-4 w-4 text-accent-500" /> Administration
                  </button>
                )}
                <button
                  onClick={signOut}
                  className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Déconnexion
                </button>
              </>
            )}
          </nav>

          {/* Drawer footer */}
          <div className="border-t border-line px-4 py-6 flex items-center gap-4">
            <ThemeToggle theme={colorMode} onToggle={toggleColorMode} />
            {!user ? (
              <button
                onClick={() => handleNav('connexion')}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-line px-4 py-3 text-sm font-medium text-muted transition-all duration-200 hover:border-accent-400/40 hover:text-accent-500 flex-1"
              >
                <LogIn className="h-4 w-4" />
                Connexion
              </button>
            ) : (
              <button
                onClick={signOut}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 px-4 py-3 text-sm font-medium text-red-400 transition-all duration-200 hover:border-red-400/50 hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}