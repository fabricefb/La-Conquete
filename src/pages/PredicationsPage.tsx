import { useState, useEffect, useMemo } from 'react';
import { useReveal } from '../lib/hooks';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { Play, Clock, Search, Calendar, Headphones, Mic, ArrowRight, BookOpen, Filter } from '../lib/icons';
import type { Page } from '../lib/navigation';
import { UniversalHero } from '../components/UniversalHero';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface PredicationsPageProps {
  onNavigate: (page: Page) => void;
}

interface Sermon {
  id: string;
  title: string;
  preacher: string;
  date: string;
  series: string;
  duration: string;
  thumbnailUrl: string;
  videoUrl: string;
  description: string;
  isFeatured: boolean;
}

interface SermonSeries {
  id: string;
  title: string;
  description: string;
  count: number;
  coverUrl: string;
}

// ═══════════════════════════════════════════════════════════════════
// YOUTUBE API INTEGRATION
// To enable: Set VITE_YOUTUBE_API_KEY in .env
// Set VITE_YOUTUBE_CHANNEL_ID to your channel ID
// The fetchYoutubeSermons() function below will auto-populate
// ═══════════════════════════════════════════════════════════════════

// Placeholder: Replace with actual YouTube Data API v3 call
// GET https://www.googleapis.com/youtube/v3/search?part=snippet&channelId={VITE_YOUTUBE_CHANNEL_ID}&type=video&order=date&maxResults=12&key={VITE_YOUTUBE_API_KEY}

async function fetchYoutubeSermons(): Promise<Sermon[]> {
  // ─── YouTube Data API v3 Integration ─────────────────────────────
  // const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
  // const channelId = import.meta.env.VITE_YOUTUBE_CHANNEL_ID;
  //
  // if (apiKey && channelId) {
  //   const res = await fetch(
  //     `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=12&key=${apiKey}`
  //   );
  //   const data = await res.json();
  //   return (data.items ?? []).map((item: any) => ({
  //     id: item.id.videoId,
  //     title: item.snippet.title,
  //     preacher: '',
  //     date: item.snippet.publishedAt,
  //     series: '',
  //     duration: '',
  //     thumbnailUrl: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.medium?.url,
  //     videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  //     description: item.snippet.description,
  //     isFeatured: false,
  //   }));
  // }

  // Fallback: return empty (hardcoded data used below)
  return [];
}

// ═══════════════════════════════════════════════════════════════════
// HARDCODED SAMPLE DATA (fallback)
// ═══════════════════════════════════════════════════════════════════

const PREACHERS = [
  'Tous',
  'Pasteur Emmanuel Kayumba',
  'Pasteur Jean-Pierre Kalume',
  'Pasteur Marie Mwamba',
  'Ancien David Kibwe',
];

const SERIES_LIST = [
  'Toutes',
  'Marcher par la foi',
  'La puissance de la prière',
  'Vie de disciple',
  'Les fondements',
  'Renaissance spirituelle',
];

