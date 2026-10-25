import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  CalendarClock,
  HandHeart,
  Heart,
  MessageCircle,
  Quote,
  X,
  type LucideIcon,
} from '../../lib/icons';
import type { Page } from '../../lib/navigation';
import { CHURCH } from '../../lib/church';

interface QuickActionsProps {
  onNavigate: (page: Page) => void;
}

interface QuickAction {
  label: string;
  hint: string;
  Icon: LucideIcon;
  page: Page;
}

const ACTIONS: readonly QuickAction[] = [
  { label: 'Don et offrande', hint: "Soutenir l'œuvre de l'église", Icon: HandHeart, page: 'dons' },
  { label: 'Prière & assistance', hint: 'Confier un sujet de prière', Icon: Heart, page: 'contact' },
  { label: 'Laisser un témoignage', hint: 'Mur de témoignages', Icon: Quote, page: 'contact' },
  { label: 'Demander un rendez-vous', hint: 'Rencontrer un pasteur', Icon: CalendarClock, page: 'contact' },
];

const WHATSAPP_URL = `https://wa.me/${CHURCH.phone.href.replace(/\D/g, '')}?text=${encodeURIComponent(
  "Bonjour, je viens du site de l'Église Évangélique La Conquête.",
)}`;

function WhatsAppIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function QuickActions({ onNavigate }: QuickActionsProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const goTo = (page: Page) => {
    setOpen(false);
    onNavigate(page);
  };

  if (!scrolled && !open) return null;

  return (
    <div
      ref={rootRef}
      className="fixed bottom-24 right-4 z-[70] flex flex-col items-end gap-3 animate-fade-up lg:bottom-8 lg:right-8"
    >
      {open && (
        <div
          id="quick-actions-menu"
          className="w-[min(20rem,calc(100vw-2rem))] origin-bottom-right animate-scale-in border border-line bg-bg-card shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Accès rapides
            </p>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-evangile-500">
              {CHURCH.shortName}
            </span>
          </div>

          <div className="divide-y divide-line">
            {ACTIONS.map(({ label, hint, Icon, page }) => (
              <button
                key={label}
                type="button"
                onClick={() => goTo(page)}
                className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-card-hover"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-line text-evangile-500 transition-colors group-hover:border-evangile-600/50">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-cream">{label}</span>
                  <span className="mt-0.5 block text-[11px] text-muted">{hint}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-evangile-500" />
              </button>
            ))}

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-card-hover"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-line text-evangile-500 transition-colors group-hover:border-evangile-600/50">
                <WhatsAppIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-cream">Contacter sur WhatsApp</span>
                <span className="mt-0.5 block text-[11px] text-muted">{CHURCH.phone.display}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-evangile-500" />
            </a>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="quick-actions-menu"
        aria-label={open ? 'Fermer les accès rapides' : 'Ouvrir les accès rapides'}
        className="group relative flex h-14 w-14 items-center justify-center bg-evangile-600 text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition-[filter] duration-200 hover:brightness-110 active:brightness-95"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}

        {!open && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-full top-1/2 mr-3 hidden -translate-y-1/2 translate-x-2 whitespace-nowrap border border-line bg-bg-card px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream opacity-0 shadow-lg transition-[opacity,transform] duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 lg:block"
          >
            Accès rapides
          </span>
        )}
      </button>
    </div>
  );
}
