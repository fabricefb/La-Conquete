import { useState, useEffect } from 'react';
import { db, buildContentMap, getContent } from '../lib/supabase';
import type { ChurchEvent } from '../types';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { formatDate } from '../lib/date';
import { Calendar, MapPin, BookOpen, Heart, Sun, Music, GraduationCap, Star, Search } from '../lib/icons';
import { IconBox } from '../components/IconBox';
import { EvtReveal } from '../components/EvtReveal';
import type { Page } from '../lib/navigation';

interface EventsPageProps { onNavigate: (page: Page) => void; }

const CATEGORIES = ['Tous', 'Cultes', 'Missions', 'Jeunesse', 'Communion', 'Formation', 'Évangélisation', 'Spécial', 'Autre'] as const;
const CAT_LABELS: Record<string, string> = {
  'Tous': 'Tous', 'Cultes': 'Cultes', 'Missions': 'Missions', 'Jeunesse': 'Jeunesse',
  'Communion': 'Communion', 'Formation': 'Formation', 'Évangélisation': 'Évangélisation',
  'Spécial': 'Spécial', 'Autre': 'Autre',
};

const weeklyServices = [
  { title: 'Culte de Louange et Adoration', day: 'Dimanche', time: '08h00 – 10h45', Icon: Sun, desc: 'Culte principal de la semaine' },
  { title: 'Réunion des Mamans', day: 'Lundi', time: '17h00', Icon: Heart, desc: 'Département des femmes' },
  { title: "Culte d'Enseignement", day: 'Mercredi', time: 'À confirmer', Icon: BookOpen, desc: 'Département des Hommes Adultes' },
  { title: 'Culte de Jeunesse et Prière', day: 'Vendredi', time: 'À confirmer', Icon: Music, desc: '' },
  { title: 'Génération Espoir', day: 'Samedi', time: 'À confirmer', Icon: Star, desc: 'Département de la Jeunesse' },
  { title: 'Dévotion Matinale', day: 'Lun – Ven', time: '06h00 – 08h00', Icon: GraduationCap, desc: 'Chaque jour de la semaine' },
];

const FALLBACK_IMG = 'https://images.pexels.com/photos/2774557/pexels-photo-2774557.jpeg?auto=compress&cs=tinysrgb&w=800';

