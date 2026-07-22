import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Charge les réglages d'animation depuis site_settings (clé 'animation_settings')
 * et applique les CSS variables + classes sur le document.
 *
 * Ce provider est utilisé côté public pour que les animations
 * configurées dans l'admin soient effectives sur le site.
 */
export function AnimationProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'animation_settings')
          .single();

        if (cancelled || !data?.value) {
          setReady(true);
          return;
        }

        const s = typeof data.value === 'string'
          ? JSON.parse(data.value)
          : data.value;

        if (cancelled) return;

        const root = document.documentElement;

        // Durées et easings → CSS variables
        if (s.revealDuration) root.style.setProperty('--anim-reveal-duration', `${s.revealDuration}s`);
        if (s.hoverDuration) root.style.setProperty('--anim-hover-duration', `${s.hoverDuration}s`);
        if (s.revealEasing) root.style.setProperty('--anim-reveal-ease', s.revealEasing);
        if (s.hoverEasing) root.style.setProperty('--anim-hover-ease', s.hoverEasing);
        if (s.marqueeDuration) root.style.setProperty('--anim-marquee-duration', `${s.marqueeDuration}s`);

        // Toggles → classes sur <html>
        if (s.scrollReveal === false) root.classList.add('anim-no-reveal');
        else root.classList.remove('anim-no-reveal');

        if (s.hoverEffects === false) root.classList.add('anim-no-hover');
        else root.classList.remove('anim-no-hover');

        if (s.parallax === true) root.classList.add('anim-parallax-active');
        else root.classList.remove('anim-parallax-active');
      } catch {
        // Silently fail — site works with defaults
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Retardement du rendu des enfants pour éviter les flash d'animations
  // pendant le chargement des réglages
  return <>{children}</>;
}