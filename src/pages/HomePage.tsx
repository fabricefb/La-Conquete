import { useState, useEffect } from 'react';
import { db, buildContentMap, getContent, buildSettingsMap } from '../lib/supabase';
import type { PageContent, SiteSetting, Ministry } from '../types';
import { useReveal, useParallax } from '../lib/hooks';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import {
  Radio,
  Sparkles,
  Crown,
  Flame,
  Compass,
  BookOpen,
  Calendar,
  Users,
  Quote,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
} from '../lib/icons';
import type { Page } from '../lib/navigation';

/* ═══════════════════════════════════════════════════════════════════
   Constants & defaults
   ═══════════════════════════════════════════════════════════════════ */

const DEFAULT_HERO_IMG =
  'https://images.pexels.com/photos/2889440/pexels-photo-2889440.jpeg?auto=compress&cs=tinysrgb&w=1920';
const DEFAULT_VISION_IMG =
  'https://images.pexels.com/photos/290468/pexels-photo-290468.jpeg?auto=compress&cs=tinysrgb&w=1200';
const DEFAULT_SERMON_IMG =
  'https://images.pexels.com/photos/261763/pexels-photo-261763.jpeg?auto=compress&cs=tinysrgb&w=800';
const DEFAULT_EVENT_IMG =
  'https://images.pexels.com/photos/2774557/pexels-photo-2774557.jpeg?auto=compress&cs=tinysrgb&w=800';
const DEFAULT_PEOPLE_IMG =
  'https://images.pexels.com/photos/8465180/pexels-photo-8465180.jpeg?auto=compress&cs=tinysrgb&w=800';

/* ═══════════════════════════════════════════════════════════════════
   RevealSection helper
   ═══════════════════════════════════════════════════════════════════ */

