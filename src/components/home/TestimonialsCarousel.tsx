import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from '../../lib/icons';

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
    <div className="panel relative overflow-hidden p-8 sm:p-10 md:p-12">
      <span className="rule-accent absolute left-8 top-0 sm:left-10 md:left-12" />

      <div className="relative mx-auto max-w-2xl text-center">
        <div key={currentIndex} className={isAnimating || currentIndex === 0 ? 'verse-enter' : ''}>
          <p className="text-base leading-relaxed text-cream sm:text-lg">
            &ldquo;{current.content}&rdquo;
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-line bg-bg-card font-hero text-lg text-evangile-600">
              {current.is_anonymous
                ? '?'
                : (current.author_name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="person-name">
                {current.is_anonymous ? 'Anonyme' : current.author_name || 'Membre'}
              </p>
              {current.category && current.category !== 'general' && (
                <p className="person-role mt-1 capitalize">{current.category}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {testimonials.length > 1 && (
        <div className="mt-10 flex items-center justify-center gap-6 border-t border-line pt-6">
          <button
            type="button"
            onClick={() => handleManualNav(currentIndex - 1)}
            className="flex h-10 w-10 items-center justify-center border border-line text-muted transition-colors hover:border-evangile-600 hover:text-evangile-600"
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
                className={`h-0.5 transition-all duration-300 ${
                  index === currentIndex ? 'w-10 bg-evangile-600' : 'w-6 bg-line hover:bg-muted'
                }`}
                aria-label={`Aller au témoignage ${index + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleManualNav(currentIndex + 1)}
            className="flex h-10 w-10 items-center justify-center border border-line text-muted transition-colors hover:border-evangile-600 hover:text-evangile-600"
            aria-label="Témoignage suivant"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}