const SAMPLE_SERMONS: Sermon[] = [
  {
    id: 's-1',
    title: 'La foi qui déplace les montagnes',
    preacher: 'Pasteur Emmanuel Kayumba',
    date: '2025-01-12',
    series: 'Marcher par la foi',
    duration: '1h 15min',
    thumbnailUrl: '',
    videoUrl: '',
    description: 'Un enseignement puissant sur la nature de la foi et comment elle peut transformer les circonstances impossibles de votre vie.',
    isFeatured: true,
  },
  {
    id: 's-2',
    title: 'Les secrets d\'une prière efficace',
    preacher: 'Pasteur Jean-Pierre Kalume',
    date: '2025-01-08',
    series: 'La puissance de la prière',
    duration: '55min',
    thumbnailUrl: '',
    videoUrl: '',
    description: 'Découvrez les principes bibliques pour une vie de prière qui produit des résultats.',
    isFeatured: false,
  },
  {
    id: 's-3',
    title: 'L\'importance de la communion fraternelle',
    preacher: 'Pasteur Marie Mwamba',
    date: '2025-01-05',
    series: 'Vie de disciple',
    duration: '48min',
    thumbnailUrl: '',
    videoUrl: '',
    description: 'Pourquoi l\'église locale est essentielle pour la croissance spirituelle de chaque croyant.',
    isFeatured: false,
  },
  {
    id: 's-4',
    title: 'Le fondement de la grâce',
    preacher: 'Pasteur Emmanuel Kayumba',
    date: '2024-12-29',
    series: 'Les fondements',
    duration: '1h 05min',
    thumbnailUrl: '',
    videoUrl: '',
    description: 'Retour aux bases de la foi chrétienne : comprendre la grâce souveraine de Dieu.',
    isFeatured: false,
  },
  {
    id: 's-5',
    title: 'Renaître de nouveau en Christ',
    preacher: 'Ancien David Kibwe',
    date: '2024-12-22',
    series: 'Renaissance spirituelle',
    duration: '42min',
    thumbnailUrl: '',
    videoUrl: '',
    description: 'La nouvelle naissance : ce que cela signifie et comment vivre dans la nouveauté de vie.',
    isFeatured: false,
  },
  {
    id: 's-6',
    title: 'Persévérer dans la foi au milieu de l\'épreuve',
    preacher: 'Pasteur Jean-Pierre Kalume',
    date: '2024-12-15',
    series: 'Marcher par la foi',
    duration: '1h 10min',
    thumbnailUrl: '',
    videoUrl: '',
    description: 'Comment garder la foi quand tout va mal ? Un message d\'espérance et de persévérance.',
    isFeatured: false,
  },
  {
    id: 's-7',
    title: 'La personne du Saint-Esprit',
    preacher: 'Pasteur Emmanuel Kayumba',
    date: '2024-12-08',
    series: 'Les fondements',
    duration: '1h 20min',
    thumbnailUrl: '',
    videoUrl: '',
    description: 'Connaître le Saint-Esprit non pas comme une force, mais comme une Personne qui habite en nous.',
    isFeatured: false,
  },
  {
    id: 's-8',
    title: 'L\'armure de Dieu',
    preacher: 'Pasteur Marie Mwamba',
    date: '2024-12-01',
    series: 'Vie de disciple',
    duration: '58min',
    thumbnailUrl: '',
    videoUrl: '',
    description: 'Éphésiens 6 : comment revêtir l\'armure complète de Dieu pour tenir ferme face à l\'adversaire.',
    isFeatured: false,
  },
];

const SAMPLE_SERIES: SermonSeries[] = [
  { id: 'series-1', title: 'Marcher par la foi', description: 'Série sur la foi vivante et agissante', count: 4, coverUrl: '' },
  { id: 'series-2', title: 'La puissance de la prière', description: 'Enseignements sur la vie de prière', count: 3, coverUrl: '' },
  { id: 'series-3', title: 'Vie de disciple', description: 'La croissance spirituelle au quotidien', count: 5, coverUrl: '' },
  { id: 'series-4', title: 'Les fondements', description: 'Retour aux fondamentaux de la foi', count: 6, coverUrl: '' },
  { id: 'series-5', title: 'Renaissance spirituelle', description: 'Série sur la nouvelle naissance et le renouveau', count: 3, coverUrl: '' },
];

// ═══════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={`reveal ${visible ? 'in' : ''} ${className}`}>
      {children}
    </div>
  );
}

function VideoPlayerPlaceholder({ title, large = false }: { title: string; large?: boolean }) {
  const size = large ? 'h-20 w-20' : 'h-12 w-12';
  const iconSize = large ? 'h-8 w-8' : 'h-5 w-5';
  return (
    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 via-navy-900 to-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.08),transparent_70%)]" />
      <div className={`relative flex ${size} items-center justify-center rounded-full border-2 border-accent-400/40 bg-accent-400/10 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:border-accent-500/60 hover:bg-accent-400/20`}>
        <Play className={`ml-${large ? '1' : '0.5'} ${iconSize} text-accent-400`} />
      </div>
      <p className="absolute bottom-4 left-4 text-xs text-muted/60">{title}</p>
    </div>
  );
}

