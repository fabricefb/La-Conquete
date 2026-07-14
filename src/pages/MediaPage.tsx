import { useState, useEffect, useCallback } from 'react';
import { db, buildContentMap, getContent } from '../lib/supabase';
import type { MediaItem, MediaCategory } from '../types';
import { useReveal } from '../lib/hooks';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { Play, Headphones, X, ImageOff } from '../lib/icons';
import type { Page } from '../lib/navigation';

// ─── Types ─────────────────────────────────────────────────────────
interface MediaPageProps {
  onNavigate: (page: Page) => void;
}

// ─── Category filter config ────────────────────────────────────────
interface CategoryTab {
  label: string;
  value: string;
}

const CATEGORIES: CategoryTab[] = [
  { label: 'Tous', value: '' },
  { label: 'Sermons', value: 'sermon' },
  { label: 'Événements', value: 'event' },
  { label: 'Louange', value: 'worship' },
  { label: 'Communauté', value: 'community' },
  { label: 'Général', value: 'general' },
];

const CATEGORY_LABELS: Record<MediaCategory, string> = {
  sermon: 'Sermon',
  event: 'Événement',
  worship: 'Louange',
  community: 'Communauté',
  general: 'Général',
};

// ─── Reveal wrapper ───────────────────────────────────────────────
function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={`reveal ${visible ? 'in' : ''} ${className}`}>
      {children}
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="glass rounded-3xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-white/5" />
      <div className="p-5 space-y-3">
        <div className="h-3 rounded-full bg-white/5 w-1/4" />
        <div className="h-5 rounded-full bg-white/5 w-3/4" />
        <div className="h-3 rounded-full bg-white/5 w-1/2" />
      </div>
    </div>
  );
}

