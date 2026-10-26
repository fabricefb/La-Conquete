import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Quote } from '../../lib/icons';

interface Testimonial {
  id: string;
  content: string;
  author_name?: string | null;
  author_title?: string | null;
  photo_url?: string | null;
  category?: string | null;
  is_anonymous?: boolean | null;
}

interface TestimonialsCarouselProps {
  testimonials: Testimonial[];
  autoPlay?: boolean;
  interval?: number;
  onShare?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Témoignage',
  guerison: 'Guérison',
  finance: 'Provision',
  maternite: 'Maternité',
  delivrance: 'Délivrance',
  miracle: 'Miracle',
  salut: 'Salut',
  famille: 'Famille',
  autre: 'Témoignage',
};

function displayName(testimonial: Testimonial): string {
  if (testimonial.is_anonymous) return 'Anonyme';
  return testimonial.author_name?.trim() || 'Membre de la communauté';
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function TestimonialsCarousel({
  testimonials,
  autoPlay = true,
  interval = 7000,
  onShare,
}: TestimonialsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback(
    (index: number) => {
      if (testimonials.length === 0) return;
      setCurrentIndex((index + testimonials.length) % testimonials.length);
    },
    [testimonials.length],
  );

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrevious = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  useEffect(() => {
    if (currentIndex > testimonials.length - 1) {
      setCurrentIndex(Math.max(0, testimonials.length - 1));
    }
  }, [currentIndex, testimonials.length]);

  useEffect(() => {
    if (!autoPlay || paused || testimonials.length <= 1 || prefersReducedMotion()) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % testimonials.length);
    }, interval);
    return () => window.clearInterval(timer);
  }, [autoPlay, paused, interval, testimonials.length, currentIndex]);

  if (testimonials.length === 0) return null;

  const current = testimonials[currentIndex];
  const name = displayName(current);
  const category = (current.category || 'general').toLowerCase();
  const categoryLabel = CATEGORY_LABELS[category] || CATEGORY_LABELS.general;
  const showCategory = category !== 'general';
  const showPhoto = Boolean(current.photo_url) && !current.is_anonymous;

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    if (Math.abs(delta) > 48) {
      if (delta < 0) goNext();
      else goPrevious();
    }
    touchStartX.current = null;
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goPrevious();
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goNext();
    }
  };

  return (
    <div
      className="panel relative overflow-hidden"
      role="region"
      aria-roledescription="carrousel"
      aria-label="Témoignages de la communauté"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <span className="rule-accent absolute left-0 top-0 w-24" />

      <div className="p-7 sm:p-10 md:p-12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-eyebrow">Témoignage</p>
            {showCategory && (
              <span className="mt-3 inline-flex border border-line px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-evangile-600">
                {categoryLabel}
              </span>
            )}
          </div>
          <span className="stat-figure text-[2rem] leading-none text-evangile-600/20" aria-hidden="true">
            {String(currentIndex + 1).padStart(2, '0')}
          </span>
        </div>

        <div key={current.id} className="verse-enter" aria-live="polite">
          <Quote className="mt-6 h-8 w-8 text-evangile-600/40" aria-hidden="true" />
          <blockquote className="verse-quote mt-4 max-w-4xl text-[clamp(1.3rem,2.6vw,2.05rem)] leading-[1.4] text-cream">
            &ldquo;{current.content}&rdquo;
          </blockquote>

          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-line pt-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border border-line bg-bg font-hero text-lg text-evangile-600">
              {showPhoto ? (
                <img
                  src={current.photo_url as string}
                  alt=""
                  width={48}
                  height={48}
                  loading="lazy"
                  decoding="async"
                  className="photo-claro h-full w-full object-cover object-top"
                />
              ) : current.is_anonymous ? (
                '?'
              ) : (
                initials(name)
              )}
            </div>
            <div>
              <p className="person-name">{name}</p>
              {current.author_title && <p className="person-role mt-1">{current.author_title}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-5 border-t border-line px-7 py-5 sm:px-10">
        <div className="flex items-center gap-4">
          {testimonials.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrevious}
                className="flex h-10 w-10 items-center justify-center border border-line text-muted transition-colors hover:border-evangile-600 hover:text-evangile-600 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-evangile-600"
                aria-label="Témoignage précédent"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2">
                {testimonials.map((testimonial, index) => (
                  <button
                    key={testimonial.id}
                    type="button"
                    aria-current={index === currentIndex ? 'true' : undefined}
                    aria-label={`Témoignage ${index + 1}`}
                    onClick={() => goTo(index)}
                    className={`h-0.5 transition-all duration-300 ${
                      index === currentIndex ? 'w-10 bg-evangile-600' : 'w-6 bg-line hover:bg-muted'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={goNext}
                className="flex h-10 w-10 items-center justify-center border border-line text-muted transition-colors hover:border-evangile-600 hover:text-evangile-600 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-evangile-600"
                aria-label="Témoignage suivant"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            {String(currentIndex + 1).padStart(2, '0')} / {String(testimonials.length).padStart(2, '0')}
          </span>
        </div>

        {onShare && (
          <button type="button" onClick={onShare} className="btn-link">
            Partager mon témoignage <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
