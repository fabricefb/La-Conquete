import { useState, useEffect } from 'react';
import { useReveal } from '../lib/hooks';
import { db, buildContentMap, getContent } from '../lib/supabase';
import type { ChurchEvent } from '../types';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { formatDate } from '../lib/date';
import { Calendar, MapPin, BookOpen, Heart, Moon, Users, Send } from '../lib/icons';
import type { Page } from '../lib/navigation';

interface EventsPageProps { onNavigate: (page: Page) => void; }

const CATEGORIES = ['Tous', 'Cultes', 'Missions', 'Jeunesse', 'Communion'];

const weeklyServices = [
  { title: 'Étude Biblique', day: 'Mardi', time: '19h00', Icon: BookOpen },
  { title: 'Intercession', day: 'Jeudi', time: '18h30', Icon: Heart },
  { title: 'Veillée', day: 'Vendredi', time: '22h00', Icon: Moon },
  { title: 'Culte Dominical', day: 'Dimanche', time: '10h00', Icon: Users },
];

const FALLBACK_IMG = 'https://images.pexels.com/photos/2774557/pexels-photo-2774557.jpeg?auto=compress&cs=tinysrgb&w=800';

function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal();
  return <div ref={ref} className={`reveal ${visible ? 'in' : ''} ${className}`}>{children}</div>;
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

  const featured = filtered.find((e) => e.is_featured);
  const regular = filtered.filter((e) => !e.is_featured);

  const heroTitle = getContent(contentMap, 'hero', 'title', 'Agenda');
  const heroSubtitle = getContent(contentMap, 'hero', 'subtitle', 'Retrouvez tous nos événements, cultes et rassemblements.');

  return (
    <div className="min-h-screen bg-bg text-cream">
      <SiteHeader onNavigate={onNavigate} activePage="events" theme={colorMode} onToggleTheme={toggleColorMode} />

      {/* HERO */}
      <section className="relative flex min-h-[40vh] items-center justify-center overflow-hidden pt-16 bg-radial-gold">
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-20 text-center">
          <RevealSection>
            <p className="section-label justify-center">{getContent(contentMap, 'hero', 'badge', 'Calendrier')}</p>
            <h1 className="mt-4 font-serif text-5xl font-semibold text-cream sm:text-6xl">{heroTitle}</h1>
            <p className="mt-6 text-lg text-muted">{heroSubtitle}</p>
          </RevealSection>
        </div>
      </section>

      {/* FILTERS */}
      <section className="sticky top-16 z-30 border-b border-line bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${activeCategory === cat ? 'bg-gradient-to-r from-gold-300 to-gold-500 text-black' : 'border border-line text-muted hover:border-gold-400/40 hover:text-cream'}`}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="relative">
              <input type="text" placeholder="Rechercher un événement…" value={search} onChange={(e) => setSearch(e.target.value)} className="input-surface w-full py-2 pl-4 pr-4 text-sm sm:w-64" />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {error && (
          <RevealSection className="mb-10">
            <div className="rounded-2xl border border-ember-500/20 bg-ember-500/10 p-6 text-center text-muted">{error}</div>
          </RevealSection>
        )}

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-3xl overflow-hidden animate-pulse">
                <div className="h-48 bg-white/5" />
                <div className="p-6 space-y-3"><div className="h-3 rounded-full bg-white/5 w-1/3" /><div className="h-5 rounded-full bg-white/5 w-2/3" /><div className="h-3 rounded-full bg-white/5 w-full" /></div>
              </div>
            ))}
          </div>
        ) : !error && (
          <>
            {featured && (
              <RevealSection className="mb-12">
                <div className="relative overflow-hidden rounded-4xl">
                  <img src={featured.image_url || FALLBACK_IMG} alt={featured.title} className="h-96 w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className="rounded-full bg-gold-400 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-black">À la une</span>
                      {featured.is_live && (
                        <span className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live
                        </span>
                      )}
                      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/80">{featured.category}</span>
                    </div>
                    <h2 className="font-serif text-3xl font-semibold text-white sm:text-4xl">{featured.title}</h2>
                    <p className="mt-2 text-white/70 max-w-xl line-clamp-2">{featured.description}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/60">
                      <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formatDate(featured.event_date).full}</span>
                      {featured.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{featured.location}</span>}
                    </div>
                  </div>
                </div>
              </RevealSection>
            )}

            {regular.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-16">
                {regular.map((event, i) => {
                  const { day, month } = formatDate(event.event_date);
                  return (
                    <RevealSection key={event.id} className={`reveal-delay-${(i % 3) + 1}`}>
                      <div className="glass rounded-3xl overflow-hidden h-full flex flex-col transition-all duration-300 hover:scale-[1.02]">
                        <div className="relative h-48 overflow-hidden">
                          <img src={event.image_url || FALLBACK_IMG} alt={event.title} className="h-full w-full object-cover transition-transform duration-700 hover:scale-110" />
                          <div className="absolute top-3 left-3 flex flex-col items-center justify-center w-12 h-14 rounded-xl bg-black/70 backdrop-blur-sm text-center">
                            <span className="text-xl font-bold text-gold-400 leading-none">{day}</span>
                            <span className="text-[9px] uppercase tracking-widest text-white/70">{month}</span>
                          </div>
                          {event.is_live && (
                            <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col flex-1 p-5">
                          <span className="mb-2 self-start rounded-full border border-gold-400/20 bg-gold-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-gold-400">{event.category}</span>
                          <h3 className="font-serif text-lg font-semibold text-cream flex-1">{event.title}</h3>
                          <p className="mt-1 text-sm text-muted line-clamp-2">{event.description}</p>
                          {event.location && (
                            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />{event.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </RevealSection>
                  );
                })}
              </div>
            )}

            {filtered.length === 0 && (
              <div className="py-20 text-center text-muted">
                <Calendar className="mx-auto mb-4 h-10 w-10 opacity-40" />
                <p>Aucun événement trouvé.</p>
              </div>
            )}
          </>
        )}

        {/* WEEKLY SERVICES */}
        <RevealSection className="mb-16">
          <div className="mb-10 text-center">
            <p className="section-label justify-center">Chaque semaine</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold text-cream">Cultes hebdomadaires</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {weeklyServices.map(({ title, day, time, Icon }) => (
              <div key={title} className="glass rounded-3xl p-6 bg-radial-gold text-center transition-all duration-300 hover:scale-105">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-gold-400/20 text-gold-400"><Icon className="h-5 w-5" /></div>
                <h3 className="font-serif text-lg font-semibold text-cream">{title}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-gold-400">{day}</p>
                <p className="mt-1 text-sm text-muted">{time}</p>
              </div>
            ))}
          </div>
        </RevealSection>

        {/* NEWSLETTER */}
        <RevealSection>
          <div className="glass rounded-4xl p-10 bg-radial-gold text-center">
            <p className="section-label justify-center">Restez informé</p>
            <h2 className="mt-4 font-serif text-3xl font-semibold text-cream">Ne manquez aucun événement</h2>
            <p className="mt-3 text-muted">Abonnez-vous à notre newsletter pour recevoir les dernières nouvelles.</p>
            <form onSubmit={(e) => { e.preventDefault(); setEmail(''); }} className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <input type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-surface w-full px-5 py-3 text-sm sm:w-80" />
              <button type="submit" className="btn-gold shrink-0"><Send className="h-4 w-4" /> S'abonner</button>
            </form>
          </div>
        </RevealSection>
      </div>

      <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />
      <MobileNav onNavigate={onNavigate} active="events" theme={colorMode} onToggleTheme={toggleColorMode} />
    </div>
  );
}