import { useEffect, useState } from 'react';
import { db, buildContentMap, getContent, isSupabaseConfigured } from '../lib/supabase';
import { imageSrcSet } from '../lib/images';
import { PAGE_HERO_IMAGES } from '../lib/heroImages';

interface UniversalHeroProps {
  pageKey: string;
  defaultBadge: string;
  defaultTitle: string;
  defaultSubtitle?: string;
  bgImage?: string;
  children?: React.ReactNode;
}

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
    if (!isSupabaseConfigured) return;
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
  const heroBg = getContent(cm, 'hero', 'bg_image', '') || bgImage || PAGE_HERO_IMAGES[pageKey] || '';
  const onImage = Boolean(heroBg);

  const titleColor = onImage ? '#FFFFFF' : 'rgb(var(--text-rgb))';
  const mutedColor = onImage ? 'rgba(255,255,255,0.72)' : 'rgb(var(--text-muted-rgb))';
  const watermarkColor = onImage ? 'rgba(255,255,255,0.06)' : 'rgb(var(--text-rgb) / 0.05)';

  return (
    <section className="relative flex min-h-[62vh] items-end overflow-hidden border-b border-line sm:min-h-[68vh] lg:min-h-[76vh]">
      {heroBg ? (
        <>
          <img
            src={heroBg}
            srcSet={imageSrcSet(heroBg)}
            sizes="100vw"
            alt=""
            aria-hidden="true"
            {...{ fetchpriority: 'high' }}
            decoding="async"
            className="photo-claro-strong hero-reveal-wipe hero-slide-zoom absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="photo-veil absolute inset-0" />
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
