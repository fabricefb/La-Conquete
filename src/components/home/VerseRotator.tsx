'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BookOpen, ChevronLeft, ChevronRight } from '../../lib/icons';

interface Verse {
  text: string;
  reference: string;
}

interface VerseRotatorProps {
  verses?: Verse[];
  autoPlay?: boolean;
  interval?: number;
}

const defaultVerses: Verse[] = [
  {
    text: 'Car je connais les projets que j\u2019ai form\u00e9s sur vous, dit l\u2019\u00c9ternel, projets de paix et non de malheur, afin de vous donner un avenir et de l\u2019esp\u00e9rance.',
    reference: 'J\u00e9r\u00e9mie 29:11',
  },
  {
    text: 'Je peux tout par celui qui me fortifie.',
    reference: 'Philippiens 4:13',
  },
  {
    text: 'Le c\u0153ur de l\u2019homme m\u00e9dite sa voie, mais c\u2019est l\u2019\u00c9ternel qui dirige ses pas.',
    reference: 'Proverbes 16:9',
  },
  {
    text: 'Car l\u00e0 o\u00f9 deux ou trois sont assembl\u00e9s en mon nom, je suis au milieu d\u2019eux.',
    reference: 'Matthieu 18:20',
  },
];

export function VerseRotator({
  verses = defaultVerses,
  autoPlay = true,
  interval = 6000,
}: VerseRotatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);

  const goTo = useCallback(
    (index: number) => {
      if (isAnimating) return;
      setCurrentIndex((index + verses.length) % verses.length);
      setIsAnimating(true);
      // Reset animation flag after animation completes
      setTimeout(() => setIsAnimating(false), 500);
    },
    [verses.length, isAnimating],
  );

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);

  // Auto-play timer
  useEffect(() => {
    if (!autoPlay) return;

    const startTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (!isPausedRef.current) {
          goNext();
        }
      }, interval);
    };

    startTimer();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoPlay, interval, goNext]);

  // Reset timer on manual navigation
  const handleManualNav = (index: number) => {
    isPausedRef.current = true;
    goTo(index);
    // Briefly pause auto-play after manual interaction
    setTimeout(() => {
      isPausedRef.current = false;
    }, interval);
  };

  const currentVerse = verses[currentIndex];

  return (
    <div className="glass-card relative overflow-hidden rounded-2xl p-8 sm:p-10 md:p-12">
      {/* Decorative corner — top-left */}
      <div className="absolute left-0 top-0 h-8 w-8">
        <div className="absolute left-4 top-0 h-px w-6 bg-gradient-to-r from-gold-400/80 to-transparent" />
        <div className="absolute left-0 top-4 h-6 w-px bg-gradient-to-b from-gold-400/80 to-transparent" />
        <div className="absolute left-4 top-0 h-1 w-1 rounded-full bg-red-500" />
      </div>

      {/* Decorative corner — bottom-right */}
      <div className="absolute bottom-0 right-0 h-8 w-8">
        <div className="absolute bottom-4 right-0 h-px w-6 bg-gradient-to-l from-gold-400/80 to-transparent" />
        <div className="absolute bottom-0 right-4 h-6 w-px bg-gradient-to-t from-gold-400/80 to-transparent" />
        <div className="absolute bottom-4 right-0 h-1 w-1 rounded-full bg-red-500" />
      </div>

      {/* BookOpen icon — top right */}
      <div className="absolute right-6 top-6 text-gold-400/30">
        <BookOpen className="h-8 w-8" strokeWidth={1.5} />
      </div>

      {/* Verse content */}
      <div className="relative mx-auto max-w-2xl text-center">
        <div
          key={currentIndex}
          className={isAnimating || currentIndex === 0 ? 'verse-enter' : ''}
        >
          <blockquote className="font-serif italic text-lg leading-relaxed sm:text-xl md:text-2xl"
            style={{ color: 'rgb(var(--text-rgb))' }}
          >
            &ldquo;{currentVerse.text}&rdquo;
          </blockquote>
          <p className="gold-text mt-6 text-sm font-semibold uppercase tracking-widest sm:text-base">
            {currentVerse.reference}
          </p>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="mt-8 flex items-center justify-center gap-6">
        {/* Previous button */}
        <button
          type="button"
          onClick={() => handleManualNav(currentIndex - 1)}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
          style={{
            background: 'rgb(var(--glass-bg-rgb) / 0.4)',
            border: '1px solid rgb(var(--glass-border-rgb) / 0.2)',
            color: 'rgb(var(--text-muted-rgb))',
          }}
          aria-label="Verset pr\u00e9c\u00e9dent"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-2">
          {verses.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleManualNav(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-6 bg-gradient-to-r from-gold-400 to-red-500'
                  : 'w-2 hover:scale-125'
              }`}
              style={
                index !== currentIndex
                  ? { background: 'rgb(var(--text-muted-rgb) / 0.3)' }
                  : undefined
              }
              aria-label={`Aller au verset ${index + 1}`}
            />
          ))}
        </div>

        {/* Next button */}
        <button
          type="button"
          onClick={() => handleManualNav(currentIndex + 1)}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
          style={{
            background: 'rgb(var(--glass-bg-rgb) / 0.4)',
            border: '1px solid rgb(var(--glass-border-rgb) / 0.2)',
            color: 'rgb(var(--text-muted-rgb))',
          }}
          aria-label="Verset suivant"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}