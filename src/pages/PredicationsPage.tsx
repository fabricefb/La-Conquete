import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase, db, isSupabaseConfigured, buildSettingsMap } from '../lib/supabase';
import { useReveal } from '../lib/hooks';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { UniversalHero } from '../components/UniversalHero';
import { YOUTUBE_CHANNEL } from '../lib/teachings';
import { useLiveTeachings } from '../lib/liveTeachings';
import { CHURCH } from '../lib/church';
import { featuredSocialLinks } from '../lib/socials';
import { imageSrcSet } from '../lib/images';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Church,
  Facebook,
  Headphones,
  Loader2,
  Mic,
  Play,
  Search,
  X,
  Youtube,
} from '../lib/icons';
import type { Page } from '../lib/navigation';

/* ═══════════════════════════════════════════════════════════════════
   PRÉDICATIONS — flux unique
   Archives de l'église (Supabase) + publications réelles de la chaîne
   YouTube. Toute lecture se fait sur la plateforme d'origine.
   ═══════════════════════════════════════════════════════════════════ */

interface PredicationsPageProps {
  onNavigate: (page: Page) => void;
}

type FeedSource = 'eglise' | 'youtube';
type SourceFilter = 'all' | FeedSource;

interface FeedItem {
  id: string;
  title: string;
  preacher: string;
  date: string;
  series: string;
  kind: string;
  duration: string;
  thumbnail: string;
  videoUrl: string;
  audioUrl: string;
  description: string;
  isFeatured: boolean;
  source: FeedSource;
}

const SOURCE_LABEL: Record<FeedSource, string> = {
  eglise: 'Église',
  youtube: 'YouTube',
};

const PAGE_SIZE = 12;

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function classifyTeaching(title: string): string {
  const value = normalize(title);
  if (/(jeune|priere|marathon)/.test(value)) return 'Prière';
  if (value.includes('culte')) return 'Culte';
  if (value.includes('alpha')) return 'Alpha';
  return 'Enseignement';
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string, long = false): string {
  const date = parseDate(value);
  if (!date) return '';
  return date
    .toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: long ? 'long' : 'short',
      year: 'numeric',
    })
    .replace('.', '');
}

function youTubeId(url: string): string {
  return url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/)?.[1] ?? '';
}

const MONTHS_LONG = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDateFilter(value: string): string {
  if (!value) return 'Toutes les dates';
  const [year, month, day] = value.split('-');
  if (!month) return year;
  const label = `${MONTHS_LONG[Number(month) - 1]} ${year}`;
  return day ? `${Number(day)} ${label}` : label;
}

function matchesQuery(item: FeedItem, query: string): boolean {
  if (!query) return true;
  const haystack = normalize(
    `${item.title} ${item.kind} ${item.preacher} ${item.series} ${item.description} ${item.date} ${formatDate(item.date, true)}`,
  );
  return haystack.includes(query);
}

interface DateFilterProps {
  items: FeedItem[];
  value: string;
  onChange: (value: string) => void;
}

