import { useEffect, useState } from 'react';
import { db, buildContentMap, getContent } from '../lib/supabase';
import { useReveal } from '../lib/hooks';

interface UniversalHeroProps {
  pageKey: string;
  defaultBadge: string;
  defaultTitle: string;
  defaultSubtitle?: string;
  bgImage?: string;
  fullScreen?: boolean;
  children?: React.ReactNode;
}

/**
 * UniversalHero — hero section réutilisable pour TOUTES les pages.
 * Lit badge/title/subtitle/bg_image depuis page_contents, avec fallbacks.
 * L'admin peut tout modifier via ContentsTab.
 *
 * Fix: le bg-radial-primary utilise le shorthand CSS 'background:' qui peut
 * entrer en conflit avec le style inline backgroundImage. Solution: utiliser
 * des divs séparés pour le fond image et le gradient radial.
 */
export function UniversalHero({
  pageKey,
  defaultBadge,
  defaultTitle,
  defaultSubtitle = '',
  bgImage,
  fullScreen = false,
  children,
}: UniversalHeroProps) {
  const [cm, setCm] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    db.getPageContents(pageKey)
      .then((contents) => {
        if (!cancelled) setCm(buildContentMap(contents));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pageKey]);

  const badge = getContent(cm, 'hero', 'badge', defaultBadge);
  const title = getContent(cm, 'hero', 'title', defaultTitle);
  const subtitle = getContent(cm, 'hero', 'subtitle', defaultSubtitle);
  const heroBg = bgImage || getContent(cm, 'hero', 'bg_image', '');

  if (fullScreen) {
    return (
      <section
        className="relative min-h-screen spirit-breath flex items-center justify-center overflow-hidden"
      >
        {heroBg && (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${heroBg})` }}
          />
        )}
        <div className="absolute inset-0 bg-black/60" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute inset-0 bg-radial-primary pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 pt-28 pb-20 text-center">
          {badge && (
            <div className="animate-fade-up">
              <span className="mb-4 inline-block rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold">
                {badge}
              </span>
            </div>
          )}
          <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h1 className="font-headline font-bold leading-tight text-cream">
              <span className="brand-text text-5xl md:text-7xl lg:text-8xl block">{title}</span>
            </h1>
          </div>
          {subtitle && (
            <div className="animate-fade-up mt-6" style={{ animationDelay: '0.2s' }}>
              <p className="text-sm md:text-base uppercase tracking-widest text-muted font-medium">
                {subtitle}
              </p>
            </div>
          )}
          {children}
        </div>
      </section>
    );
  }

  // Standard hero — image et gradient sur des divs séparés pour éviter les conflits CSS
  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden">
      {/* Image de fond (si fournie) */}
      {heroBg && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
      )}
      {/* Overlay sombre quand il y a une image */}
      {heroBg && <div className="absolute inset-0 bg-black/50" />}
      {/* Gradient radial par défaut (visible si pas d'image) */}
      {!heroBg && <div className="absolute inset-0 bg-radial-primary" />}
      {/* Contenu */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-24 pt-28 text-center">
        {badge && (
          <div className="animate-fade-up">
            <span className="mb-4 inline-block rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold">
              {badge}
            </span>
          </div>
        )}
        <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <h1 className="font-serif text-4xl font-bold leading-tight text-cream sm:text-5xl md:text-6xl">
            {title}
          </h1>
        </div>
        {subtitle && (
          <div className="animate-fade-up mt-6" style={{ animationDelay: '0.2s' }}>
            <p className="text-lg leading-relaxed text-muted sm:text-xl">
              {subtitle}
            </p>
          </div>
        )}
        {children}
      </div>
    </section>
  );
}