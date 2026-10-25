import { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, Facebook, Youtube, Instagram, MessageCircle, Music } from '../lib/icons';
import type { Page } from '../lib/navigation';
import type { Theme } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { db, buildSettingsMap } from '../lib/supabase';
import { CHURCH, churchSetting } from '../lib/church';
import type { Ministry } from '../types';

// Le bloc de marque est le même qu'en tête : un seul logo, une seule clé de réglage.
const DEFAULT_LOGO = '/logo-conquete.png';

interface SiteFooterProps {
  onNavigate: (page: Page) => void;
  theme?: Theme;
  onToggleTheme?: () => void;
}

export function SiteFooter({ onNavigate, theme: themeProp, onToggleTheme: toggleProp }: SiteFooterProps) {
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [ministries, setMinistries] = useState<Ministry[]>([]);
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
    let cancelled = false;
    async function load() {
      try {
        const [settings, mins] = await Promise.all([
          db.getSettings(),
          db.getActiveMinistries(),
        ]);
        if (!cancelled) {
          setSettingsMap(buildSettingsMap(settings));
          setMinistries(mins);
        }
      } catch { /* fallback to defaults */ }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const logoUrl = churchSetting(settingsMap, 'site_logo_url', DEFAULT_LOGO);
  const churchName = churchSetting(settingsMap, 'church_name', CHURCH.name);
  const phone = churchSetting(settingsMap, 'phone', CHURCH.phone.display);
  const email = churchSetting(settingsMap, 'email', CHURCH.email);
  const address = churchSetting(settingsMap, 'address', `${CHURCH.address.street}, réf. ${CHURCH.address.landmark}`);
  const city = churchSetting(settingsMap, 'city', `${CHURCH.address.city}, ${CHURCH.address.country}`);
  const facebookUrl = churchSetting(settingsMap, 'facebook_url', CHURCH.social.facebook);
  const youtubeUrl = settingsMap['youtube_url'] ?? '';
  const whatsappUrl = settingsMap['whatsapp_url'] ?? '';
  const instagramUrl = churchSetting(settingsMap, 'instagram_url', CHURCH.social.instagram);
  const tiktokUrl = settingsMap['tiktok_url'] ?? '';

  const socialLinks: { href: string; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { href: facebookUrl, label: 'Facebook', Icon: Facebook },
    { href: youtubeUrl, label: 'YouTube', Icon: Youtube },
    { href: whatsappUrl, label: 'WhatsApp', Icon: MessageCircle },
    { href: instagramUrl, label: 'Instagram', Icon: Instagram },
    { href: tiktokUrl, label: 'TikTok', Icon: Music },
  ].filter((s) => s.href);

  const navLinks: { label: string; page: Page }[] = [
    { label: 'Accueil', page: 'home' },
    { label: 'Qui sommes-nous', page: 'about' },
    { label: 'Nos activités', page: 'activities' },
    { label: 'Agenda', page: 'events' },
    { label: 'Médias', page: 'media' },
    { label: 'Contact', page: 'contact' },
  ];

  if (isPwaMobile) return null;

  return (
    <footer className="pwa-footer-hide border-t border-line bg-bg">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand + social */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            <button onClick={() => onNavigate('home')} className="logo-plate w-fit transition-opacity hover:opacity-80" aria-label="La Conquête — Accueil">
              <img src={logoUrl || DEFAULT_LOGO} alt={churchName} className="h-10 w-auto object-contain" />
            </button>
            <p className="text-sm text-muted leading-relaxed">
              {churchName} — Ancrée dans la foi, ouverte à tous, engagée dans la communauté de {city}.
            </p>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map(({ href, label, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="flex h-10 w-10 items-center justify-center border border-line text-muted transition-colors duration-200 hover:border-evangile-600 hover:text-cream"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
                <ThemeToggle theme={theme} onToggle={onToggleTheme} />
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="lg:col-span-1">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-accent-400">Navigation</h3>
            <ul className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <li key={link.page}>
                  <button onClick={() => onNavigate(link.page)} className="text-sm text-muted transition-colors duration-200 hover:text-cream py-1.5">{link.label}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Ministries */}
          <div className="lg:col-span-1">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-accent-400">Ministères</h3>
            <ul className="flex flex-col gap-2">
              {ministries.length > 0 ? (
                ministries.slice(0, 6).map((m) => (
                  <li key={m.id}>
                    <button onClick={() => onNavigate('activities')} className="text-sm text-muted transition-colors duration-200 hover:text-cream">{m.title}</button>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted/50">Aucun ministère configuré</li>
              )}
            </ul>
          </div>

          {/* Contact info */}
          <div className="lg:col-span-2">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-accent-400">Nous contacter</h3>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-3 text-sm text-muted">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
                <span>{address}{city ? `, ${city}` : ''}</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted">
                <Phone className="h-4 w-4 shrink-0 text-accent-400" />
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="transition-colors duration-200 hover:text-cream">{phone}</a>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted">
                <Mail className="h-4 w-4 shrink-0 text-accent-400" />
                <a href={`mailto:${email}`} className="transition-colors duration-200 hover:text-cream">{email}</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-line pt-6 sm:flex-row">
          <p className="text-xs text-muted">&copy; {new Date().getFullYear()} {churchName}. Tous droits réservés.</p>
          <button onClick={() => onNavigate('home')} className="text-xs font-semibold uppercase tracking-[0.2em] text-muted transition-colors hover:text-cream">
            Retour à l'accueil
          </button>
        </div>
      </div>
    </footer>
  );
}