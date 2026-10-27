import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { getContent, supabase } from '../lib/supabase';
import { usePageContents } from '../lib/hooks/usePageContents';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { UniversalHero } from '../components/UniversalHero';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { PastorDrawer } from '../components/pastors/PastorDrawer';
import { PastorProfile } from '../components/pastors/PastorProfile';
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown } from '../lib/icons';
import { imageSrcSet } from '../lib/images';
import { findPastorBySlug, initials, pastorLinks, pastorSlug, withProtocol } from '../lib/pastors';
import type { Page } from '../lib/navigation';
import type { Pastor } from '../types';

const FALLBACK: Pastor[] = [
  { id: 'fb-1', name: 'Josué Romain Kazadi', role: 'Pasteur Principal', bio: 'Homme de Dieu visionnaire et passionné, il conduit l\'église avec sagesse et détermination.', photo_url: '/pasteur-romain-kazadi.webp', thought: 'La Parole de Dieu est notre boussole.', sort_order: 0, is_main: true, is_active: true, video_url: '', social_links: {}, extended_bio: '', media_urls: [], email: '', phone: '', created_at: '', updated_at: '' },
  { id: 'fb-2', name: 'Dr David Kateba', role: '1er Pasteur Assistant', bio: '', photo_url: '/pasteur-david-kateba.webp', thought: '', sort_order: 1, is_main: false, is_active: true, video_url: '', social_links: {}, extended_bio: '', media_urls: [], email: '', phone: '', created_at: '', updated_at: '' },
  { id: 'fb-3', name: 'Richard Mukendi', role: '2e Pasteur Assistant', bio: '', photo_url: '/pasteur-richard-mukendi.webp', thought: '', sort_order: 2, is_main: false, is_active: true, video_url: '', social_links: {}, extended_bio: '', media_urls: [], email: '', phone: '', created_at: '', updated_at: '' },
];

const PAPER = '#f4f0e9';
const INK = '#0f1248';
const RED = '#c61a18';

/* Un dossier vit sur #pasteurs/<slug> : l'adresse reste partageable et le
   routeur du site conserve le sous-chemin. */
function getSlugFromHash(): string | null {
  const raw = window.location.hash.replace('#', '').replace(/^\/+/, '');
  const [base, ...rest] = raw.split('/');
  if (base !== 'pasteurs') return null;
  const slug = rest.join('/').trim();
  return slug || null;
}

function PastorLinks({ pastor, className = '' }: { pastor: Pastor; className?: string }) {
  const links = pastorLinks(pastor);
  if (links.length === 0) return null;

  return (
    <ul className={`flex flex-wrap items-center gap-px ${className}`}>
      {links.map((link) => (
        <li key={link.key}>
          <a
            href={link.href}
            target={/^(mailto:|tel:)/i.test(link.href) ? undefined : '_blank'}
            rel={/^(mailto:|tel:)/i.test(link.href) ? undefined : 'noopener noreferrer'}
            aria-label={link.label}
            title={link.label}
            className="inline-flex h-9 w-9 items-center justify-center border border-line text-muted transition-colors hover:border-evangile-600 hover:text-evangile-600"
          >
            <link.Icon className="h-3.5 w-3.5" />
          </a>
        </li>
      ))}
    </ul>
  );
}

function Portrait({ pastor, priority = false, sizes = '(min-width: 1024px) 40vw, 100vw' }: { pastor: Pastor; priority?: boolean; sizes?: string }) {
  if (!pastor.photo_url) {
    return (
      <div role="img" aria-label={pastor.name} className="relative flex aspect-[4/5] w-full items-center justify-center bg-ink-900">
        <div className="grid-lines absolute inset-0 opacity-60" aria-hidden="true" />
        <span className="relative font-hero text-6xl leading-none text-white/20" aria-hidden="true">{initials(pastor.name)}</span>
      </div>
    );
  }

  return (
    <img
      src={pastor.photo_url}
      srcSet={imageSrcSet(pastor.photo_url)}
      sizes={sizes}
      alt={pastor.name}
      width={800}
      height={1000}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className="photo-claro photo-hover-clear aspect-[4/5] w-full object-cover object-top transition-[transform,filter] duration-700 group-hover:scale-[1.03]"
    />
  );
}

/* Détails complémentaires saisis au back-office : biographie longue,
   médias. Rien ne s'affiche tant que ces champs sont vides. */
