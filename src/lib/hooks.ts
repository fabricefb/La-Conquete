import { useEffect, useRef, useState } from 'react';

export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { setVisible(true); obs.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

export function useParallax<T extends HTMLElement = HTMLDivElement>(speed = 0.3) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf = 0;
    const fn = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { el.style.transform = `translateY(${window.pageYOffset * speed}px)`; }); };
    window.addEventListener('scroll', fn, { passive: true });
    return () => { window.removeEventListener('scroll', fn); cancelAnimationFrame(raf); };
  }, [speed]);
  return ref;
}
