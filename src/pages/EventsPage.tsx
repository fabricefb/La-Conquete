import { useState, useEffect } from 'react';
import { db, buildContentMap, getContent, isSupabaseConfigured } from '../lib/supabase';
import type { ChurchEvent } from '../types';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { useReveal } from '../lib/hooks';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { UniversalHero } from '../components/UniversalHero';
import { FeaturedSpeakers, type FeaturedSpeaker } from '../components/home/FeaturedSpeakers';
import { formatDate } from '../lib/date';
import { SERVICE_TIMES } from '../lib/services';
import { CHURCH } from '../lib/church';
import { MARATHON } from '../lib/events';
import { imageSrcSet } from '../lib/images';
import { Calendar, MapPin, Clock, Search, ArrowRight, MessageCircle, Globe } from '../lib/icons';
import type { Page } from '../lib/navigation';

interface EventsPageProps { onNavigate: (page: Page) => void; }

const FALLBACK_SPEAKERS: FeaturedSpeaker[] = [
  {
    id: 1,
    image: '/pasteur-romain-kazadi.webp',
    name: 'Josué Romain Kazadi',
    role: 'Pasteur Principal',
    text: '',
  },
  {
    id: 2,
    image: '/pasteur-david-kateba.webp',
    name: 'David Kateba',
    role: 'Docteur',
    text: '',
  },
  {
    id: 3,
    image: '/pasteur-richard-mukendi.webp',
    name: 'Richard Mukendi',
    role: 'Pasteur',
    text: '',
  },
];

function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal();
  return <div ref={ref} className={`reveal ${visible ? 'in' : ''} ${className}`}>{children}</div>;
}