// ─── Media card ───────────────────────────────────────────────────
function MediaCard({
  item,
  onOpenLightbox,
}: {
  item: MediaItem;
  onOpenLightbox: (item: MediaItem) => void;
}) {
  const thumbnailSrc = item.thumbnail_url ?? item.file_url;
  const isImage = item.file_type === 'image';
  const isVideo = item.file_type === 'video';

  return (
    <div className="glass rounded-3xl overflow-hidden flex flex-col transition-all duration-300 hover:scale-[1.03] group">
      {/* Thumbnail */}
      <div
        className="relative aspect-video overflow-hidden cursor-pointer"
        onClick={() => isImage && onOpenLightbox(item)}
        role={isImage ? 'button' : undefined}
        tabIndex={isImage ? 0 : undefined}
        onKeyDown={(e) => {
          if (isImage && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onOpenLightbox(item);
          }
        }}
      >
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/5">
            <ImageOff className="h-10 w-10 text-muted/30" />
          </div>
        )}

        {/* Video play overlay */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity group-hover:bg-black/40">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/60 bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110">
              <Play className="h-6 w-6 text-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Audio overlay */}
        {item.file_type === 'audio' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-evangile-600/60 bg-evangile-600/20 backdrop-blur-sm">
              <Headphones className="h-6 w-6 text-evangile-500" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2 p-5">
        <span className="self-start rounded-full border border-evangile-600/20 bg-evangile-600/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-evangile-500">
          {CATEGORY_LABELS[item.category]}
        </span>
        <h3 className="font-serif text-lg font-semibold text-cream leading-snug">{item.title}</h3>
        {item.description && (
          <p className="text-sm text-muted line-clamp-2">{item.description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────
function Lightbox({
  item,
  onClose,
}: {
  item: MediaItem;
  onClose: () => void;
}) {
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const imageSrc = item.thumbnail_url ?? item.file_url;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white/80 transition-all hover:border-evangile-600/40 hover:text-evangile-500"
        aria-label="Fermer"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Image */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={item.title}
          className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
        />
      )}

      {/* Caption */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-lg text-center">
        <p className="text-sm font-semibold text-white">{item.title}</p>
        {item.description && (
          <p className="mt-1 text-xs text-white/60">{item.description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────
export function MediaPage({ onNavigate }: MediaPageProps) {
  const { colorMode, toggleColorMode } = useDynamicTheme();

  // Data state
  const [contentMap, setContentMap] = useState<Record<string, string>>({});
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState('');

  // Lightbox state
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);

  // ── Fetch page contents on mount ───────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadPageContent() {
      try {
        const contents = await db.getPageContents('media');
        if (!cancelled) {
          setContentMap(buildContentMap(contents));
        }
      } catch {
        // Silently fall back to defaults
      }
    }

    loadPageContent();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Fetch media items when category changes ────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadMedia() {
      try {
        setLoading(true);
        setError(null);
        const data = await db.getActiveMedia(selectedCategory || undefined);
        if (!cancelled) {
          setMediaItems(data);
        }
      } catch {
        if (!cancelled) {
          setError('Impossible de charger les médias pour le moment.');
          setMediaItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMedia();
    return () => {
      cancelled = true;
    };
  }, [selectedCategory]);

  const heroSubtitle = getContent(contentMap, 'hero', 'subtitle', 'Retrouvez nos photos, vidéos et enregistrements audio.');

  const closeLightbox = useCallback(() => setLightboxItem(null), []);

  return (
    <div className="min-h-screen bg-bg text-cream font-sans">
      <SiteHeader
        onNavigate={onNavigate}
        activePage="media"
        theme={colorMode}
        onToggleTheme={toggleColorMode}
      />

      {/* ─── HERO ─── */}
      <section className="relative flex min-h-[40vh] items-center justify-center overflow-hidden pt-16 bg-radial-primary">
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-20 text-center">
          <RevealSection>
            <p className="section-label justify-center">Galerie</p>
            <h1 className="mt-4 font-serif text-5xl font-semibold text-cream sm:text-6xl">
              Nos Médias
            </h1>
            <p className="mt-6 text-lg text-muted">{heroSubtitle}</p>
          </RevealSection>
        </div>
      </section>

      {/* ─── FILTER BAR (sticky) ─── */}
      <section className="sticky top-16 z-30 border-b border-line bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-4 pb-4 scrollbar-none">
            {CATEGORIES.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setSelectedCategory(value)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  selectedCategory === value
                    ? 'bg-gradient-to-r from-evangile-400 to-evangile-600 text-cream'
                    : 'border border-line text-muted hover:border-evangile-600/40 hover:text-cream'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CONTENT ─── */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Error state */}
        {error && (
          <RevealSection className="mb-10">
            <div className="rounded-2xl border border-ember-500/20 bg-ember-500/10 p-6 text-center text-muted">
              {error}
            </div>
          </RevealSection>
        )}

        {/* Loading state */}
        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Media grid */}
        {!loading && !error && mediaItems.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mediaItems.map((item, i) => (
              <RevealSection key={item.id} className={`reveal-delay-${(i % 3) + 1}`}>
                <MediaCard item={item} onOpenLightbox={setLightboxItem} />
              </RevealSection>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && mediaItems.length === 0 && (
          <div className="py-24 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-line text-muted/40">
              <ImageOff className="h-8 w-8" />
            </div>
            <p className="text-lg font-serif font-semibold text-muted">
              Aucun média trouvé
            </p>
            <p className="mt-2 text-sm text-muted/60">
              {selectedCategory
                ? 'Aucun média dans cette catégorie pour le moment.'
                : 'Les médias seront bientôt disponibles.'}
            </p>
          </div>
        )}
      </div>

      {/* ─── LIGHTBOX ─── */}
      {lightboxItem && (
        <Lightbox item={lightboxItem} onClose={closeLightbox} />
      )}

      <SiteFooter
        onNavigate={onNavigate}
        theme={colorMode}
        onToggleTheme={toggleColorMode}
      />
      <MobileNav
        onNavigate={onNavigate}
        active="media"
      />
    </div>
  );
}