function RevealSection({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={`reveal ${visible ? 'in' : ''} ${className}`}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Loading skeleton
   ═══════════════════════════════════════════════════════════════════ */

function SkeletonPage() {
  return (
    <div className="min-h-screen bg-bg text-cream">
      {/* Header skeleton */}
      <div className="h-16 animate-pulse bg-bg/80" />

      {/* Hero skeleton */}
      <section className="flex min-h-screen items-center justify-center">
        <div className="mx-auto max-w-4xl px-4 pt-24 pb-16 text-center">
          <div className="mx-auto mb-6 h-8 w-48 animate-pulse rounded-full bg-white/10" />
          <div className="mx-auto mb-6 h-16 w-96 max-w-full animate-pulse rounded-xl bg-white/10" />
          <div className="mx-auto mb-10 h-6 w-80 max-w-full animate-pulse rounded-lg bg-white/10" />
          <div className="flex justify-center gap-4">
            <div className="h-12 w-40 animate-pulse rounded-full bg-white/10" />
            <div className="h-12 w-44 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      </section>

      {/* Pillars skeleton */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <div className="mx-auto mb-4 h-4 w-32 animate-pulse rounded-full bg-white/10" />
            <div className="mx-auto h-10 w-72 animate-pulse rounded-xl bg-white/10" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-64 animate-pulse rounded-3xl bg-white/5"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Vision skeleton */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="h-[480px] animate-pulse rounded-3xl bg-white/5" />
            <div className="space-y-6">
              <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-white/10" />
              <div className="h-24 w-full animate-pulse rounded-lg bg-white/10" />
              <div className="h-20 w-full animate-pulse rounded-lg bg-white/10" />
              <div className="h-12 w-48 animate-pulse rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Static explore cards
   ═══════════════════════════════════════════════════════════════════ */

const exploreCards: {
  img: string;
  tag: string;
  title: string;
  Icon: typeof BookOpen;
  page: Page;
}[] = [
  {
    img: DEFAULT_SERMON_IMG,
    tag: 'Ressources',
    title: 'Derniers Sermons',
    Icon: BookOpen,
    page: 'media',
  },
  {
    img: DEFAULT_EVENT_IMG,
    tag: 'Calendrier',
    title: 'Événements & Agenda',
    Icon: Calendar,
    page: 'events',
  },
  {
    img: DEFAULT_PEOPLE_IMG,
    tag: 'Communauté',
    title: 'Nos Ministères',
    Icon: Users,
    page: 'activities',
  },
];

/* ═══════════════════════════════════════════════════════════════════
   Props
   ═══════════════════════════════════════════════════════════════════ */

interface HomePageProps {
  onNavigate: (page: Page) => void;
}

/* ═══════════════════════════════════════════════════════════════════
   HomePage component
   ═══════════════════════════════════════════════════════════════════ */

export function HomePage({ onNavigate }: HomePageProps) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const parallaxRef = useParallax<HTMLDivElement>(0.25);

  /* ── Data state ──────────────────────────────────────────────── */
  const [contentMap, setContentMap] = useState<Record<string, string>>({});
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [ministries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Fetch on mount ──────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [contents, settings, mins] = await Promise.all([
          db.getPageContents('home'),
          db.getSettings(),
          db.getActiveMinistries(),
        ]);
        if (cancelled) return;
        setContentMap(buildContentMap(contents));
        setSettingsMap(buildSettingsMap(settings));
        // ministries are available for future use; we keep them in state
        void mins;
      } catch {
        // Silently fall back to defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Derived content ─────────────────────────────────────────── */
  const cm = contentMap;
  const sm = settingsMap;

  // Hero
  const heroBadge = getContent(cm, 'hero', 'badge', 'Église Évangélique');
  const heroTitle = getContent(
    cm,
    'hero',
    'title',
    'Bâtir, Transformer et Conquérir',
  );
  const heroSubtitle = getContent(
    cm,
    'hero',
    'subtitle',
    'Impactez votre génération, transformez votre communauté et conquérez votre destinée avec la puissance de Dieu.',
  );
  const heroCta1Text = getContent(cm, 'hero', 'cta_1_text', 'Suivre le Direct');
  const heroCta1Link = getContent(cm, 'hero', 'cta_1_link', 'media') as Page;
  const heroCta2Text = getContent(
    cm,
    'hero',
    'cta_2_text',
    'Planifier une visite',
  );
  const heroCta2Link = getContent(cm, 'hero', 'cta_2_link', 'contact') as Page;
  const heroImg = getContent(cm, 'hero', 'image_url', DEFAULT_HERO_IMG);

  // Split title on "et" to wrap "Conquérir" in gold-text
  const titleParts = heroTitle.split(' et ');
  const titleBefore = titleParts[0];
  const titleAfter = titleParts.length > 1 ? titleParts.slice(1).join(' et ') : '';

  // Pillars
  const pillarsSectionLabel = getContent(cm, 'pillars', 'section_label', 'Notre vision');
  const pillarsSectionTitle = getContent(cm, 'pillars', 'section_title', 'Les trois piliers');
  const pillar1Title = getContent(cm, 'pillars', 'pillar_1_title', 'Bâtir');
  const pillar1Desc = getContent(
    cm,
    'pillars',
    'pillar_1_desc',
    'Construire des fondations solides ancrées dans la Parole de Dieu.',
  );
  const pillar2Title = getContent(cm, 'pillars', 'pillar_2_title', 'Transformer');
  const pillar2Desc = getContent(
    cm,
    'pillars',
    'pillar_2_desc',
    'Vivre une transformation intérieure par la puissance du Saint-Esprit.',
  );
  const pillar3Title = getContent(cm, 'pillars', 'pillar_3_title', 'Conquérir');
  const pillar3Desc = getContent(
    cm,
    'pillars',
    'pillar_3_desc',
    'Avancer dans notre mission divine pour impacter des nations.',
  );

  const pillars: {
    label: string;
    desc: string;
    Icon: typeof Crown;
    accent: string;
    radial: string;
  }[] = [
    {
      label: pillar1Title,
      desc: pillar1Desc,
      Icon: Crown,
      accent: 'text-gold-400',
      radial: 'bg-radial-gold',
    },
    {
      label: pillar2Title,
      desc: pillar2Desc,
      Icon: Flame,
      accent: 'text-ember-400',
      radial: 'bg-radial-ember',
    },
    {
      label: pillar3Title,
      desc: pillar3Desc,
      Icon: Compass,
      accent: 'text-gold-400',
      radial: 'bg-radial-gold',
    },
  ];

  // Vision
  const visionLabel = getContent(cm, 'vision', 'section_label', 'Notre mission');
  const visionTitle = getContent(
    cm,
    'vision',
    'title',
    'Conquérir des âmes\npour le Royaume de Dieu',
  );
  const visionText1 = getContent(
    cm,
    'vision',
    'text_1',
    'Fondée sur la Parole vivante de Dieu, l\'Église La Conquête est une communauté de foi qui croit en la puissance transformatrice de l\'Évangile. Nous sommes appelés à bâtir des vies, à transformer des cœurs et à conquérir des nations pour la gloire de Dieu.',
  );
  const visionText2 = getContent(
    cm,
    'vision',
    'text_2',
    'Chaque croyant est un ambassadeur, porteur d\'une vision divine pour sa génération. Ensemble, nous avançons dans notre destinée collective avec foi, amour et détermination.',
  );
  const visionImg = getContent(cm, 'vision', 'image_url', DEFAULT_VISION_IMG);
  const visionBibleRef = getContent(cm, 'vision', 'bible_ref', 'Psaumes 2:8');
  const visionBibleText = getContent(
    cm,
    'vision',
    'bible_text',
    'Demande-moi, et je te donnerai les nations pour héritage.',
  );
  const visionCtaText = getContent(cm, 'vision', 'cta_text', 'En savoir plus');
  const visionCtaLink = getContent(cm, 'vision', 'cta_link', 'about') as Page;

  // Quote
  const quoteText = getContent(
    cm,
    'quote',
    'text',
    'Impactez votre génération, transformez votre communauté et conquérez votre destinée avec la puissance de Dieu.',
  );
  const quoteRef = getContent(cm, 'quote', 'ref', 'Matthieu 28:19');

  // Contact strip
  const contactLabel = getContent(cm, 'contact', 'section_label', 'Nous rejoindre');
  const contactTitle = getContent(cm, 'contact', 'title', 'Venez comme vous êtes');
  const contactAddress = sm['address'] || 'Av. Kabambare, Lubumbashi, RDC';
  const contactPhone = sm['phone'] || '+243 844 107 079';
  const contactEmail = sm['email'] || 'contact@laconquete.cd';

  const contactInfo: {
    Icon: typeof MapPin;
    label: string;
    value: string;
    href?: string;
  }[] = [
    { Icon: MapPin, label: 'Adresse', value: contactAddress },
    { Icon: Phone, label: 'Téléphone', value: contactPhone, href: `tel:${contactPhone.replace(/\s/g, '')}` },
    { Icon: Mail, label: 'Email', value: contactEmail, href: `mailto:${contactEmail}` },
  ];

  /* ── Loading state ───────────────────────────────────────────── */
  if (loading) {
    return <SkeletonPage />;
  }

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-bg text-cream">
      <SiteHeader
        onNavigate={onNavigate}
        activePage="home"
        theme={colorMode}
        onToggleTheme={toggleColorMode}
      />

      {/* ─── HERO ─── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div ref={parallaxRef} className="absolute inset-0 will-change-transform">
          <img
            src={heroImg}
            alt="Église La Conquête"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-bg" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 pt-24 pb-16 text-center">
          <div className="animate-fade-up mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold-300">
              <Sparkles className="h-3.5 w-3.5" />
              {heroBadge}
            </span>
          </div>

          <h1
            className="animate-fade-up mb-6 font-serif text-5xl font-semibold leading-tight tracking-tight sm:text-6xl lg:text-7xl"
            style={{ animationDelay: '0.1s' }}
          >
            {titleBefore}
            {titleAfter && (
              <>
                <br />
                et{' '}
                <span className="gold-text">{titleAfter}</span>
              </>
            )}
          </h1>

          <p
            className="animate-fade-up mx-auto mb-10 max-w-xl text-lg leading-relaxed text-muted"
            style={{ animationDelay: '0.2s' }}
          >
            {heroSubtitle}
          </p>

          <div
            className="animate-fade-up flex flex-col items-center justify-center gap-4 sm:flex-row"
            style={{ animationDelay: '0.3s' }}
          >
            <button onClick={() => onNavigate(heroCta1Link)} className="btn-gold">
              <Radio className="h-4 w-4" />
              {heroCta1Text}
            </button>
            <button
              onClick={() => onNavigate(heroCta2Link)}
              className="btn-ghost"
            >
              {heroCta2Text}
            </button>
          </div>

          {/* Scroll indicator */}
          <div
            className="animate-fade-up absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            style={{ animationDelay: '0.8s' }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted/60">
              Défiler
            </span>
            <div className="h-12 w-px bg-gradient-to-b from-gold-400/60 to-transparent" />
          </div>
        </div>
      </section>

      {/* ─── PILLARS ─── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-14 text-center">
            <p className="section-label justify-center">{pillarsSectionLabel}</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold text-cream">
              {pillarsSectionTitle}
            </h2>
          </RevealSection>

          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map(({ label, desc, Icon, accent, radial }, i) => (
              <RevealSection
                key={label}
                className={`reveal-delay-${i + 1}`}
              >
                <div
                  className={`glass rounded-3xl p-8 ${radial} group transition-all duration-300 hover:scale-105 hover:shadow-xl`}
                >
                  <div
                    className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-line ${accent}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3
                    className={`mb-3 font-serif text-2xl font-semibold ${accent}`}
                  >
                    {label}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted">{desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── VISION SPLIT ─── */}
      <section className="py-24 bg-radial-gold">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <RevealSection>
              <div className="overflow-hidden rounded-5xl">
                <img
                  src={visionImg}
                  alt="Église"
                  className="h-[480px] w-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
            </RevealSection>
            <RevealSection className="reveal-delay-1">
              <p className="section-label">{visionLabel}</p>
              <h2 className="mt-4 font-serif text-4xl font-semibold leading-snug text-cream">
                {visionTitle.split('\n').map((line, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    {line}
                  </span>
                ))}
              </h2>
              <p className="mt-6 leading-relaxed text-muted">{visionText1}</p>
              <p className="mt-4 leading-relaxed text-muted">{visionText2}</p>
              <blockquote className="mt-8 border-l-2 border-gold-400/40 pl-5 text-sm italic text-muted">
                « {visionBibleText} »
                <span className="mt-1 block not-italic font-semibold text-gold-400">
                  — {visionBibleRef}
                </span>
              </blockquote>
              <button
                onClick={() => onNavigate(visionCtaLink)}
                className="btn-gold mt-8"
              >
                {visionCtaText}
                <ArrowRight className="h-4 w-4" />
              </button>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ─── EXPLORE ─── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-14 text-center">
            <p className="section-label justify-center">Explorer</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold text-cream">
              Découvrez notre monde
            </h2>
          </RevealSection>

          <div className="grid gap-6 md:grid-cols-3">
            {exploreCards.map(({ img, tag, title, Icon, page }, i) => (
              <RevealSection
                key={title}
                className={`reveal-delay-${i + 1}`}
              >
                <button
                  onClick={() => onNavigate(page)}
                  className="group relative w-full overflow-hidden rounded-4xl text-left"
                >
                  <img
                    src={img}
                    alt={title}
                    className="h-80 w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/80">
                      {tag}
                    </span>
                    <h3 className="font-serif text-xl font-semibold text-white">
                      {title}
                    </h3>
                    <div className="mt-3 flex items-center gap-2 text-sm text-gold-300 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1">
                      <Icon className="h-4 w-4" />
                      <span>Découvrir</span>
                    </div>
                  </div>
                </button>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── QUOTE ─── */}
      <section className="py-24 bg-radial-gold">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <RevealSection>
            <div className="mb-6 flex justify-center">
              <Quote className="h-10 w-10 text-gold-400/50" />
            </div>
            <p className="font-serif text-2xl italic leading-relaxed text-cream sm:text-3xl">
              « {quoteText} »
            </p>
            <p className="mt-6 font-semibold text-gold-400">— {quoteRef}</p>
          </RevealSection>
        </div>
      </section>

      {/* ─── CONTACT STRIP ─── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-12 text-center">
            <p className="section-label justify-center">{contactLabel}</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold text-cream">
              {contactTitle}
            </h2>
          </RevealSection>
          <div className="grid gap-6 sm:grid-cols-3">
            {contactInfo.map(({ Icon, label, value, href }) => (
              <RevealSection key={label}>
                {href ? (
                  <a
                    href={href}
                    className="glass rounded-3xl p-7 text-center transition-all duration-300 hover:scale-105 block"
                  >
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-gold-400/20 text-gold-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">
                      {label}
                    </p>
                    <p className="text-sm font-medium text-cream">{value}</p>
                  </a>
                ) : (
                  <div className="glass rounded-3xl p-7 text-center transition-all duration-300 hover:scale-105">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-gold-400/20 text-gold-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">
                      {label}
                    </p>
                    <p className="text-sm font-medium text-cream">{value}</p>
                  </div>
                )}
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter
        onNavigate={onNavigate}
        theme={colorMode}
        onToggleTheme={toggleColorMode}
      />
      <MobileNav
        onNavigate={onNavigate}
        active="home"
        theme={colorMode}
        onToggleTheme={toggleColorMode}
      />
    </div>
  );
}