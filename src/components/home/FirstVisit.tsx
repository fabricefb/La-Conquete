import { CHURCH } from '../../lib/church';
import { SERVICE_TIMES } from '../../lib/services';
import { imageSrcSet } from '../../lib/images';
import type { Page } from '../../lib/navigation';
import {
  ArrowRight,
  Calendar,
  MapPinned,
  MessageCircle,
  Navigation,
  Phone,
} from '../../lib/icons';

/* ═══════════════════════════════════════════════════════════════════
   PREMIER DIMANCHE — informations factuelles pour une première visite
   Horaires, adresse et contact lus dans les sources uniques.
   ═══════════════════════════════════════════════════════════════════ */

const WHATSAPP_NUMBER = CHURCH.phone.href.replace(/\D/g, '');
const ANNOUNCEMENTS_MESSAGE = encodeURIComponent(
  "Bonjour, je souhaite recevoir les annonces de l'Église Évangélique La Conquête.",
);
const WHATSAPP_ANNOUNCEMENTS = `https://wa.me/${WHATSAPP_NUMBER}?text=${ANNOUNCEMENTS_MESSAGE}`;
const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  CHURCH.address.full,
)}`;

export function FirstVisit({
  onNavigate,
  image = '/church-photo-2.webp',
}: {
  onNavigate: (page: Page) => void;
  image?: string;
}) {
  return (
    <section
      id="premier-dimanche"
      aria-label="Votre premier dimanche"
      className="scroll-mt-24 border-y border-line bg-bg-card py-16 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid border border-line lg:grid-cols-12">
          <div className="relative min-h-[300px] overflow-hidden lg:col-span-5 lg:min-h-[560px]">
            <img
              src={image}
              srcSet={imageSrcSet(image)}
              sizes="(min-width: 1024px) 50vw, 100vw"
              alt="Assemblée de l'Église Évangélique La Conquête à Lubumbashi"
              className="photo-claro-strong absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/35 to-ink-950/10" />
            <div className="grid-lines absolute inset-0 opacity-25" />

            <div className="absolute left-0 top-0 flex items-center gap-2.5 border-b border-r border-white/15 bg-ink-950/60 px-4 py-2.5">
              <span className="h-1.5 w-1.5 bg-evangile-500" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">
                Premier dimanche
              </p>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/55">
                Église Évangélique La Conquête
              </p>
              <p className="mt-3 font-hero text-3xl uppercase leading-[0.95] text-white sm:text-4xl">
                {CHURCH.address.street}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/65">
                {CHURCH.address.landmark} · {CHURCH.address.city}
              </p>
            </div>
          </div>

          <div className="border-t border-line p-6 sm:p-8 lg:col-span-7 lg:border-l lg:border-t-0 lg:p-10">
            <div className="flex items-center gap-4">
              <span className="rule-accent" />
              <p className="section-eyebrow">Première visite</p>
            </div>

            <h2 className="section-title mt-4">Votre premier dimanche</h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
              L'essentiel pour venir : l'horaire, l'adresse et un contact direct avec l'église.
            </p>

            <div className="mt-8 border-t border-line">
              {SERVICE_TIMES.map((service, index) => (
                <div
                  key={`${service.weekday}-${service.start}`}
                  className="flex gap-3 border-b border-line py-4 sm:gap-4"
                >
                  <span className="w-6 shrink-0 font-hero text-lg leading-none text-evangile-600">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-4">
                    <div>
                      <p className="text-sm font-semibold text-cream">{service.service}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-muted">
                        <Calendar className="h-3 w-3 text-evangile-500" />
                        {service.day}
                        <span className="sm:hidden">· {service.time}</span>
                      </p>
                    </div>
                    <span className="hidden whitespace-nowrap text-sm text-cream sm:block">
                      {service.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="flex gap-3">
                <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-evangile-500" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Adresse</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-cream">
                    {CHURCH.address.street}
                    <br />
                    {CHURCH.address.landmark}
                    <br />
                    {CHURCH.address.city}, {CHURCH.address.country}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-evangile-500" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Téléphone</p>
                  <a
                    href={CHURCH.phone.href}
                    className="mt-1.5 inline-block text-sm text-cream transition-colors hover:text-evangile-400"
                  >
                    {CHURCH.phone.display}
                  </a>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    Pour les annonces de la semaine, écrivez-nous sur WhatsApp.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => onNavigate('activities')} className="btn-primary">
                Voir les cultes
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <a
                href={DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                Itinéraire
                <Navigation className="h-3.5 w-3.5" />
              </a>
              <a
                href={WHATSAPP_ANNOUNCEMENTS}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Recevoir les annonces
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
