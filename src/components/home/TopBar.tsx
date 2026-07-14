import { useEffect, useState } from 'react';
import { Youtube, Facebook, Instagram, Phone, Mail, Heart } from '../../lib/icons';

/* ═══════════════════════════════════════════════════════════════════
   SOCIAL LINKS — Configurables depuis l'admin
   ═══════════════════════════════════════════════════════════════════ */
const SOCIALS = [
  { icon: Youtube,  href: 'https://youtube.com/@laconquete',  label: 'YouTube',  color: 'hover:text-red-500' },
  { icon: Facebook,  href: 'https://facebook.com/laconquete',  label: 'Facebook', color: 'hover:text-blue-500' },
  { icon: Instagram, href: 'https://instagram.com/laconquete', label: 'Instagram', color: 'hover:text-pink-500' },
  /* TikTok n'est pas dans lucide, on utilise un lien textuel ou SVG inline */
];

/* ------------------------------------------------------------------ */
/*  Hardcoded church announcements                                     */
/* ------------------------------------------------------------------ */
const ANNOUNCEMENTS = [
  'Culte dominical à 08h00 — Venez adorer le Seigneur avec nous !',
  'Réunion de prière tous les mercredis à 18h00',
  'École biblique du dimanche à 09h30 — Tous les âges bienvenus',
  'Concert de louange le 15 août à 19h00 — Entrée libre',
  'Camp de jeunes du 20 au 24 juillet — Inscriptions ouvertes',
  'Collecte spéciale pour les missions le dernier dimanche du mois',
];

/* ------------------------------------------------------------------ */
/*  TikTok SVG Icon (lucide n'a pas TikTok)                          */
/* ------------------------------------------------------------------ */
function TikTokIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.16v-3.44a4.85 4.85 0 01-3.77-1.82V6.69h3.77z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  WhatsApp SVG Icon                                                  */
/* ------------------------------------------------------------------ */
function WhatsAppIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function TopBar({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [now, setNow] = useState<Date | null>(null);

  /* Live clock ---------------------------------------------------- */
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[41] w-full hidden md:flex items-center justify-between px-4 lg:px-6 h-10 text-xs select-none"
      style={{ backgroundColor: 'rgb(var(--bg-elevated-rgb))' }}
      role="banner"
      aria-label="Barre d'informations"
    >
      {/* ---- Left: Social Icons + Clock ------------------------- */}
      <div className="flex items-center gap-3">
        {/* Social icons */}
        <div className="flex items-center gap-2 text-muted">
          {SOCIALS.map(({ icon: Icon, href, label, color }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className={`transition-colors duration-300 ${color} hover:scale-110`}
            >
              <Icon className="w-3.5 h-3.5" />
            </a>
          ))}
          {/* TikTok */}
          <a href="https://tiktok.com/@laconquete" target="_blank" rel="noopener noreferrer"
            aria-label="TikTok" className="text-muted hover:text-white transition-colors duration-300 hover:scale-110">
            <TikTokIcon />
          </a>
          {/* WhatsApp */}
          <a href="https://wa.me/243000000000" target="_blank" rel="noopener noreferrer"
            aria-label="WhatsApp" className="text-muted hover:text-green-500 transition-colors duration-300 hover:scale-110">
            <WhatsAppIcon />
          </a>
        </div>

        {/* Separator */}
        <span className="text-muted/30">|</span>

        {/* Clock */}
        {now && (
          <time dateTime={now.toISOString()} className="font-mono tracking-wide text-muted">
            {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </time>
        )}
        {now && (
          <span className="text-muted/60 whitespace-nowrap">
            {now.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      {/* ---- Center: Scrolling Marquee --------------------------- */}
      <div
        className="flex-1 mx-6 overflow-hidden scrollbar-hide"
        aria-live="polite"
        aria-label="Annonces de l'église"
      >
        <div className="animate-marquee flex whitespace-nowrap">
          {ANNOUNCEMENTS.map((text, i) => (
            <span key={`a-${i}`} className="mx-8 text-cream/70 text-[11px]">
              {text}
            </span>
          ))}
          {ANNOUNCEMENTS.map((text, i) => (
            <span key={`b-${i}`} className="mx-8 text-cream/70 text-[11px]">
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* ---- Right: Live + Phone + Email + Don ------------------ */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* LIVE indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-evangile-600/10 border border-evangile-600/30 cursor-pointer hover:bg-evangile-600/20 transition-colors">
          <span className="live-dot" aria-hidden="true" />
          <span className="font-bold tracking-widest uppercase text-evangile-600 text-[10px]">
            EN DIRECT
          </span>
        </div>

        {/* Phone */}
        <a
          href="tel:+243000000000"
          className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-muted hover:text-cream transition-colors"
        >
          <Phone size={11} aria-hidden="true" />
          <span className="whitespace-nowrap text-[11px]">+243 00 000 0000</span>
        </a>

        {/* Email */}
        <a
          href="mailto:contact@laconquete.cd"
          className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-muted hover:text-cream transition-colors"
        >
          <Mail size={11} aria-hidden="true" />
          <span className="whitespace-nowrap text-[11px]">contact@laconquete.cd</span>
        </a>

        {/* Don button */}
        <button
          onClick={() => onNavigate?.('dons')}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-evangile-600 text-white text-[11px] font-semibold hover:bg-evangile-700 hover:shadow-glow-red transition-all duration-300 hover:scale-[1.02] active:scale-95"
        >
          <Heart size={11} aria-hidden="true" />
          <span>Don</span>
        </button>
      </div>

      {/* ---- Bottom shimmer line --------------------------------- */}
      <div className="shimmer-line absolute bottom-0 left-0 h-px w-full" aria-hidden="true" />
    </div>
  );
}