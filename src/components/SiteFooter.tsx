import { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, Globe } from '../lib/icons';
import type { Page } from '../lib/navigation';
import type { Theme } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { db, buildSettingsMap } from '../lib/supabase';
import type { Ministry } from '../types';

interface SiteFooterProps {
  onNavigate: (page: Page) => void;
  theme?: Theme;
  onToggleTheme?: () => void;
}

export function SiteFooter({ onNavigate, theme: themeProp, onToggleTheme: toggleProp }: SiteFooterProps) {
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [ministries, setMinistries] = useState<Ministry[]>([]);

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

  const logoUrl = settingsMap['logo_url'] ?? '';
  const churchName = settingsMap['church_name'] ?? 'Église Évangélique La Conquête';
  const phone = settingsMap['phone'] ?? '+243 844 107 079';
  const email = settingsMap['email'] ?? 'egliseevangeliquelaconquete@gmail.com';
  const address = settingsMap['address'] ?? "520, Av. N'Djamena, Lubumbashi";
  const city = settingsMap['city'] ?? 'Haut Katanga, RD Congo';
  const facebookUrl = settingsMap['facebook_url'] ?? '';
  const youtubeUrl = settingsMap['youtube_url'] ?? '';
  const whatsappUrl = settingsMap['whatsapp_url'] ?? '';
  const instagramUrl = settingsMap['instagram_url'] ?? '';
  const tiktokUrl = settingsMap['tiktok_url'] ?? '';

  const socialLinks: { href: string; label: string }[] = [
    { href: facebookUrl, label: 'Facebook' },
    { href: youtubeUrl, label: 'YouTube' },
    { href: whatsappUrl, label: 'WhatsApp' },
    { href: instagramUrl, label: 'Instagram' },
    { href: tiktokUrl, label: 'TikTok' },
  ].filter((s) => s.href);

  const navLinks: { label: string; page: Page }[] = [
    { label: 'Accueil', page: 'home' },
    { label: 'Qui sommes-nous', page: 'about' },
    { label: 'Nos activités', page: 'activities' },
    { label: 'Agenda', page: 'events' },
    { label: 'Médias', page: 'media' },
    { label: 'Contact', page: 'contact' },
  ];

  return (
    <footer className="border-t border-line bg-bg">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand + social */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            <button onClick={() => onNavigate('home')} className="flex items-center gap-3 transition-opacity hover:opacity-80 w-fit">
              {logoUrl ? (
                <img src={logoUrl} alt={churchName} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-400/20 text-gold-400 text-sm font-bold">
                  {churchName.charAt(0)}
                </div>
              )}
              <span className="gold-text text-lg font-bold tracking-wide">La Conquête</span>
            </button>
            <p className="text-sm text-muted leading-relaxed">
              {churchName} — Ancrée dans la foi, ouverte à tous, engagée dans la communauté de {city}.
            </p>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map(({ href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-all duration-200 hover:border-gold-400/40 hover:text-gold-400"
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                ))}
                <ThemeToggle theme={theme} onToggle={onToggleTheme} />
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="lg:col-span-1">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold-400">Navigation</h3>
            <ul className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <li key={link.page}>
                  <button onClick={() => onNavigate(link.page)} className="text-sm text-muted transition-colors duration-200 hover:text-cream">{link.label}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Ministries */}
          <div className="lg:col-span-1">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold-400">Ministères</h3>
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
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold-400">Nous contacter</h3>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-3 text-sm text-muted">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                <span>{address}{city ? `, ${city}` : ''}</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted">
                <Phone className="h-4 w-4 shrink-0 text-gold-400" />
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="transition-colors duration-200 hover:text-cream">{phone}</a>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted">
                <Mail className="h-4 w-4 shrink-0 text-gold-400" />
                <a href={`mailto:${email}`} className="transition-colors duration-200 hover:text-cream">{email}</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-line pt-6 sm:flex-row">
          <p className="text-xs text-muted">&copy; {new Date().getFullYear()} {churchName}. Tous droits réservés.</p>
          <button onClick={() => onNavigate('home')} className="flex items-center gap-2 transition-opacity hover:opacity-80">
            {logoUrl ? (
              <img src={logoUrl} alt={churchName} className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span className="gold-text text-sm font-bold">LC</span>
            )}
            <span className="gold-text text-sm font-bold tracking-wide">La Conquête</span>
          </button>
        </div>
      </div>
    </footer>
  );
}