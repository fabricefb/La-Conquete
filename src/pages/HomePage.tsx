import { useState, useEffect } from 'react';
import { supabase, db, buildContentMap, getContent, buildSettingsMap } from '../lib/supabase';
import { useReveal, useParallax } from '../lib/hooks';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { IconBox } from '../components/IconBox';
import { TopBar } from '../components/home/TopBar';
import { LiveStreamModal } from '../components/LiveStreamModal';
import { TypingText } from '../components/home/TypingHero';
import { EnhancedPastorGrid } from '../components/home/EnhancedPastorGrid';
import { TestimonialsCarousel } from '../components/home/TestimonialsCarousel';
import {
  Crown,
  Flame,
  Compass,
  Quote,
  Cross,
  Heart,
  ArrowRight,
  Radio,
  MonitorPlay,
  Users,
  Calendar,
  Eye,
  ChevronDown,
} from '../lib/icons';
import type { Page } from '../lib/navigation';

/* ═══════════════════════════════════════════════════════════════════
   Constants & defaults
   ═══════════════════════════════════════════════════════════════════ */

const DEFAULT_HERO_IMG =
  'https://images.pexels.com/photos/2889440/pexels-photo-2889440.jpeg?auto=compress&cs=tinysrgb&w=1920';
const DEFAULT_ABOUT_IMG =
  'https://images.pexels.com/photos/290468/pexels-photo-290468.jpeg?auto=compress&cs=tinysrgb&w=1200';
const DEFAULT_SERMON_IMG =
  'https://images.pexels.com/photos/261763/pexels-photo-261763.jpeg?auto=compress&cs=tinysrgb&w=800';
const DEFAULT_EVENT_IMG =
  'https://images.pexels.com/photos/2774557/pexels-photo-2774557.jpeg?auto=compress&cs=tinysrgb&w=800';
const DEFAULT_MINISTRY_IMG =
  'https://images.pexels.com/photos/8465180/pexels-photo-8465180.jpeg?auto=compress&cs=tinysrgb&w=800';
const DEFAULT_MEDIA_IMG =
  'https://images.pexels.com/photos/196656/pexels-photo-196656.jpeg?auto=compress&cs=tinysrgb&w=800';
const DEFAULT_CTA_IMG =
  'https://images.pexels.com/photos/3728816/pexels-photo-3728816.jpeg?auto=compress&cs=tinysrgb&w=1920';

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
    <div className="min-h-screen bg-bg text-cream font-sans">
      <div className="h-10 animate-pulse bg-bg/80" />
      <div className="h-16 animate-pulse bg-bg/80" />
      <section className="flex min-h-screen items-center justify-center">
        <div className="mx-auto max-w-4xl px-4 pt-24 pb-16 text-center">
          <div className="mx-auto mb-6 h-8 w-72 animate-pulse rounded-full bg-white/10" />
          <div className="mx-auto mb-6 h-16 w-[500px] max-w-full animate-pulse rounded-xl bg-white/10" />
          <div className="mx-auto mb-10 h-6 w-80 max-w-full animate-pulse rounded-lg bg-white/10" />
          <div className="flex justify-center gap-4">
            <div className="h-12 w-40 animate-pulse rounded-full bg-white/10" />
            <div className="h-12 w-44 animate-pulse rounded-full bg-white/10" />
          </div>
          <div className="mt-16 flex justify-center gap-12">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="mx-auto mb-2 h-8 w-16 rounded-lg bg-white/10" />
                <div className="mx-auto h-3 w-20 rounded bg-white/5" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="h-10 w-64 mx-auto animate-pulse rounded-xl bg-white/10" />
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3 h-64 animate-pulse rounded-2xl bg-white/5" />
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Static verse cards data
   ═══════════════════════════════════════════════════════════════════ */

const smallVerses = [
  { text: 'Je peux tout par celui qui me fortifie.', ref: 'Philippiens 4:13' },
  { text: 'Le Seigneur est mon berger, je ne manquerai de rien.', ref: 'Psaumes 23:1' },
  { text: 'Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d\u2019eux.', ref: 'Matthieu 18:20' },
  { text: 'Confiez-vous en l\u2019Éternel de tout votre c\u0153ur.', ref: 'Proverbes 3:5' },
];

/* ═══════════════════════════════════════════════════════════════════
   Sample blog articles
   ═══════════════════════════════════════════════════════════════════ */