function DateFilter({ items, value, onChange }: DateFilterProps) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number(value.slice(0, 4)) || new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(() =>
    value.length >= 7 ? Number(value.slice(5, 7)) - 1 : null,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => {
    const years = new Map<string, number>();
    const months = Array.from({ length: 12 }, () => 0);
    const days = new Map<number, number>();
    const yearKey = String(year);
    const monthKey = month !== null ? `${yearKey}-${pad2(month + 1)}` : '';

    for (const item of items) {
      const itemYear = item.date.slice(0, 4);
      if (!/^\d{4}$/.test(itemYear)) continue;
      years.set(itemYear, (years.get(itemYear) ?? 0) + 1);
      if (itemYear !== yearKey) continue;

      const itemMonth = Number(item.date.slice(5, 7)) - 1;
      if (itemMonth >= 0 && itemMonth < 12) months[itemMonth] += 1;

      if (monthKey && item.date.startsWith(monthKey)) {
        const itemDay = Number(item.date.slice(8, 10));
        if (itemDay >= 1 && itemDay <= 31) days.set(itemDay, (days.get(itemDay) ?? 0) + 1);
      }
    }

    return { years, months, days };
  }, [items, year, month]);

  const yearList = useMemo(
    () => Array.from(counts.years.keys()).sort((a, b) => b.localeCompare(a)),
    [counts.years],
  );
  const yearIndex = yearList.indexOf(String(year));
  const yearTotal = counts.years.get(String(year)) ?? 0;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const toggleOpen = () => {
    if (!open) {
      const selectedYear = Number(value.slice(0, 4));
      setYear(selectedYear || (yearList[0] ? Number(yearList[0]) : new Date().getFullYear()));
      setMonth(value.length >= 7 ? Number(value.slice(5, 7)) - 1 : null);
    }
    setOpen(!open);
  };

  const shiftYear = (direction: -1 | 1) => {
    const next = yearList[yearIndex - direction];
    if (!next) return;
    setYear(Number(next));
    setMonth(null);
  };

  const selectMonth = (index: number) => {
    setMonth(index);
    onChange(`${year}-${pad2(index + 1)}`);
  };

  const daysInMonth = month !== null ? new Date(year, month + 1, 0).getDate() : 0;
  const firstOffset = month !== null ? (new Date(year, month, 1).getDay() + 6) % 7 : 0;
  const olderDisabled = yearIndex === -1 || yearIndex >= yearList.length - 1;
  const newerDisabled = yearIndex <= 0;

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1 sm:flex-none">
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`input-surface flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm sm:w-auto ${
          value ? 'font-medium' : 'text-muted'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Calendar className={`h-4 w-4 shrink-0 ${value ? 'text-evangile-500' : 'text-muted/60'}`} />
          <span className="truncate">{formatDateFilter(value)}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted/60 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Filtrer par date"
          className="absolute left-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] border border-line bg-bg-card p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)]"
        >
          {month === null ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => shiftYear(-1)}
                  disabled={olderDisabled}
                  aria-label="Année précédente"
                  className="flex h-8 w-8 items-center justify-center border border-line text-muted transition-colors hover:border-evangile-600/50 hover:text-evangile-500 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <p className="font-hero text-lg uppercase leading-none tracking-[0.08em] text-cream">{year}</p>
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
                    {yearTotal} vidéo{yearTotal > 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => shiftYear(1)}
                  disabled={newerDisabled}
                  aria-label="Année suivante"
                  className="flex h-8 w-8 items-center justify-center border border-line text-muted transition-colors hover:border-evangile-600/50 hover:text-evangile-500 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {yearList.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted">Aucune vidéo pour ces filtres.</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-1">
                    {MONTHS_LONG.map((label, index) => {
                      const count = counts.months[index];
                      const iso = `${year}-${pad2(index + 1)}`;
                      const active = value === iso;

                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => selectMonth(index)}
                          disabled={count === 0}
                          aria-pressed={active}
                          aria-label={`${label} ${year}, ${count} vidéo${count > 1 ? 's' : ''}`}
                          className={`flex h-9 items-center justify-between gap-1 border px-2 text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors ${
                            active
                              ? 'border-evangile-600 bg-evangile-600 text-white'
                              : count === 0
                                ? 'cursor-not-allowed border-transparent text-muted/30'
                                : 'border-line text-cream hover:border-evangile-600/50 hover:text-evangile-500'
                          }`}
                        >
                          <span>{MONTHS_SHORT[index]}</span>
                          <span className={active ? 'text-white/70' : 'text-muted'}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 border-t border-line pt-2 text-[10px] tracking-normal text-muted">
                    Choisissez un mois, puis un jour.
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMonth(null)}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted transition-colors hover:text-cream"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Mois
                </button>
                <p className="font-hero text-base uppercase leading-none tracking-[0.06em] text-cream">
                  {MONTHS_LONG[month]} {year}
                </p>
                <span className="w-10" />
              </div>

              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day, index) => (
                  <span
                    key={`weekday-${index}`}
                    className="pb-1 text-center text-[9px] font-semibold uppercase tracking-[0.08em] text-muted"
                  >
                    {day}
                  </span>
                ))}
                {Array.from({ length: firstOffset }).map((_, index) => (
                  <span key={`offset-${index}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const count = counts.days.get(day) ?? 0;
                  const iso = `${year}-${pad2(month + 1)}-${pad2(day)}`;
                  const active = value === iso;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        onChange(iso);
                        setOpen(false);
                      }}
                      disabled={count === 0}
                      aria-pressed={active}
                      aria-label={`${day} ${MONTHS_LONG[month]} ${year}, ${count} vidéo${count > 1 ? 's' : ''}`}
                      className={`relative flex h-8 items-center justify-center border text-[11px] transition-colors ${
                        active
                          ? 'border-evangile-600 bg-evangile-600 font-semibold text-white'
                          : count === 0
                            ? 'cursor-not-allowed border-transparent text-muted/30'
                            : 'border-transparent text-cream hover:border-evangile-600/50 hover:text-evangile-500'
                      }`}
                    >
                      {day}
                      {count > 0 && !active && (
                        <span className="absolute bottom-0.5 h-[3px] w-[3px] rounded-full bg-evangile-500" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] tracking-normal text-muted">
                Les jours marqués contiennent des vidéos.
              </p>
            </>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="text-[10px] font-semibold uppercase tracking-[0.12em] text-evangile-500 transition-colors hover:text-evangile-400"
            >
              Toutes les dates
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le calendrier"
              className="flex h-6 w-6 items-center justify-center border border-line text-muted transition-colors hover:border-evangile-600/50 hover:text-evangile-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RevealSection({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={`reveal ${visible ? 'in' : ''} ${className}`}>
      {children}
    </div>
  );
}

