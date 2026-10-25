import { useEffect, useState } from 'react';
import { db, buildContentMap, getContent } from '../lib/supabase';

interface UniversalHeroProps {
  pageKey: string;
  defaultBadge: string;
  defaultTitle: string;
  defaultSubtitle?: string;
  bgImage?: string;
  children?: React.ReactNode;
}

/* Photo de reportage par défaut quand la page n'en déclare pas encore.
   Remplaçable depuis l'admin (page_contents.hero.bg_image). */
const PAGE_HERO_IMAGES: Record<string, string> = {
  activities: '/church-photo-2.jpg',
  annonces: '/church-photo-3.jpg',
  blog: '/church-photo-3.jpg',
  communiques: '/church-photo-1.jpg',
  contact: '/church-photo-2.jpg',
  departments: '/church-photo-2.jpg',
  dons: '/church-photo-1.jpg',
  emissions: '/church-photo-1.jpg',
  enseignements: '/church-photo-3.jpg',
  jeunesse: '/church-photo-2.jpg',
  media: '/church-photo-3.jpg',
  predications: '/church-photo-1.jpg',
};

/**
 * Hero institutionnel partagé par toutes les pages intérieures.
 * Photo traitée en clair-obscur, titre condensé, filet rouge,
 * puis fondu + lueur qui séparent le hero de la section suivante.
 */
export function UniversalHero({
  pageKey,
  defaultBadge,
  defaultTitle,
  defaultSubtitle = '',
  bgImage,
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
  const heroBg = bgImage || getContent(cm, 'hero', 'bg_image', '') || PAGE_HERO_IMAGES[pageKey] || '';
  const onImage = Boolean(heroBg);

  const titleColor = onImage ? '#FFFFFF' : 'rgb(var(--text-rgb))';
  const mutedColor = onImage ? 'rgba(255,255,255,0.72)' : 'rgb(var(--text-muted-rgb))';
  const watermarkColor = onImage ? 'rgba(255,255,255,0.06)' : 'rgb(var(--text-rgb) / 0.05)';

  return (
    <section className="relative flex min-h-[62vh] items-end overflow-hidden border-b border-line sm:min-h-[68vh] lg:min-h-[76vh]">
      {heroBg ? (
        <>
          <div
            className="photo-claro-strong hero-reveal-wipe hero-slide-zoom absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${heroBg})` }}
          />
          <div className="absolute inset-0 bg-ink-950/40" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(100deg, rgba(6,13,29,0.94) 0%, rgba(6,13,29,0.7) 42%, rgba(6,13,29,0.18) 74%, rgba(6,13,29,0.45) 100%)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/35" />
        </>
      ) : (
        <div className="absolute inset-0 bg-radial-primary" />
      )}

      <div className="grid-lines pointer-events-none absolute inset-0" />
      <span
        className="watermark pointer-events-none absolute -right-4 top-24 hidden text-[15vw] leading-none lg:block"
        style={{ color: watermarkColor }}
      >
        {title}
      </span>

      <div className="relative z-10 w-full pb-28 pt-32 sm:pb-32 sm:pt-36 lg:pb-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            {badge && (
              <div className="animate-fade-up flex items-center gap-4">
                <span className="h-px w-10 bg-evangile-600" />
                <p className="section-eyebrow">{badge}</p>
              </div>
            )}

            <h1
              className="animate-fade-up mt-5 font-hero uppercase"
              style={{
                color: titleColor,
                fontSize: 'clamp(3rem, 8vw, 6rem)',
                lineHeight: 0.88,
                letterSpacing: '0.012em',
                fontWeight: 400,
                animationDelay: '0.08s',
              }}
            >
              {title}
            </h1>

            <span
              className="animate-fade-up mt-6 block h-px w-24 bg-evangile-600"
              style={{ animationDelay: '0.14s' }}
            />

            {subtitle && (
              <p
                className="animate-fade-up mt-6 max-w-2xl text-base leading-relaxed sm:text-lg"
                style={{ color: mutedColor, animationDelay: '0.2s' }}
              >
                {subtitle}
              </p>
            )}

            {children && (
              <div className="animate-fade-up mt-8" style={{ animationDelay: '0.26s' }}>
                {children}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fondu vers la section suivante + lueur rouge de séparation */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-24 sm:h-32">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent, rgb(var(--bg-rgb)) 92%)' }}
        />
        <div className="hero-glow-separator" />
      </div>
    </section>
  );
}
