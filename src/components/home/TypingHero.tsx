import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';

/* ================================================================== */
/*  TypingText                                                         */
/* ================================================================== */

interface TypingTextProps {
  /** Array of words to cycle through */
  words: string[];
  /** Additional class names applied to the <span> */
  className?: string;
  /** Milliseconds per character when typing (default 100) */
  typingSpeed?: number;
  /** Milliseconds per character when deleting (default 60) */
  deletingSpeed?: number;
  /** Milliseconds to pause on a fully-typed word (default 2000) */
  pauseTime?: number;
}

/**
 * Types each word character-by-character, pauses, deletes, then moves
 * to the next word.  A blinking cursor is provided via the
 * `.typing-cursor` CSS class applied to the outer `<span>`.
 */
export function TypingText({
  words,
  className = '',
  typingSpeed = 100,
  deletingSpeed = 60,
  pauseTime = 2000,
}: TypingTextProps) {
  const [currentText, setCurrentText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset animation when words change (e.g. after async content load)
  useEffect(() => {
    setCurrentText('');
    setWordIndex(0);
    setIsDeleting(false);
    if (intervalRef.current) clearTimeout(intervalRef.current);
  }, [words]);

  const tick = useCallback(() => {
    const fullWord = words[wordIndex];

    if (!isDeleting) {
      // --- Typing ---------------------------------------------------
      setCurrentText(fullWord.substring(0, currentText.length + 1));

      if (currentText.length + 1 === fullWord.length) {
        // Word fully typed → pause, then switch to deleting
        setIsDeleting(true);
        intervalRef.current = setTimeout(tick, pauseTime);
        return;
      }

      intervalRef.current = setTimeout(tick, typingSpeed);
    } else {
      // --- Deleting -------------------------------------------------
      setCurrentText(fullWord.substring(0, currentText.length - 1));

      if (currentText.length - 1 === 0) {
        // Word fully deleted → move to next word
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % words.length);
        intervalRef.current = setTimeout(tick, typingSpeed);
        return;
      }

      intervalRef.current = setTimeout(tick, deletingSpeed);
    }
  }, [currentText, isDeleting, wordIndex, words, typingSpeed, deletingSpeed, pauseTime]);

  useEffect(() => {
    intervalRef.current = setTimeout(tick, typingSpeed);
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
    // We intentionally use `tick` as the dependency so the effect
    // re-runs whenever the closure changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return (
    <span
      className={`typing-cursor ${className}`}
      aria-label={words[wordIndex]}
      role="status"
    >
      {currentText}
    </span>
  );
}

/* ================================================================== */
/*  AnimatedCounter                                                    */
/* ================================================================== */

interface AnimatedCounterProps {
  /** Target number to count up to */
  end: number;
  /** Suffix displayed after the number, e.g. "+" or "%" */
  suffix?: string;
  /** Total animation duration in milliseconds (default 2000) */
  duration?: number;
  /** Additional class names applied to the wrapper <span> */
  className?: string;
}

/**
 * Animates from 0 → `end` when the element scrolls into view.
 * Uses `requestAnimationFrame` with an ease-out cubic curve for a
 * natural deceleration feel.
 */
export function AnimatedCounter({
  end,
  suffix = '',
  duration = 2000,
  className = '',
}: AnimatedCounterProps) {
  const [value, setValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true);
          observer.disconnect();

          /* ---- Animation loop ------------------------------------ */
          const startTime = performance.now();

          // Ease-out cubic: f(t) = 1 - (1 - t)^3
          const easeOutCubic = (t: number): number =>
            1 - Math.pow(1 - t, 3);

          const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutCubic(progress);

            setValue(Math.round(eased * end));

            if (progress < 1) {
              requestAnimationFrame(step);
            }
          };

          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  return (
    <span
      ref={ref}
      className={`stat-number ${className}`}
      style={
        {
          fontVariantNumeric: 'tabular-nums',
        } as CSSProperties
      }
      aria-label={`${end}${suffix}`}
    >
      {value.toLocaleString('fr-FR')}{suffix}
    </span>
  );
}