function SourceBadge({ source }: { source: FeedSource }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-ink-950/80 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
      {source === 'youtube' ? <Youtube className="h-3 w-3" /> : <Church className="h-3 w-3" />}
      {SOURCE_LABEL[source]}
    </span>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  const href = item.videoUrl || item.audioUrl;
  const mediaLabel = item.videoUrl ? 'Regarder' : 'Écouter';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col border border-line bg-bg-card transition-colors duration-300 hover:border-white/20 hover:bg-bg-card-hover"
    >
      <div className="relative aspect-video overflow-hidden">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            srcSet={imageSrcSet(item.thumbnail)}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            alt=""
            className="photo-claro photo-hover-clear h-full w-full object-cover transition-[transform,filter] duration-700 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-ink-950">
            <BookOpen className="h-10 w-10 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent" />

        <div className="absolute left-3 top-3">
          <SourceBadge source={item.source} />
        </div>

        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center border border-white/40 bg-ink-950/55 text-white transition-colors duration-200 group-hover:border-white group-hover:bg-ink-950/80">
            {item.videoUrl ? <Play className="ml-0.5 h-5 w-5" /> : <Headphones className="h-5 w-5" />}
          </span>
        </span>

        {item.duration && (
          <span className="absolute bottom-3 right-3 border border-white/20 bg-ink-950/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
            {item.duration}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          {item.date && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-evangile-500" />
              {formatDate(item.date)}
            </span>
          )}
          {item.kind && (
            <>
              {item.date && <span className="h-3 w-px bg-line" />}
              <span className="text-evangile-500">{item.kind}</span>
            </>
          )}
          {!item.date && !item.kind && <span>Message</span>}
        </div>

        <h3 className="mt-5 line-clamp-3 text-balance font-hero text-2xl uppercase leading-[1.16] tracking-[0.035em] text-cream transition-colors duration-200 group-hover:text-evangile-400">
          {item.title}
        </h3>

        {item.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted">{item.description}</p>
        )}

        <div className="mt-auto pt-6">
          <div className="flex items-center justify-between gap-4 border-t border-line pt-4 text-[11px]">
            <span className="flex min-w-0 items-center gap-2 text-muted">
              {item.source === 'youtube' ? (
                <Youtube className="h-3.5 w-3.5 shrink-0 text-evangile-500" />
              ) : (
                <Mic className="h-3.5 w-3.5 shrink-0 text-evangile-500" />
              )}
              <span className="truncate">
                {item.preacher || (item.source === 'youtube' ? 'Chaîne officielle' : 'Église')}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold uppercase tracking-[0.14em] text-evangile-500">
              {mediaLabel}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

export function PredicationsPage({ onNavigate }: PredicationsPageProps) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const { videos: youtubeFeed } = useLiveTeachings();
  const [sermons, setSermons] = useState<FeedItem[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(isSupabaseConfigured);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPreacher, setSelectedPreacher] = useState('Tous');
  const [selectedSeries, setSelectedSeries] = useState('Toutes');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const channels = featuredSocialLinks(settingsMap);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    db.getSettings()
      .then((settings) => {
        if (!cancelled) setSettingsMap(buildSettingsMap(settings));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSermons() {
      if (!isSupabaseConfigured) {
        setLoadingArchive(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('sermons')
          .select('*')
          .eq('is_active', true)
          .order('preached_on', { ascending: false });

        if (error) throw error;
        if (cancelled) return;

        setSermons(
          (data ?? [])
            .filter((row: any) => row.title)
            .map((row: any) => ({
              id: `eglise-${row.id}`,
              title: row.title || '',
              preacher: row.preacher || '',
              date: row.preached_on || row.created_at || '',
              series: row.series || '',
              kind: classifyTeaching(row.title || ''),
              duration: row.duration || '',
              thumbnail: row.thumbnail_url || '',
              videoUrl: row.video_url || '',
              audioUrl: row.audio_url || '',
              description: row.description || '',
              isFeatured: Boolean(row.is_featured),
              source: 'eglise' as const,
            })),
        );
      } catch (err) {
        console.warn('[PredicationsPage] archives indisponibles:', err);
      } finally {
        if (!cancelled) setLoadingArchive(false);
      }
    }

    void loadSermons();
    return () => {
      cancelled = true;
    };
  }, []);

  const youtubeItems = useMemo<FeedItem[]>(
    () =>
      youtubeFeed.map((teaching) => ({
        id: `youtube-${teaching.id}`,
        title: teaching.title,
        preacher: '',
        date: teaching.publishedAt,
        series: '',
        kind: classifyTeaching(teaching.title),
        duration: teaching.duration,
        thumbnail: teaching.thumbnail,
        videoUrl: teaching.videoUrl,
        audioUrl: '',
        description: '',
        isFeatured: false,
        source: 'youtube',
      })),
    [youtubeFeed],
  );

  const feedItems = useMemo(() => {
    const seen = new Set<string>();
    const merged: FeedItem[] = [];

    for (const item of [...sermons, ...youtubeItems]) {
      const key = youTubeId(item.videoUrl) || item.id;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }

    return merged.sort(
      (a, b) => (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0),
    );
  }, [sermons, youtubeItems]);

  const featured = useMemo(
    () => feedItems.find((item) => item.isFeatured) ?? feedItems[0],
    [feedItems],
  );

  const preachers = useMemo(() => {
    const values = Array.from(new Set(sermons.map((item) => item.preacher).filter(Boolean)));
    return ['Tous', ...values.sort((a, b) => a.localeCompare(b, 'fr'))];
  }, [sermons]);

  const seriesList = useMemo(() => {
    const values = Array.from(new Set(sermons.map((item) => item.series).filter(Boolean)));
    return ['Toutes', ...values.sort((a, b) => a.localeCompare(b, 'fr'))];
  }, [sermons]);

  const hasBothSources = sermons.length > 0 && youtubeItems.length > 0;

  const dateScopeItems = useMemo(() => {
    const query = normalize(searchQuery.trim());

    return feedItems.filter((item) => {
      if (sourceFilter !== 'all' && item.source !== sourceFilter) return false;
      if (selectedPreacher !== 'Tous' && item.preacher !== selectedPreacher) return false;
      if (selectedSeries !== 'Toutes' && item.series !== selectedSeries) return false;
      return matchesQuery(item, query);
    });
  }, [feedItems, sourceFilter, selectedPreacher, selectedSeries, searchQuery]);

  const filteredFeed = useMemo(
    () => dateScopeItems.filter((item) => !selectedDate || item.date.startsWith(selectedDate)),
    [dateScopeItems, selectedDate],
  );

  const hasFilters =
    searchQuery.trim() !== '' ||
    sourceFilter !== 'all' ||
    selectedDate !== '' ||
    selectedPreacher !== 'Tous' ||
    selectedSeries !== 'Toutes';
  const showFeatured = !hasFilters && Boolean(featured);

  const feedHeading = useMemo(() => {
    if (selectedSeries !== 'Toutes') return `Série : ${selectedSeries}`;
    if (selectedDate) {
      const [year, month, day] = selectedDate.split('-');
      if (!month) return `Vidéos ${year}`;
      if (!day) return `Vidéos de ${MONTHS_LONG[Number(month) - 1]} ${year}`;
      return `Vidéos du ${formatDate(selectedDate, true)}`;
    }
    return hasFilters ? 'Résultats' : 'Toutes les vidéos';
  }, [selectedSeries, selectedDate, hasFilters]);

  const gridItems = useMemo(
    () =>
      showFeatured
        ? filteredFeed.filter((item) => item.id !== featured?.id)
        : filteredFeed,
    [filteredFeed, featured, showFeatured],
  );
  const visibleGridItems = gridItems.slice(0, visibleCount);
  const remainingCount = Math.max(0, gridItems.length - visibleGridItems.length);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, sourceFilter, selectedDate, selectedPreacher, selectedSeries]);

  const seriesCards = useMemo(() => {
    const map = new Map<string, { count: number; description: string; cover: string }>();

    for (const item of sermons) {
      if (!item.series) continue;
      const current = map.get(item.series);
      if (current) {
        current.count += 1;
        if (!current.description && item.description) current.description = item.description;
        if (!current.cover && item.thumbnail) current.cover = item.thumbnail;
      } else {
        map.set(item.series, {
          count: 1,
          description: item.description || `Série : ${item.series}`,
          cover: item.thumbnail,
        });
      }
    }

    return Array.from(map.entries()).map(([title, info]) => ({ title, ...info }));
  }, [sermons]);

  const audioItems = sermons.filter((item) => item.audioUrl);

  const resetFilters = () => {
    setSearchQuery('');
    setSourceFilter('all');
    setSelectedDate('');
    setSelectedPreacher('Tous');
    setSelectedSeries('Toutes');
  };

  const scrollToFeed = () => {
    document.getElementById('predications-feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-bg font-sans text-cream mobile-bottom-pad">
      <SiteHeader onNavigate={onNavigate} activePage="predications" />

      <UniversalHero
        pageKey="predications"
        defaultBadge="Prédications"
        defaultTitle="Nos Prédications"
        defaultSubtitle="Les prédications de l'église et les publications de la chaîne YouTube, réunies dans un même flux."
      >
        <div className="mt-8 flex items-center gap-2 animate-fade-up sm:gap-3" style={{ animationDelay: '0.3s' }}>
          <a
            href={YOUTUBE_CHANNEL.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex-1 gap-1.5 whitespace-nowrap px-3 py-2.5 text-[12.5px] sm:flex-none sm:gap-2.5 sm:px-6"
          >
            <Youtube className="h-3.5 w-3.5" />
            Voir sur YouTube
          </a>
          <a
            href={CHURCH.social.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost flex-1 gap-1.5 whitespace-nowrap px-3 py-2.5 text-[12.5px] sm:flex-none sm:gap-2.5 sm:px-6"
          >
            <Facebook className="h-3.5 w-3.5" />
            Voir sur Facebook
          </a>
        </div>
      </UniversalHero>

      {showFeatured && featured && (
        <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8 lg:pt-20">
          <RevealSection>
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
              <div>
                <div className="flex items-center gap-4">
                  <span className="rule-accent" />
                  <p className="section-eyebrow">À la une</p>
                </div>
                <h2 className="section-title mt-4">Le message à la une</h2>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {feedItems.length} vidéo{feedItems.length > 1 ? 's' : ''} disponible{feedItems.length > 1 ? 's' : ''}
              </p>
            </div>
          </RevealSection>

          <RevealSection className="mt-8">
            <div className="grid border border-line bg-bg-card lg:grid-cols-12">
              <a
                href={featured.videoUrl || featured.audioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block overflow-hidden lg:col-span-7"
              >
                <div className="relative aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[440px]">
                  {featured.thumbnail ? (
                    <img
                      src={featured.thumbnail}
                      srcSet={imageSrcSet(featured.thumbnail)}
                      sizes="(min-width: 1024px) 58vw, 100vw"
                      alt=""
                      className="photo-claro-strong photo-hover-clear h-full w-full object-cover transition-[transform,filter] duration-700 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-ink-950">
                      <BookOpen className="h-12 w-12 text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/25 to-transparent" />

                  <div className="absolute left-0 top-0">
                    <SourceBadge source={featured.source} />
                  </div>

                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-20 w-20 items-center justify-center border border-white/40 bg-ink-950/55 text-white transition-colors duration-200 group-hover:border-white group-hover:bg-ink-950/80">
                      {featured.videoUrl ? <Play className="ml-1 h-8 w-8" /> : <Headphones className="h-8 w-8" />}
                    </span>
                  </span>
                </div>
              </a>

              <div className="flex flex-col border-t border-line p-6 lg:col-span-5 lg:justify-center lg:border-l lg:border-t-0 lg:p-10">
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                  <span className="h-1.5 w-1.5 bg-evangile-600" />
                  <span>{formatDate(featured.date, true)}</span>
                  {featured.duration && (
                    <>
                      <span className="h-3 w-px bg-line" />
                      <span>{featured.duration}</span>
                    </>
                  )}
                </div>

                <h3 className="mt-4 font-hero text-4xl uppercase leading-[0.92] text-cream lg:text-5xl">
                  {featured.title}
                </h3>

                {featured.description && (
                  <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-muted">{featured.description}</p>
                )}

                <dl className="mt-6 border-t border-line pt-4 text-sm">
                  {featured.series && (
                    <div className="flex items-baseline justify-between gap-4 border-b border-line/60 py-2">
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Série</dt>
                      <dd className="text-right text-cream">{featured.series}</dd>
                    </div>
                  )}
                  {featured.preacher && (
                    <div className="flex items-baseline justify-between gap-4 border-b border-line/60 py-2">
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Prédicateur</dt>
                      <dd className="text-right text-cream">{featured.preacher}</dd>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between gap-4 py-2">
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Source</dt>
                    <dd className="text-right text-cream">{SOURCE_LABEL[featured.source]}</dd>
                  </div>
                </dl>

                <div className="mt-8">
                  <a
                    href={featured.videoUrl || featured.audioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    {featured.videoUrl ? 'Regarder le message' : 'Écouter le message'}
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </RevealSection>
        </section>
      )}

      <section
        id="predications-feed"
        className="sticky top-16 z-30 mt-14 scroll-mt-24 border-y border-line bg-bg/95 backdrop-blur-sm"
      >
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <label className="relative w-full lg:max-w-md lg:flex-1">
                <span className="sr-only">Rechercher dans les messages</span>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/60" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Rechercher un titre, un mot, une date…"
                  className="input-surface w-full py-2.5 pl-10 pr-4 text-sm"
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <DateFilter items={dateScopeItems} value={selectedDate} onChange={setSelectedDate} />

                {preachers.length > 2 && (
                  <select
                    value={selectedPreacher}
                    onChange={(event) => setSelectedPreacher(event.target.value)}
                    aria-label="Filtrer par prédicateur"
                    className="input-surface min-w-0 flex-1 cursor-pointer appearance-none px-4 py-2.5 text-sm sm:flex-none"
                  >
                    {preachers.map((preacher) => (
                      <option key={preacher} value={preacher} className="bg-navy-900 text-cream">
                        {preacher}
                      </option>
                    ))}
                  </select>
                )}

                {seriesList.length > 2 && (
                  <select
                    value={selectedSeries}
                    onChange={(event) => setSelectedSeries(event.target.value)}
                    aria-label="Filtrer par série"
                    className="input-surface min-w-0 flex-1 cursor-pointer appearance-none px-4 py-2.5 text-sm sm:flex-none"
                  >
                    {seriesList.map((series) => (
                      <option key={series} value={series} className="bg-navy-900 text-cream">
                        {series}
                      </option>
                    ))}
                  </select>
                )}

                {hasBothSources && (
                  <div className="flex w-full border border-line sm:w-auto">
                    {(['all', 'eglise', 'youtube'] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setSourceFilter(filter)}
                        className={`flex-1 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors sm:flex-none ${
                          sourceFilter === filter
                            ? 'bg-evangile-600 text-white'
                            : 'text-muted hover:text-cream'
                        }`}
                      >
                        {filter === 'all' ? 'Tous' : SOURCE_LABEL[filter]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>
                  {hasFilters
                    ? `${filteredFeed.length} résultat${filteredFeed.length > 1 ? 's' : ''}`
                    : `${feedItems.length} vidéo${feedItems.length > 1 ? 's' : ''} au total`}
                </span>
                {gridItems.length > 0 && remainingCount > 0 && (
                  <span className="normal-case tracking-normal text-muted/70">
                    · {visibleGridItems.length} sur {gridItems.length} affichées
                  </span>
                )}
                {loadingArchive && (
                  <span className="inline-flex items-center gap-1.5 normal-case tracking-normal">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    mise à jour des archives
                  </span>
                )}
              </span>
              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-evangile-500 transition-colors hover:text-evangile-400"
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {gridItems.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className="section-title">{feedHeading}</h2>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              {gridItems.length} vidéo{gridItems.length > 1 ? 's' : ''} · lecture externe
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleGridItems.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
          </div>

          {remainingCount > 0 && (
            <div className="mt-10 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="btn-ghost gap-2"
              >
                Afficher {Math.min(PAGE_SIZE, remainingCount)} vidéos de plus
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setVisibleCount(gridItems.length)}
                className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-cream"
              >
                Tout afficher ({gridItems.length})
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <BookOpen className="mx-auto h-8 w-8 text-muted/40" />
          <p className="mt-4 text-sm text-muted">
            {feedItems.length === 0
              ? 'Les messages seront publiés ici dès qu’ils seront disponibles.'
              : !hasFilters && filteredFeed.length > 0
                ? 'Le message correspondant est affiché à la une.'
                : 'Aucun message ne correspond à vos filtres.'}
          </p>
          {hasFilters && filteredFeed.length === 0 && (
            <button type="button" onClick={resetFilters} className="btn-ghost mt-6">
              Réinitialiser les filtres
            </button>
          )}
        </section>
      )}

      {seriesCards.length > 0 && (
        <section className="border-y border-line bg-bg-card py-14 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
              <div>
                <div className="flex items-center gap-4">
                  <span className="rule-accent" />
                  <p className="section-eyebrow">Continuité</p>
                </div>
                <h2 className="section-title mt-4">Nos séries</h2>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                {seriesCards.length} série{seriesCards.length > 1 ? 's' : ''}
              </p>
            </div>

            <div className="mt-8 flex gap-px overflow-x-auto border border-line bg-line scrollbar-none">
              {seriesCards.map((series) => (
                <button
                  key={series.title}
                  type="button"
                  onClick={() => {
                    setSelectedSeries(series.title);
                    setSourceFilter('eglise');
                    scrollToFeed();
                  }}
                  className="group w-72 shrink-0 bg-bg p-4 text-left transition-colors hover:bg-bg-card-hover"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {series.cover ? (
                      <img
                        src={series.cover}
                        srcSet={imageSrcSet(series.cover)}
                        sizes="288px"
                        alt=""
                        className="photo-claro photo-hover-clear h-full w-full object-cover transition-[transform,filter] duration-700 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-ink-950">
                        <BookOpen className="h-8 w-8 text-white/20" />
                      </div>
                    )}
                    <span className="absolute bottom-0 left-0 bg-ink-950/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                      {series.count} message{series.count > 1 ? 's' : ''}
                    </span>
                  </div>
                  <h3 className="mt-4 line-clamp-2 font-hero text-2xl uppercase leading-[0.95] text-cream group-hover:text-evangile-400">
                    {series.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{series.description}</p>
                  <span className="mt-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-evangile-500">
                    Explorer
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {audioItems.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
            <div>
              <div className="flex items-center gap-4">
                <span className="rule-accent" />
                <p className="section-eyebrow">Audio</p>
              </div>
              <h2 className="section-title mt-4">À écouter</h2>
            </div>
            <Headphones className="h-5 w-5 text-evangile-500" />
          </div>

          <div className="border-t border-line">
            {audioItems.slice(0, 6).map((item) => (
              <a
                key={item.id}
                href={item.audioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 border-b border-line py-4 transition-colors hover:bg-bg-card"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-line text-evangile-500 transition-colors group-hover:border-evangile-600/60">
                  <Headphones className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-cream group-hover:text-evangile-400">
                    {item.title}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted">
                    {item.preacher && <span>{item.preacher}</span>}
                    {item.date && <span>{formatDate(item.date)}</span>}
                  </span>
                </span>
                {item.duration && (
                  <span className="hidden shrink-0 text-[11px] text-muted sm:block">{item.duration}</span>
                )}
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-evangile-500" />
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-line bg-bg-card py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
            <div>
              <div className="flex items-center gap-4">
                <span className="rule-accent" />
                <p className="section-eyebrow">Nos canaux</p>
              </div>
              <h2 className="section-title mt-4">Suivre l'église</h2>
            </div>
            <button type="button" onClick={() => onNavigate('media')} className="btn-link">
              Médiathèque
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {channels.map(({ label, title, handle, description, href, Icon }, i) => (
              <RevealSection key={label} className={`reveal-delay-${(i % 4) + 1}`}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full flex-col justify-between bg-bg p-6 transition-colors hover:bg-bg-card-hover sm:p-8"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="section-eyebrow">{label}</p>
                    <Icon className="h-7 w-7 text-evangile-500" />
                  </div>
                  <div className="mt-10">
                    <h3 className="font-hero text-2xl uppercase leading-none text-cream sm:text-3xl">
                      {title}
                    </h3>
                    <p className="mt-3 text-sm text-muted">
                      {handle ? `${handle} · ${description}` : description}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-evangile-500">
                      Ouvrir le canal
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </a>
              </RevealSection>
            ))}
          </div>

          <p className="mt-4 flex items-center gap-2 text-[11px] text-muted">
            <Calendar className="h-3.5 w-3.5" />
            La lecture se fait sur la plateforme d'origine, sans quitter le site.
          </p>
        </div>
      </section>

      <div className="footer-spacer" />
      <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />
      <MobileNav onNavigate={onNavigate} active="predications" />
    </div>
  );
}
