import { useCallback, useEffect, useState } from 'react';
import { useReveal } from '../lib/hooks';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { UniversalHero } from '../components/UniversalHero';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import {
  ArrowRight, ArrowUpRight, Facebook, Instagram, Youtube, X, Play, Image as ImageIcon, Mic,
} from '../lib/icons';
import type { Page } from '../lib/navigation';
import { CHURCH } from '../lib/church';
import { YOUTUBE_CHANNEL } from '../lib/teachings';
import { imageSrcSet } from '../lib/images';
import { db, isSupabaseConfigured, buildContentMap, buildSettingsMap, getContent } from '../lib/supabase';
import { DEFAULT_GALLERY, type GalleryPhoto } from '../lib/gallery';
import { featuredSocialLinks } from '../lib/socials';

interface MediaPageProps {
  onNavigate: (page: Page) => void;
}

function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={`reveal ${visible ? 'in' : ''} ${className}`}>
      {children}
    </div>
  );
}

function GalleryLightbox({
  photos,
  index,
  onClose,
  onChange,
}: {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onChange: (next: number) => void;
}) {
  const item = photos[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onChange((index + 1) % photos.length);
      if (e.key === 'ArrowLeft') onChange((index - 1 + photos.length) % photos.length);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [index, photos.length, onClose, onChange]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={item.alt}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center border border-white/20 bg-black/50 text-white/80 transition-colors hover:border-white/60 hover:text-white"
        aria-label="Fermer"
      >
        <X className="h-5 w-5" />
      </button>
      <button
        onClick={() => onChange((index - 1 + photos.length) % photos.length)}
        className="absolute left-3 top-1/2 z-10 -translate-y-1/2 border border-white/20 bg-black/50 px-3 py-3 text-white/80 transition-colors hover:border-white/60 hover:text-white sm:left-6"
        aria-label="Photo précédente"
      >
        ‹
      </button>
      <figure className="max-w-5xl">
        <img src={item.src} alt={item.alt} className="max-h-[82vh] w-auto max-w-full object-contain" />
        <figcaption className="mt-4 text-center text-sm text-white/70">{item.caption}</figcaption>
      </figure>
      <button
        onClick={() => onChange((index + 1) % photos.length)}
        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 border border-white/20 bg-black/50 px-3 py-3 text-white/80 transition-colors hover:border-white/60 hover:text-white sm:right-6"
        aria-label="Photo suivante"
      >
        ›
      </button>
    </div>
  );
}