export function EventsPage({ onNavigate }: EventsPageProps) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [contentMap, setContentMap] = useState<Record<string, string>>({});

  useReveal();

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const [evts, contents] = await Promise.all([db.getEvents(), db.getPageContents('events')]);
        if (cancelled) return;
        setEvents(evts);
        setContentMap(buildContentMap(contents));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = events.filter((e) => {
    const matchCat = activeCategory === null || e.category === activeCategory;
    const term = search.trim().toLowerCase();
    const matchSearch = !term || (e.title || '').toLowerCase().includes(term) || (e.description || '').toLowerCase().includes(term);
    return matchCat && matchSearch;
  });

  const upcoming = [...filtered]
    .filter((e) => new Date(e.event_date) >= new Date())
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

  const featured = events.find((e) => e.is_featured && new Date(e.event_date) >= new Date());
  const showFilters = !loading && events.some((e) => new Date(e.event_date) >= new Date());
  const heroTitle = getContent(contentMap, 'hero', 'title', 'Événements');

  const calendarLabel = getContent(contentMap, 'calendar', 'label', 'Calendrier');
  const calendarTitle = getContent(contentMap, 'calendar', 'title', 'Prochains rendez-vous');
  const searchPlaceholder = getContent(contentMap, 'calendar', 'search_placeholder', 'Rechercher un événement…');
  const categories = getContent(
    contentMap,
    'calendar',
    'categories',
    'Tous, Cultes, Missions, Jeunesse, Communion, Formation, Évangélisation, Spécial, Autre',
  )
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  const agendaError = getContent(
    contentMap,
    'calendar',
    'error_text',
    'Agenda momentanément indisponible. Les rendez-vous hebdomadaires restent affichés ci-dessous.',
  );
  const emptyTitle = getContent(
    contentMap,
    'calendar',
    'empty_title',
    "Aucun événement supplémentaire n'est annoncé pour le moment.",
  );
  const emptyText = getContent(
    contentMap,
    'calendar',
    'empty_text',
    'Les rendez-vous hebdomadaires ont lieu chaque semaine, sans inscription.',
  );
  const liveBadge = getContent(contentMap, 'calendar', 'live_badge', 'En direct');

  const marathon = {
    label: getContent(contentMap, 'marathon', 'label', MARATHON.label),
    title: getContent(contentMap, 'marathon', 'title', MARATHON.title),
    period: getContent(contentMap, 'marathon', 'period', MARATHON.period),
    theme: getContent(contentMap, 'marathon', 'theme', MARATHON.theme),
    reference: getContent(contentMap, 'marathon', 'reference', MARATHON.reference),
    hours: getContent(contentMap, 'marathon', 'hours', MARATHON.hours),
    image: getContent(contentMap, 'marathon', 'image', MARATHON.image),
    themeLabel: getContent(contentMap, 'marathon', 'theme_label', 'Thème'),
    hoursLabel: getContent(contentMap, 'marathon', 'hours_label', 'Horaires'),
    locationLabel: getContent(contentMap, 'marathon', 'location_label', 'Lieu'),
    ctaPrimary: getContent(contentMap, 'marathon', 'cta_primary', "Lire l'annonce"),
    ctaSecondary: getContent(contentMap, 'marathon', 'cta_secondary', 'Poser une question'),
  };

  const speakersLabel = getContent(contentMap, 'speakers', 'label', 'Marathon de prière');
  const speakersTitle = getContent(contentMap, 'speakers', 'title', 'Orateurs');
  const speakersDescription = getContent(contentMap, 'speakers', 'description', '');
  const isSpeakerActive = (position: number): boolean => {
    const raw = getContent(contentMap, 'speakers', `speaker_${position}_active`, 'true');
    return ['true', '1', 'oui', 'yes', 'on'].includes(raw.trim().toLowerCase());
  };
  const eventSpeakers: FeaturedSpeaker[] = [1, 2, 3, 4, 5]
    .map((position) => {
      const fallback = FALLBACK_SPEAKERS[position - 1];
      return {
        id: position,
        image: getContent(contentMap, 'speakers', `speaker_${position}_image`, fallback?.image ?? ''),
        name: getContent(contentMap, 'speakers', `speaker_${position}_name`, fallback?.name ?? ''),
        role: getContent(contentMap, 'speakers', `speaker_${position}_role`, fallback?.role ?? ''),
        text: getContent(contentMap, 'speakers', `speaker_${position}_text`, fallback?.text ?? ''),
        tag: position === 5 ? 'Hôte' : `Orateur ${position}`,
      };
    })
    .filter((speaker) => isSpeakerActive(speaker.id) && speaker.image && speaker.name);

  const weeklyLabel = getContent(contentMap, 'weekly', 'label', 'Chaque semaine');
  const weeklyTitle = getContent(contentMap, 'weekly', 'title', 'Cultes hebdomadaires');
  const weeklyDescription = getContent(
    contentMap,
    'weekly',
    'description',
    'Des rendez-vous réguliers pour grandir dans la foi et la communion fraternelle. Entrée libre.',
  );
  const weeklyCta = getContent(contentMap, 'weekly', 'cta_text', 'Tout savoir sur les cultes');

  const newsLabel = getContent(contentMap, 'stay_connected', 'news_label', 'Rester informé');
  const newsTitle = getContent(contentMap, 'stay_connected', 'news_title', "Suivez la vie de l'église");
  const newsText = getContent(
    contentMap,
    'stay_connected',
    'news_text',
    "Les annonces, communiqués et changements de programme sont publiés en premier sur nos canaux officiels. Aucune inscription n'est nécessaire.",
  );
  const joinLabel = getContent(contentMap, 'stay_connected', 'join_label', 'Nous rejoindre');
  const joinTitle = getContent(contentMap, 'stay_connected', 'join_title', 'Une question sur un événement ?');
  const joinText = getContent(
    contentMap,
    'stay_connected',
    'join_text',
    'Le bureau pastoral répond du lundi au vendredi, de 10h à 18h00, au',
  );
  const joinCta = getContent(contentMap, 'stay_connected', 'join_cta', 'Nous écrire');

  return (
    <div className="min-h-screen bg-bg text-cream font-sans mobile-bottom-pad">
      <SiteHeader onNavigate={onNavigate} activePage="events" />

      <main>
        <UniversalHero
          pageKey="events"
          defaultBadge="Agenda spirituel"
          defaultTitle={heroTitle}
          defaultSubtitle="Cultes, veillées, séminaires et sorties d'évangélisation : les rendez-vous qui rythment la vie de l'église à Lubumbashi."
          bgImage="/priere.webp"
        />

        {/* ═══ MARATHON DE PRIÈRE ═══ */}
        <section id="marathon" className="border-b border-line px-4 py-16 md:py-24">
          <div className="mx-auto max-w-7xl">
            <RevealSection>
              <p className="section-label">{marathon.label}</p>
              <h2 className="section-title mt-4">{marathon.title}</h2>
              <div className="rule-accent mt-6" />
            </RevealSection>

            <div className="mt-10 grid gap-px bg-line lg:grid-cols-[minmax(0,400px)_1fr]">
              <RevealSection>
                <figure className="flex h-full items-center justify-center overflow-hidden">
                  <img
                    src={marathon.image}
                    alt={`Affiche officielle — ${marathon.title}, ${marathon.period}`}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </figure>
              </RevealSection>

              <RevealSection className="reveal-delay-1">
                <div className="flex h-full flex-col justify-between gap-10 bg-bg-card p-8">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-evangile-600">
                      {marathon.period}
                    </p>
                    <p className="person-role mt-6">{marathon.themeLabel}</p>
                    <p className="mt-2 font-serif text-xl italic leading-snug text-cream sm:text-2xl">
                      « {marathon.theme} »
                    </p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-evangile-600">
                      {marathon.reference}
                    </p>
                    <dl className="mt-8 grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="person-role">{marathon.hoursLabel}</dt>
                        <dd className="mt-2 text-sm leading-relaxed text-muted">{marathon.hours}</dd>
                      </div>
                      <div>
                        <dt className="person-role">{marathon.locationLabel}</dt>
                        <dd className="mt-2 text-sm leading-relaxed text-muted">{CHURCH.address.full}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => onNavigate('blog')} className="btn-primary">
                      {marathon.ctaPrimary} <ArrowRight className="h-4 w-4" />
                    </button>
                    <button onClick={() => onNavigate('contact')} className="btn-ghost">
                      {marathon.ctaSecondary}
                    </button>
                  </div>
                </div>
              </RevealSection>
            </div>
          </div>
        </section>

        {/* ═══ ORATEURS DU MARATHON ═══ */}
        {eventSpeakers.length > 0 && (
          <FeaturedSpeakers
            speakers={eventSpeakers}
            label={speakersLabel}
            title={speakersTitle}
            description={speakersDescription}
            onNavigate={onNavigate}
          />
        )}

        {/* ═══ ÉVÉNEMENTS (Supabase) ═══ */}
        <section className="px-4 py-16 md:py-24">
          <div className="mx-auto max-w-7xl">
            <RevealSection>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="section-label">{calendarLabel}</p>
                  <h2 className="section-title mt-4">{calendarTitle}</h2>
                </div>
                {showFilters && (
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <label htmlFor="events-search" className="sr-only">{searchPlaceholder}</label>
                    <input
                      id="events-search"
                      type="text"
                      placeholder={searchPlaceholder}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="input-surface w-full py-2.5 pl-10 pr-4 text-sm"
                    />
                  </div>
                )}
              </div>
              <div className="rule-accent mt-6" />

              {showFilters && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const isActive = activeCategory === cat || (activeCategory === null && cat === categories[0]);
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat === categories[0] ? null : cat)}
                        aria-pressed={isActive}
                        className={`border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                          isActive
                            ? 'border-evangile-600 bg-evangile-600 text-white'
                            : 'border-line text-muted hover:border-evangile-600 hover:text-evangile-600'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}
            </RevealSection>

            {error && (
              <div className="mt-8 border border-line bg-bg-card px-5 py-4 text-sm text-muted">{agendaError}</div>
            )}

            {loading ? (
              <div className="mt-10 grid gap-px bg-line sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-bg-card p-8">
                    <div className="h-3 w-20 bg-white/10" />
                    <div className="mt-4 h-6 w-2/3 bg-white/10" />
                    <div className="mt-3 h-3 w-full bg-white/5" />
                  </div>
                ))}
              </div>
            ) : upcoming.length > 0 ? (
              <div className="mt-10 space-y-6">
                {upcoming.map((event, i) => {
                  const { day, month } = formatDate(event.event_date);
                  const time = new Date(event.event_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                  const isFeatured = featured?.id === event.id;
                  return (
                    <RevealSection key={event.id} className={`reveal-delay-${(i % 3) + 1}`}>
                      <article className={`grid gap-px bg-line ${isFeatured ? 'lg:grid-cols-[280px_1fr]' : 'sm:grid-cols-[140px_1fr]'}`}>
                        <div className="relative flex flex-col justify-center overflow-hidden bg-bg-card p-6">
                          {isFeatured && event.image_url && (
                            <>
                              <img
                                src={event.image_url}
                                srcSet={imageSrcSet(event.image_url)}
                                sizes="(min-width: 1024px) 280px, 100vw"
                                alt=""
                                aria-hidden="true"
                                className="photo-claro-strong absolute inset-0 h-full w-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                              <div className="absolute inset-0 bg-bg/80" />
                            </>
                          )}
                          <span className="relative font-hero text-5xl leading-none text-cream">{day}</span>
                          <span className="relative mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-evangile-600">{month}</span>
                          {event.is_live && (
                            <span className="relative mt-3 inline-flex w-fit items-center gap-1.5 bg-evangile-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                              {liveBadge}
                            </span>
                          )}
                        </div>
                        <div className="bg-bg-card p-6 md:p-8">
                          <p className="section-eyebrow">{event.category}</p>
                          <h3 className="card-title mt-2">{event.title}</h3>
                          {event.description && (
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{event.description}</p>
                          )}
                          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
                            <span className="inline-flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-evangile-600" /> {time}
                            </span>
                            {event.location && (
                              <span className="inline-flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-evangile-600" /> {event.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    </RevealSection>
                  );
                })}
              </div>
            ) : (
              <RevealSection className="mt-10">
                <div className="border border-dashed border-line px-6 py-10 text-center">
                  <Calendar className="mx-auto h-8 w-8 text-muted/50" />
                  <p className="mt-4 text-sm leading-relaxed text-muted">
                    <span className="block">{emptyTitle}</span>
                    <span className="mt-1 block">{emptyText}</span>
                  </p>
                </div>
              </RevealSection>
            )}
          </div>
        </section>

        {/* ═══ CULTES HEBDOMADAIRES ═══ */}
        <section className="border-y border-line bg-bg-card px-4 py-16 md:py-24">
          <div className="mx-auto max-w-7xl">
            <RevealSection>
              <p className="section-label">{weeklyLabel}</p>
              <h2 className="section-title mt-4">{weeklyTitle}</h2>
              <div className="rule-accent mt-6" />
              <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">
                {weeklyDescription}
              </p>
            </RevealSection>

            <div className="mt-10 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
              {SERVICE_TIMES.map(({ day, service, time }, i) => (
                <RevealSection key={day} className={`reveal-delay-${(i % 4) + 1}`}>
                  <div className="h-full bg-bg-card p-6">
                    <span className="block h-1 w-10 bg-evangile-600" />
                    <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.24em] text-evangile-600">{day}</p>
                    <h3 className="card-title mt-3">{service}</h3>
                    <p className="mt-2 text-sm text-muted">{time}</p>
                  </div>
                </RevealSection>
              ))}
            </div>

            <RevealSection className="mt-8">
              <button onClick={() => onNavigate('activities')} className="btn-link">
                {weeklyCta} <ArrowRight className="h-4 w-4" />
              </button>
            </RevealSection>
          </div>
        </section>

        {/* ═══ RESTER EN LIEN ═══ */}
        <section className="px-4 py-16 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-px bg-line lg:grid-cols-2">
              <RevealSection>
                <div className="h-full bg-bg-card p-8 md:p-10">
                  <p className="section-eyebrow">{newsLabel}</p>
                  <h2 className="card-title mt-3 text-[1.75rem]">{newsTitle}</h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
                    {newsText}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <a href={CHURCH.social.facebook} target="_blank" rel="noopener noreferrer" className="btn-primary">
                      <Globe className="h-4 w-4" /> Facebook
                    </a>
                    <a href={`https://wa.me/${CHURCH.phone.href.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  </div>
                </div>
              </RevealSection>

              <RevealSection className="reveal-delay-1">
                <div className="h-full bg-bg-card p-8 md:p-10">
                  <p className="section-eyebrow">{joinLabel}</p>
                  <h2 className="card-title mt-3 text-[1.75rem]">{joinTitle}</h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
                    {joinText}{' '}
                    <a href={CHURCH.phone.href} className="font-semibold text-cream underline decoration-evangile-600 decoration-2 underline-offset-4">
                      {CHURCH.phone.display}
                    </a>.
                  </p>
                  <div className="mt-6">
                    <button onClick={() => onNavigate('contact')} className="btn-ghost">
                      {joinCta} <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </RevealSection>
            </div>
          </div>
        </section>
      </main>

      <div className="footer-spacer" />
      <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />
      <MobileNav onNavigate={onNavigate} active="events" />
    </div>
  );
}
