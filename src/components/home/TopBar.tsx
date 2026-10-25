import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { CHURCH } from '../../lib/church';
import { SERVICE_TIMES } from '../../lib/services';
import { useToast } from '../../contexts/ToastContext';
import { Heart, Phone, Mail } from '../../lib/icons';

/* ═══════════════════════════════════════════════════════════════════
   TOPBAR — Bande passante après le Hero
   - Marquee alimenté par les communiqués (Supabase)
   - Compte à rebours vers le prochain live (admin-programmable)
   - Visible sur mobile ET desktop
   - Plus fixe en haut — coule naturellement après le Hero
   ═══════════════════════════════════════════════════════════════════ */

/* ------------------------------------------------------------------ */
/*  TikTok SVG Icon                                                    */
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
/*  Live window helper                                                 */
/*  off       → aucun direct programmé (ou direct terminé)             */
/*  upcoming  → compte à rebours avant le culte                        */
/*  live      → fenêtre de diffusion : bouton EN DIRECT                */
/* ------------------------------------------------------------------ */
const LIVE_FALLBACK_HOURS = 4;

function useLiveStatus(startDate: string | null, endDate: string | null, label: string) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startDate) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startDate]);

  const start = startDate ? new Date(startDate).getTime() : NaN;
  if (!Number.isFinite(start)) {
    return { phase: 'off' as const, label, days: 0, hours: 0, mins: 0, secs: 0 };
  }

  const configuredEnd = endDate ? new Date(endDate).getTime() : NaN;
  const end = Number.isFinite(configuredEnd) && configuredEnd > start
    ? configuredEnd
    : start + LIVE_FALLBACK_HOURS * 3600000;

  if (now >= end) {
    return { phase: 'off' as const, label, days: 0, hours: 0, mins: 0, secs: 0 };
  }

  if (now >= start) {
    return { phase: 'live' as const, label, days: 0, hours: 0, mins: 0, secs: 0 };
  }

  const diff = start - now;
  return {
    phase: 'upcoming' as const,
    label,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
interface TopBarProps {
  onNavigate?: (page: string) => void;
  onLiveClick?: () => void;
  phone?: string;
  email?: string;
  marqueeOverride?: string;
  textColor?: string;
  bgColor?: string;
}

const UPCOMING_ANNOUNCEMENTS: string[] = [];
if (Date.now() < new Date('2026-12-01T00:00:00+02:00').getTime()) {
  UPCOMING_ANNOUNCEMENTS.push(
    "Marathon de prière — du 1er au 30 novembre 2026 · thème : « La mission de l'Église locale face au monde moderne »",
  );
}

export function TopBar({ onNavigate, onLiveClick, phone, email, marqueeOverride, textColor, bgColor }: TopBarProps) {
  const [announcements, setAnnouncements] = useState<string[]>([
    ...UPCOMING_ANNOUNCEMENTS,
    `Bienvenue à l'Église Évangélique La Conquête — ${CHURCH.address.city}, ${CHURCH.address.country}`,
    ...SERVICE_TIMES.map((s) => `${s.service} — ${s.day}, ${s.time.replace(' – ', ' à ')}`),
  ]);
  const [liveTargetDate, setLiveTargetDate] = useState<string | null>(null);
  const [liveEndDate, setLiveEndDate] = useState<string | null>(null);
  const [liveLabel, setLiveLabel] = useState('Prochain direct');
  const live = useLiveStatus(liveTargetDate, liveEndDate, liveLabel);

  /* ── Fetch communiqués & live window (refreshed every minute) ── */
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function load() {
      try {
        // Fetch published communiqués for the marquee
        const { data: commData } = await supabase
          .from('contents')
          .select('title')
          .eq('type', 'communique')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!cancelled && commData && commData.length > 0) {
          setAnnouncements([...UPCOMING_ANNOUNCEMENTS, ...commData.map((c: any) => c.title)]);
        }

        // Fetch the live window from site_settings
        const { data: liveRows } = await supabase
          .from('site_settings')
          .select('key, value')
          .in('key', ['next_live_datetime', 'live_end_datetime', 'next_live_label']);

        if (cancelled) return;

        if (liveRows) {
          const map: Record<string, string> = {};
          for (const row of liveRows) map[row.key] = row.value;
          setLiveTargetDate(map['next_live_datetime'] || null);
          setLiveEndDate(map['live_end_datetime'] || null);
          setLiveLabel(map['next_live_label'] || 'Prochain direct');
        }

        // Keep open pages in sync when the admin starts or stops the live
        if (!timer) timer = setInterval(() => { void load(); }, 60000);
      } catch {
        // Keep defaults
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  /* ── Build marquee items (duplicate for seamless loop) ── */
  // If admin set a custom marquee text, use it; otherwise use communiqués
  const customItems = marqueeOverride
    ? marqueeOverride.split('|').map(s => s.trim()).filter(Boolean)
    : [];
  const marqueeItems = customItems.length > 0
    ? [...customItems, ...customItems]
    : announcements.length > 0
      ? [...announcements, ...announcements]
      : [`Bienvenue à l'Église Évangélique La Conquête — ${CHURCH.address.city}, ${CHURCH.address.country}`];

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        backgroundColor: bgColor || 'rgb(var(--brand-red-rgb))',
        color: textColor || undefined,
      }}
      role="banner"
      aria-label="Bande d'informations"
    >
      {/* ---- Main content row ---- */}
      <div className="flex items-center justify-between px-3 md:px-6 py-2.5">
        {/* ---- Left: live window (countdown → EN DIRECT) ---- */}
        <div className="flex items-center gap-2 shrink-0">
          {live.phase === 'upcoming' && (
            <>
              <span className="live-dot" aria-hidden="true" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-white hidden sm:inline">
                  {live.label}
                </span>
                <div className="flex items-center gap-0.5 font-mono text-[10px] md:text-xs font-bold text-white">
                  {live.days > 0 && (
                    <span className="border border-white/25 px-1.5 py-0.5">{live.days}j</span>
                  )}
                  <span className="border border-white/25 px-1.5 py-0.5">
                    {String(live.hours).padStart(2, '0')}h
                  </span>
                  <span className="border border-white/25 px-1.5 py-0.5">
                    {String(live.mins).padStart(2, '0')}m
                  </span>
                  <span className="border border-white/25 px-1.5 py-0.5">
                    {String(live.secs).padStart(2, '0')}s
                  </span>
                </div>
              </div>
            </>
          )}
          {live.phase === 'live' && (
            <>
              <span className="live-dot" aria-hidden="true" />
              <button
                type="button"
                onClick={onLiveClick}
                className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
                aria-label={`Suivre le direct — ${live.label}`}
              >
                <span className="hidden text-[11px] font-medium text-white/75 md:inline">
                  {live.label}
                </span>
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-white animate-pulse">
                  EN DIRECT
                </span>
                <span className="hidden border border-white/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white sm:inline">
                  Regarder
                </span>
              </button>
            </>
          )}
        </div>

        {/* ---- Center: Scrolling Marquee (hidden on very small, shown on sm+) ---- */}
        <div
          className="hidden sm:flex flex-1 mx-4 md:mx-8 overflow-hidden scrollbar-hide"
          aria-live="polite"
          aria-label="Communiqués de l'église"
        >
          <div key={marqueeOverride || 'communiques'} className="animate-marquee flex whitespace-nowrap">
            {marqueeItems.map((text, i) => (
              <span key={i} className="mx-6 md:mx-8 text-white/90 text-[11px] md:text-xs font-medium">
                {text}
              </span>
            ))}
          </div>
        </div>

        {/* ---- Right: Phone + Email + Don ---- */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <a
            href={phone ? `tel:${phone.replace(/\s/g, '')}` : CHURCH.phone.href}
            className="hidden md:flex items-center gap-1 text-white/80 hover:text-white transition-colors text-[11px]"
          >
            <Phone size={11} aria-hidden="true" />
            <span className="whitespace-nowrap">{phone || CHURCH.phone.display}</span>
          </a>

          <a
            href={`mailto:${email || CHURCH.email}`}
            className="hidden lg:flex items-center gap-1 text-white/80 hover:text-white transition-colors text-[11px]"
          >
            <Mail size={11} aria-hidden="true" />
            <span className="whitespace-nowrap">{email || CHURCH.email}</span>
          </a>

          <button
            onClick={() => onNavigate?.('dons')}
            className="flex items-center gap-1.5 bg-cream px-3 py-1 text-[11px] font-bold text-ink-950 transition-colors hover:bg-white/85"
          >
            <Heart size={11} aria-hidden="true" />
            <span>Don</span>
          </button>
        </div>
      </div>

      {/* ---- Mobile-only: Show announcements as a single line below ---- */}
      <div className="sm:hidden overflow-hidden border-t border-white/20">
        <div key={marqueeOverride || 'communiques'} className="animate-marquee flex whitespace-nowrap py-1.5">
          {marqueeItems.map((text, i) => (
            <span key={i} className="mx-6 text-white/80 text-[10px] font-medium">
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* ---- Bottom shimmer line ---- */}
      <div className="shimmer-line absolute bottom-0 left-0 h-px w-full" aria-hidden="true" />
    </div>
  );
}