export function MediaPage({ onNavigate }: MediaPageProps) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [gallery, setGallery] = useState<GalleryPhoto[]>(DEFAULT_GALLERY);
  const [cm, setCm] = useState<Record<string, string>>({});
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const liveImage = getContent(cm, 'live', 'image', '/church-photo-1.webp');
  const channels = featuredSocialLinks(settingsMap);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const changeLightbox = useCallback((next: number) => setLightboxIndex(next), []);

  // Photos gérées dans Média & Communication → Médias (table media_items).
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        const items = await db.getActiveMedia();
        const photos = items
          .filter((item) => item.file_type === 'image' && item.file_url.trim())
          .map((item) => ({
            src: item.file_url,
            alt: item.description.trim() || item.title,
            caption: item.title,
          }));
        if (!cancelled && photos.length > 0) setGallery(photos);
      } catch {
        /* conserve les photos du site si la base est indisponible */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Photo de la section « En direct » pilotée depuis le back-office.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    db.getPageContents('media')
      .then((rows) => {
        if (!cancelled) setCm(buildContentMap(rows));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Canaux officiels (réseaux sociaux) réglés dans Paramètres → Réseaux sociaux.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    db.getSettings()
      .then((settings) => {
        if (!cancelled) setSettingsMap(buildSettingsMap(settings));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-bg text-cream font-sans mobile-bottom-pad">
      <SiteHeader onNavigate={onNavigate} activePage="media" />
      <MobileNav onNavigate={onNavigate} active="media" />

      <UniversalHero
        pageKey="media"
        defaultBadge="Médias"
        defaultTitle="Nos médias"
        defaultSubtitle="Les vidéos, les photos et les plateformes officielles de l'Église La Conquête."
        bgImage="/predication-1.webp"
      />

      {/* ═══ PLATEFORMES ═══ */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <RevealSection>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="section-label">Nos canaux</p>
                <h2 className="section-title mt-4">Suivez-nous là où vous êtes</h2>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-muted">
                Chaque plateforme est tenue par le département de communication de l'église.
              </p>
            </div>
            <div className="rule-accent mt-6" />
          </RevealSection>

          {channels.length > 0 && (
            <div className="mt-10 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
              {channels.map(({ label, handle, description, href, Icon }, i) => (
                <RevealSection key={label} className={`reveal-delay-${(i % 4) + 1}`}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex h-full flex-col bg-bg-card p-7 transition-colors hover:bg-bg-elevated"
                  >
                    <div className="flex items-start justify-between">
                      <span className="inline-flex h-11 w-11 items-center justify-center border border-line text-evangile-600">
                        <Icon className="h-5 w-5" />
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                    <h3 className="card-title mt-6">{label}</h3>
                    {handle && (
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-evangile-600">
                        {handle}
                      </p>
                    )}
                    <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
                  </a>
                </RevealSection>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══ EN DIRECT ═══ */}
      <section className="relative overflow-hidden border-y border-line" aria-label="Culte en direct">
        <img
          src={liveImage}
          srcSet={imageSrcSet(liveImage)}
          sizes="100vw"
          alt=""
          aria-hidden="true"
          className="photo-claro-strong absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="photo-veil-strong absolute inset-0" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 md:py-20 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-evangile-500">
              <span className="h-1.5 w-1.5 rounded-full bg-evangile-500" />
              En direct
            </div>
            <h2 className="section-title mt-4" style={{ color: '#FFFFFF' }}>
              Le culte, où que vous soyez
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/70 sm:text-base">
              Retrouvez les cultes et les temps de prière en direct sur YouTube et Facebook.
              Les vidéos restent disponibles après la diffusion.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={YOUTUBE_CHANNEL.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              <Youtube className="h-4 w-4" /> YouTube
            </a>
            <a
              href={CHURCH.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost border-white/30 text-white hover:bg-white/10"
            >
              <Facebook className="h-4 w-4" /> Facebook
            </a>
          </div>
        </div>
      </section>

      {/* ═══ PRÉDICATIONS ═══ */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-px bg-line lg:grid-cols-2">
          <RevealSection>
            <article className="flex h-full flex-col bg-bg-card p-8 md:p-10">
              <span className="inline-flex h-11 w-11 items-center justify-center border border-line text-evangile-600">
                <Mic className="h-5 w-5" />
              </span>
              <p className="section-eyebrow mt-6">Prédications</p>
              <h2 className="card-title mt-3">L'archive des messages</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Toutes les prédications de l'église, classées par année, avec un accès direct
                à la vidéo. Les dernières publications apparaissent en premier.
              </p>
              <button onClick={() => onNavigate('predications')} className="btn-link mt-6">
                Voir toutes les prédications <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          </RevealSection>
          <RevealSection className="reveal-delay-1">
            <article className="flex h-full flex-col bg-bg-card p-8 md:p-10">
              <span className="inline-flex h-11 w-11 items-center justify-center border border-line text-evangile-600">
                <Play className="h-5 w-5" />
              </span>
              <p className="section-eyebrow mt-6">Chaîne officielle</p>
              <h2 className="card-title mt-3">La Conquête sur YouTube</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Abonnez-vous à la chaîne {YOUTUBE_CHANNEL.handle} pour être averti des nouvelles
                vidéos et des directs.
              </p>
              <a
                href={YOUTUBE_CHANNEL.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-link mt-6"
              >
                Ouvrir la chaîne <ArrowUpRight className="h-4 w-4" />
              </a>
            </article>
          </RevealSection>
        </div>
      </section>

      {/* ═══ GALERIE ═══ */}
      <section className="border-y border-line bg-bg-card px-4 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <RevealSection>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="section-label">Moments de grâce</p>
                <h2 className="section-title mt-4">Notre galerie</h2>
              </div>
              <a
                href={CHURCH.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-link"
              >
                Tous les albums sur Facebook <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
            <div className="rule-accent mt-6" />
          </RevealSection>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((photo, i) => (
              <RevealSection key={`${photo.src}-${i}`} className={`reveal-delay-${(i % 3) + 1}`}>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="group relative block w-full overflow-hidden"
                  aria-label={`Agrandir : ${photo.caption}`}
                >
                  <img
                    src={photo.src}
                    srcSet={imageSrcSet(photo.src)}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    alt={photo.alt}
                    className="photo-claro photo-hover-clear h-52 w-full object-cover transition-[transform,filter] duration-700 group-hover:scale-105 sm:h-64"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-ink-950/60 px-4 py-3 text-left backdrop-blur-sm">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                      {photo.caption}
                    </span>
                    <ImageIcon className="h-4 w-4 text-white/70" />
                  </span>
                </button>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto flex max-w-4xl flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-eyebrow">Rester connecté</p>
            <h2 className="section-title mt-4 text-[clamp(1.8rem,3.4vw,2.5rem)]">
              Ne manquez aucun rendez-vous
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
              Les annonces et les horaires de la semaine sont publiés sur nos plateformes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => onNavigate('activities')} className="btn-primary">
              Voir les activités <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => onNavigate('contact')} className="btn-ghost">
              Nous contacter
            </button>
          </div>
        </div>
      </section>

      <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />

      {lightboxIndex !== null && (
        <GalleryLightbox photos={gallery} index={lightboxIndex} onClose={closeLightbox} onChange={changeLightbox} />
      )}
    </div>
  );
}