function SermonCard({ sermon }: { sermon: Sermon }) {
  return (
    <div className="glass rounded-3xl overflow-hidden flex flex-col transition-all duration-300 hover:scale-[1.02] group h-full">
      {/* Thumbnail with play overlay */}
      <div className="relative aspect-video overflow-hidden">
        {sermon.thumbnailUrl ? (
          <img src={sermon.thumbnailUrl} alt={sermon.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy-800 to-black">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.06),transparent_70%)]" />
          </div>
        )}
        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity group-hover:bg-black/40">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/50 bg-white/15 backdrop-blur-sm transition-transform group-hover:scale-110">
            <Play className="ml-0.5 h-6 w-6 text-white" />
          </div>
        </div>
        {/* Duration badge */}
        {sermon.duration && (
          <div className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
            {sermon.duration}
          </div>
        )}
      </div>
      {/* Info */}
      <div className="flex flex-col gap-2 p-5 flex-1">
        {sermon.series && (
          <span className="self-start rounded-full border border-accent-400/20 bg-accent-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent-400">
            {sermon.series}
          </span>
        )}
        <h3 className="font-serif text-lg font-semibold text-cream leading-snug">{sermon.title}</h3>
        <p className="text-sm text-muted line-clamp-2 flex-1">{sermon.description}</p>
        <div className="mt-2 flex items-center justify-between text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <Mic className="h-3.5 w-3.5 text-accent-400" />
            {sermon.preacher}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-accent-400" />
            {new Date(sermon.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
}

function SeriesCard({ series, onSelect }: { series: SermonSeries; onSelect: (s: string) => void }) {
  return (
    <button
      onClick={() => onSelect(series.title)}
      className="glass group flex w-64 shrink-0 flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.03] text-left"
    >
      {/* Cover */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {series.coverUrl ? (
          <img src={series.coverUrl} alt={series.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-600/10 via-navy-800 to-black">
            <BookOpen className="h-10 w-10 text-accent-400/30" />
          </div>
        )}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-accent-400">{series.count} prédications</span>
        </div>
      </div>
      {/* Info */}
      <div className="p-4">
        <h3 className="font-serif text-base font-semibold text-cream leading-snug">{series.title}</h3>
        <p className="mt-1 text-xs text-muted line-clamp-2">{series.description}</p>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════

export function PredicationsPage({ onNavigate }: PredicationsPageProps) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [sermons, setSermons] = useState<Sermon[]>(SAMPLE_SERMONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPreacher, setSelectedPreacher] = useState('Tous');
  const [selectedSeries, setSelectedSeries] = useState('Toutes');

  // ── Attempt YouTube fetch on mount ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const ytSermons = await fetchYoutubeSermons();
        if (!cancelled && ytSermons.length > 0) {
          setSermons(ytSermons);
        }
      } catch { /* keep sample data */ }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Filter sermons ──────────────────────────────────────────────
  const filteredSermons = useMemo(() => {
    return sermons.filter((s) => {
      if (selectedPreacher !== 'Tous' && s.preacher !== selectedPreacher) return false;
      if (selectedSeries !== 'Toutes' && s.series !== selectedSeries) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!s.title.toLowerCase().includes(q) && !s.preacher.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [sermons, selectedPreacher, selectedSeries, searchQuery]);

  const featured = sermons.find((s) => s.isFeatured) ?? sermons[0];
  const gridSermons = filteredSermons.filter((s) => s.id !== featured?.id);
  return (
    <div className="min-h-screen bg-bg text-cream font-sans">
      <SiteHeader onNavigate={onNavigate} activePage="predications" />

      {/* ─── HERO ─── */}
      <UniversalHero pageKey="predications" defaultBadge="Prédications" defaultTitle="Nos Prédications" defaultSubtitle="Retrouvez les enseignements bibliques, prédications et séries de notre église pour nourrir votre vie spirituelle." />

      {/* ─── FILTER BAR (sticky) ─── */}
      <section className="sticky top-16 z-30 border-b border-line bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une prédication..."
                className="input-surface w-full !rounded-full py-2 pl-10 pr-4 text-sm"
              />
            </div>
            {/* Preacher filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/50" />
              <select
                value={selectedPreacher}
                onChange={(e) => setSelectedPreacher(e.target.value)}
                className="input-surface appearance-none !rounded-full py-2 pl-10 pr-8 text-sm cursor-pointer"
              >
                {PREACHERS.map((p) => (
                  <option key={p} value={p} className="bg-navy-900 text-cream">{p}</option>
                ))}
              </select>
            </div>
            {/* Series filter */}
            <select
              value={selectedSeries}
              onChange={(e) => setSelectedSeries(e.target.value)}
              className="input-surface appearance-none !rounded-full py-2 px-4 text-sm cursor-pointer"
            >
              {SERIES_LIST.map((s) => (
                <option key={s} value={s} className="bg-navy-900 text-cream">{s}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ─── FEATURED SERMON ─── */}
      {featured && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="glass rounded-3xl overflow-hidden">
              <div className="grid lg:grid-cols-2">
                <VideoPlayerPlaceholder title={featured.title} large />
                <div className="flex flex-col justify-center p-8 lg:p-12">
                  <span className="mb-4 self-start rounded-full border border-accent-400/20 bg-accent-400/10 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent-400">
                    Prédication à la une
                  </span>
                  <h2 className="font-serif text-3xl font-semibold text-cream lg:text-4xl">{featured.title}</h2>
                  <p className="mt-4 text-muted leading-relaxed">{featured.description}</p>
                  <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted">
                    <span className="flex items-center gap-1.5">
                      <Mic className="h-4 w-4 text-accent-400" />
                      {featured.preacher}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-accent-400" />
                      {new Date(featured.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {featured.duration && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-accent-400" />
                        {featured.duration}
                      </span>
                    )}
                  </div>
                  {featured.series && (
                    <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-accent-400/20 bg-accent-400/10 px-3 py-1 text-xs font-medium text-accent-400">
                      <BookOpen className="h-3.5 w-3.5" />
                      Série : {featured.series}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </RevealSection>
        </section>
      )}

      {/* ─── SERMON GRID ─── */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <RevealSection>
          <h2 className="font-serif text-3xl font-semibold text-cream mb-8">Toutes les prédications</h2>
        </RevealSection>
        {gridSermons.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {gridSermons.map((sermon, i) => (
              <RevealSection key={sermon.id} className={`reveal-delay-${(i % 3) + 1}`}>
                <SermonCard sermon={sermon} />
              </RevealSection>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <Search className="mx-auto h-10 w-10 text-muted/30" />
            <p className="mt-4 text-lg font-serif font-semibold text-muted">Aucune prédication trouvée</p>
            <p className="mt-2 text-sm text-muted/60">Essayez d'ajuster vos filtres de recherche.</p>
          </div>
        )}
      </section>

      {/* ─── SERIES / COLLECTIONS ─── */}
      <section className="border-y border-line bg-navy-900/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <RevealSection>
            <h2 className="font-serif text-3xl font-semibold text-cream mb-8">Nos séries de prédications</h2>
          </RevealSection>
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-none">
            {SAMPLE_SERIES.map((series) => (
              <SeriesCard key={series.id} series={series} onSelect={setSelectedSeries} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── ÉCOUTER LES PLUS RÉCENTES ─── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif text-3xl font-semibold text-cream">Écouter les plus récentes</h2>
            <button onClick={() => onNavigate('media')} className="flex items-center gap-2 text-sm font-medium text-accent-400 transition-colors hover:text-accent-300">
              Voir tous les médias
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </RevealSection>
        <div className="space-y-3">
          {sermons.slice(0, 5).map((sermon, i) => (
            <RevealSection key={sermon.id} className={`reveal-delay-${Math.min(i + 1, 3)}`}>
              <div className="glass rounded-2xl flex items-center gap-4 p-4 transition-all duration-200 hover:bg-white/[0.03] group cursor-pointer">
                {/* Play button */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent-400/20 bg-accent-400/10 transition-all group-hover:border-accent-400/40 group-hover:bg-accent-400/20">
                  <Headphones className="h-5 w-5 text-accent-400" />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-base font-semibold text-cream truncate">{sermon.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted mt-0.5">
                    <span>{sermon.preacher}</span>
                    <span className="text-muted/40">·</span>
                    <span>{new Date(sermon.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
                {/* Duration */}
                {sermon.duration && (
                  <span className="shrink-0 text-sm text-muted">{sermon.duration}</span>
                )}
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />
      <MobileNav onNavigate={onNavigate} active="predications" />
    </div>
  );
}