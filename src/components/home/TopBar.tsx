import { useEffect, useState } from 'react';
import { MapPinned, Phone } from '../../lib/icons';

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
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function TopBar() {
  const [now, setNow] = useState<Date | null>(null);

  /* Live clock ---------------------------------------------------- */
  useEffect(() => {
    // Set initial value immediately
    setNow(new Date());

    const id = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(id);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */
  return (
    <div
      className="relative w-full hidden md:flex items-center justify-between px-4 h-10 text-xs select-none"
      style={{ backgroundColor: 'rgb(var(--bg-elevated-rgb))' }}
      role="banner"
      aria-label="Barre d'informations"
    >
      {/* ---- Left: Clock & Date ---------------------------------- */}
      <div className="flex items-center gap-2 shrink-0 w-56 text-cream">
        {now && (
          <time dateTime={now.toISOString()} className="font-mono tracking-wide">
            {now.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })}
          </time>
        )}
        <span className="text-muted" aria-hidden="true">•</span>
        {now && (
          <span className="text-muted whitespace-nowrap">
            {now.toLocaleDateString('fr-FR', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
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
          {/* Original items */}
          {ANNOUNCEMENTS.map((text, i) => (
            <span key={`a-${i}`} className="mx-8 text-cream/80">
              {text}
            </span>
          ))}
          {/* Duplicate for seamless loop */}
          {ANNOUNCEMENTS.map((text, i) => (
            <span key={`b-${i}`} className="mx-8 text-cream/80">
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* ---- Right: Live + Location + Phone ---------------------- */}
      <div className="flex items-center gap-3 shrink-0">
        {/* LIVE indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-bg/60 border border-line">
          <span className="live-dot" aria-hidden="true" />
          <span
            className="font-bold tracking-widest uppercase"
            style={{ color: '#E3221F' }}
          >
            EN DIRECT
          </span>
        </div>

        {/* Location pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-bg/60 border border-line text-cream">
          <MapPinned size={12} aria-hidden="true" />
          <span className="whitespace-nowrap">Kinshasa, RDC</span>
        </div>

        {/* Phone pill */}
        <a
          href="tel:+243000000000"
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-bg/60 border border-line text-cream hover:bg-bg transition-colors"
        >
          <Phone size={12} aria-hidden="true" />
          <span className="whitespace-nowrap">+243 00 000 0000</span>
        </a>
      </div>

      {/* ---- Bottom shimmer line --------------------------------- */}
      <div
        className="shimmer-line absolute bottom-0 left-0 h-px w-full"
        aria-hidden="true"
      />
    </div>
  );
}