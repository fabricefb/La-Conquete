import { useEffect, useState } from 'react';
import { getContent, supabase } from '../lib/supabase';
import { usePageContents } from '../lib/hooks/usePageContents';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { UniversalHero } from '../components/UniversalHero';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import {
  Facebook, Youtube, Instagram, Twitter, MessageCircle, Globe, Mail, Phone,
  Play, ArrowRight, ArrowUpRight, ChevronDown,
  type LucideIcon,
} from '../lib/icons';
import { imageSrcSet } from '../lib/images';
import type { Page } from '../lib/navigation';
import type { Pastor, PastorSocialLinks } from '../types';

const FALLBACK: Pastor[] = [
  { id: 'fb-1', name: 'Josué Romain Kazadi', role: 'Pasteur Principal', bio: 'Homme de Dieu visionnaire et passionné, il conduit l\'église avec sagesse et détermination.', photo_url: '/pasteur-romain-kazadi.webp', thought: 'La Parole de Dieu est notre boussole.', sort_order: 0, is_main: true, is_active: true, video_url: '', social_links: {}, extended_bio: '', media_urls: [], email: '', phone: '', created_at: '', updated_at: '' },
  { id: 'fb-2', name: 'Dr David Kateba', role: '1er Pasteur Assistant', bio: '', photo_url: '/pasteur-david-kateba.webp', thought: '', sort_order: 1, is_main: false, is_active: true, video_url: '', social_links: {}, extended_bio: '', media_urls: [], email: '', phone: '', created_at: '', updated_at: '' },
  { id: 'fb-3', name: 'Richard Mukendi', role: '2e Pasteur Assistant', bio: '', photo_url: '/pasteur-richard-mukendi.webp', thought: '', sort_order: 2, is_main: false, is_active: true, video_url: '', social_links: {}, extended_bio: '', media_urls: [], email: '', phone: '', created_at: '', updated_at: '' },
];

/* ── Liens d'une fiche : réseaux, email, téléphone, vidéo ─────────────
   Les champs du back-office acceptent une URL complète ou un identifiant
   seul ; on normalise ici pour que le lien reste cliquable. */
const SOCIAL_META: { key: keyof PastorSocialLinks; label: string; Icon: LucideIcon }[] = [
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'youtube', label: 'YouTube', Icon: Youtube },
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'twitter', label: 'X', Icon: Twitter },
  { key: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle },
  { key: 'website', label: 'Site web', Icon: Globe },
  { key: 'email', label: 'Email', Icon: Mail },
];

interface PastorLink {
  key: string;
  href: string;
  label: string;
  Icon: LucideIcon;
}

function withProtocol(value: string): string {
  const v = value.trim();
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function whatsappHref(value: string): string {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return `https://wa.me/${v.replace(/\D/g, '')}`;
}

function pastorLinks(pastor: Pastor): PastorLink[] {
  const socials = pastor.social_links || {};
  const links: PastorLink[] = [];

  for (const social of SOCIAL_META) {
    const raw = socials[social.key];
    if (!raw || !raw.trim()) continue;
    const href = social.key === 'email'
      ? (raw.includes('@') ? `mailto:${raw.trim().replace(/^mailto:/i, '')}` : withProtocol(raw))
      : social.key === 'whatsapp'
        ? whatsappHref(raw)
        : withProtocol(raw);
    links.push({ key: social.key, href, label: `${social.label} de ${pastor.name}`, Icon: social.Icon });
  }

  if (pastor.email && !links.some((l) => l.key === 'email')) {
    links.push({ key: 'email', href: `mailto:${pastor.email.trim()}`, label: `Email de ${pastor.name}`, Icon: Mail });
  }
  if (pastor.phone) {
    links.push({ key: 'phone', href: `tel:${pastor.phone.replace(/[^\d+]/g, '')}`, label: `Téléphone de ${pastor.name}`, Icon: Phone });
  }
  if (pastor.video_url && pastor.video_url.trim()) {
    links.push({ key: 'video', href: withProtocol(pastor.video_url), label: `Vidéo de ${pastor.name}`, Icon: Play });
  }

  return links;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'LC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isExternal(href: string): boolean {
  return !/^(mailto:|tel:)/i.test(href);
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
            target={isExternal(link.href) ? '_blank' : undefined}
            rel={isExternal(link.href) ? 'noopener noreferrer' : undefined}
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

export function PasteursPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const cm = usePageContents('pasteurs');
  const [pastors, setPastors] = useState<Pastor[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Les blocs arrivent après le chargement : sans observateur recréé, ils
  // restent à opacity 0 (classe .reveal) et la page paraît vide.
  useEffect(() => {
    if (loading) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
    );
    document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [loading]);

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
    <div className="bg-bg min-h-screen mobile-bottom-pad">
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
                  <figure className="group portrait-frame">
                    <Portrait pastor={principal} priority />
                    <span className="absolute inset-x-0 top-0 h-0.5 bg-evangile-600" />
                    <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent p-5">
                      <div>
                        <p className="font-hero text-[clamp(1.5rem,2.6vw,2.1rem)] uppercase leading-none text-white">
                          {principal.name}
                        </p>
                        {principal.role && (
                          <p className="person-role mt-2 text-[9px] tracking-[0.16em] text-white/60 sm:text-[11px] sm:tracking-[0.22em]">
                            {principal.role}
                          </p>
                        )}
                      </div>
                      <span className="hidden font-hero text-sm leading-none text-white/40 sm:block" aria-hidden="true">01</span>
                    </figcaption>
                  </figure>
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
                    <PastorLinks pastor={principal} className="mt-8" />
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
                : team.map((pastor, index) => {
                    const hasBody = !!(pastor.bio || pastor.thought || pastor.extended_bio?.trim() || pastor.media_urls?.length || pastorLinks(pastor).length);
                    return (
                      <article key={pastor.id} className="group flex flex-col overflow-hidden border border-line bg-bg-card transition-colors duration-300 hover:border-evangile-600/40">
                        <figure className="relative overflow-hidden">
                          <Portrait pastor={pastor} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 45vw, 88vw" />
                          <span className="absolute inset-x-0 top-0 z-10 h-0.5 bg-evangile-600/0 transition-colors duration-300 group-hover:bg-evangile-600" />
                          <span className="absolute right-4 top-4 z-10 font-hero text-sm leading-none text-white/45" aria-hidden="true">
                            {String(index + firstTeamNumber).padStart(2, '0')}
                          </span>
                          <figcaption className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-ink-950 via-ink-950/55 to-transparent p-5">
                            <h3 className="person-name text-white">{pastor.name}</h3>
                            {pastor.role && (
                              <p className="person-role mt-1.5 text-[9px] tracking-[0.16em] text-white/60 sm:text-[10px] sm:tracking-[0.2em]">
                                {pastor.role}
                              </p>
                            )}
                          </figcaption>
                        </figure>

                        {hasBody && (
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
                            <PastorLinks pastor={pastor} className="mt-auto pt-5" />
                          </div>
                        )}
                      </article>
                    );
                  })}
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
  );
}
