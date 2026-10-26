import { useEffect, useState } from 'react';
import {
  Mail, Phone, MapPin, Facebook, Youtube, Instagram, MessageCircle, Music,
  ArrowRight, ChevronUp, HandHeart,
} from '../lib/icons';
import type { Page } from '../lib/navigation';
import type { Theme } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { db, buildSettingsMap, isSupabaseConfigured } from '../lib/supabase';
import { CHURCH, churchSetting } from '../lib/church';
import { SERVICE_TIMES } from '../lib/services';
import { YOUTUBE_CHANNEL } from '../lib/teachings';

// Le bloc de marque est le même qu'en tête : un seul logo, une seule clé de réglage.
const DEFAULT_LOGO = '/logo-conquete.png';

interface SiteFooterProps {
  onNavigate: (page: Page) => void;
  theme?: Theme;
  onToggleTheme?: () => void;
}

interface FooterLink {
  label: string;
  page: Page;
}

const CHURCH_LINKS: FooterLink[] = [
  { label: 'Accueil', page: 'home' },
  { label: 'Qui sommes-nous', page: 'about' },
  { label: 'Notre vision', page: 'about' },
  { label: 'Équipe pastorale', page: 'pasteurs' },
];

const LIFE_LINKS: FooterLink[] = [
  { label: 'Activités & horaires', page: 'activities' },
  { label: 'Événements', page: 'events' },
  { label: 'Nos ministères', page: 'ministeres' },
  { label: 'Missions & extensions', page: 'missions' },
  { label: 'Contact', page: 'contact' },
];

const MEDIA_LINKS: FooterLink[] = [
  { label: 'Prédications', page: 'predications' },
  { label: 'Blog', page: 'blog' },
  { label: 'Médias', page: 'media' },
];

