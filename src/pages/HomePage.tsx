import { useState, useEffect } from 'react';
import { db, buildContentMap, getContent, buildSettingsMap } from '../lib/supabase';
import { useReveal, useParallax } from '../lib/hooks';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { TopBar } from '../components/home/TopBar';
import { TypingText, AnimatedCounter } from '../components/home/TypingHero';
import { VerseRotator } from '../components/home/VerseRotator';
import { EnhancedPastorGrid } from '../components/home/EnhancedPastorGrid';
import { TestimonialsCarousel } from '../components/home/TestimonialsCarousel';
import {
  Sparkles,
  Crown,
  Flame,
  Compass,
  BookOpen,
  Quote,
  MapPin,
  Phone,
  Mail,
  Heart,
  ArrowRight,
  Newspaper,
  Cross,
  Clock3,
  Radio,
  MonitorPlay,
  Megaphone,
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

  /* ── Fetch on mount ──────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [contents, settings, testimonialData, pastorData] = await Promise.all([
          db.getPageContents('home'),
          db.getSettings(),
          db.getActiveTestimonials(),
          db.getActivePastors(),
        ]);
        if (cancelled) return;
        setContentMap(buildContentMap(contents));
        setSettingsMap(buildSettingsMap(settings));
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

  // Hero
  const heroImg = getContent(cm, 'hero', 'bg_image', DEFAULT_HERO_IMG);
  const heroSubtitle = getContent(
    cm,
    'hero',
    'subtitle',
    'Une communauté de foi qui transforme des vies',
  );

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

  // Quote
  const quoteText = getContent(
    cm,
    'quote',
    'text',
    'Car nous sommes son ouvrage, ayant été créés en Jésus-Christ pour de bonnes \u0153uvres, que Dieu a préparées d\u2019avance, afin que nous les pratiquions.',
  );
  const quoteRef = getContent(cm, 'quote', 'reference', 'Éphésiens 2:10');

  // Contact
  const contactAddress = getContent(
    cm,
    'contact',
    'address',
    'Kinshasa, République Démocratique du Congo',
  );
  const contactPhone = getContent(cm, 'contact', 'phone', '+243 00 000 0000');
  const contactEmail = getContent(cm, 'contact', 'email', 'contact@laconquete.cd');

  /* ── Loading ─────────────────────────────────────────────────── */
  if (loading) return <SkeletonPage />;

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  return (
    <>
      <SiteHeader onNavigate={onNavigate} />
      <MobileNav onNavigate={onNavigate} active="home" />

      {/* ═══════ SECTION 0: TOP BAR ═══════ */}
      <TopBar />

      {/* ═══════ SECTION 1: HERO (fullscreen) ═══════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Parallax background */}
        <div
          ref={parallaxRef}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat will-change-transform"
          style={{ backgroundImage: `url(${heroImg})` }}
        />

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

        {/* Radial gold glow */}
        <div className="absolute inset-0 bg-radial-gold pointer-events-none" />

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-28 pb-20 text-center">
          {/* Badge */}
          <div className="animate-fade-up mb-8 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-gold-400">
            <Sparkles className="h-3.5 w-3.5" />
            Église Évangélique La Conquête
          </div>

          {/* Typing hero text */}
          <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h1 className="font-serif font-bold leading-tight">
              <TypingText
                words={['Bâtir', 'Transformer', 'Conquérir', 'Adorer', 'Servir', 'Évangéliser']}
                className="text-4xl md:text-6xl lg:text-7xl text-cream typing-cursor"
              />
            </h1>
          </div>

          {/* Subtitle with gold line dividers */}
          <div
            className="animate-fade-up mt-8 flex items-center justify-center gap-4"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="hidden sm:block h-px w-12 bg-gradient-to-r from-transparent to-gold-400/60" />
            <p className="text-lg md:text-xl text-cream/80 max-w-xl">
              {heroSubtitle}
            </p>
            <div className="hidden sm:block h-px w-12 bg-gradient-to-l from-transparent to-gold-400/60" />
          </div>

          {/* CTA buttons */}
          <div
            className="animate-fade-up mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            style={{ animationDelay: '0.3s' }}
          >
            <button onClick={() => onNavigate('about')} className="btn-gold">
              Découvrir
              <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => onNavigate('contact')} className="btn-ghost">
              Nous contacter
            </button>
          </div>

          {/* Animated stats row */}
          <div
            className="animate-fade-up mt-16 grid grid-cols-2 gap-8 sm:gap-12 md:flex md:justify-center md:gap-16"
            style={{ animationDelay: '0.5s' }}
          >
            {[
              { end: 500, suffix: '+', label: 'Membres' },
              { end: 8, suffix: '', label: 'Départements' },
              { end: 50, suffix: '+', label: 'Prédications' },
              { end: 3, suffix: '', label: 'Extensions' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-cream">
                  <AnimatedCounter end={stat.end} suffix={stat.suffix} duration={2500} />
                </div>
                <p className="mt-1 text-xs uppercase tracking-widest text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <ChevronDown className="h-6 w-6 text-cream/50" />
        </div>
      </section>

      {/* ═══════ SECTION 2: BIBLE VERSES ═══════ */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-14 text-center">
            <p className="section-label justify-center">La Parole de Dieu</p>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl font-semibold text-cream">
              Ancrez votre vie dans les promesses divines
            </h2>
          </RevealSection>

          <div className="grid gap-8 md:grid-cols-5 items-start">
            {/* Left: VerseRotator */}
            <RevealSection className="md:col-span-3">
              <VerseRotator />
            </RevealSection>

            {/* Right: 2x2 verse cards */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              {smallVerses.map((verse, i) => (
                <RevealSection key={i} className={`reveal-delay-${i + 1}`}>
                  <div className="glass-card h-full rounded-xl p-4 flex flex-col justify-between">
                    <p className="text-xs sm:text-sm leading-relaxed text-cream/80 italic">
                      &ldquo;{verse.text}&rdquo;
                    </p>
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-gold-400">
                      {verse.ref}
                    </p>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 3: THREE PILLARS ═══════ */}
      <section className="py-24 bg-radial-gold">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-14 text-center">
            <p className="section-label justify-center">Nos Fondements</p>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl font-semibold text-cream">
              Trois piliers qui nous guident
            </h2>
          </RevealSection>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { num: '01', Icon: Crown, title: pillar1Title, desc: pillar1Desc, accent: 'text-gold-400' },
              { num: '02', Icon: Flame, title: pillar2Title, desc: pillar2Desc, accent: 'text-red-400' },
              { num: '03', Icon: Compass, title: pillar3Title, desc: pillar3Desc, accent: 'text-gold-400' },
            ].map(({ num, Icon, title, desc, accent }, i) => (
              <RevealSection key={num} className={`reveal-delay-${i + 1}`}>
                <div className="glass-card group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 border-t-2 border-transparent hover:border-t-gold-400/60 hover:shadow-lg hover:shadow-gold-400/5">
                  {/* Background number */}
                  <span className="absolute top-4 right-6 text-5xl font-bold text-cream opacity-[0.07] select-none font-serif">
                    {num}
                  </span>

                  {/* Icon */}
                  <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-line ${accent}`}>
                    <Icon className="h-6 w-6" />
                  </div>

                  {/* Content */}
                  <h3 className={`mb-3 font-serif text-xl font-semibold ${accent}`}>
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted">{desc}</p>

                  {/* Hover gradient border effect */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold-400 to-red-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 4: WE ARE UNIQUE ═══════ */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left: Image */}
            <RevealSection>
              <div className="relative">
                <div className="overflow-hidden rounded-3xl">
                  <img
                    src={DEFAULT_ABOUT_IMG}
                    alt="Église La Conquête"
                    className="cutout-mask h-[480px] w-full object-cover transition-transform duration-700 hover:scale-105"
                    loading="lazy"
                  />
                </div>
                {/* Floating Cross decoration */}
                <div className="absolute -bottom-4 -right-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg/90 border border-gold-400/20 text-gold-400 shadow-xl shadow-black/20">
                  <Cross className="h-7 w-7" />
                </div>
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
              <blockquote className="mt-8 border-l-4 border-gold-400/50 pl-5">
                <p className="text-sm italic text-cream/70">&laquo; {aboutQuote} &raquo;</p>
                <p className="mt-1 text-xs font-semibold text-gold-400">&mdash; Psaumes 2:8</p>
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

      {/* ═══════ SECTION 5: EXPLORER ═══════ */}
      <section className="py-24 bg-radial-gold">
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
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/20 text-gold-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-white">{title}</h3>
                    <div className="mt-2 flex items-center gap-2 text-sm text-gold-300 opacity-0 transition-all duration-300 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
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

      {/* ═══════ SECTION 6: BIBLICAL QUOTE (full-width dark) ═══════ */}
      <section
        className="py-28"
        style={{ backgroundColor: 'rgb(var(--bg-rgb))' }}
      >
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <RevealSection>
            {/* Gold divider above */}
            <div className="mx-auto mb-8 flex items-center justify-center gap-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold-400/50" />
              <Quote className="h-8 w-8 text-gold-400/60 rotate-180" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold-400/50" />
            </div>

            <p className="font-serif text-2xl italic leading-relaxed text-cream sm:text-3xl">
              &laquo; {quoteText} &raquo;
            </p>
            <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-gold-400">
              &mdash; {quoteRef}
            </p>

            {/* Gold divider below */}
            <div className="mt-8 mx-auto flex items-center justify-center gap-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold-400/50" />
              <Quote className="h-8 w-8 text-gold-400/60" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold-400/50" />
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══════ SECTION 7: PASTORAL TEAM ═══════ */}
      {pastors.length > 0 && (
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

      {/* ═══════ SECTION 8: TESTIMONIALS ═══════ */}
      {testimonials.length > 0 && (
        <section className="py-24 bg-radial-gold">
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

      {/* ═══════ SECTION 9: BLOG / ACTUALITÉS ═══════ */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-14 text-center">
            <p className="section-label justify-center">
              <Newspaper className="h-3.5 w-3.5 mr-1.5" />
              Actualités
            </p>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl font-semibold text-cream">
              Dernières nouvelles
            </h2>
          </RevealSection>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sampleArticles.map((article, i) => (
              <RevealSection key={i} className={`reveal-delay-${i + 1}`}>
                <div className="glass-card group overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-gold-400/20">
                  {/* Image */}
                  <div className="overflow-hidden h-48">
                    <img
                      src={article.img}
                      alt={article.title}
                      className="blog-img-zoom h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    {/* Category badge */}
                    <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-gold-400/20 bg-gold-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gold-400">
                      <Megaphone className="h-3 w-3" />
                      {article.category}
                    </span>

                    <h3 className="font-serif text-base font-semibold leading-snug text-cream line-clamp-2 group-hover:text-gold-400 transition-colors duration-200">
                      {article.title}
                    </h3>

                    <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                      <Clock3 className="h-3 w-3" />
                      {article.date}
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-muted line-clamp-2">
                      {article.excerpt}
                    </p>

                    <button
                      onClick={() => onNavigate('annonces')}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-gold-400 hover:text-gold-300 transition-colors duration-200"
                    >
                      Lire l&apos;article
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 10: CTA FINAL ═══════ */}
      <section className="relative py-28 overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${DEFAULT_CTA_IMG})` }}
        />
        {/* 90% dark overlay */}
        <div className="absolute inset-0 bg-black/90" />
        {/* Radial glow */}
        <div className="absolute inset-0 bg-radial-gold pointer-events-none opacity-50" />

        <div className="relative z-10 mx-auto max-w-2xl px-4 text-center">
          <RevealSection>
            {/* Heart with ping */}
            <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400/20" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gold-400/15 border border-gold-400/30">
                <Heart className="h-7 w-7 text-gold-400" />
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

      {/* ═══════ SECTION 11: CONTACT STRIP ═══════ */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                Icon: MapPin,
                label: 'Adresse',
                value: contactAddress,
                href: undefined,
              },
              {
                Icon: Phone,
                label: 'Téléphone',
                value: contactPhone,
                href: `tel:${contactPhone.replace(/\s/g, '')}`,
              },
              {
                Icon: Mail,
                label: 'Email',
                value: contactEmail,
                href: `mailto:${contactEmail}`,
              },
            ].map(({ Icon, label, value, href }, i) => (
              <RevealSection key={label} className={`reveal-delay-${i + 1}`}>
                {href ? (
                  <a
                    href={href}
                    className="glass-card group block rounded-2xl p-7 text-center transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]"
                  >
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-400/20 text-muted transition-all duration-300 group-hover:scale-110 group-hover:text-gold-400 group-hover:border-gold-400/40 group-hover:bg-gold-400/10">
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">
                      {label}
                    </p>
                    <p className="text-sm font-medium text-cream">{value}</p>
                  </a>
                ) : (
                  <div className="glass-card group rounded-2xl p-7 text-center transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-400/20 text-muted transition-all duration-300 group-hover:scale-110 group-hover:text-gold-400 group-hover:border-gold-400/40 group-hover:bg-gold-400/10">
                      <Icon className="h-6 w-6" />
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

      {/* ═══════ FOOTER ═══════ */}
      <SiteFooter
        onNavigate={onNavigate}
        theme={colorMode}
        onToggleTheme={toggleColorMode}
      />
    </>
  );
}