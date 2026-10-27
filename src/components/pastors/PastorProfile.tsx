import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight, ArrowUpRight, ArrowLeft, ChevronLeft, ChevronRight, Play, X,
} from '../../lib/icons';
import { imageSrcSet } from '../../lib/images';
import {
  formatItemDate, initials, isExternal, itemSourceLabel, itemThumbnail, linkLabel, mediaHost, pastorLinks, withProtocol,
} from '../../lib/pastors';
import type { Pastor, PastorItem } from '../../types';

const PAPER = '#f4f0e9';
const INK = '#0f1248';
const RED = '#c61a18';

interface ProfileSectionProps {
  id: string;
  number: string;
  title: string;
  children: ReactNode;
}

function ProfileSection({ id, number, title, children }: ProfileSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-[#0f1248]/15 pt-8 first:border-t-0 first:pt-0">
      <div className="flex items-baseline gap-4">
        <span className="font-hero text-sm" style={{ color: RED }}>{number}</span>
        <h2 className="font-hero text-[clamp(1.6rem,3vw,2.25rem)] uppercase leading-none" style={{ color: INK }}>
          {title}
        </h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/* Visionneuse de la galerie : dialogue natif, flèches clavier, fond marine. */
interface GalleryLightboxProps {
  photos: PastorItem[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

function GalleryLightbox({ photos, index, onClose, onNavigate }: GalleryLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const photo = index !== null ? photos[index] : null;
  const open = !!photo;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    }
    if (!open && dialog.open) {
      dialog.close();
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!photo || index === null) return <dialog ref={dialogRef} className="hidden" aria-hidden="true" />;

  const go = (delta: number) => onNavigate((index + delta + photos.length) % photos.length);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={(event) => {
        if (photos.length < 2) return;
        if (event.key === 'ArrowLeft') go(-1);
        if (event.key === 'ArrowRight') go(1);
      }}
      aria-label={`Galerie de ${photos.length} photo${photos.length > 1 ? 's' : ''}`}
      className="m-auto w-[calc(100%-1.5rem)] max-w-[1100px] bg-transparent p-0 text-[#f4f0e9] [&::backdrop]:bg-[#0f1248]/92 [&::backdrop]:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f4f0e9]/60">
            {index + 1} / {photos.length}
          </span>
          <button
            onClick={onClose}
            aria-label="Fermer la galerie"
            className="inline-flex h-9 w-9 items-center justify-center border border-[#f4f0e9]/30 transition-colors hover:border-[#f4f0e9]/70 hover:bg-[#f4f0e9]/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <img
          src={photo.image_url}
          alt={photo.title || ''}
          className="mx-auto max-h-[72vh] w-auto max-w-full object-contain"
        />

        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            {photo.title && <p className="text-sm font-semibold">{photo.title}</p>}
            {photo.description && (
              <p className="mt-1 text-xs leading-relaxed text-[#f4f0e9]/60">{photo.description}</p>
            )}
          </div>
          {photos.length > 1 && (
            <div className="flex shrink-0 gap-px">
              <button
                onClick={() => go(-1)}
                aria-label="Photo précédente"
                className="inline-flex h-10 w-10 items-center justify-center border border-[#f4f0e9]/25 transition-colors hover:bg-[#f4f0e9]/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => go(1)}
                aria-label="Photo suivante"
                className="inline-flex h-10 w-10 items-center justify-center border border-[#f4f0e9]/25 transition-colors hover:bg-[#f4f0e9]/10"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}

interface PastorProfileProps {
  pastor: Pastor;
  all: Pastor[];
  items: PastorItem[];
  onBack: () => void;
  onHome: () => void;
  onOpen: (pastor: Pastor) => void;
  onContact: () => void;
}

export function PastorProfile({ pastor, all, items, onBack, onHome, onOpen, onContact }: PastorProfileProps) {
  const index = all.findIndex((p) => p.id === pastor.id);
  const next = all.length > 1 ? all[(index + 1) % all.length] : null;
  const links = pastorLinks(pastor);
  const mediaUrls = (pastor.media_urls || []).filter((url) => url && url.trim());
  const bio = (pastor.extended_bio || '').trim() || (pastor.bio || '').trim();
  const family = (pastor.family || '').trim();
  const ministry = (pastor.ministry || '').trim();
  const hasLinks = links.length > 0 || mediaUrls.length > 0;

  const predications = items.filter((item) => item.kind === 'predication' && item.url.trim());
  const articles = items.filter((item) => item.kind === 'article' && item.url.trim());
  const photos = items.filter((item) => item.kind === 'photo' && item.image_url.trim());
  const [zoom, setZoom] = useState<number | null>(null);

  useEffect(() => {
    document.title = `${pastor.name} — ${pastor.role} | La Conquête`;
    return () => { document.title = 'Église Évangélique La Conquête — Lubumbashi, RDC'; };
  }, [pastor.name, pastor.role]);

  useEffect(() => { setZoom(null); }, [pastor.id]);

  // Le sommaire suit l'ordre réel des sections affichées.
  const blocks = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    if (bio) list.push({ id: 'biographie', label: 'Biographie' });
    if (family) list.push({ id: 'famille', label: 'Famille' });
    if (ministry) list.push({ id: 'ministere', label: 'Ministère' });
    if (predications.length) list.push({ id: 'predications', label: 'Prédications' });
    if (articles.length) list.push({ id: 'articles', label: 'Articles' });
    if (photos.length) list.push({ id: 'galerie', label: 'Galerie' });
    if (hasLinks) list.push({ id: 'reseaux', label: 'Réseaux & médias' });
    return list;
  }, [bio, family, ministry, hasLinks, predications.length, articles.length, photos.length]);

  const num = (id: string) => String(blocks.findIndex((block) => block.id === id) + 1).padStart(2, '0');

  const number = index >= 0 ? String(index + 1).padStart(2, '0') : '01';

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: PAPER, color: INK }}>
      {/* ── Barre autonome : le dossier ne reprend pas la navigation du site ── */}
      <header className="sticky top-0 z-40 border-b border-[#0f1248]/12 backdrop-blur" style={{ backgroundColor: `${PAPER}e6` }}>
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <button onClick={onHome} className="flex items-center gap-3" aria-label="Retour à l'accueil du site">
            <span className="flex h-10 items-center px-3" style={{ backgroundColor: INK }}>
              <img src="/logo-conquete.png" alt="La Conquête" className="h-6 w-auto" />
            </span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.28em] text-[#0f1248]/55 sm:block">
              Dossier pastoral
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 border border-[#0f1248]/20 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#0f1248]/70 transition-colors hover:border-[#0f1248]/50 hover:text-[#0f1248] sm:px-4 sm:text-[10px]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Équipe
            </button>
            <button
              onClick={onHome}
              className="px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-85 sm:px-4 sm:text-[10px]"
              style={{ backgroundColor: INK }}
            >
              Retour au site
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ── Couverture ── */}
        <section className="mx-auto grid max-w-[1400px] lg:grid-cols-[0.92fr_1.08fr]">
          <figure className="relative min-h-[420px] overflow-hidden lg:min-h-[660px]" style={{ backgroundColor: INK }}>
            {pastor.photo_url ? (
              <img
                src={pastor.photo_url}
                srcSet={imageSrcSet(pastor.photo_url)}
                sizes="(min-width: 1024px) 46vw, 100vw"
                alt={pastor.name}
                loading="eager"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-hero text-[clamp(4rem,14vw,9rem)] leading-none text-white/15">{initials(pastor.name)}</span>
              </div>
            )}
            <span className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: RED }} />
            <span className="absolute bottom-4 right-4 font-hero text-sm text-white/45" aria-hidden="true">
              {number} / {String(all.length).padStart(2, '0')}
            </span>
          </figure>

          <div className="px-5 py-10 sm:px-10 lg:py-16">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: RED }}>
              Dossier pastoral · {number}
            </p>
            <h1 className="mt-5 font-hero text-[clamp(2.6rem,6vw,5rem)] uppercase leading-[0.88]" style={{ color: INK }}>
              {pastor.name}
            </h1>
            {pastor.role && (
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#0f1248]/60">
                {pastor.role}
              </p>
            )}

            {pastor.thought && (
              <blockquote className="mt-8 border-l-2 pl-5" style={{ borderColor: RED }}>
                <p className="font-serif text-[clamp(1.1rem,1.8vw,1.35rem)] italic leading-relaxed text-[#0f1248]/80">
                  « {pastor.thought} »
                </p>
                <cite className="mt-3 block text-[9px] font-semibold uppercase not-italic tracking-[0.24em] text-[#0f1248]/45">
                  {pastor.name}
                </cite>
              </blockquote>
            )}

            <dl className="mt-10 grid gap-6 border-y border-[#0f1248]/12 py-6 sm:grid-cols-2">
              {[
                { label: 'Fonction', value: pastor.role },
                { label: 'Famille', value: family },
                { label: 'Ministère', value: ministry },
                { label: 'Contact', value: [pastor.email, pastor.phone].filter(Boolean).join(' · ') },
              ].filter((fact) => fact.value).map((fact) => (
                <div key={fact.label}>
                  <dt className="text-[9px] font-semibold uppercase tracking-[0.26em] text-[#0f1248]/45">{fact.label}</dt>
                  <dd className="mt-1.5 text-sm font-semibold leading-snug" style={{ color: INK }}>{fact.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={onContact}
                className="inline-flex items-center gap-2 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-85"
                style={{ backgroundColor: RED }}
              >
                Prendre contact
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 border border-[#0f1248]/25 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0f1248]/70 transition-colors hover:border-[#0f1248]/60 hover:text-[#0f1248]"
              >
                Toute l'équipe
              </button>
            </div>
          </div>
        </section>

        {/* ── Corps du dossier ── */}
        <section className="border-t border-[#0f1248]/15">
          <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
            <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#0f1248]/40">Sommaire</p>
              {blocks.length > 0 ? (
                <ul className="mt-4 space-y-3 border-t border-[#0f1248]/15 pt-4">
                  {blocks.map((section, i) => (
                    <li key={section.id}>
                      <button
                        onClick={() => scrollTo(section.id)}
                        className="group flex w-full items-baseline gap-3 text-left"
                      >
                        <span className="font-hero text-xs text-[#0f1248]/35">{String(i + 1).padStart(2, '0')}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0f1248]/65 transition-colors group-hover:text-[#c61a18]">
                          {section.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 border-t border-[#0f1248]/15 pt-4 text-[11px] leading-relaxed text-[#0f1248]/50">
                  Le dossier détaillé est en cours de rédaction.
                </p>
              )}
              <div className="mt-8 border-t border-[#0f1248]/15 pt-4 text-[10px] uppercase leading-relaxed tracking-[0.18em] text-[#0f1248]/45">
                Église Évangélique<br />La Conquête<br />Lubumbashi, RDC
              </div>
            </aside>

            <div className="space-y-14">
              {blocks.length === 0 && (
                <ProfileSection id="redaction" number="01" title="Fiche en cours de rédaction">
                  <p className="max-w-xl text-[15px] leading-[1.85] text-[#0f1248]/70">
                    Le dossier détaillé de {pastor.name} n'est pas encore publié. Le bureau pastoral reste joignable
                    pour toute information le concernant.
                  </p>
                  <button
                    onClick={onContact}
                    className="mt-6 inline-flex items-center gap-2 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-85"
                    style={{ backgroundColor: RED }}
                  >
                    Écrire au bureau pastoral
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </ProfileSection>
              )}

              {bio && (
                <ProfileSection id="biographie" number={num('biographie')} title="Biographie">
                  <p className="whitespace-pre-line text-[15px] leading-[1.85] text-[#0f1248]/80 first-letter:float-left first-letter:mr-3 first-letter:font-hero first-letter:text-[4.2rem] first-letter:leading-[0.78] first-letter:text-[#c61a18]">
                    {bio}
                  </p>
                </ProfileSection>
              )}

              {family && (
                <ProfileSection id="famille" number={num('famille')} title="Famille">
                  <p className="whitespace-pre-line text-[15px] leading-[1.85] text-[#0f1248]/80">{family}</p>
                </ProfileSection>
              )}

              {ministry && (
                <ProfileSection id="ministere" number={num('ministere')} title="Ministère">
                  <p className="whitespace-pre-line text-[15px] leading-[1.85] text-[#0f1248]/80">{ministry}</p>
                </ProfileSection>
              )}

              {predications.length > 0 && (
                <ProfileSection id="predications" number={num('predications')} title="Prédications">
                  <div className="grid gap-px border border-[#0f1248]/15 bg-[#0f1248]/15 sm:grid-cols-2">
                    {predications.map((item) => {
                      const thumb = itemThumbnail(item);
                      const href = item.url.startsWith('#') ? item.url : withProtocol(item.url);
                      return (
                        <a
                          key={item.id}
                          href={href}
                          target={isExternal(href) ? '_blank' : undefined}
                          rel={isExternal(href) ? 'noopener noreferrer' : undefined}
                          className="group flex flex-col bg-[#f4f0e9] p-3 transition-colors hover:bg-white"
                        >
                          <span className="relative block aspect-video w-full overflow-hidden" style={{ backgroundColor: INK }}>
                            {thumb ? (
                              <img
                                src={thumb}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.03]"
                              />
                            ) : (
                              <span className="absolute inset-0 grid-lines opacity-40" aria-hidden="true" />
                            )}
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: RED }}>
                                <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
                              </span>
                            </span>
                          </span>
                          <span className="mt-3 flex flex-1 flex-col">
                            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#0f1248]/45">
                              {[formatItemDate(item.published_at), itemSourceLabel(href)].filter(Boolean).join(' · ')}
                            </span>
                            <span className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug" style={{ color: INK }}>
                              {item.title || 'Prédication'}
                            </span>
                            {item.description && (
                              <span className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[#0f1248]/60">
                                {item.description}
                              </span>
                            )}
                            <span className="mt-3 inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color: RED }}>
                              Regarder
                              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                            </span>
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </ProfileSection>
              )}

              {articles.length > 0 && (
                <ProfileSection id="articles" number={num('articles')} title="Articles">
                  <ul className="divide-y divide-[#0f1248]/10 border-y border-[#0f1248]/15">
                    {articles.map((item) => {
                      const href = item.url.startsWith('#') ? item.url : withProtocol(item.url);
                      return (
                        <li key={item.id}>
                          <a
                            href={href}
                            target={isExternal(href) ? '_blank' : undefined}
                            rel={isExternal(href) ? 'noopener noreferrer' : undefined}
                            className="group flex items-start justify-between gap-4 py-4"
                          >
                            <span className="min-w-0">
                              <span className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-[#0f1248]/45">
                                {[formatItemDate(item.published_at), itemSourceLabel(href)].filter(Boolean).join(' · ')}
                              </span>
                              <span className="mt-1.5 block text-[15px] font-semibold leading-snug" style={{ color: INK }}>
                                {item.title || 'Article'}
                              </span>
                              {item.description && (
                                <span className="mt-1 block line-clamp-2 text-[13px] leading-relaxed text-[#0f1248]/60">
                                  {item.description}
                                </span>
                              )}
                            </span>
                            <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[#0f1248]/40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#c61a18]" />
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </ProfileSection>
              )}

              {photos.length > 0 && (
                <ProfileSection id="galerie" number={num('galerie')} title="Galerie">
                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                    {photos.map((item, i) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setZoom(i)}
                        className="group relative block aspect-square overflow-hidden"
                        style={{ backgroundColor: INK }}
                        aria-label={item.title ? `Agrandir : ${item.title}` : 'Agrandir la photo'}
                      >
                        <img
                          src={item.image_url}
                          alt={item.title || ''}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                        <span className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-[#0f1248]/85 to-transparent p-2 text-left opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                          <span className="line-clamp-1 text-[10px] font-medium text-white">{item.title || 'Agrandir'}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </ProfileSection>
              )}

              {hasLinks && (
                <ProfileSection
                  id="reseaux"
                  number={num('reseaux')}
                  title="Réseaux & médias"
                >
                  {links.length > 0 && (
                    <ul className="divide-y divide-[#0f1248]/10 border-y border-[#0f1248]/15">
                      {links.map((link) => (
                        <li key={link.key}>
                          <a
                            href={link.href}
                            target={isExternal(link.href) ? '_blank' : undefined}
                            rel={isExternal(link.href) ? 'noopener noreferrer' : undefined}
                            className="group flex items-center justify-between gap-4 py-4"
                          >
                            <span className="flex items-center gap-3">
                              <link.Icon className="h-4 w-4" />
                              <span className="text-sm font-medium">{linkLabel(link)}</span>
                            </span>
                            <span className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#0f1248]/45">
                              Ouvrir
                              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}

                  {mediaUrls.length > 0 && (
                    <ul className={`space-y-px ${links.length > 0 ? 'mt-4' : 'border-y border-[#0f1248]/15 py-4'}`}>
                      {mediaUrls.map((url) => (
                        <li key={url}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-4 border border-[#0f1248]/15 px-4 py-3 text-xs text-[#0f1248]/70 transition-colors hover:border-[#c61a18] hover:text-[#0f1248]"
                          >
                            <span className="truncate">{mediaHost(url)}</span>
                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </ProfileSection>
              )}
            </div>
          </div>
        </section>

        {/* ── Fiche suivante + retours ── */}
        {next && (
          <section className="border-t border-[#0f1248]/15" style={{ backgroundColor: INK }}>
            <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-5 py-12 text-[#f4f0e9] sm:flex-row sm:items-end sm:justify-between sm:px-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#f4f0e9]/50">Fiche suivante</p>
                <button onClick={() => onOpen(next)} className="group mt-3 flex items-end gap-4 text-left">
                  <span className="font-hero text-[clamp(1.8rem,4vw,3rem)] uppercase leading-none transition-colors group-hover:text-[#ff5a52]">
                    {next.name}
                  </span>
                  <ArrowRight className="mb-1 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
                </button>
                {next.role && (
                  <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#f4f0e9]/45">{next.role}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={onBack}
                  className="border border-[#f4f0e9]/25 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors hover:bg-[#f4f0e9]/10"
                >
                  Toute l'équipe
                </button>
                <button
                  onClick={onHome}
                  className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-85"
                  style={{ backgroundColor: RED }}
                >
                  Retour au site
                </button>
              </div>
            </div>
          </section>
        )}

      </main>

      <footer style={{ backgroundColor: INK }}>
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 border-t border-[#f4f0e9]/15 px-5 py-8 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#f4f0e9]/40 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>Église Évangélique La Conquête · Lubumbashi</span>
          <button onClick={onHome} className="text-left transition-colors hover:text-[#f4f0e9]">
            Retour au site
          </button>
        </div>
      </footer>

      {photos.length > 0 && (
        <GalleryLightbox
          photos={photos}
          index={zoom}
          onClose={() => setZoom(null)}
          onNavigate={setZoom}
        />
      )}
    </div>
  );
}