const sampleArticles = [
  {
    title: 'Retour sur la semaine de jeûne et prière 2024',
    category: 'Vie de l\u2019église',
    date: '15 Janvier 2024',
    excerpt: 'Une semaine marquée par la présence de Dieu, des témoignages puissants et des vies transformées par la puissance de la prière collective.',
    img: 'https://images.pexels.com/photos/47361/pexels-photo-47361.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    title: 'Nouveau programme de disciplesbat pour les jeunes',
    category: 'Jeunesse',
    date: '8 Février 2024',
    excerpt: 'Lancez-vous dans un parcours de croissance spirituelle conçu spécialement pour la nouvelle génération de croyants.',
    img: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    title: 'Extension de Masina : inauguration du nouveau local',
    category: 'Extensions',
    date: '22 Mars 2024',
    excerpt: 'La famille de la Conquête s\u2019agrandit avec l\u2019inauguration officielle du local de Masina, un nouveau lieu de culte pour la communauté.',
    img: 'https://images.pexels.com/photos/4481259/pexels-photo-4481259.jpeg?auto=compress&cs=tinysrgb&w=600',
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
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [pastors, setPastors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [builderConfig, setBuilderConfig] = useState<Record<string, { visible: boolean; config: Record<string, unknown> }>>({});

  /* ── Fetch on mount ──────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [contents, settings, testimonialData, pastorData, builderData] = await Promise.all([
          db.getPageContents('home'),
          db.getSettings(),
          db.getActiveTestimonials(),
          db.getActivePastors(),
          supabase.from('site_settings').select('value').eq('key', 'builder_config_home').single(),
        ]);
        if (cancelled) return;
        setContentMap(buildContentMap(contents));
        setSettingsMap(buildSettingsMap(settings));

        // Parse builder config to determine section visibility
        if (builderData?.data?.value) {
          try {
            const parsed = typeof builderData.data.value === 'string'
              ? JSON.parse(builderData.data.value) as any[]
              : builderData.data.value as any[];
            if (Array.isArray(parsed)) {
              const cfg: Record<string, { visible: boolean; config: Record<string, unknown> }> = {};
              for (const s of parsed) {
                cfg[s.id] = { visible: !!s.visible, config: s.config || {} };
              }
              setBuilderConfig(cfg);
            }
          } catch { /* keep empty — all sections visible by default */ }
        }
        setTestimonials(
          (testimonialData || [])
            .filter((t: any) => t.status === 'published' && t.is_active)
            .slice(0, 6),
        );
        setPastors(
          (pastorData || [])
            .sort((a: any, b: any) => (b.role_level ?? 0) - (a.role_level ?? 0)),
        );
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

  // Helper: check if a section is visible via builder config (default: visible)
  const isSectionVisible = (sectionId: string): boolean => {
    const cfg = builderConfig[sectionId];
    if (!cfg) return true; // no config = visible by default
    return cfg.visible;
  };

  // Helper: get a config value from builder
  const getBuilderConfig = (sectionId: string, key: string, fallback: unknown = ''): unknown => {
    return builderConfig[sectionId]?.config?.[key] ?? fallback;
  };

  // Topbar dynamic content
  const topbarPhone = getContent(cm, 'topbar', 'phone', '');
  const topbarEmail = getContent(cm, 'topbar', 'email', '');

  // Hero — support multiple images for slideshow
  const heroImg = getContent(cm, 'hero', 'bg_image', DEFAULT_HERO_IMG);
  const heroImagesStr = getContent(cm, 'hero', 'bg_images', '');
  const heroImages = heroImagesStr
    ? heroImagesStr.split(',').map((u: string) => u.trim()).filter(Boolean)
    : [DEFAULT_HERO_IMG];
  const [heroIndex, setHeroIndex] = useState(0);

  // Slideshow: change every 30 seconds
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % heroImages.length);
    }, 30000);
    return () => clearInterval(timer);
  }, [heroImages.length]);
  // Hero texts
  const heroTitle1 = getContent(cm, 'hero', 'title_line1', 'La Conquête');
  const heroTitle2 = getContent(cm, 'hero', 'title_line2', 'des Âmes');
  const heroSubtitle = getContent(cm, 'hero', 'subtitle', 'Église Évangélique La Conquête — Kinshasa, RDC');
  const heroBibleVerse = getContent(cm, 'hero', 'bible_verse', 'Psaumes 2:8 — "Demande-moi, et je te donnerai les nations pour héritage"');
  const heroCtaPrimary = getContent(cm, 'hero', 'cta_primary', 'Rejoindre le culte');
  const heroCtaSecondary = getContent(cm, 'hero', 'cta_secondary', 'Notre vision');

  // Pillars
  const pillar1Title = getContent(cm, 'pillars', 'pillar_1_title', 'Foi');
  const pillar1Desc = getContent(
    cm,
    'pillars',
    'pillar_1_desc',
    'Une foi ancrée dans la Parole de Dieu qui nous donne la force de tenir ferme dans les épreuves et de marcher avec confiance vers notre destinée.',
  );
  const pillar2Title = getContent(cm, 'pillars', 'pillar_2_title', 'Communauté');
  const pillar2Desc = getContent(
    cm,
    'pillars',
    'pillar_2_desc',
    'Une famille soudée par l\u2019amour du Christ, où chacun trouve sa place, son soutien et sa mission au service du corps.',
  );
  const pillar3Title = getContent(cm, 'pillars', 'pillar_3_title', 'Mission');
  const pillar3Desc = getContent(
    cm,
    'pillars',
    'pillar_3_desc',
    'Un appel à aller au-delà des murs, à porter l\u2019Évangile aux nations et à faire des disciples pour la gloire de Dieu.',
  );

  // About
  const aboutText1 = getContent(
    cm,
    'about',
    'text_1',
    'Fondée sur la Parole vivante de Dieu, l\u2019Église Évangélique La Conquête est une communauté de foi qui croit en la puissance transformatrice de l\u2019Évangile. Nous sommes appelés à bâtir des vies, à transformer des c\u0153urs et à conquérir des nations pour la gloire de Dieu.',
  );
  const aboutText2 = getContent(
    cm,
    'about',
    'text_2',
    'Chaque croyant est un ambassadeur, porteur d\u2019une vision divine pour sa génération. Ensemble, nous avançons dans notre destinée collective avec foi, amour et détermination.',
  );
  const aboutQuote = getContent(
    cm,
    'about',
    'bible_text',
    'Demande-moi, et je te donnerai les nations pour héritage.',
  );
  const aboutImage = getContent(cm, 'about', 'image', DEFAULT_ABOUT_IMG);

  // Quote
  const quoteText = getContent(
    cm,
    'quote',
    'text',
    'Car nous sommes son ouvrage, ayant été créés en Jésus-Christ pour de bonnes \u0153uvres, que Dieu a préparées d\u2019avance, afin que nous les pratiquions.',
  );
  const quoteRef = getContent(cm, 'quote', 'reference', 'Éphésiens 2:10');

  /* ── Loading ─────────────────────────────────────────────────── */
  if (loading) return <SkeletonPage />;

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  return (
    <>
      <SiteHeader onNavigate={onNavigate} />
      <MobileNav onNavigate={onNavigate} active="home" />

      {/* ═══════ HERO (fullscreen) ═══════ */}
      <div className="h-16 shrink-0" />
      <section
        ref={parallaxRef}
        className="relative min-h-screen spirit-breath flex items-center justify-center overflow-hidden"
      >
        {/* Background slideshow layer */}
        {heroImages.length > 1 ? (
          heroImages.map((img: string, i: number) => (
            <div
              key={i}
              className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[2000ms] ease-in-out"
              style={{
                backgroundImage: `url(${img})`,
                opacity: i === heroIndex ? 1 : 0,
              }}
            />
          ))
        ) : (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${heroImg})` }}
          />
        )}
        {/* Slideshow dots (only if multiple images) */}
        {heroImages.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {heroImages.map((_: string, i: number) => (
              <button
                key={i}
                onClick={() => setHeroIndex(i)}
                className={`w-2 h-2 rounded-full transition-all duration-500 ${
                  i === heroIndex
                    ? 'bg-evangile-500 w-6'
                    : 'bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        )}
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Decorative grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Radial red glow */}
        <div className="absolute inset-0 bg-radial-primary pointer-events-none" />

        {/* Floating light particles */}
        <div className="particle" style={{ width: 4, height: 4, left: '15%', bottom: -10, animationDuration: '18s', animationDelay: '0s' }} />
        <div className="particle" style={{ width: 3, height: 3, left: '28%', bottom: -10, animationDuration: '14s', animationDelay: '2s' }} />
        <div className="particle" style={{ width: 5, height: 5, left: '42%', bottom: -10, animationDuration: '22s', animationDelay: '5s' }} />
        <div className="particle" style={{ width: 2, height: 2, left: '55%', bottom: -10, animationDuration: '12s', animationDelay: '1s' }} />
        <div className="particle" style={{ width: 6, height: 6, left: '68%', bottom: -10, animationDuration: '25s', animationDelay: '7s' }} />
        <div className="particle" style={{ width: 3, height: 3, left: '80%', bottom: -10, animationDuration: '16s', animationDelay: '3s' }} />
        <div className="particle" style={{ width: 4, height: 4, left: '90%', bottom: -10, animationDuration: '20s', animationDelay: '6s' }} />
        <div className="particle" style={{ width: 2, height: 2, left: '10%', bottom: -10, animationDuration: '10s', animationDelay: '4s' }} />
        <div className="particle" style={{ width: 5, height: 5, left: '35%', bottom: -10, animationDuration: '19s', animationDelay: '8s' }} />
        <div className="particle" style={{ width: 3, height: 3, left: '72%', bottom: -10, animationDuration: '15s', animationDelay: '0.5s' }} />
        <div className="particle" style={{ width: 4, height: 4, left: '50%', bottom: -10, animationDuration: '21s', animationDelay: '3.5s' }} />
        <div className="particle" style={{ width: 2, height: 2, left: '85%', bottom: -10, animationDuration: '13s', animationDelay: '1.5s' }} />

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-4xl px-4 pt-28 pb-20 text-center">
          {/* Main heading */}
          <div className="animate-fade-up">
            <h1 className="font-headline font-bold leading-tight">
              <span className="brand-text text-5xl md:text-7xl lg:text-8xl block">{heroTitle1}</span>
              <span className="text-cream text-5xl md:text-7xl lg:text-8xl block mt-2">{heroTitle2}</span>
            </h1>
          </div>

          {/* Subtitle */}
          <div className="animate-fade-up mt-6" style={{ animationDelay: '0.1s' }}>
            <p className="text-sm md:text-base uppercase tracking-widest text-muted font-medium">
              {heroSubtitle}
            </p>
          </div>

          {/* Typing text — Bible verse */}
          <div className="animate-fade-up mt-8" style={{ animationDelay: '0.2s' }}>
            <TypingText
              words={[heroBibleVerse]}
              className="text-base md:text-lg text-cream/70 italic typing-cursor"
            />
          </div>

          {/* CTA buttons */}
          <div
            className="animate-fade-up mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
            style={{ animationDelay: '0.3s' }}
          >
            <button onClick={() => onNavigate('activities')} className="btn-primary">
              {heroCtaPrimary}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => onNavigate('about')} className="btn-ghost">
              {heroCtaSecondary}
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <ChevronDown className="h-6 w-6 text-cream/50" />
        </div>
      </section>

      {/* ═══════ BANDE PASSANTE — Communiqués & Countdown ═══════ */}
      {isSectionVisible('topbar') && <TopBar onNavigate={onNavigate} onLiveClick={() => setLiveModalOpen(true)} phone={topbarPhone} email={topbarEmail} />}

      {/* ═══════ SECTION: THREE PILLARS ═══════ */}
      {isSectionVisible('pillars') && (
      <section className="py-24 bg-radial-primary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-14 text-center">
            <p className="section-label justify-center">Nos Fondements</p>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl font-semibold text-cream">
              Trois piliers qui nous guident
            </h2>
          </RevealSection>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { num: '01', Icon: Crown, title: pillar1Title, desc: pillar1Desc, accent: 'text-evangile-500' },
              { num: '02', Icon: Flame, title: pillar2Title, desc: pillar2Desc, accent: 'text-red-400' },
              { num: '03', Icon: Compass, title: pillar3Title, desc: pillar3Desc, accent: 'text-evangile-500' },
            ].map(({ num, Icon, title, desc, accent }, i) => (
              <RevealSection key={num} className={`reveal-delay-${i + 1}`}>
                <div className="glass-card group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 border-t-2 border-transparent hover:border-t-evangile-600/60 hover:shadow-lg hover:shadow-evangile-600/5">
                  {/* Background number */}
                  <span className="absolute top-4 right-6 text-5xl font-bold text-cream opacity-[0.07] select-none font-serif">
                    {num}
                  </span>

                  {/* Icon */}
                  <IconBox pageKey="home" elementId={`pillars-icon-${i}`} className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-line ${accent}`}>
                    <Icon className="h-6 w-6" />
                  </IconBox>

                  {/* Content */}
                  <h3 className={`mb-3 font-serif text-xl font-semibold ${accent}`}>
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted">{desc}</p>

                  {/* Hover gradient border effect */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-evangile-600 to-red-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ═══════ SECTION: WE ARE UNIQUE ═══════ */}
      {isSectionVisible('unique') && (
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left: Image */}
            <RevealSection>
              <div className="relative">
                <div className="overflow-hidden rounded-3xl">
                  <img
                    src={aboutImage}
                    alt="Église La Conquête"
                    className="cutout-mask h-[480px] w-full object-cover transition-transform duration-700 hover:scale-105"
                    loading="lazy"
                  />
                </div>
                {/* Floating Cross decoration */}
                <IconBox pageKey="home" elementId="unique-float-cross" className="absolute -bottom-4 -right-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg/90 border border-evangile-600/20 text-evangile-500 shadow-xl shadow-black/20">
                  <Cross className="h-7 w-7" />
                </IconBox>
              </div>
            </RevealSection>

            {/* Right: Text */}
            <RevealSection className="reveal-delay-1">
              <p className="section-label">Qui sommes-nous</p>
              <h2 className="mt-4 font-serif text-3xl md:text-4xl font-semibold leading-snug text-cream">
                Une église qui fait la différence
              </h2>
              <p className="mt-6 leading-relaxed text-muted">{aboutText1}</p>
              <p className="mt-4 leading-relaxed text-muted">{aboutText2}</p>

              {/* Signed quote */}
              <blockquote className="mt-8 border-l-4 border-evangile-600/50 pl-5">
                <p className="text-sm italic text-cream/70">&laquo; {aboutQuote} &raquo;</p>
                <p className="mt-1 text-xs font-semibold text-evangile-500">&mdash; Psaumes 2:8</p>
              </blockquote>

              <button
                onClick={() => onNavigate('about')}
                className="btn-gold mt-8"
              >
                En savoir plus
                <ArrowRight className="h-4 w-4" />
              </button>
            </RevealSection>
          </div>
        </div>
      </section>
      )}

      {/* ═══════ SECTION: EXPLORER ═══════ */}
      {isSectionVisible('explore') && (
      <section className="py-24 bg-radial-primary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-14 text-center">
            <p className="section-label justify-center">Explorer</p>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl font-semibold text-cream">
              Découvrez nos activités
            </h2>
          </RevealSection>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                img: DEFAULT_SERMON_IMG,
                Icon: Radio,
                title: 'Prédications',
                stat: '12+ messages',
                page: 'predications' as Page,
              },
              {
                img: DEFAULT_EVENT_IMG,
                Icon: Calendar,
                title: 'Événements',
                stat: 'Prochains événements',
                page: 'events' as Page,
              },
              {
                img: DEFAULT_MINISTRY_IMG,
                Icon: Users,
                title: 'Ministères',
                stat: '8 départements',
                page: 'departments' as Page,
              },
              {
                img: DEFAULT_MEDIA_IMG,
                Icon: MonitorPlay,
                title: 'Médias',
                stat: 'Vidéos & podcasts',
                page: 'media' as Page,
              },
            ].map(({ img, Icon, title, stat, page }, i) => (
              <RevealSection key={title} className={`reveal-delay-${i + 1}`}>
                <button
                  onClick={() => onNavigate(page)}
                  className="group relative w-full overflow-hidden rounded-2xl text-left"
                >
                  <img
                    src={img}
                    alt={title}
                    className="blog-img-zoom h-64 w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  {/* Stat badge */}
                  <div className="absolute right-3 top-3 z-10">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm">
                      <Eye className="h-3 w-3" />
                      {stat}
                    </span>
                  </div>

                  {/* Bottom content */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-evangile-600/20 text-evangile-500">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-white">{title}</h3>
                    <div className="mt-2 flex items-center gap-2 text-sm text-evangile-400 opacity-0 transition-all duration-300 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
                      <span>Découvrir</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </button>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ═══════ SECTION: BIBLICAL QUOTE (full-width dark) ═══════ */}
      {isSectionVisible('quote') && (
      <section
        className="py-28"
        style={{ backgroundColor: 'rgb(var(--bg-rgb))' }}
      >
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <RevealSection>
            {/* Gold divider above */}
            <div className="mx-auto mb-8 flex items-center justify-center gap-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-evangile-600/50" />
              <Quote className="h-8 w-8 text-evangile-500/60 rotate-180" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-evangile-600/50" />
            </div>

            <p className="font-serif text-2xl italic leading-relaxed text-cream sm:text-3xl">
              &laquo; {quoteText} &raquo;
            </p>
            <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-evangile-500">
              &mdash; {quoteRef}
            </p>

            {/* Gold divider below */}
            <div className="mt-8 mx-auto flex items-center justify-center gap-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-evangile-600/50" />
              <Quote className="h-8 w-8 text-evangile-500/60" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-evangile-600/50" />
            </div>
          </RevealSection>
        </div>
      </section>
      )}

      {/* ═══════ SECTION: PASTORAL TEAM ═══════ */}
      {isSectionVisible('pastors') && pastors.length > 0 && (
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <RevealSection className="mb-14 text-center">
              <p className="section-label justify-center">Notre équipe</p>
              <h2 className="mt-4 font-serif text-3xl md:text-4xl font-semibold text-cream">
                Rencontrez ceux qui servent
              </h2>
            </RevealSection>

            <RevealSection>
              <EnhancedPastorGrid pastors={pastors} />
            </RevealSection>
          </div>
        </section>
      )}

      {/* ═══════ SECTION: TESTIMONIALS ═══════ */}
      {isSectionVisible('testimonials') && testimonials.length > 0 && (
        <section className="py-24 bg-radial-primary">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <RevealSection className="mb-14 text-center">
              <p className="section-label justify-center">Témoignages</p>
              <h2 className="mt-4 font-serif text-3xl md:text-4xl font-semibold text-cream">
                Ce que Dieu fait parmi nous
              </h2>
            </RevealSection>

            <RevealSection>
              <TestimonialsCarousel testimonials={testimonials} />
            </RevealSection>
          </div>
        </section>
      )}

      {/* ═══════ SECTION: CTA FINAL ═══════ */}
      {isSectionVisible('cta') && (
      <section className="relative py-28 overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${DEFAULT_CTA_IMG})` }}
        />
        {/* 90% dark overlay */}
        <div className="absolute inset-0 bg-black/90" />
        {/* Radial glow */}
        <div className="absolute inset-0 bg-radial-primary pointer-events-none opacity-50" />

        <div className="relative z-10 mx-auto max-w-2xl px-4 text-center">
          <RevealSection>
            {/* Heart with ping */}
            <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-evangile-600/20" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-evangile-600/15 border border-evangile-600/30">
                <Heart className="h-7 w-7 text-evangile-500" />
              </div>
            </div>

            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-cream">
              Rejoignez notre famille
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-cream/70 max-w-lg mx-auto">
              Vous êtes appelé à faire partie de cette aventure extraordinaire. Venez rencontrer une communauté qui prie, qui aime et qui sert ensemble.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button onClick={() => onNavigate('contact')} className="btn-gold">
                Rejoindre
                <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => onNavigate('about')} className="btn-ghost">
                En savoir plus
              </button>
            </div>
          </RevealSection>
        </div>
      </section>
      )}

      {/* ═══════ SECTION: MAP ═══════ */}
      {isSectionVisible('map') && (
      <section className="py-0">
        <iframe
          title="Localisation de l'Église Évangélique La Conquête"
          src={getBuilderConfig('map', 'embed_url', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15881.0!2d29.2223!3d-11.6602!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1c6c1e4e5e5e5e5%3A0x5e5e5e5e5e5e5e5!2sLubumbashi!5e0!3m2!1sfr!2scd!4v1700000000000') as string}
          width="100%"
          height={getBuilderConfig('map', 'height', 400) as number}
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full"
        />
      </section>
      )}

      {/* ═══════ FOOTER ═══════ */}
      <SiteFooter
        onNavigate={onNavigate}
        theme={colorMode}
        onToggleTheme={toggleColorMode}
      />

      {/* ═══════ LIVE STREAM MODAL ═══════ */}
      <LiveStreamModal
        open={liveModalOpen}
        onClose={() => setLiveModalOpen(false)}
      />
    </>
  );
}