export function SiteFooter({ onNavigate, theme: themeProp, onToggleTheme: toggleProp }: SiteFooterProps) {
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [isPwaMobile, setIsPwaMobile] = useState(false);

  useEffect(() => {
    const checkPwa = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || (window.navigator as any).standalone === true;
      setIsPwaMobile(isStandalone);
    };
    checkPwa();
    window.addEventListener('resize', checkPwa);
    return () => window.removeEventListener('resize', checkPwa);
  }, []);

  // Simple fallback for theme
  const [fallbackTheme, setFallbackTheme] = useState<Theme>('dark');
  const fallbackToggle = () => {
    const next = fallbackTheme === 'dark' ? 'light' : 'dark';
    setFallbackTheme(next);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(next);
    try { localStorage.setItem('la-conquete-theme', next); } catch { /* */ }
  };
  const theme = themeProp ?? fallbackTheme;
  const onToggleTheme = toggleProp ?? fallbackToggle;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    db.getSettings().then((settings) => {
      if (!cancelled) setSettingsMap(buildSettingsMap(settings));
    }).catch(() => { /* fallback to defaults */ });
    return () => { cancelled = true; };
  }, []);

  const logoUrl = churchSetting(settingsMap, 'site_logo_url', DEFAULT_LOGO);
  const churchName = churchSetting(settingsMap, 'church_name', CHURCH.name);
  const phone = churchSetting(settingsMap, 'phone', CHURCH.phone.display);
  const email = churchSetting(settingsMap, 'email', CHURCH.email);
  const address = churchSetting(
    settingsMap,
    'address',
    `${CHURCH.address.street}, ${CHURCH.address.landmark}`,
  );
  const city = churchSetting(
    settingsMap,
    'city',
    `${CHURCH.address.city}, ${CHURCH.address.country}`,
  );
  const facebookUrl = churchSetting(settingsMap, 'facebook_url', CHURCH.social.facebook);
  const youtubeUrl = churchSetting(settingsMap, 'youtube_url', YOUTUBE_CHANNEL.url);
  const instagramUrl = churchSetting(settingsMap, 'instagram_url', CHURCH.social.instagram);
  const whatsappUrl = settingsMap['whatsapp_url'] ?? '';
  const tiktokUrl = settingsMap['tiktok_url'] ?? '';

  const socialLinks: { href: string; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { href: facebookUrl, label: 'Facebook', Icon: Facebook },
    { href: youtubeUrl, label: 'YouTube', Icon: Youtube },
    { href: instagramUrl, label: 'Instagram', Icon: Instagram },
    { href: whatsappUrl, label: 'WhatsApp', Icon: MessageCircle },
    { href: tiktokUrl, label: 'TikTok', Icon: Music },
  ].filter((s) => s.href);

  const linkGroups: { index: string; title: string; links: FooterLink[] }[] = [
    { index: '01', title: 'L’Église', links: CHURCH_LINKS },
    { index: '02', title: 'Vie de l’Église', links: LIFE_LINKS },
    { index: '03', title: 'Médias', links: MEDIA_LINKS },
  ];

  if (isPwaMobile) return null;

  return (
    <footer className="pwa-footer-hide border-t border-line bg-bg">
      {/* Bandeau des cultes — la donnée vient de la source unique des horaires */}
      <div className="border-b border-line bg-white/[0.015]">
        <div className="mx-auto flex max-w-8xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-evangile-600" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-400">
              Cultes hebdomadaires
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 sm:grid-cols-4">
            {SERVICE_TIMES.map((s) => (
              <button
                key={s.weekday}
                onClick={() => onNavigate('activities')}
                className="group flex items-baseline gap-2 text-left"
                title={`${s.day} · ${s.service}`}
              >
                <span className="font-hero text-base leading-none tracking-wide text-cream/90">
                  {s.day}
                </span>
                <span className="text-[11px] text-muted transition-colors group-hover:text-cream">
                  {s.time}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => onNavigate('activities')}
            className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted transition-colors hover:text-cream"
          >
            Tous les horaires
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-8xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:grid-cols-12">
          {/* Brand + social */}
          <div className="col-span-2 flex flex-col gap-5 sm:col-span-4 lg:col-span-3">
            <button
              onClick={() => onNavigate('home')}
              className="logo-plate w-fit transition-opacity hover:opacity-80"
              aria-label="La Conquête — Accueil"
            >
              <img src={logoUrl || DEFAULT_LOGO} alt={churchName} className="h-10 w-auto object-contain" />
            </button>
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              {churchName} — Ancrée dans la foi, ouverte à tous, engagée dans la communauté de {city}.
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              {socialLinks.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="flex h-9 w-9 items-center justify-center border border-line text-muted transition-colors duration-200 hover:border-evangile-600 hover:text-cream"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
              <span className="mx-1 h-6 w-px bg-line" />
              <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            </div>
          </div>

          {/* Sitemap */}
          {linkGroups.map((group) => {
            const wide = group.title === 'Médias';
            return (
              <nav
                key={group.title}
                aria-label={group.title}
                className={`${wide ? 'col-span-2' : 'col-span-1'} lg:col-span-2`}
              >
                <h3 className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cream">
                  <span className="text-evangile-500">{group.index}</span>
                  {group.title}
                </h3>
                <ul className={wide
                  ? 'grid grid-cols-2 gap-x-4 gap-y-2.5 lg:flex lg:flex-col lg:gap-2.5'
                  : 'flex flex-col gap-2.5'}>
                  {group.links.map((link) => (
                    <li key={link.page + link.label}>
                      <button
                        onClick={() => onNavigate(link.page)}
                        className="text-left text-sm text-muted transition-colors duration-200 hover:text-cream"
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            );
          })}

          {/* Contact */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-3">
            <h3 className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cream">
              <span className="text-evangile-500">04</span>
              Nous joindre
            </h3>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-2.5 text-sm text-muted">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
                <span>{address}{city ? `, ${city}` : ''}</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-muted">
                <Phone className="h-4 w-4 shrink-0 text-accent-400" />
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="transition-colors duration-200 hover:text-cream">
                  {phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-muted">
                <Mail className="h-4 w-4 shrink-0 text-accent-400" />
                <a href={`mailto:${email}`} className="break-all text-xs transition-colors duration-200 hover:text-cream">
                  {email}
                </a>
              </li>
            </ul>
            <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-muted/80">
              Bureau pastoral<br />
              Lundi au vendredi, 10h00 – 18h00
            </p>
            <button
              onClick={() => onNavigate('dons')}
              className="mt-5 inline-flex items-center gap-2 border border-evangile-600/70 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream transition-colors duration-200 hover:bg-evangile-600 hover:text-white"
            >
              <HandHeart className="h-3.5 w-3.5" />
              Faire un don
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-8xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} {churchName}. Tous droits réservés.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted transition-colors hover:text-cream"
          >
            Haut de page
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
