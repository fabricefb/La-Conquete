import { useEffect, useRef } from 'react';
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, X } from '../../lib/icons';
import { imageSrcSet } from '../../lib/images';
import { initials, isExternal, linkLabel, pastorLinks } from '../../lib/pastors';
import type { Pastor } from '../../types';

interface PastorDrawerProps {
  pastor: Pastor | null;
  all: Pastor[];
  onClose: () => void;
  onOpen: (pastor: Pastor) => void;
  onFull: (pastor: Pastor) => void;
  onContact: () => void;
}

/* Tiroir de fiche : la page reste visible mais floutée derrière, seul un
   résumé du pasteur choisi est proposé avec un accès au dossier complet. */
export function PastorDrawer({ pastor, all, onClose, onOpen, onFull, onContact }: PastorDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const open = !!pastor;

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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pastor?.id]);

  if (!pastor) {
    return <dialog ref={dialogRef} onClose={onClose} className="hidden" aria-hidden="true" />;
  }

  const index = all.findIndex((p) => p.id === pastor.id);
  const number = index >= 0 ? String(index + 1).padStart(2, '0') : '01';
  const previous = all.length > 1 ? all[(index - 1 + all.length) % all.length] : null;
  const next = all.length > 1 ? all[(index + 1) % all.length] : null;
  const links = pastorLinks(pastor);
  const summary = (pastor.bio || pastor.extended_bio || '').trim();

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      aria-label={`Fiche de ${pastor.name}`}
      className="m-0 ml-auto h-[100dvh] max-h-none w-full max-w-[440px] border-l border-line bg-bg-card p-0 text-cream [&::backdrop]:bg-ink-950/55 [&::backdrop]:backdrop-blur-md max-sm:mt-auto max-sm:h-auto max-sm:max-h-[88dvh] max-sm:max-w-none max-sm:border-l-0 max-sm:border-t"
    >
      <div ref={scrollRef} className="flex h-full max-h-[inherit] flex-col overflow-y-auto">
        {/* ── Portrait ── */}
        <div className="group relative shrink-0 overflow-hidden bg-ink-900">
          {pastor.photo_url ? (
            <img
              src={pastor.photo_url}
              srcSet={imageSrcSet(pastor.photo_url)}
              sizes="(min-width: 640px) 440px, 100vw"
              alt={pastor.name}
              className="photo-claro aspect-[4/5] max-h-[52vh] w-full object-cover object-top max-sm:aspect-[16/10] max-sm:max-h-none"
            />
          ) : (
            <>
              <div className="grid-lines absolute inset-0 opacity-60" aria-hidden="true" />
              <div className="relative flex aspect-[4/5] max-h-[52vh] w-full items-center justify-center max-sm:aspect-[16/10] max-sm:max-h-none">
                <span className="font-hero text-7xl leading-none text-white/20">{initials(pastor.name)}</span>
              </div>
            </>
          )}
          <span className="absolute inset-x-0 top-0 h-0.5 bg-evangile-600" aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <span className="font-hero text-sm leading-none text-white/60">{number}</span>
            <button
              onClick={onClose}
              aria-label="Fermer la fiche"
              className="inline-flex h-9 w-9 items-center justify-center border border-white/25 bg-ink-950/45 text-white transition-colors hover:border-white/60 hover:bg-ink-950/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent p-5 pt-14">
            <h2 className="font-hero text-[clamp(1.6rem,2.6vw,2rem)] uppercase leading-none text-white">
              {pastor.name}
            </h2>
            {pastor.role && <p className="person-role mt-2 text-white/60">{pastor.role}</p>}
          </div>
        </div>

        {/* ── Résumé ── */}
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          {pastor.thought && (
            <blockquote className="border-l-2 border-evangile-600 pl-4">
              <p className="font-serif text-[15px] italic leading-relaxed text-cream/80">« {pastor.thought} »</p>
            </blockquote>
          )}

          {summary ? (
            <p className={`text-sm leading-relaxed text-muted ${pastor.thought ? 'mt-5' : ''} line-clamp-6 whitespace-pre-line`}>
              {summary}
            </p>
          ) : (
            <p className={`text-sm leading-relaxed text-muted ${pastor.thought ? 'mt-5' : ''}`}>
              La fiche complète de {pastor.name} est en cours de rédaction.
            </p>
          )}

          {links.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-px">
              {links.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    target={isExternal(link.href) ? '_blank' : undefined}
                    rel={isExternal(link.href) ? 'noopener noreferrer' : undefined}
                    aria-label={linkLabel(link)}
                    title={linkLabel(link)}
                    className="inline-flex h-9 w-9 items-center justify-center border border-line text-muted transition-colors hover:border-evangile-600 hover:text-evangile-600"
                  >
                    <link.Icon className="h-3.5 w-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <button onClick={() => onFull(pastor)} className="btn-primary w-full justify-between">
              Lire la suite
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onContact}
              className="inline-flex w-full items-center justify-between border border-line px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted transition-colors hover:border-evangile-600 hover:text-cream"
            >
              Prendre contact
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>

          {/* ── Navigation dans l'équipe ── */}
          {(previous || next) && (
            <div className="mt-auto grid grid-cols-2 gap-px border-t border-line pt-5">
              {previous ? (
                <button
                  onClick={() => onOpen(previous)}
                  className="group flex flex-col items-start gap-1 pr-2 text-left"
                >
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">
                    <ChevronLeft className="h-3 w-3" />
                    Avant
                  </span>
                  <span className="w-full truncate text-xs font-semibold text-cream transition-colors group-hover:text-evangile-600">
                    {previous.name}
                  </span>
                </button>
              ) : (
                <span />
              )}
              {next && (
                <button
                  onClick={() => onOpen(next)}
                  className="group flex flex-col items-end gap-1 border-l border-line pl-4 text-right"
                >
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">
                    Après
                    <ChevronRight className="h-3 w-3" />
                  </span>
                  <span className="w-full truncate text-xs font-semibold text-cream transition-colors group-hover:text-evangile-600">
                    {next.name}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
