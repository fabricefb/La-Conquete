import { Mail, Phone, MapPin, Globe } from '../lib/icons';
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

const ministries = ['Jeunesse', 'Femmes', 'Hommes', 'Intercession', 'Louange', 'Missions'];

interface SiteFooterProps {
  onNavigate: (page: Page) => void;
  theme?: Theme;
  onToggleTheme?: () => void;
}

export function SiteFooter({ onNavigate, theme: themeProp, onToggleTheme: toggleProp }: SiteFooterProps) {
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

  return (
    <footer className="border-t border-line bg-bg">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand + social */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            <button onClick={() => onNavigate('home')} className="flex items-center gap-3 transition-opacity hover:opacity-80 w-fit">
              <img src={LOGO} alt="La Conquête" className="h-10 w-10 rounded-full object-cover" />
              <span className="gold-text text-lg font-bold tracking-wide">La Conquête</span>
            </button>
            <p className="text-sm text-muted leading-relaxed">
              Église évangélique ancrée dans la foi, ouverte à tous, engagée dans la communauté de Lubumbashi.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-all duration-200 hover:border-gold-400/40 hover:text-gold-400">
                <Globe className="h-4 w-4" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-all duration-200 hover:border-gold-400/40 hover:text-gold-400">
                <Globe className="h-4 w-4" />
              </a>
              <a href="https://wa.me/243844107079" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-all duration-200 hover:border-gold-400/40 hover:text-gold-400">
                <Globe className="h-4 w-4" />
              </a>
              <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            </div>
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
              {ministries.map((m) => (
                <li key={m}>
                  <button onClick={() => onNavigate('activities')} className="text-sm text-muted transition-colors duration-200 hover:text-cream">{m}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact info */}
          <div className="lg:col-span-2">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold-400">Nous contacter</h3>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-3 text-sm text-muted">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                <span>Av. Kabambare, Lubumbashi, RDC</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted">
                <Phone className="h-4 w-4 shrink-0 text-gold-400" />
                <a href="tel:+243844107079" className="transition-colors duration-200 hover:text-cream">+243 844 107 079</a>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted">
                <Mail className="h-4 w-4 shrink-0 text-gold-400" />
                <a href="mailto:contact@laconquete.cd" className="transition-colors duration-200 hover:text-cream">contact@laconquete.cd</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-line pt-6 sm:flex-row">
          <p className="text-xs text-muted">&copy; {new Date().getFullYear()} Église Évangélique La Conquête. Tous droits réservés.</p>
          <button onClick={() => onNavigate('admin')}
            className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-all duration-200 hover:border-gold-400/40 hover:text-gold-400">
            Admin
          </button>
        </div>
      </div>
    </footer>
  );
}