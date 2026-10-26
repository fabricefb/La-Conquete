import { useState, useEffect } from 'react';
import { db, buildContentMap, getContent, isSupabaseConfigured } from '../lib/supabase';
import { useReveal } from '../lib/hooks';
import { CHURCH } from '../lib/church';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { IconBox } from '../components/IconBox';
import { SiteFooter } from '../components/SiteFooter';
import { UniversalHero } from '../components/UniversalHero';
import { MobileNav } from '../components/MobileNav';
import { BookOpen, Heart, ArrowRight, MapPin, Phone } from '../lib/icons';
import { imageSrcSet } from '../lib/images';
import type { Page } from '../lib/navigation';
import type { Pastor } from '../types';

interface PageProps { onNavigate: (page: Page) => void; }

const DEFAULT_ABOUT_HERO_IMG = '/church-photo-2.webp';

const FALLBACK_MAIN_PASTOR: Pastor = {
  id: 'fb-1',
  name: 'Josué Romain Kazadi',
  role: 'Pasteur Principal',
  bio: 'Homme de Dieu visionnaire et passionné, le Pasteur Josué Romain KAZADI est le fondateur de l\'Église Évangélique La Conquête. Sous sa direction, l\'église poursuit sa mission de gagner des âmes, d\'équiper les croyants et de transformer les communautés à Lubumbashi et au-delà.',
  photo_url: '/pasteur-romain-kazadi.webp',
  thought: 'La Parole de Dieu est notre boussole. Elle guide nos pas, éclaire notre chemin et nous donne la force de conquérir chaque jour.',
  sort_order: 0,
  is_main: true,
  is_active: true,
  video_url: '',
  social_links: {} as any,
  extended_bio: '',
  media_urls: [],
  email: '' as any,
  phone: '' as any,
  created_at: '',
  updated_at: '',
};

interface ValueItem { title: string; description: string; }

const FALLBACK_VALUES: ValueItem[] = [
  { title: 'Foi', description: 'Nous croyons en la puissance transformative de la foi en Jésus-Christ. Elle est le fondement de tout ce que nous faisons et la source de notre espérance.' },
  { title: 'Amour', description: "L'amour de Dieu nous motive à aimer notre prochain authentiquement. Nous cultivons une communauté où chacun est accueilli et valorisé." },
  { title: 'Unité', description: "Nous cultivons l'unité dans la diversité, conscients que chaque membre a sa place dans le corps du Christ." },
  { title: 'Service', description: "Suivre l'exemple du Christ, c'est servir les autres. Chaque membre est encouragé à découvrir ses dons et à les mettre au service de la communauté." },
  { title: 'Intégrité', description: 'Nous choisissons la vérité et la droiture dans nos actes comme dans nos paroles, devant Dieu et devant les hommes.' },
  { title: 'Excellence', description: 'Nous nous efforçons de servir Dieu avec excellence dans chaque domaine, offrant le meilleur de nous-mêmes pour honorer Celui qui nous a tout donné.' },
];

/* Repères publiés par l'église. Aucune date antérieure n'est documentée. */
const FALLBACK_TIMELINE = [
  { year: '2004', event: "21 novembre — fondation de l'Église Évangélique La Conquête à Lubumbashi par une poignée de croyants passionnés." },
  { year: '2025', event: "20 juillet — pose de la première pierre du Centre Évangélique Missionnaire La Conquête Kakana, à une cinquantaine de kilomètres de Lubumbashi." },
  { year: '2026', event: "1er au 30 novembre — marathon de prière sur le thème « La mission de l'Église locale face au monde moderne »." },
];

function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal();
  return <div ref={ref} className={`reveal ${visible ? 'in' : ''} ${className}`}>{children}</div>;
}

function SectionHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <RevealSection className="mb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">{eyebrow}</p>
          <h2 className="section-title mt-4">{title}</h2>
        </div>
        {children}
      </div>
      <div className="rule-accent mt-6" />
    </RevealSection>
  );
}

