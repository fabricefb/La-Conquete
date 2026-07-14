import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Quote } from '../../lib/icons';

interface Testimonial {
  id: string;
  content: string;
  author_name?: string;
  category?: string;
  is_anonymous?: boolean;
}

interface TestimonialsCarouselProps {
  testimonials: Testimonial[];
  autoPlay?: boolean;
  interval?: number;
}

export function TestimonialsCarousel({
  testimonials,
  autoPlay = true,
  interval = 5000,
}: TestimonialsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);

  const goTo = useCallback(
    (index: number) => {
      if (isAnimating) return;
      setCurrentIndex((index + testimonials.length) % testimonials.length);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
    },
    [testimonials.length, isAnimating],
  );

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);

  useEffect(() => {
    if (!autoPlay || testimonials.length <= 1) return;
    const startTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (!isPausedRef.current) goNext();
      }, interval);
    };
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoPlay, interval, goNext, testimonials.length]);

  const handleManualNav = (index: number) => {
    isPausedRef.current = true;
    goTo(index);
    setTimeout(() => {
      isPausedRef.current = false;
    }, interval);
  };

  if (testimonials.length === 0) return null;

  const current = testimonials[currentIndex];

  return (
    <div className="glass-card relative overflow-hidden rounded-2xl p-8 sm:p-10 md:p-12">
      {/* Decorative corners */}
      <div className="absolute left-0 top-0 h-8 w-8">
        <div className="absolute left-4 top-0 h-px w-6 bg-gradient-to-r from-evangile-600/80 to-transparent" />
        <div className="absolute left-0 top-4 h-6 w-px bg-gradient-to-b from-evangile-600/80 to-transparent" />
      </div>
      <div className="absolute bottom-0 right-0 h-8 w-8">
        <div className="absolute bottom-4 right-0 h-px w-6 bg-gradient-to-l from-evangile-600/80 to-transparent" />
        <div className="absolute bottom-0 right-4 h-6 w-px bg-gradient-to-t from-evangile-600/80 to-transparent" />
      </div>

      {/* Quote decoration */}
      <div className="absolute right-6 top-6 text-evangile-500/20">
        <Quote className="h-10 w-10" />
      </div>

      {/* Content */}
      <div className="relative mx-auto max-w-2xl text-center">
        <div key={currentIndex} className={isAnimating || currentIndex === 0 ? 'verse-enter' : ''}>
          <p
            className="font-serif italic text-lg leading-relaxed sm:text-xl md:text-2xl"
            style={{ color: 'rgb(var(--text-rgb))' }}
          >
            &ldquo;{current.content}&rdquo;
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-evangile-600/15 text-sm font-bold text-evangile-500">
              {current.is_anonymous
                ? '?'
                : (current.author_name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-rgb))' }}>
                {current.is_anonymous ? 'Anonyme' : current.author_name || 'Membre'}
              </p>
              {current.category && current.category !== 'general' && (
                <p className="text-xs capitalize" style={{ color: 'rgb(var(--radial-primary-rgb, 227,34,31))' }}>
                  {current.category}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {testimonials.length > 1 && (
        <div className="mt-8 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => handleManualNav(currentIndex - 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
            style={{
              background: 'rgb(var(--glass-bg-rgb) / 0.4)',
              border: '1px solid rgb(var(--glass-border-rgb) / 0.2)',
              color: 'rgb(var(--text-muted-rgb))',
            }}
            aria-label="Témoignage précédent"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleManualNav(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-6 bg-gradient-to-r from-evangile-600 to-red-500'
                    : 'w-2 hover:scale-125'
                }`}
                style={
                  index !== currentIndex
                    ? { background: 'rgb(var(--text-muted-rgb) / 0.3)' }
                    : undefined
                }
                aria-label={`Aller au témoignage ${index + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleManualNav(currentIndex + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
            style={{
              background: 'rgb(var(--glass-bg-rgb) / 0.4)',
              border: '1px solid rgb(var(--glass-border-rgb) / 0.2)',
              color: 'rgb(var(--text-muted-rgb))',
            }}
            aria-label="Témoignage suivant"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}