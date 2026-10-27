import { useEffect, useMemo, type ReactNode } from 'react';
import {
  ArrowRight, ArrowUpRight, ArrowLeft,
} from '../../lib/icons';
import { imageSrcSet } from '../../lib/images';
import { initials, isExternal, linkLabel, mediaHost, pastorLinks } from '../../lib/pastors';
import type { Pastor } from '../../types';

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

interface PastorProfileProps {
  pastor: Pastor;
  all: Pastor[];
  onBack: () => void;
  onHome: () => void;
  onOpen: (pastor: Pastor) => void;
  onContact: () => void;
}

export function PastorProfile({ pastor, all, onBack, onHome, onOpen, onContact }: PastorProfileProps) {
  const index = all.findIndex((p) => p.id === pastor.id);
  const next = all.length > 1 ? all[(index + 1) % all.length] : null;
  const links = pastorLinks(pastor);
  const mediaUrls = (pastor.media_urls || []).filter((url) => url && url.trim());
  const bio = (pastor.extended_bio || '').trim() || (pastor.bio || '').trim();
  const family = (pastor.family || '').trim();
  const ministry = (pastor.ministry || '').trim();
  const hasLinks = links.length > 0 || mediaUrls.length > 0;

  useEffect(() => {
    document.title = `${pastor.name} — ${pastor.role} | La Conquête`;
    return () => { document.title = 'Église Évangélique La Conquête — Lubumbashi, RDC'; };
  }, [pastor.name, pastor.role]);

  const sections = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    if (bio) list.push({ id: 'biographie', label: 'Biographie' });
    if (family) list.push({ id: 'famille', label: 'Famille' });
    if (ministry) list.push({ id: 'ministere', label: 'Ministère' });
    if (hasLinks) list.push({ id: 'reseaux', label: 'Réseaux & médias' });
    return list;
  }, [bio, family, ministry, hasLinks]);

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
              {sections.length > 0 ? (
                <ul className="mt-4 space-y-3 border-t border-[#0f1248]/15 pt-4">
                  {sections.map((section, i) => (
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
              {sections.length === 0 && (
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
                <ProfileSection id="biographie" number="01" title="Biographie">
                  <p className="whitespace-pre-line text-[15px] leading-[1.85] text-[#0f1248]/80 first-letter:float-left first-letter:mr-3 first-letter:font-hero first-letter:text-[4.2rem] first-letter:leading-[0.78] first-letter:text-[#c61a18]">
                    {bio}
                  </p>
                </ProfileSection>
              )}

              {family && (
                <ProfileSection id="famille" number={bio ? '02' : '01'} title="Famille">
                  <p className="whitespace-pre-line text-[15px] leading-[1.85] text-[#0f1248]/80">{family}</p>
                </ProfileSection>
              )}

              {ministry && (
                <ProfileSection id="ministere" number={String((bio ? 1 : 0) + (family ? 1 : 0) + 1).padStart(2, '0')} title="Ministère">
                  <p className="whitespace-pre-line text-[15px] leading-[1.85] text-[#0f1248]/80">{ministry}</p>
                </ProfileSection>
              )}

              {hasLinks && (
                <ProfileSection
                  id="reseaux"
                  number={String((bio ? 1 : 0) + (family ? 1 : 0) + (ministry ? 1 : 0) + 1).padStart(2, '0')}
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
    </div>
  );
}