export function AboutPage({ onNavigate }: PageProps) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [contentMap, setContentMap] = useState<Record<string, string>>({});
  const [pastors, setPastors] = useState<Pastor[]>([]);
  const [loading, setLoading] = useState(true);

  useReveal();

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      const [contents, pastorsData] = await Promise.all([
        db.getPageContents('about').catch(() => []),
        db.getActivePastors().catch(() => []),
      ]);
      if (cancelled) return;
      setContentMap(buildContentMap(contents));
      setPastors(pastorsData);
      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  const cm = contentMap;

  const visionText = getContent(contentMap, 'vision', 'text', 'La Conquête des âmes, La Conquête des terres habitables et cultivables.');
  const missionText = getContent(contentMap, 'mission', 'text', 'Nous œuvrons au moyen de la Parole de Dieu, à gagner les âmes pour Jésus. Nous les équipons, les instruisons et les envoyons comme agents de transformation dans les nations. Nous motivons et équipons également nos membres pour la conquête des terres.');

  const valuesTitle = getContent(cm, 'values', 'title', '') || getContent(cm, 'values', 'heading_title', 'Nos Valeurs');
  const valuesSubtitle = getContent(cm, 'values', 'subtitle', '') || getContent(cm, 'values', 'heading_subtitle', 'Les piliers qui guident notre vie communautaire et notre engagement au service de Dieu.');
  const ctaImage = getContent(cm, 'cta', 'image', '/church-photo-1.webp');

  const values: ValueItem[] = (() => {
    const dv: ValueItem[] = [];
    let idx = 1;
    while (true) {
      const t = getContent(contentMap, `value_${idx}`, 'title', '');
      if (!t) break;
      dv.push({
        title: t,
        description: getContent(contentMap, `value_${idx}`, 'desc', FALLBACK_VALUES[(idx - 1) % FALLBACK_VALUES.length].description),
      });
      idx++;
    }
    return dv.length > 0 ? dv : FALLBACK_VALUES;
  })();

  const timeline = FALLBACK_TIMELINE.map((t, i) => ({
    year: getContent(cm, 'timeline', `year_${i + 1}`, t.year),
    event: getContent(cm, 'timeline', `event_${i + 1}`, t.event),
  }));

  const mainPastor = pastors.find(p => p.is_main) || FALLBACK_MAIN_PASTOR;

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-cream font-sans">
        <SiteHeader activePage="about" onNavigate={onNavigate} />
        <MobileNav active="about" onNavigate={onNavigate} />
        <UniversalHero pageKey="about" defaultBadge="À propos de nous" defaultTitle="Qui sommes-nous" bgImage={DEFAULT_ABOUT_HERO_IMG} />
        <div className="footer-spacer" />
        <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="bg-bg min-h-screen mobile-bottom-pad">
      <SiteHeader activePage="about" onNavigate={onNavigate} />
      <MobileNav active="about" onNavigate={onNavigate} />

      <UniversalHero
        pageKey="about"
        defaultBadge="À propos de nous"
        defaultTitle="Qui sommes-nous"
        defaultSubtitle="Depuis 2004, une église, une vision, une famille réunie autour de la Parole de Dieu à Lubumbashi."
        bgImage={DEFAULT_ABOUT_HERO_IMG}
      />

      {/* ═══ VISION & MISSION ═══ */}
      <section className="py-16 px-4 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-px bg-line lg:grid-cols-2">
            <RevealSection>
              <article className="h-full bg-bg-card p-8 md:p-10">
                <IconBox pageKey="about" elementId="vision-bookopen-icon" className="mb-6 inline-flex h-11 w-11 items-center justify-center border border-line text-evangile-600">
                  <BookOpen className="h-5 w-5" />
                </IconBox>
                <p className="section-eyebrow">{getContent(cm, 'vision_heading', 'label', 'Notre Vision')}</p>
                <h2 className="card-title mt-3">Une vision de conquête</h2>
                <p className="mt-5 text-[15px] leading-relaxed text-cream/80 sm:text-base">
                  {visionText}
                </p>
                <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-evangile-600">
                  {CHURCH.visionReference}
                </p>
              </article>
            </RevealSection>
            <RevealSection className="reveal-delay-1">
              <article className="h-full bg-bg-card p-8 md:p-10">
                <IconBox pageKey="about" elementId="mission-heart-icon" className="mb-6 inline-flex h-11 w-11 items-center justify-center border border-line text-evangile-600">
                  <Heart className="h-5 w-5" />
                </IconBox>
                <p className="section-eyebrow">{getContent(cm, 'mission_heading', 'label', 'Notre Mission')}</p>
                <h2 className="card-title mt-3">Une mission claire</h2>
                <p className="mt-5 text-[15px] leading-relaxed text-cream/80 sm:text-base">
                  {missionText}
                </p>
              </article>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ═══ PASTEUR PRINCIPAL ═══ */}
      <section className="border-y border-line py-16 px-4 md:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHead eyebrow="Direction spirituelle" title="Notre pasteur">
            <button onClick={() => onNavigate('pasteurs')} className="btn-link">
              Toute l'équipe pastorale <ArrowRight className="h-4 w-4" />
            </button>
          </SectionHead>
          <div className="grid items-start gap-12 lg:grid-cols-12">
            <RevealSection className="lg:col-span-4">
              <figure className="portrait-frame">
                <img
                  src={mainPastor.photo_url || '/pasteur-romain-kazadi.webp'}
                  srcSet={imageSrcSet(mainPastor.photo_url || '/pasteur-romain-kazadi.webp')}
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  alt={mainPastor.name}
                  className="photo-claro aspect-[3/4] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <figcaption className="flex items-center justify-between border-t border-line bg-bg px-5 py-4">
                  <span className="person-role">Fondateur</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-evangile-600">La Conquête</span>
                </figcaption>
              </figure>
            </RevealSection>

            <RevealSection className="reveal-delay-1 lg:col-span-8">
              <h3 className="section-title text-[clamp(2rem,4vw,3rem)]">{mainPastor.name}</h3>
              <p className="person-role mt-3">{mainPastor.role}</p>
              <p className="mt-7 max-w-2xl text-[15px] leading-relaxed text-cream/80 sm:text-base">{mainPastor.bio}</p>

              {mainPastor.thought && (
                <blockquote className="mt-9 border-l-2 border-evangile-600 pl-6">
                  <p className="verse-quote">« {mainPastor.thought} »</p>
                  <cite className="mt-4 block text-[11px] font-semibold uppercase not-italic tracking-[0.22em] text-muted">
                    {mainPastor.name}
                  </cite>
                </blockquote>
              )}
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ═══ REPÈRES ═══ */}
      <section className="py-16 px-4 md:py-24">
        <div className="mx-auto max-w-3xl">
          <SectionHead eyebrow="Notre parcours" title="Repères" />
          <ol className="border-l border-line">
            {timeline.map((t, i) => (
              <li key={i} className={`reveal reveal-delay-${(i % 3) + 1} relative pb-10 pl-8 last:pb-0`}>
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 bg-evangile-600" aria-hidden="true" />
                <p className="font-hero text-2xl text-cream">{t.year}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t.event}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-xs leading-relaxed text-muted/70">
            Seuls les faits publiés par l'église sont mentionnés ici. Les dates antérieures seront ajoutées
            lorsqu'elles auront été confirmées par le bureau pastoral.
          </p>
        </div>
      </section>

      {/* ═══ VALEURS ═══ */}
      <section className="border-y border-line bg-bg-card py-16 px-4 md:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHead eyebrow="Ce qui nous tient" title={valuesTitle} />
          {valuesSubtitle && (
            <p className="reveal mb-10 max-w-2xl text-sm leading-relaxed text-muted">{valuesSubtitle}</p>
          )}
          <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, i) => (
              <div key={value.title} className={`reveal reveal-delay-${(i % 4) + 1} bg-bg-card p-7`}>
                <span className="stat-figure block text-[2.75rem] text-evangile-600/30">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="card-title mt-5">{value.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ÉQUIPE & MINISTÈRES ═══ */}
      <section className="py-16 px-4 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <RevealSection>
            <article className="panel h-full p-8 md:p-10">
              <p className="section-eyebrow">Ensemble au service</p>
              <h2 className="card-title mt-3">L'équipe pastorale</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Découvrez les pasteurs qui accompagnent la vision et l'œuvre de Dieu au sein de notre église,
                ainsi que les responsables de nos extensions.
              </p>
              <button onClick={() => onNavigate('pasteurs')} className="btn-link mt-6">
                Rencontrer l'équipe <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          </RevealSection>
          <RevealSection className="reveal-delay-1">
            <article className="panel h-full p-8 md:p-10">
              <p className="section-eyebrow">Une maison, plusieurs services</p>
              <h2 className="card-title mt-3">Nos ministères</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Louange, accueil, enfants, évangélisation, diaconie : chaque membre a un rôle à jouer.
                Trouvez le ministère où vos dons serviront la communauté.
              </p>
              <button onClick={() => onNavigate('ministeres')} className="btn-link mt-6">
                Découvrir les ministères <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          </RevealSection>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative overflow-hidden border-t border-line" aria-label="Nous rendre visite">
        <img
          src={ctaImage}
          srcSet={imageSrcSet(ctaImage)}
          sizes="100vw"
          alt=""
          aria-hidden="true"
          className="photo-claro-strong absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="photo-veil-strong absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="max-w-2xl">
            <p className="section-eyebrow">Nous rejoindre</p>
            <h2 className="section-title mt-4" style={{ color: '#FFFFFF' }}>
              Soyez les bienvenus chez vous
            </h2>
            <div className="mt-5 h-px w-16 bg-evangile-600" />
            <p className="mt-5 flex items-start gap-2 text-sm leading-relaxed text-white/70 sm:text-base">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {CHURCH.address.full}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => onNavigate('contact')} className="btn-primary">
                Nous contacter <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <a href={CHURCH.phone.href} className="btn-ghost border-white/30 text-white hover:bg-white/10">
                <Phone className="h-4 w-4" aria-hidden="true" /> {CHURCH.phone.display}
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
    </div>
  );
}