/* ─── Material Symbol wrapper ─── */
function MS({ children, className = '' }: { children: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

/* ─── Category badge label ─── */
function catBadge(cat: string, isLive: boolean) {
  if (isLive) return 'LIVE BROADCAST';
  const map: Record<string, string> = { Cultes: 'WORSHIP', Missions: 'SPECIAL EVENT', Jeunesse: 'YOUTH FOCUS', Communion: 'COMMUNION' };
  return map[cat] || 'EVENT';
}

/* ─── Category badge color ─── */
function catBadgeColor(cat: string) {
  return cat === 'Missions' ? 'bg-accent-500' : 'bg-ink-700';
}

/* ─── Button color ─── */
function ctaBtnClass(cat: string) {
  return cat === 'Missions' ? 'bg-accent-500 hover:opacity-90' : 'bg-ink-700 hover:bg-ink-600';
}

export function EventsPage({ onNavigate }: EventsPageProps) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [search, setSearch] = useState('');
  const [email, setEmail] = useState('');
  const [contentMap, setContentMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [evts, contents] = await Promise.all([
          db.getEvents(),
          db.getPageContents('events'),
        ]);
        if (cancelled) return;
        setEvents(evts);
        setContentMap(buildContentMap(contents));
      } catch {
        setError('Impossible de charger les événements.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = events.filter((e) => {
    const matchCat = activeCategory === 'Tous' || e.category === activeCategory;
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const upcoming = [...filtered]
    .filter((e) => new Date(e.event_date) >= new Date())
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

  // Bento preview data (next 3 upcoming or fallback)
  const bentoEvents = upcoming.length >= 3 ? upcoming.slice(0, 3) : upcoming.length >= 2 ? upcoming.slice(0, 2) : upcoming;
  const nextSunday = upcoming.find((e) => {
    const d = new Date(e.event_date);
    return d.getDay() === 0;
  }) || upcoming[0];

  const heroTitle = getContent(contentMap, 'hero', 'title', 'Événements de la Saison de Conquête');
  const heroSubtitle = getContent(contentMap, 'hero', 'subtitle', 'Rejoignez notre communauté dynamique pour des moments de transformation, de prière et de communion fraternelle à Lubumbashi et dans toutes nos extensions.');

  return (
    <div className="min-h-screen bg-bg text-cream font-sans">
      <SiteHeader onNavigate={onNavigate} activePage="events" />

      <main className="min-h-screen">
        {/* ═══════ HERO — Bento Calendar Overview ═══════ */}
        <section className="relative py-xl overflow-hidden bg-ink-700 text-white">
          {/* Subtle decorative radial */}
          <div className="absolute inset-0 bg-radial-primary opacity-40" />
          <div className="relative z-10 px-margin-mobile md:px-margin-desktop max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left — Text */}
            <EvtReveal>
              <span className="inline-block px-3 py-1 bg-evangile-600 rounded text-[12px] font-bold tracking-widest uppercase mb-4">
                {getContent(contentMap, 'hero', 'badge', 'Agenda Spirituel')}
              </span>
              <h1 className="font-playfair text-headline-xl mb-6">{heroTitle}</h1>
              <p className="text-body-lg text-sky-100 max-w-xl mb-8 leading-relaxed">{heroSubtitle}</p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-white/80">
                  <MS className="text-accent-500 text-[20px]">location_on</MS>
                  <span className="font-be-vn text-label-lg uppercase tracking-wide">Lubumbashi Main Campus</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <MS className="text-accent-500 text-[20px]">schedule</MS>
                  <span className="font-be-vn text-label-lg uppercase tracking-wide">Horaires GMT+2</span>
                </div>
              </div>
            </EvtReveal>

            {/* Right — Bento grid */}
            <EvtReveal delay={2}>
              <div className="grid grid-cols-2 gap-4">
                {/* Bento card 1 */}
                {bentoEvents[0] && (() => {
                  const { day, month } = formatDate(bentoEvents[0].event_date);
                  return (
                    <div className="glass-card p-6 rounded-xl flex flex-col justify-between aspect-square">
                      <span className="text-headline-xl font-bold text-accent-500 font-playfair">{day}</span>
                      <div>
                        <p className="font-bold uppercase tracking-widest text-[12px] text-sky-100">{month}</p>
                        <p className="font-playfair text-headline-md text-white/90 mt-1 line-clamp-2">{bentoEvents[0].title}</p>
                      </div>
                    </div>
                  );
                })()}
                {/* Bento card 2 — solid accent */}
                {bentoEvents[1] && (() => {
                  const { day, month } = formatDate(bentoEvents[1].event_date);
                  return (
                    <div className="bg-evangile-600 p-6 rounded-xl flex flex-col justify-between aspect-square shadow-xl shadow-accent-500/20">
                      <span className="text-headline-xl font-bold text-white font-playfair">{day}</span>
                      <div>
                        <p className="font-bold uppercase tracking-widest text-[12px] text-white/80">{month}</p>
                        <p className="font-playfair text-headline-md text-white mt-1 line-clamp-2">{bentoEvents[1].title}</p>
                      </div>
                    </div>
                  );
                })()}
                {/* Bento card 3 — Next service bar */}
                <div className="col-span-2 glass-card p-6 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-ink-700 flex items-center justify-center shrink-0">
                      <MS className="text-white text-[24px]">celebration</MS>
                    </div>
                    <div>
                      <p className="font-be-vn text-label-lg text-accent-500 uppercase">Prochain Culte</p>
                      <p className="font-playfair text-headline-md text-white/90">
                        {nextSunday ? nextSunday.title : 'Culte de Célébration'}
                      </p>
                    </div>
                  </div>
                  <span className="text-accent-500 font-bold font-be-vn text-label-lg hidden sm:block">
                    {nextSunday
                      ? new Date(nextSunday.event_date).toLocaleDateString('fr-FR', { weekday: 'short' }).toUpperCase() + ' ' + formatDate(nextSunday.event_date).day + ':00'
                      : 'DIM 09:00'}
                  </span>
                </div>
              </div>
            </EvtReveal>
          </div>
        </section>

        {/* ═══════ FILTERS — Sticky ═══════ */}
        <section className="py-4 md:py-5 bg-bg border-b border-line sticky top-16 z-40">
          <div className="px-margin-mobile md:px-margin-desktop max-w-8xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2 rounded-full font-be-vn text-label-lg uppercase tracking-wide transition-all duration-200 active:scale-95 ${
                    activeCategory === cat
                      ? 'bg-evangile-600 text-white shadow-lg shadow-accent-500/20'
                      : 'bg-bg-elevated text-muted hover:bg-bg-card-hover'
                  }`}>
                  {CAT_LABELS[cat] || cat}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted" />
              <input type="text" placeholder="Rechercher un événement..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-surface w-full py-3 pl-11 pr-4 text-sm !rounded-lg" />
            </div>
          </div>
        </section>

        {/* ═══════ EVENT LIST ═══════ */}
        <section className="py-10 md:py-16 px-margin-mobile md:px-margin-desktop max-w-8xl mx-auto">
          {error && (
            <div className="mb-10 rounded-xl border border-ember-500/20 bg-ember-500/10 p-6 text-center text-muted">{error}</div>
          )}

          {loading ? (
            <div className="space-y-gutter">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl overflow-hidden flex flex-col lg:flex-row bg-bg-elevated">
                  <div className="lg:w-1/3 h-64 lg:h-auto bg-white/5" />
                  <div className="lg:w-2/3 p-8 space-y-4">
                    <div className="h-4 rounded bg-white/5 w-1/4" />
                    <div className="h-6 rounded bg-white/5 w-2/3" />
                    <div className="h-3 rounded bg-white/5 w-full" />
                    <div className="h-3 rounded bg-white/5 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : !error && (
            <>
              {/* Featured event — full-width horizontal card */}
              {(() => {
                const feat = filtered.find((e) => e.is_featured) || upcoming[0];
                if (!feat) return null;
                const { day, month } = formatDate(feat.event_date);
                return (
                  <EvtReveal className="mb-8">
                    <div className="group rounded-xl overflow-hidden border border-line hover:border-accent-400/50 transition-all duration-300 flex flex-col lg:flex-row items-stretch bg-bg-elevated shadow-sm hover:shadow-xl hover:shadow-accent-500/5">
                      <div className="lg:w-1/3 relative h-64 lg:h-auto overflow-hidden">
                        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                          style={{ backgroundImage: `url(${feat.image_url || FALLBACK_IMG})` }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-black/10" />
                        <div className={`absolute top-4 left-4 px-3 py-1 ${feat.is_live ? 'bg-evangile-600 animate-pulse' : catBadgeColor(feat.category)} text-white font-be-vn text-[12px] font-bold uppercase tracking-wider rounded`}>
                          {feat.is_live ? (
                            <span className="flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              {catBadge(feat.category, true)}
                            </span>
                          ) : catBadge(feat.category, false)}
                        </div>
                      </div>
                      <div className="lg:w-2/3 p-6 md:p-8 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-4 mb-3">
                            <div className="px-4 py-2 rounded-lg bg-bg-card text-accent-500 font-bold text-headline-md font-playfair flex flex-col items-center leading-tight">
                              <span>{day}</span>
                              <span className="text-[11px] font-be-vn -mt-0.5 uppercase tracking-widest text-muted">{month}</span>
                            </div>
                            <div>
                              <h2 className="font-playfair text-2xl md:text-3xl font-bold text-cream leading-tight">{feat.title}</h2>
                              <p className="text-accent-500 font-be-vn text-label-lg uppercase tracking-wider mt-0.5">
                                {feat.is_featured ? 'Événement à la une' : feat.category}
                              </p>
                            </div>
                          </div>
                          <p className="text-muted leading-relaxed line-clamp-2">{feat.description}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-line mt-6 pt-5">
                          <div className="flex flex-wrap gap-5 text-muted">
                            <span className="flex items-center gap-2 text-sm">
                              <MS className="text-accent-500 text-[18px]">schedule</MS>
                              <span className="font-be-vn">{new Date(feat.event_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} – 11:30</span>
                            </span>
                            {feat.location && (
                              <span className="flex items-center gap-2 text-sm">
                                <MS className="text-accent-500 text-[18px]">location_on</MS>
                                <span className="font-be-vn">{feat.location}</span>
                              </span>
                            )}
                          </div>
                          <button className={`w-full sm:w-auto px-7 py-3 text-white rounded-lg font-be-vn text-label-lg uppercase tracking-wide transition-all duration-200 active:scale-95 ${feat.is_featured ? 'bg-evangile-600 hover:opacity-90' : ctaBtnClass(feat.category)}`}>
                            {feat.is_live ? 'Rejoindre le Live' : 'Rejoindre'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </EvtReveal>
                );
              })()}

              {/* Regular events — horizontal cards */}
              {upcoming.filter((e) => e !== (filtered.find((e) => e.is_featured) || upcoming[0])).length > 0 ? (
                <div className="space-y-gutter">
                  {upcoming
                    .filter((e) => e !== (filtered.find((e) => e.is_featured) || upcoming[0]))
                    .map((event, i) => {
                      const { day, month } = formatDate(event.event_date);
                      return (
                        <EvtReveal key={event.id} delay={Math.min((i % 4) + 1, 4) as 1|2|3|4}>
                          <div className="group rounded-xl overflow-hidden border border-line hover:border-accent-400/50 transition-all duration-300 flex flex-col lg:flex-row items-stretch bg-bg-elevated shadow-sm hover:shadow-xl hover:shadow-accent-500/5">
                            {/* Image */}
                            <div className="lg:w-1/3 relative h-64 lg:h-auto overflow-hidden">
                              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                style={{ backgroundImage: `url(${event.image_url || FALLBACK_IMG})` }} />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-black/10" />
                              <div className={`absolute top-4 left-4 px-3 py-1 ${catBadgeColor(event.category)} text-white font-be-vn text-[12px] font-bold uppercase tracking-wider rounded`}>
                                {catBadge(event.category, event.is_live)}
                              </div>
                            </div>
                            {/* Content */}
                            <div className="lg:w-2/3 p-6 md:p-8 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center gap-4 mb-3">
                                  <div className="px-4 py-2 rounded-lg bg-bg-card text-accent-500 font-bold text-headline-md font-playfair flex flex-col items-center leading-tight">
                                    <span>{day}</span>
                                    <span className="text-[11px] font-be-vn -mt-0.5 uppercase tracking-widest text-muted">{month}</span>
                                  </div>
                                  <div>
                                    <h3 className="font-playfair text-xl md:text-2xl font-bold text-cream leading-tight">{event.title}</h3>
                                    <p className="text-accent-500 font-be-vn text-label-lg uppercase tracking-wider mt-0.5">{event.category}</p>
                                  </div>
                                </div>
                                <p className="text-muted leading-relaxed line-clamp-2">{event.description}</p>
                              </div>
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-line mt-6 pt-5">
                                <div className="flex flex-wrap gap-5 text-muted">
                                  <span className="flex items-center gap-2 text-sm">
                                    <MS className="text-accent-500 text-[18px]">schedule</MS>
                                    <span className="font-be-vn">{new Date(event.event_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </span>
                                  {event.location && (
                                    <span className="flex items-center gap-2 text-sm">
                                      <MS className="text-accent-500 text-[18px]">location_on</MS>
                                      <span className="font-be-vn">{event.location}</span>
                                    </span>
                                  )}
                                </div>
                                <button className={`w-full sm:w-auto px-7 py-3 text-white rounded-lg font-be-vn text-label-lg uppercase tracking-wide transition-all duration-200 active:scale-95 ${ctaBtnClass(event.category)}`}>
                                  {event.is_live ? 'Rejoindre le Live' : event.category === 'Missions' ? "S'inscrire" : 'Rejoindre'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </EvtReveal>
                      );
                    })}
                </div>
              ) : upcoming.length <= 1 && !loading && (
                /* Past events as smaller grid if no upcoming */
                filtered.length > 1 ? (
                  <div className="grid gap-gutter sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.slice(1).map((event, i) => {
                      const { day, month } = formatDate(event.event_date);
                      return (
                        <EvtReveal key={event.id} delay={Math.min((i % 3) + 1, 3) as 1|2|3}>
                          <div className="glass card-parallax rounded-2xl overflow-hidden flex flex-col h-full">
                            <div className="relative h-48 overflow-hidden">
                              <img src={event.image_url || FALLBACK_IMG} alt={event.title} className="h-full w-full object-cover transition-transform duration-700 hover:scale-110" />
                              <div className="absolute top-3 left-3 flex flex-col items-center justify-center w-12 h-14 rounded-lg bg-black/70 backdrop-blur-sm text-center">
                                <span className="text-xl font-bold text-accent-400 font-playfair leading-none">{day}</span>
                                <span className="text-[9px] uppercase tracking-widest text-white/70">{month}</span>
                              </div>
                            </div>
                            <div className="flex flex-col flex-1 p-5">
                              <span className="mb-2 self-start rounded-full border border-accent-400/20 bg-accent-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent-400">{event.category}</span>
                              <h3 className="font-playfair text-lg font-semibold text-cream flex-1">{event.title}</h3>
                              <p className="mt-1 text-sm text-muted line-clamp-2">{event.description}</p>
                              {event.location && (
                                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />{event.location}
                                </div>
                              )}
                            </div>
                          </div>
                        </EvtReveal>
                      );
                    })}
                  </div>
                ) : null
              )}

              {filtered.length === 0 && (
                <div className="py-20 text-center text-muted">
                  <Calendar className="mx-auto mb-4 h-10 w-10 opacity-40" />
                  <p className="font-be-vn">Aucun événement trouvé.</p>
                </div>
              )}
            </>
          )}

          {/* ═══════ WEEKLY SERVICES ═══════ */}
          <EvtReveal className="mt-16 md:mt-24">
            <div className="mb-10 text-center">
              <p className="section-label justify-center">Chaque semaine</p>
              <h2 className="mt-4 font-playfair text-3xl md:text-4xl font-bold text-cream">Cultes hebdomadaires</h2>
              <p className="mt-3 text-muted max-w-xl mx-auto font-be-vn">Des rendez-vous réguliers pour grandir dans la foi et la communion fraternelle.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {weeklyServices.map(({ title, day, time, Icon, desc }, i) => (
                <EvtReveal key={title} delay={Math.min((i % 3) + 1, 3) as 1|2|3}>
                  <div className="glass rounded-2xl p-6 text-center transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:shadow-accent-500/5 group h-full">
                    <IconBox pageKey="events" elementId={`service-icon-${i}`} className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-accent-400/20 bg-accent-400/5 text-accent-500 transition-colors group-hover:bg-accent-500 group-hover:text-white group-hover:border-accent-500">
                      <Icon className="h-5 w-5" />
                    </IconBox>
                    <h3 className="font-playfair text-lg font-semibold text-cream">{title}</h3>
                    <p className="mt-1 text-xs font-bold uppercase tracking-widest text-accent-500 font-be-vn">{day}</p>
                    <p className="mt-1 text-sm text-muted font-be-vn">{time}</p>
                    {desc && <p className="mt-2 text-xs text-muted/60 font-be-vn">{desc}</p>}
                  </div>
                </EvtReveal>
              ))}
            </div>
          </EvtReveal>

          {/* ═══════ NEWSLETTER ═══════ */}
          <EvtReveal className="mt-16 md:mt-24">
            <div className="glass rounded-2xl p-8 md:p-12 bg-radial-primary text-center">
              <MS className="text-accent-500 text-[40px] mb-4">mail</MS>
              <h2 className="mt-2 font-playfair text-2xl md:text-3xl font-bold text-cream">Ne Manquez Aucun Moment de Bénédiction</h2>
              <p className="mt-3 text-muted max-w-2xl mx-auto font-be-vn">
                Recevez les dernières mises à jour sur nos événements, séminaires et cultes directement dans votre boîte mail.
              </p>
              <form onSubmit={(e) => { e.preventDefault(); setEmail(''); }}
                className="mt-8 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                <input type="email" placeholder="Votre adresse e-mail" value={email}
                  onChange={(e) => setEmail(e.target.value)} required
                  className="input-surface flex-grow px-5 py-4 text-sm !rounded-lg" />
                <button type="submit" className="btn-gold shrink-0 !rounded-lg !px-8 !py-4">
                  S'abonner
                </button>
              </form>
            </div>
          </EvtReveal>
        </section>
      </main>

      <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />
      <MobileNav onNavigate={onNavigate} active="events" />
    </div>
  );
}