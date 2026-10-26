import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Bell, Calendar, Clock, MapPin } from '../../lib/icons';
import { CHURCH } from '../../lib/church';
import { SERVICE_TIMES } from '../../lib/services';
import { imageSrcSet } from '../../lib/images';
import type { Page } from '../../lib/navigation';
import type { ChurchEvent } from '../../types';

interface Slide {
  key: string;
  label: string;
  badge: string;
  title: string;
  time: string;
  description?: string;
  image: string;
  cta: string;
  page: Page;
}

const SERVICE_DESCRIPTIONS: Record<number, string> = {
  0: 'Adoration, Parole et communion fraternelle.',
  3: "Enseignement biblique et prière au cœur de la semaine.",
  5: 'Un temps de jeûne, de prière et de consécration.',
};

const SERVICE_IMAGES: Record<number, string> = {
  0: '/church-photo-3.webp',
  3: '/bible.webp',
  5: '/church-photo-1.webp',
};

function weeklySlides(overrides: Record<number, string>): Slide[] {
  return SERVICE_TIMES.slice(0, 4).map((s) => ({
    key: `service-${s.weekday}`,
    label: 'Programme hebdomadaire',
    badge: s.day,
    title: s.service,
    time: s.time,
    description: SERVICE_DESCRIPTIONS[s.weekday],
    image: overrides[s.weekday] || SERVICE_IMAGES[s.weekday] || '/church-photo-2.webp',
    cta: 'Nos programmes',
    page: 'activities',
  }));
}

function eventToSlide(evt: ChurchEvent): Slide {
  const date = new Date(evt.event_date);
  const badge = Number.isNaN(date.getTime())
    ? evt.category
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return {
    key: `event-${evt.id}`,
    label: evt.category,
    badge,
    title: evt.title,
    time: evt.location || CHURCH.address.full,
    description: evt.description,
    image: evt.image_url || '/priere.webp',
    cta: "Voir l'événement",
    page: 'events',
  };
}

export interface AgendaSettings {
  eyebrow: string;
  title: string;
  subtitle: string;
  kicker: string;
  badge: string;
  featuredTitle: string;
  featuredTime: string;
  featuredDescription: string;
  featuredImage: string;
  featuredCta: string;
}

interface UpcomingCarouselProps {
  events: ChurchEvent[];
  agenda: AgendaSettings;
  serviceImages?: Record<number, string>;
  onNavigate: (page: Page) => void;
}

export function UpcomingCarousel({ events, agenda, serviceImages = {}, onNavigate }: UpcomingCarouselProps) {
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);

  const upcoming = events
    .filter((e) => {
      const t = new Date(e.event_date).getTime();
      return !Number.isNaN(t) && t >= Date.now() - 86400000;
    })
    .slice(0, 2);

  const featured: Slide = {
    key: 'featured',
    label: agenda.kicker,
    badge: agenda.badge,
    title: agenda.featuredTitle,
    time: agenda.featuredTime,
    description: agenda.featuredDescription,
    image: agenda.featuredImage || '/marathon-priere-2026-slide.webp',
    cta: agenda.featuredCta,
    page: 'events',
  };

  const slides = [featured, ...upcoming.map(eventToSlide), ...weeklySlides(serviceImages)];

  const go = (next: number) => {
    setIndex(((next % slides.length) + slides.length) % slides.length);
  };

  const whatsapp = (title: string) => {
    const number = CHURCH.phone.href.replace(/\D/g, '');
    const text = encodeURIComponent(`Bonjour, je souhaite être informé(e) : ${title}. Merci.`);
    return `https://wa.me/${number}?text=${text}`;
  };

  return (
    <section
      aria-label="À ne pas manquer"
      className="relative overflow-hidden border-b border-line bg-bg-card py-16 md:py-24"
    >
      <span className="watermark pointer-events-none absolute -right-4 top-2 hidden select-none text-[15vw] leading-none lg:block">
        Agenda
      </span>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <span className="rule-accent" />
              <p className="section-eyebrow">{agenda.eyebrow}</p>
            </div>
            <h2 className="section-title mt-4">{agenda.title}</h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
              {agenda.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="inline-flex h-11 w-11 items-center justify-center border border-line text-cream transition-colors hover:border-evangile-600 hover:text-evangile-600"
              aria-label="Événement précédent"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              className="inline-flex h-11 w-11 items-center justify-center border border-line text-cream transition-colors hover:border-evangile-600 hover:text-evangile-600"
              aria-label="Événement suivant"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className="mt-8 overflow-hidden border border-line bg-bg"
          onPointerDown={(e) => { startX.current = e.clientX; }}
          onPointerUp={(e) => {
            if (startX.current === null) return;
            const dx = e.clientX - startX.current;
            if (Math.abs(dx) > 48) go(index + (dx < 0 ? 1 : -1));
            startX.current = null;
          }}
          onPointerLeave={() => { startX.current = null; }}
        >
          <div
            className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {slides.map((slide, i) => (
              <article
                key={slide.key}
                className="relative flex min-h-[31rem] w-full shrink-0 flex-col sm:min-h-[35rem]"
                aria-hidden={i !== index}
              >
                <img
                  src={slide.image}
                  srcSet={imageSrcSet(slide.image)}
                  sizes="100vw"
                  alt=""
                  className="photo-claro-strong absolute inset-0 h-full w-full object-cover"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/70 to-ink-950/20" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-transparent to-transparent" />
                <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" />

                <div className="relative z-10 flex flex-1 flex-col justify-between gap-10 p-6 sm:p-10">
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex items-center gap-2 border border-white/20 bg-black/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85">
                      <Calendar className="h-3.5 w-3.5" />
                      {slide.badge}
                    </span>
                    <span className="hidden items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/50 sm:inline-flex">
                      <MapPin className="h-3.5 w-3.5" />
                      {CHURCH.address.street} — {CHURCH.address.landmark}
                    </span>
                  </div>

                  <div className="max-w-2xl">
                    <p className="section-eyebrow">{slide.label}</p>
                    <p className="mt-3 flex items-center gap-2 text-sm text-white/70">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {slide.time}
                    </p>
                    <h3 className="mt-4 font-hero text-5xl uppercase leading-[0.88] text-white sm:text-6xl lg:text-7xl">
                      {slide.title}
                    </h3>
                    {slide.description && (
                      <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70">
                        {slide.description}
                      </p>
                    )}

                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <button onClick={() => onNavigate(slide.page)} className="btn-primary">
                        {slide.cta}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <a
                        href={whatsapp(slide.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 border border-white/30 px-5 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/10"
                      >
                        <Bell className="h-3.5 w-3.5" />
                        Me prévenir
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.key}
                type="button"
                onClick={() => go(i)}
                className={`h-0.5 transition-all duration-300 ${
                  i === index ? 'w-12 bg-evangile-600' : 'w-8 bg-line hover:bg-muted'
                }`}
                aria-label={`Aller à : ${slide.title}`}
                aria-current={i === index ? 'true' : undefined}
              />
            ))}
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            {String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
          </p>
        </div>
      </div>
    </section>
  );
}