function PastorDetails({ pastor }: { pastor: Pastor }) {
  const hasDetails = !!pastor.extended_bio?.trim() || (pastor.media_urls?.length ?? 0) > 0;
  if (!hasDetails) return null;

  return (
    <details className="group/details mt-5 border-t border-line pt-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted transition-colors hover:text-cream [&::-webkit-details-marker]:hidden">
        En savoir plus
        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300 group-open/details:rotate-180" />
      </summary>
      {pastor.extended_bio?.trim() && (
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-cream/75">{pastor.extended_bio}</p>
      )}
      {pastor.media_urls?.length > 0 && (
        <ul className="mt-4 space-y-px">
          {pastor.media_urls.map((url) => (
            <li key={url}>
              <a
                href={withProtocol(url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border border-line px-3 py-2 text-xs text-muted transition-colors hover:border-evangile-600 hover:text-cream"
              >
                <ArrowUpRight className="h-3 w-3 shrink-0" />
                <span className="truncate">{url}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

function SkeletonBlock() {
  return (
    <div className="animate-pulse border border-line bg-bg-elevated">
      <div className="aspect-[4/5] w-full bg-bg-elevated" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-24 bg-line" />
        <div className="h-3 w-40 bg-line" />
      </div>
    </div>
  );
}

/* Feuille de papier du dossier : sert de cadre aux états chargement/introuvable. */
function DossierShell({ children, onBack, onHome }: { children: ReactNode; onBack: () => void; onHome: () => void }) {
  return (
    <div className="flex min-h-screen flex-col font-sans" style={{ backgroundColor: PAPER, color: INK }}>
      <header className="border-b border-[#0f1248]/12">
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
      <div className="flex flex-1 items-center px-5 py-24 sm:px-8">
        <div className="mx-auto w-full max-w-xl">{children}</div>
      </div>
    </div>
  );
}

export function PasteursPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const cm = usePageContents('pasteurs');
  const [pastors, setPastors] = useState<Pastor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pastor | null>(null);
  const [slug, setSlug] = useState<string | null>(getSlugFromHash);

  useEffect(() => {
    let cancelled = false;
    async function fetchPastors() {
      try {
        const { data } = await supabase.from('pastors').select('*').eq('is_active', true).order('sort_order');
        if (!cancelled) setPastors((data && data.length > 0 ? data : FALLBACK) as Pastor[]);
      } catch {
        if (!cancelled) setPastors(FALLBACK);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPastors();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onHashChange = () => setSlug(getSlugFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Les blocs arrivent après le chargement : sans observateur recréé, ils
  // restent à opacity 0 (classe .reveal) et la page paraît vide.
  useEffect(() => {
    if (loading || slug) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
    );
    document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [loading, slug]);

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  const openDossier = useCallback((pastor: Pastor) => {
    setSelected(null);
    window.location.hash = `pasteurs/${pastorSlug(pastor.name)}`;
  }, []);

  const leaveDossier = useCallback(() => {
    window.location.hash = 'pasteurs';
  }, []);

  /* ── Dossier autonome ── */
  if (slug) {
    const profile = findPastorBySlug(pastors, slug);

    if (loading) {
      return (
        <DossierShell onBack={leaveDossier} onHome={() => onNavigate('home')}>
          <div className="space-y-4">
            <div className="h-2 w-28 animate-pulse" style={{ backgroundColor: `${INK}1a` }} />
            <div className="h-12 w-3/4 animate-pulse" style={{ backgroundColor: `${INK}14` }} />
            <div className="h-3 w-full animate-pulse" style={{ backgroundColor: `${INK}0f` }} />
            <div className="h-3 w-2/3 animate-pulse" style={{ backgroundColor: `${INK}0f` }} />
          </div>
        </DossierShell>
      );
    }

    if (!profile) {
      return (
        <DossierShell onBack={leaveDossier} onHome={() => onNavigate('home')}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: RED }}>Fiche introuvable</p>
          <h1 className="mt-4 font-hero text-[clamp(2rem,5vw,3.2rem)] uppercase leading-[0.9]" style={{ color: INK }}>
            Ce dossier n'existe pas
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[#0f1248]/70">
            Le lien est peut-être incomplet ou la fiche a été renommée. L'équipe pastorale reste accessible depuis la page de l'église.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={leaveDossier}
              className="inline-flex items-center gap-2 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-85"
              style={{ backgroundColor: RED }}
            >
              Toute l'équipe
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="border border-[#0f1248]/25 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0f1248]/70 transition-colors hover:border-[#0f1248]/60 hover:text-[#0f1248]"
            >
              Retour au site
            </button>
          </div>
        </DossierShell>
      );
    }

    return (
      <PastorProfile
        pastor={profile}
        all={pastors}
        onBack={leaveDossier}
        onHome={() => onNavigate('home')}
        onContact={() => onNavigate('contact')}
        onOpen={openDossier}
      />
    );
  }

  /* ── Équipe pastorale ── */
  const principal = pastors.find((p) => p.is_main);
  const team = pastors.filter((p) => p.id !== principal?.id);
  const firstTeamNumber = principal ? 2 : 1;

  const principauxLabel = getContent(cm, 'principaux', 'heading_label', 'Direction');
  const principauxTitle = getContent(cm, 'principaux', 'heading_title', 'Le pasteur principal');
  const equipeLabel = getContent(cm, 'equipe', 'heading_label', "L'équipe");
  const equipeTitle = getContent(cm, 'equipe', 'heading_title', "L'équipe pastorale");
  const ctaLabel = getContent(cm, 'cta', 'label', "Rejoindre l'équipe");
  const ctaTitle = getContent(cm, 'cta', 'title', 'Vous sentez un appel ?');
  const ctaText = getContent(
    cm,
    'cta',
    'text',
    'Contactez le bureau pastoral pour en parler et être accompagné dans votre discernement.',
  );
  const ctaButton = getContent(cm, 'cta', 'button', 'Nous contacter');

  return (
    <>
      <div className={`bg-bg min-h-screen mobile-bottom-pad transition-[filter] duration-500 ${selected ? 'blur-[3px]' : ''}`}>
        <SiteHeader activePage="pasteurs" onNavigate={onNavigate} />
        <MobileNav active="pasteurs" onNavigate={onNavigate} />

        <UniversalHero
          pageKey="pasteurs"
          defaultBadge="Serviteurs de Dieu"
          defaultTitle="Notre équipe pastorale"
          defaultSubtitle="Des hommes et des femmes appelés et équipés pour servir l'Église et la communauté."
          bgImage="/church-photo-3.webp"
        />

        {/* ═══ DIRECTION ═══ */}
        {(loading || principal) && (
          <section className="border-b border-line px-4 py-16 md:py-24">
            <div className="mx-auto max-w-7xl">
              <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
                <div className="reveal mx-auto w-full max-w-[420px] lg:col-span-5 lg:mx-0 lg:max-w-none">
                  {loading ? (
                    <SkeletonBlock />
                  ) : principal && (
                    <button
                      type="button"
                      onClick={() => setSelected(principal)}
                      aria-label={`Ouvrir la fiche de ${principal.name}`}
                      className="group portrait-frame block w-full text-left"
                    >
                      <Portrait pastor={principal} priority />
                      <span className="absolute inset-x-0 top-0 h-0.5 bg-evangile-600" aria-hidden="true" />
                      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent p-5">
                        <span className="block">
                          <span className="block font-hero text-[clamp(1.5rem,2.6vw,2.1rem)] uppercase leading-none text-white">
                            {principal.name}
                          </span>
                          {principal.role && (
                            <span className="person-role mt-2 block text-[9px] tracking-[0.16em] text-white/60 sm:text-[11px] sm:tracking-[0.22em]">
                              {principal.role}
                            </span>
                          )}
                        </span>
                        <span className="hidden font-hero text-sm leading-none text-white/40 sm:block" aria-hidden="true">01</span>
                      </span>
                      <span className="absolute inset-0 hidden items-center justify-center bg-ink-950/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:flex" aria-hidden="true">
                        <span className="inline-flex items-center gap-2 border border-white/45 px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white">
                          Ouvrir la fiche
                          <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </span>
                    </button>
                  )}
                </div>

                <div className="reveal reveal-delay-1 lg:col-span-7">
                  <p className="section-label">{principauxLabel}</p>
                  <h2 className="section-title mt-4">{principauxTitle}</h2>
                  <div className="rule-accent mt-6" />

                  {loading ? (
                    <div className="mt-8 space-y-3">
                      <div className="h-3 w-full max-w-md animate-pulse bg-line" />
                      <div className="h-3 w-full max-w-sm animate-pulse bg-line" />
                      <div className="h-3 w-2/3 animate-pulse bg-line" />
                    </div>
                  ) : principal && (
                    <>
                      {principal.bio && (
                        <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-cream/80 sm:text-base">
                          {principal.bio}
                        </p>
                      )}

                      {principal.thought && (
                        <blockquote className="mt-8 border-l-2 border-evangile-600 pl-5">
                          <p className="verse-quote text-[clamp(1.15rem,2.2vw,1.55rem)]">« {principal.thought} »</p>
                          <cite className="mt-3 block text-[10px] font-semibold uppercase not-italic tracking-[0.24em] text-evangile-600">
                            {principal.name}
                          </cite>
                        </blockquote>
                      )}

                      <PastorDetails pastor={principal} />

                      <div className="mt-8 flex flex-wrap items-center gap-4">
                        <button onClick={() => setSelected(principal)} className="btn-primary">
                          Ouvrir la fiche
                          <ArrowRight className="h-4 w-4" />
                        </button>
                        <PastorLinks pastor={principal} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ═══ ÉQUIPE ═══ */}
        {(loading || team.length > 0) && (
          <section className="px-4 py-16 md:py-24">
            <div className="mx-auto max-w-7xl">
              <div className="reveal flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="section-label">{equipeLabel}</p>
                  <h2 className="section-title mt-4">{equipeTitle}</h2>
                </div>
                <div className="flex items-end gap-3">
                  <span className="stat-figure text-[3.2rem] text-evangile-600/25">
                    {String(pastors.length).padStart(2, '0')}
                  </span>
                  <span className="person-role mb-1">{pastors.length > 1 ? 'pasteurs' : 'pasteur'}</span>
                </div>
              </div>

              <div className="reveal mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {loading
                  ? Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="bg-bg-card p-4">
                        <SkeletonBlock />
                      </div>
                    ))
                  : team.map((pastor, index) => (
                      <article key={pastor.id} className="group flex flex-col overflow-hidden border border-line bg-bg-card transition-colors duration-300 hover:border-evangile-600/40">
                        <button
                          type="button"
                          onClick={() => setSelected(pastor)}
                          aria-label={`Ouvrir la fiche de ${pastor.name}`}
                          className="relative block overflow-hidden text-left"
                        >
                          <Portrait pastor={pastor} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 45vw, 88vw" />
                          <span className="absolute inset-x-0 top-0 z-10 h-0.5 bg-evangile-600/0 transition-colors duration-300 group-hover:bg-evangile-600" aria-hidden="true" />
                          <span className="absolute right-4 top-4 z-10 font-hero text-sm leading-none text-white/45" aria-hidden="true">
                            {String(index + firstTeamNumber).padStart(2, '0')}
                          </span>
                          <span className="absolute inset-x-0 bottom-0 z-10 block bg-gradient-to-t from-ink-950 via-ink-950/55 to-transparent p-5">
                            <span className="person-name block text-white">{pastor.name}</span>
                            {pastor.role && (
                              <span className="person-role mt-1.5 block text-[9px] tracking-[0.16em] text-white/60 sm:text-[10px] sm:tracking-[0.2em]">
                                {pastor.role}
                              </span>
                            )}
                          </span>
                          <span className="absolute inset-0 z-20 hidden items-center justify-center bg-ink-950/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:flex" aria-hidden="true">
                            <span className="inline-flex items-center gap-2 border border-white/45 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white">
                              Ouvrir la fiche
                              <ArrowUpRight className="h-3 w-3" />
                            </span>
                          </span>
                        </button>

                        <div className="flex flex-1 flex-col p-5">
                          {pastor.bio && (
                            <p className="text-sm leading-relaxed text-muted line-clamp-3">{pastor.bio}</p>
                          )}
                          {pastor.thought && (
                            <p className="mt-4 border-l-2 border-evangile-600 pl-4 font-serif text-[13px] italic leading-relaxed text-cream/70">
                              « {pastor.thought} »
                            </p>
                          )}
                          <PastorDetails pastor={pastor} />
                          <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                            <PastorLinks pastor={pastor} />
                            <button
                              onClick={() => setSelected(pastor)}
                              className="inline-flex shrink-0 items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-evangile-600 transition-opacity hover:opacity-80"
                            >
                              Ouvrir la fiche
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══ APPEL ═══ */}
        <section className="border-t border-line bg-bg-card px-4 py-16 md:py-24">
          <div className="reveal mx-auto max-w-7xl">
            <div className="grid gap-8 border border-line bg-bg p-8 md:grid-cols-12 md:items-center md:p-12">
              <div className="md:col-span-8">
                <p className="section-eyebrow">{ctaLabel}</p>
                <h2 className="section-title mt-4 text-[clamp(1.9rem,3.6vw,2.8rem)]">{ctaTitle}</h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">{ctaText}</p>
              </div>
              <div className="md:col-span-4 md:justify-self-end">
                <button onClick={() => onNavigate('contact')} className="btn-primary w-full sm:w-auto">
                  {ctaButton}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="footer-spacer" />
        <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
      </div>

      <PastorDrawer
        pastor={selected}
        all={pastors}
        onClose={() => setSelected(null)}
        onOpen={setSelected}
        onFull={openDossier}
        onContact={() => { setSelected(null); onNavigate('contact'); }}
      />
    </>
  );
}
