import { useMemo, type ReactNode } from 'react';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { useReveal } from '../lib/hooks';
import { usePageContents } from '../lib/hooks/usePageContents';
import { getContent } from '../lib/supabase';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { UniversalHero } from '../components/UniversalHero';
import { getNextService, SERVICE_TIMES } from '../lib/services';
import { CHURCH } from '../lib/church';
import { MARATHON } from '../lib/events';
import { YOUTUBE_CHANNEL } from '../lib/teachings';
import { imageSrcSet } from '../lib/images';
import {
  ArrowRight, Clock3, Facebook, MapPin, Phone, Youtube,
} from '../lib/icons';
import type { Page } from '../lib/navigation';

interface PageProps { onNavigate: (page: Page) => void; }

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { ref, visible } = useReveal();
  return <div ref={ref} className={`reveal ${visible ? 'in' : ''} ${className}`}>{children}</div>;
}

function formatNextDate(date: Date): string {
  const label = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Lubumbashi',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function ActivitiesPage({ onNavigate }: PageProps) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const cm = usePageContents('activities');
  const ctaImage = getContent(cm, 'cta', 'image', '/church-photo-3.webp');
  const next = useMemo(() => getNextService(), []);

  return (
    <div className="min-h-screen bg-bg font-sans text-cream mobile-bottom-pad">
      <SiteHeader activePage="activities" onNavigate={onNavigate} />
      <MobileNav active="activities" onNavigate={onNavigate} />

      <main>
        <UniversalHero
          pageKey="activities"
          defaultBadge="Vie communautaire"
          defaultTitle="Nos activités"
          defaultSubtitle="Cultes, prière, jeunesse et service : une communauté qui vit sa foi toute la semaine, au cœur de Lubumbashi."
          bgImage="/church-photo-1.webp"
        >
          <div className="flex flex-wrap gap-3">
            <button onClick={() => onNavigate('events')} className="btn-primary">
              Voir l'agenda <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className="btn-ghost border-white/30 text-white hover:bg-white/10"
            >
              Nous contacter
            </button>
          </div>
        </UniversalHero>

        <section className="border-b border-line bg-bg-card" aria-label="Informations pratiques">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-px bg-line md:grid-cols-3">
              <div className="bg-bg-card py-6 md:pr-8">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-evangile-600">
                  <Clock3 className="h-4 w-4" aria-hidden="true" /> Prochain culte
                </p>
                <p className="mt-3 font-hero text-2xl uppercase leading-snug text-cream sm:text-3xl">
                  {formatNextDate(next.at)}
                </p>
                <p className="mt-2 text-sm text-muted">
                  {next.service} · {next.time}
                </p>
              </div>

              <div className="bg-bg-card py-6 md:px-8">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-evangile-600">
                  <MapPin className="h-4 w-4" aria-hidden="true" /> Adresse
                </p>
                <p className="mt-3 text-sm leading-relaxed text-cream">
                  {CHURCH.address.street}
                  <br />
                  {CHURCH.address.landmark}, {CHURCH.address.city}
                </p>
                <p className="mt-2 text-sm text-muted">Entrée libre</p>
              </div>

              <div className="bg-bg-card py-6 md:pl-8">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-evangile-600">
                  <Phone className="h-4 w-4" aria-hidden="true" /> Bureau pastoral
                </p>
                <p className="mt-3 text-sm leading-relaxed text-cream">
                  Lundi – vendredi · 10h00 – 18h00
                </p>
                <a
                  href={CHURCH.phone.href}
                  className="mt-2 inline-block text-sm text-muted underline decoration-line underline-offset-4 transition-colors hover:text-evangile-600"
                >
                  {CHURCH.phone.display}
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="semaine" className="px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
              <Reveal className="lg:sticky lg:top-24 lg:self-start">
                <p className="section-label">Rythme hebdomadaire</p>
                <h2 className="section-title mt-4">La semaine à La Conquête</h2>
                <div className="rule-accent mt-6" />
                <p className="mt-6 max-w-md text-sm leading-relaxed text-muted">
                  Quatre rendez-vous pour prier, écouter la Parole et grandir ensemble.
                  Chaque culte se tient au même endroit, sans inscription.
                </p>

                <div className="mt-8 border border-line bg-bg-card p-6">
                  <p className="person-role flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-evangile-600" aria-hidden="true" /> Lieu des cultes
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-cream">
                    {CHURCH.address.full}
                  </p>
                  <button onClick={() => onNavigate('events')} className="btn-link mt-5">
                    Voir tous les événements <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </Reveal>

              <Reveal className="reveal-delay-1">
                <div className="border-t border-line">
                  {SERVICE_TIMES.map((service, index) => (
                    <article
                      key={service.day}
                      className="group border-b border-line py-6 first:pt-0 sm:py-7"
                    >
                      <div className="flex items-start gap-4 sm:gap-5">
                        <span className="w-8 shrink-0 font-hero text-2xl leading-none text-evangile-600/45 transition-colors group-hover:text-evangile-600 sm:w-10 sm:text-3xl">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-evangile-600">
                            {service.day}
                          </p>
                          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                            <h3 className="card-title text-[1.35rem] sm:text-[1.6rem]">{service.service}</h3>
                            <p className="whitespace-nowrap font-hero text-2xl leading-none text-cream sm:text-3xl">
                              {service.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-bg-card px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-px bg-line lg:grid-cols-2">
              <Reveal>
                <article className="flex h-full flex-col bg-bg-card p-8 md:p-10">
                  <p className="section-label">Servir ensemble</p>
                  <h2 className="section-title mt-4 text-[clamp(2rem,4vw,3rem)]">Chaque don a sa place</h2>
                  <div className="rule-accent mt-6" />
                  <p className="mt-6 max-w-md text-sm leading-relaxed text-muted">
                    Louange, accueil, enfants, évangélisation, diaconie : les ministères de l'église
                    accueillent de nouveaux serviteurs tout au long de l'année.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button onClick={() => onNavigate('ministeres')} className="btn-primary">
                      Découvrir les ministères <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button onClick={() => onNavigate('contact')} className="btn-ghost">
                      Nous écrire
                    </button>
                  </div>
                </article>
              </Reveal>

              <Reveal className="reveal-delay-1">
                <article className="flex h-full flex-col bg-bg-card p-8 md:p-10">
                  <p className="section-label">Où que vous soyez</p>
                  <h2 className="section-title mt-4 text-[clamp(2rem,4vw,3rem)]">Suivre le culte en direct</h2>
                  <div className="rule-accent mt-6" />
                  <p className="mt-6 max-w-md text-sm leading-relaxed text-muted">
                    Les cultes et les temps de prière sont diffusés sur YouTube et Facebook.
                    Les vidéos restent disponibles après la diffusion.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-5">
                    <a
                      href={YOUTUBE_CHANNEL.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-link"
                    >
                      <Youtube className="h-4 w-4" /> YouTube
                    </a>
                    <a
                      href={CHURCH.social.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-link"
                    >
                      <Facebook className="h-4 w-4" /> Facebook
                    </a>
                    <button onClick={() => onNavigate('media')} className="btn-ghost">
                      Espace médias
                    </button>
                  </div>
                </article>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-px bg-line lg:grid-cols-[minmax(0,380px)_1fr]">
              <Reveal>
                <figure className="flex h-full items-center justify-center bg-bg-card p-6 sm:p-8">
                  <img
                    src={MARATHON.image}
                    alt={`Affiche officielle — ${MARATHON.title}, ${MARATHON.period}`}
                    className="h-auto w-full object-contain"
                    loading="lazy"
                  />
                </figure>
              </Reveal>

              <Reveal className="reveal-delay-1">
                <div className="flex h-full flex-col justify-between gap-8 bg-bg-card p-8 md:p-10">
                  <div>
                    <p className="section-label">Temps fort</p>
                    <h2 className="section-title mt-4 text-[2.5rem] sm:text-[3rem]">{MARATHON.title}</h2>
                    <div className="rule-accent mt-5" />
                    <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-evangile-600">
                      {MARATHON.period}
                    </p>
                    <p className="mt-4 font-serif text-xl italic leading-snug text-cream sm:text-2xl">
                      « {MARATHON.theme} »
                    </p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-evangile-600">
                      {MARATHON.reference}
                    </p>
                    <dl className="mt-8 grid gap-5 sm:grid-cols-2">
                      <div>
                        <dt className="person-role">Horaires</dt>
                        <dd className="mt-2 text-sm leading-relaxed text-muted">{MARATHON.hours}</dd>
                      </div>
                      <div>
                        <dt className="person-role">Lieu</dt>
                        <dd className="mt-2 text-sm leading-relaxed text-muted">{CHURCH.address.full}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => onNavigate('events')} className="btn-primary">
                      Voir l'agenda <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button onClick={() => onNavigate('contact')} className="btn-ghost">
                      Poser une question
                    </button>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-line" aria-label="Venir à un culte">
          <img
            src={ctaImage}
            srcSet={imageSrcSet(ctaImage)}
            sizes="100vw"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="photo-claro-strong absolute inset-0 h-full w-full object-cover"
          />
          <div className="photo-veil-strong absolute inset-0" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
            <div className="max-w-2xl">
              <p className="section-eyebrow">Venir nous voir</p>
              <h2 className="section-title mt-4" style={{ color: '#FFFFFF' }}>
                Vivez un culte avec nous
              </h2>
              <div className="mt-5 h-px w-16 bg-evangile-600" />
              <p className="mt-5 text-sm leading-relaxed text-white/70 sm:text-base">
                Le prochain rendez-vous : {formatNextDate(next.at).toLowerCase()} à{' '}
                {next.start.replace(':', 'h')}, au {CHURCH.address.street}, {CHURCH.address.landmark},{' '}
                {CHURCH.address.city}.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={() => onNavigate('contact')} className="btn-primary">
                  Nous contacter <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <a
                  href={CHURCH.phone.href}
                  className="btn-ghost border-white/30 text-white hover:bg-white/10"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" /> {CHURCH.phone.display}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
    </div>
  );
}
