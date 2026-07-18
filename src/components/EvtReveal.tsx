import { useState, useEffect, useRef } from 'react';

/** Shared intersection-observer hook — fires once when element enters viewport */
function useEvtReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

/**
 * Reveal-on-scroll wrapper — children fade/slide in when scrolled into view.
 * Used across Dashboard, Events, Pastoral, Communication pages.
 */
export function EvtReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useEvtReveal();
  return (
    <div
      ref={ref}
      className={`evt-reveal ${inView ? 'in' : ''} ${delay ? `evt-reveal-delay-${delay}` : ''} ${className}`}
    >
      {children}
    </div>
  );
}