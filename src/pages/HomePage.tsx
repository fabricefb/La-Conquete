import { useState, useEffect, useRef } from 'react';
import { supabase, db, buildContentMap, getContent, buildSettingsMap } from '../lib/supabase';
import { loadSectionColors, type SectionColorMap } from '../lib/hooks/useSectionColors';
import { useReveal } from '../lib/hooks';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { IconBox } from '../components/IconBox';
import { TopBar } from '../components/home/TopBar';
import { UpcomingCarousel } from '../components/home/UpcomingCarousel';
import { RecentTeachings } from '../components/home/RecentTeachings';
import { ServiceCountdown } from '../components/home/ServiceCountdown';
import { LiveStreamModal } from '../components/LiveStreamModal';
import { ArticleReader } from '../components/ArticleReader';
import { EnhancedPastorGrid } from '../components/home/EnhancedPastorGrid';
import { TestimonialsCarousel } from '../components/home/TestimonialsCarousel';
import { sortedArticles, articleDate, readingTime, type Article } from '../lib/articles';
import { CHURCH } from '../lib/church';
import {
  Crown,
  Flame,
  Compass,
  Heart,
  ArrowRight,
  Radio,
  MonitorPlay,
  Users,
  Calendar,
  Eye,
  ChevronDown,
  Newspaper,
  Clock,
  ArrowUpRight,
} from '../lib/icons';
import type { Page } from '../lib/navigation';
import type { ChurchEvent } from '../types';

/* ═══════════════════════════════════════════════════════════════════
   Activity Card type (matches activity_cards table)
   ═══════════════════════════════════════════════════════════════════ */
interface ActivityCard {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  image_url: string;
  link: string;
  sort_order: number;
  is_active: boolean;
}

/* ═══════════════════════════════════════════════════════════════════
   Constants & defaults
   ═══════════════════════════════════════════════════════════════════ */

/* Fallbacks only — each is overridable from the admin. These are the church's
   own photographs, shipped from /public so nothing depends on a third-party CDN. */
const DEFAULT_HERO_IMG = '/church-photo-3.jpg';
const DEFAULT_ABOUT_IMG = '/church-photo-1.jpg';
const DEFAULT_SERMON_IMG = '/predication-1.jpg';
const DEFAULT_EVENT_IMG = '/priere.jpg';
const DEFAULT_MINISTRY_IMG = '/church-photo-2.jpg';
const DEFAULT_MEDIA_IMG = '/bible.jpg';
const DEFAULT_NEWS_IMG = '/church-photo-1.jpg';
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
          <div className="mx-auto mb-6 h-8 w-72 animate-pulse bg-white/10" />
          <div className="mx-auto mb-6 h-16 w-[500px] max-w-full animate-pulse bg-white/10" />
          <div className="mx-auto mb-10 h-6 w-80 max-w-full animate-pulse bg-white/10" />
          <div className="flex justify-center gap-4">
            <div className="h-12 w-40 animate-pulse bg-white/10" />
            <div className="h-12 w-44 animate-pulse bg-white/10" />
          </div>
          <div className="mt-16 flex justify-center gap-12">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="mx-auto mb-2 h-8 w-16 bg-white/10" />
                <div className="mx-auto h-3 w-20 bg-white/5" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-12 sm:py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="h-10 w-64 mx-auto animate-pulse bg-white/10" />
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3 h-56 sm:h-64 animate-pulse bg-white/5" />
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 animate-pulse bg-white/5" />
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="py-12 sm:py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 sm:h-64 animate-pulse bg-white/5" />
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
  { text: "Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux.", ref: 'Matthieu 18:20' },
  { text: "Confiez-vous en l'Éternel de tout votre cœur.", ref: 'Proverbes 3:5' },
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
  const bgRef = useRef<HTMLDivElement>(null);

  // Parallax: translate the background layer on scroll
  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    let raf = 0;
    const fn = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translateY(${window.pageYOffset * 0.25}px) scale(1.15)`;
      });
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => { window.removeEventListener('scroll', fn); cancelAnimationFrame(raf); };
  }, []);

  /* ── Data state ──────────────────────────────────────────────── */
  const [contentMap, setContentMap] = useState<Record<string, string>>({});
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [pastors, setPastors] = useState<any[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [openArticle, setOpenArticle] = useState<Article | null>(null);
  const [builderConfig, setBuilderConfig] = useState<Record<string, { visible: boolean; config: Record<string, unknown> }>>({});
  const [sectionColors, setSectionColors] = useState<SectionColorMap>({});
  const [activityCards, setActivityCards] = useState<ActivityCard[]>([]);

  const news = sortedArticles();

  /* ── Fetch on mount ──────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [contents, settings, testimonialData, pastorData, builderData, colorsData, eventData, activityCardsData] = await Promise.all([
          db.getPageContents('home'),
          db.getSettings(),
          db.getActiveTestimonials(),
          db.getActivePastors(),
          supabase.from('site_settings').select('value').eq('key', 'builder_config_home').single(),
          supabase.from('site_settings').select('value').eq('key', 'section_colors_home').single(),
          db.getEvents().catch(() => []),
          supabase.from('activity_cards').select('*').eq('is_active', true).order('sort_order'),
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

        // Parse section colors
        if (colorsData?.data?.value) {
          try {
            const parsed = typeof colorsData.data.value === 'string'
              ? JSON.parse(colorsData.data.value)
              : colorsData.data.value;
            if (parsed && typeof parsed === 'object') {
              setSectionColors(parsed as SectionColorMap);
            }
          } catch { /* keep empty */ }
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
        setEvents((eventData || []) as ChurchEvent[]);
        // Map DB columns (card_key, stat_label, target_page) to interface fields
        const CARD_KEY_TO_ICON: Record<string, string> = {
          predications: 'radio', events: 'calendar', ministries: 'users',
          medias: 'monitor_play', actualites: 'newspaper',
        };
        setActivityCards(
          (activityCardsData?.data || []).map((row: any) => ({
            id: row.id,
            title: row.title || '',
            description: row.stat_label || '',
            icon_name: CARD_KEY_TO_ICON[row.card_key] || 'eye',
            image_url: row.image_url || '',
            link: row.target_page || 'activities',
            sort_order: row.sort_order ?? 0,
            is_active: row.is_active ?? true,
          })) as ActivityCard[],
        );
      } catch (err) {
        console.warn('[HomePage] data fetch failed:', err);
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

  // Icon name → component mapping for activity cards
  const iconMap: Record<string, React.FC<{ className?: string }>> = {
    radio: Radio,
    calendar: Calendar,
    users: Users,
    monitor_play: MonitorPlay,
    monitorplay: MonitorPlay,
    newspaper: Newspaper,
    eye: Eye,
    crown: Crown,
    flame: Flame,
    compass: Compass,
    heart: Heart,
    clock: Clock,
    headphones: Radio,
  };

  // Fallback cards if Supabase returns nothing
  const fallbackCards: ActivityCard[] = [
    { id: 'fb-1', title: 'Prédications', description: 'Messages récents', icon_name: 'radio', image_url: DEFAULT_SERMON_IMG, link: 'predications', sort_order: 1, is_active: true },
    { id: 'fb-2', title: 'Événements', description: "L'agenda", icon_name: 'calendar', image_url: DEFAULT_EVENT_IMG, link: 'events', sort_order: 2, is_active: true },
    { id: 'fb-3', title: 'Ministères', description: 'Les départements', icon_name: 'users', image_url: DEFAULT_MINISTRY_IMG, link: 'ministeres', sort_order: 3, is_active: true },
    { id: 'fb-4', title: 'Médias', description: 'Vidéos & podcasts', icon_name: 'monitor_play', image_url: DEFAULT_MEDIA_IMG, link: 'media', sort_order: 4, is_active: true },
    { id: 'fb-5', title: 'Actualités', description: 'Dernières nouvelles', icon_name: 'newspaper', image_url: DEFAULT_NEWS_IMG, link: 'blog', sort_order: 5, is_active: true },
  ];
  const displayCards = activityCards.length > 0 ? activityCards : fallbackCards;

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

  // Helper: get inline style from section colors
  const getSectionStyle = (sectionId: string): React.CSSProperties => {
    const c = sectionColors[sectionId];
    if (!c) return {};
    const s: React.CSSProperties = {};
    if (c.bg) s.backgroundColor = c.bg;
    if (c.text) s.color = c.text;
    return s;
  };

  // Pastors section config
  const pastorsLabel = getContent(cm, 'pastors', 'label', 'Notre équipe');
  const pastorsTitle = getContent(cm, 'pastors', 'title', 'Rencontrez ceux qui servent');
  const pastorColumns = Number(getBuilderConfig('pastors', 'columns', 4)) || 4;
  const pastorMaxDisplay = Number(getBuilderConfig('pastors', 'max_display', 8)) || 8;
  const pastorShowBio = getBuilderConfig('pastors', 'show_bio', true) as boolean;

  // Topbar dynamic content
  const topbarPhone = getContent(cm, 'topbar', 'phone', '');
  const topbarEmail = getContent(cm, 'topbar', 'email', '');
  // Priority: page_contents > builder_config > empty
  const topbarMarquee =
    getContent(cm, 'topbar', 'marquee_text', '') ||
    (getBuilderConfig('topbar', 'marquee_text', '') as string) ||
    '';

  // Topbar section colors (from section_colors_home)
  const topbarTextColor = sectionColors['topbar']?.text || '';
  const topbarBgColor = sectionColors['topbar']?.bg || '';

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
  const heroSubtitle = getContent(cm, 'hero', 'subtitle', 'Église Évangélique La Conquête — Lubumbashi, RDC');
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
    "Une famille soudée par l'amour du Christ, où chacun trouve sa place, son soutien et sa mission au service du corps.",
  );
  const pillar3Title = getContent(cm, 'pillars', 'pillar_3_title', 'Mission');
  const pillar3Desc = getContent(
    cm,
    'pillars',
    'pillar_3_desc',
    "Un appel à aller au-delà des murs, à porter l'Évangile aux nations et à faire des disciples pour la gloire de Dieu.",
  );

  // About
  const aboutText1 = getContent(
    cm,
    'about',
    'text_1',
    "Fondée sur la Parole vivante de Dieu, l'Église Évangélique La Conquête est une communauté de foi qui croit en la puissance transformatrice de l'Évangile. Nous sommes appelés à bâtir des vies, à transformer des cœurs et à conquérir des nations pour la gloire de Dieu.",
  );
  const aboutText2 = getContent(
    cm,
    'about',
    'text_2',
    "Chaque croyant est un ambassadeur, porteur d'une vision divine pour sa génération. Ensemble, nous avançons dans notre destinée collective avec foi, amour et détermination.",
  );
  const aboutQuote = getContent(
    cm,
    'about',
    'bible_text',
    'Demande-moi, et je te donnerai les nations pour héritage.',
  );
  const aboutImage = getContent(cm, 'about', 'image', DEFAULT_ABOUT_IMG);

  // Pastor Word (Mot du pasteur)
  const pastorWordLabel = getContent(cm, 'pastor_word', 'label', 'Mot du pasteur');
  const pastorWordTitle = getContent(cm, 'pastor_word', 'title', 'Conseils pastoraux');
  const pastorWordText1 = getContent(cm, 'pastor_word', 'text_1', 'Cher membre de la famille La Conquête, Dieu a un plan extraordinaire pour votre vie. Ne laissez pas les circonstances définir votre destinée, mais laissez la Parole de Dieu établir vos pas.');
  const pastorWordText2 = getContent(cm, 'pastor_word', 'text_2', 'Nous sommes dans une saison où Dieu appelle son Église à se lever, à prendre position et à manifester sa gloire dans chaque domaine de la société.');
  const pastorWordQuote = getContent(cm, 'pastor_word', 'bible_text', 'Car je connais les projets que j\'ai formés sur vous, dit l\'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l\'espérance.');
  const pastorWordQuoteRef = getContent(cm, 'pastor_word', 'bible_ref', 'Jérémie 29:11');
  const pastorPortrait = getContent(cm, 'pastor_word', 'portrait_image', '/pasteur-kazadi.jpg');
  const pastorSignature = getContent(cm, 'pastor_word', 'signature_image', '');
  const portraitScale = parseFloat(getContent(cm, 'pastor_word', 'portrait_scale', '1')) || 1;
  const portraitPosX = getContent(cm, 'pastor_word', 'portrait_pos_x', 'center'); // left | center | right
  const portraitPosY = getContent(cm, 'pastor_word', 'portrait_pos_y', 'center'); // top | center | bottom
  const signaturePosX = getContent(cm, 'pastor_word', 'signature_pos_x', 'center'); // left | center | right
  const signatureScale = parseFloat(getContent(cm, 'pastor_word', 'signature_scale', '1')) || 1;

  // News section
  const newsTitle = getContent(cm, 'news', 'title', "La vie de l'église");
  const newsSubtitle = getContent(cm, 'news', 'subtitle', 'Enseignements, annonces et nouvelles de nos extensions — ce qui fait vivre la communauté.');

  // CTA map section
  const ctaTitle = getContent(cm, 'cta_map', 'title', 'Rejoignez notre famille');
  const ctaText = getContent(cm, 'cta_map', 'text', 'Vous êtes appelé à faire partie de cette aventure extraordinaire. Venez rencontrer une communauté qui prie, qui aime et qui sert ensemble.');

  // Quote
  const quoteText = getContent(
    cm,
    'quote',
    'text',
    "Car nous sommes son ouvrage, ayant été créés en Jésus-Christ pour de bonnes œuvres, que Dieu a préparées d'avance, afin que nous les pratiquions.",
  );
  const quoteRef = getContent(cm, 'quote', 'reference', 'Éphésiens 2:10');

  /* ── Loading ─────────────────────────────────────────────────── */
  if (loading) return <SkeletonPage />;

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen mobile-bottom-pad">
      <SiteHeader onNavigate={onNavigate} />
      <MobileNav onNavigate={onNavigate} active="home" />

      {/* ═══════ HERO — pleine largeur, photo réelle, implantation à gauche ═══════ */}
      <section className="relative w-full h-[100dvh] m-0 overflow-hidden flex items-end" style={{ marginTop: 0 }}>
        {/* Photo de reportage — calée en clair-obscur sur le marine */}
        <div
          ref={bgRef}
          className="absolute inset-[-6%] will-change-transform"
          style={{ transition: 'transform 0.1s linear' }}
        >
          {heroImages.length > 1 ? (
            heroImages.map((img: string, i: number) => (
              <div
                key={i}
                className="photo-claro-strong absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[1200ms] ease-in-out"
                style={{
                  backgroundImage: `url(${img})`,
                  opacity: i === heroIndex ? 1 : 0,
                }}
              />
            ))
          ) : (
            <div
              className="photo-claro-strong absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${heroImg})` }}
            />
          )}
        </div>

        {/* Voile marine : garantit la lisibilité du texte sur la photo */}
        <div className="hero-scrim absolute inset-0" />
        <div className="grid-lines absolute inset-0 pointer-events-none" />

        {/* Sélecteur du diaporama — barres fines, registre institutionnel */}
        {heroImages.length > 1 && (
          <div className="absolute bottom-10 right-6 z-20 flex gap-1.5 lg:right-10">
            {heroImages.map((_: string, i: number) => (
              <button
                key={i}
                onClick={() => setHeroIndex(i)}
                className={`h-0.5 w-8 transition-all duration-500 ${
                  i === heroIndex ? 'bg-evangile-600 w-14' : 'bg-white/25 hover:bg-white/50'
                }`}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Mot géant en filigrane — signature de l'affiche */}
        <span className="watermark absolute -right-8 top-1/2 hidden -translate-y-1/2 text-[22vw] leading-none lg:block">
          Conquête
        </span>

        {/* Contenu — aligné sur la grille, bloc en bas à gauche */}
        <div className="relative z-10 w-full pb-16 pt-24 sm:pb-20 lg:pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="animate-fade-up flex items-center gap-4">
                <span className="rule-accent" />
                <p className="section-eyebrow">{heroSubtitle}</p>
              </div>

              <div className="animate-fade-up mt-6" style={{ animationDelay: '0.08s' }}>
                <h1 className="display-title">
                  <span className="block">{heroTitle1}</span>
                  <span className="block">{heroTitle2}</span>
                </h1>
              </div>

              <div className="animate-fade-up mt-8 max-w-xl border-l-2 pl-5" style={{ animationDelay: '0.16s', borderColor: 'rgb(var(--brand-red-rgb))' }}>
                <blockquote className="verse-quote">{heroBibleVerse}</blockquote>
              </div>

              <ServiceCountdown className="animate-fade-up mt-10" />

              <div
                className="animate-fade-up mt-10 flex flex-wrap items-center gap-4"
                style={{ animationDelay: '0.32s' }}
              >
                <button onClick={() => onNavigate('culte')} className="btn-primary">
                  {heroCtaPrimary}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => onNavigate('about')} className="btn-ghost">
                  {heroCtaSecondary}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Indice de défilement — fixe, sans rebond */}
        <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
          <ChevronDown className="h-5 w-5 text-cream/40" />
        </div>
      </section>

      {/* ═══════ BANDE PASSANTE — Communiqués & Countdown ═══════ */}
      {isSectionVisible('topbar') && <TopBar onNavigate={(page: string) => onNavigate(page as Page)} onLiveClick={() => setLiveModalOpen(true)} phone={topbarPhone} email={topbarEmail} marqueeOverride={topbarMarquee} textColor={topbarTextColor} bgColor={topbarBgColor} />}

      {/* ═══════ SECTION: À NE PAS MANQUER (carrousel) ═══════ */}
      {isSectionVisible('agenda') && <UpcomingCarousel events={events} onNavigate={onNavigate} />}

      {/* ═══════ SECTION: THREE PILLARS ═══════ */}
      {isSectionVisible('pillars') && (
      <section className="py-12 md:py-20 lg:py-24 bg-radial-primary" style={getSectionStyle('pillars')}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-14 text-center">
            <p className="section-label justify-center">Nos Fondements</p>
            <h2 className="section-title mt-4">
              Trois piliers qui nous guident
            </h2>
          </RevealSection>

          <div className="grid gap-px border border-line bg-line md:grid-cols-3">
            {[
              { num: '01', Icon: Crown, title: pillar1Title, desc: pillar1Desc },
              { num: '02', Icon: Flame, title: pillar2Title, desc: pillar2Desc },
              { num: '03', Icon: Compass, title: pillar3Title, desc: pillar3Desc },
            ].map(({ num, Icon, title, desc }, i) => (
              <RevealSection key={num} className={`reveal-delay-${i + 1}`}>
                <div className="group relative flex h-full flex-col bg-bg-card p-6 transition-colors duration-300 hover:bg-bg-card-hover sm:p-8">
                  <div className="flex items-start justify-between">
                    <IconBox pageKey="home" elementId={`pillars-icon-${i}`} className="inline-flex h-12 w-12 items-center justify-center border border-line text-evangile-600">
                      <Icon className="h-6 w-6" />
                    </IconBox>
                    <span className="stat-figure text-[2rem] text-evangile-600/20">{num}</span>
                  </div>

                  <h3 className="card-title mt-6">{title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ═══════ SECTION: MOT DU PASTEUR ═══════ */}
      {isSectionVisible('unique') && (
      <section className="py-12 sm:py-16 md:py-24" style={getSectionStyle('unique')}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left: portrait encadré + signature */}
            <RevealSection>
              <div className="mx-auto flex w-full max-w-md flex-col items-center lg:mx-0 lg:items-start">
                <div className="portrait-frame relative aspect-[4/5] w-full overflow-hidden">
                  <img
                    src={pastorPortrait}
                    alt={CHURCH.pastor.name}
                    className="h-full w-full object-cover transition-transform duration-500"
                    style={{
                      objectPosition: `${portraitPosX} ${portraitPosY}`,
                      transform: `scale(${portraitScale})`,
                    }}
                    loading="lazy"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                    <p className="person-role">{CHURCH.pastor.title}</p>
                    <p className="person-name mt-1.5">{CHURCH.pastor.name}</p>
                  </div>
                </div>
                {pastorSignature && (
                  <div
                    className="mt-4 flex w-full"
                    style={{ justifyContent: signaturePosX === 'left' ? 'flex-start' : signaturePosX === 'right' ? 'flex-end' : 'center' }}
                  >
                    <img
                      src={pastorSignature}
                      alt="Signature"
                      className="h-12 w-auto object-contain opacity-80 transition-transform duration-300"
                      style={{ transform: `scale(${signatureScale})` }}
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            </RevealSection>

            {/* Right: Text */}
            <RevealSection className="reveal-delay-1">
              <p className="section-eyebrow">{pastorWordLabel}</p>
              <h2 className="section-title mt-4">
                {pastorWordTitle}
              </h2>
              <div className="rule-accent mt-6" />
              <p className="mt-6 leading-relaxed text-muted">{pastorWordText1}</p>
              <p className="mt-4 leading-relaxed text-muted">{pastorWordText2}</p>

              {/* Signed quote */}
              <blockquote className="mt-8 border-l-2 pl-5" style={{ borderColor: 'rgb(var(--brand-red-rgb))' }}>
                <p className="verse-quote">&laquo; {pastorWordQuote} &raquo;</p>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-evangile-600">&mdash; {pastorWordQuoteRef}</p>
              </blockquote>

              <button
                onClick={() => onNavigate('about')}
                className="btn-primary mt-8"
              >
                Voir À propos
                <ArrowRight className="h-4 w-4" />
              </button>
            </RevealSection>
          </div>
        </div>
      </section>
      )}

      {/* ═══════ SECTION: MESSAGES RÉCENTS ═══════ */}
      {isSectionVisible('teachings') && <RecentTeachings onNavigate={onNavigate} />}

      {/* ═══════ SECTION: EXPLORER ═══════ */}
      {isSectionVisible('explore') && (
      <section className="py-12 md:py-20 lg:py-24 bg-radial-primary" style={getSectionStyle('explore')}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-14 text-center">
            <p className="section-label justify-center">Explorer</p>
            <h2 className="section-title mt-4">
              Découvrez nos activités
            </h2>
            <p className="mt-3 text-sm text-muted max-w-2xl mx-auto">
              Cinq portes d'entrée dans la vie de l'église : prédications, rendez-vous, ministères, médias et actualités.
            </p>
          </RevealSection>

          <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {displayCards.map((card, i) => {
              const IconComponent = iconMap[(card.icon_name || 'eye').toLowerCase()] || Eye;
              const imgUrl = card.image_url || DEFAULT_SERMON_IMG;
              const navigateTo = card.link || 'activities';
              return (
                <RevealSection key={card.id} className={`reveal-delay-${(i % 5) + 1}`}>
                  <button
                    onClick={() => onNavigate(navigateTo as Page)}
                    className="group relative h-64 w-full overflow-hidden bg-bg-card text-left"
                  >
                    <img
                      src={imgUrl}
                      alt={card.title}
                      className="photo-claro absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/45 to-ink-950/10" />

                    <span className="absolute left-4 top-4 z-10 font-hero text-lg text-white/45">
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    {card.description && (
                      <span className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">
                        <Eye className="h-3 w-3" />
                        {card.description}
                      </span>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 z-10 p-5">
                      <IconComponent className="mb-3 h-5 w-5 text-white/70" />
                      <h3 className="card-title text-white">{card.title}</h3>
                      <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70 lg:opacity-0 lg:transition-opacity lg:duration-300 lg:group-hover:opacity-100">
                        <span>Découvrir</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </button>
                </RevealSection>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* ═══════ SECTION: ACTUALITÉS ═══════ */}
      {isSectionVisible('news') && (
      <section className="py-16 md:py-24 lg:py-28 bg-radial-primary" style={getSectionStyle('news')}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-12 flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-4">
                <span className="rule-accent" />
                <p className="section-eyebrow">Actualités</p>
              </div>
              <h2 className="section-title mt-4">{newsTitle}</h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">{newsSubtitle}</p>
            </div>
            <button onClick={() => onNavigate('blog')} className="btn-link shrink-0">
              Tous les articles
              <ArrowRight className="h-4 w-4" />
            </button>
          </RevealSection>

          {news.length > 0 && (
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
              <RevealSection className="lg:col-span-7">
                <button onClick={() => setOpenArticle(news[0])} className="group block w-full text-left">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={news[0].image}
                      alt=""
                      className="photo-claro-strong h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                    <span className="absolute left-0 top-0 bg-evangile-600 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                      {news[0].category}
                    </span>
                  </div>
                  <div className="mt-5 flex items-center gap-4 text-[11px] uppercase tracking-[0.14em] text-muted">
                    <span>{articleDate(news[0].date)}</span>
                    <span className="h-3 w-px bg-line" />
                    <span>Lecture {readingTime(news[0])}</span>
                  </div>
                  <h3 className="card-title mt-3 text-cream transition-colors group-hover:text-evangile-400">{news[0].title}</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{news[0].excerpt}</p>
                  <span className="btn-link mt-6 inline-flex">
                    Lire l'article
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              </RevealSection>

              <div className="lg:col-span-5">
                <div className="border-t border-line">
                  {news.slice(1, 4).map((a, i) => (
                    <RevealSection key={a.slug} className={`reveal-delay-${i + 1}`}>
                      <button onClick={() => setOpenArticle(a)} className="group grid w-full grid-cols-[auto_1fr] gap-5 border-b border-line py-6 text-left">
                        <span className="font-hero text-3xl leading-none text-muted/40">0{i + 2}</span>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                            {a.category} — {articleDate(a.date)}
                          </p>
                          <h3 className="mt-2 text-base font-semibold leading-snug text-cream transition-colors group-hover:text-evangile-400">
                            {a.title}
                          </h3>
                          <span className="mt-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-evangile-500">
                            Lire
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </button>
                    </RevealSection>
                  ))}
                </div>
                <button
                  onClick={() => onNavigate('blog')}
                  className="mt-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-cream transition-colors hover:text-evangile-400"
                >
                  Voir les {news.length} articles
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
      )}

      {/* ═══════ SECTION: BIBLICAL QUOTE (full-width dark) ═══════ */}
      {isSectionVisible('quote') && (
      <section
        className="border-y border-line py-16 md:py-24 lg:py-28"
        style={{ backgroundColor: 'rgb(var(--bg-rgb))', ...getSectionStyle('quote') }}
      >
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <RevealSection>
            <div className="mx-auto flex max-w-xs items-center gap-4">
              <span className="rule h-px flex-1" />
              <span className="section-eyebrow">Verset</span>
              <span className="rule h-px flex-1" />
            </div>

            <p className="verse-quote mt-8 text-xl leading-relaxed sm:text-2xl" style={sectionColors['quote']?.text ? { color: sectionColors['quote'].text } : { color: 'rgb(var(--text-rgb))' }}>
              &laquo; {quoteText} &raquo;
            </p>
            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-evangile-600" style={sectionColors['quote']?.text ? { color: sectionColors['quote'].text } : undefined}>
              &mdash; {quoteRef}
            </p>
          </RevealSection>
        </div>
      </section>
      )}

      {/* ═══════ SECTION: PASTORAL TEAM ═══════ */}
      {isSectionVisible('pastors') && pastors.length > 0 && (
        <section className="py-12 sm:py-16 md:py-24" style={getSectionStyle('pastors')}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <RevealSection className="mb-14 text-center">
              <p className="section-label justify-center" style={sectionColors['pastors']?.text ? { color: sectionColors['pastors'].text } : undefined}>{pastorsLabel}</p>
              <h2 className="section-title mt-4" style={sectionColors['pastors']?.text ? { color: sectionColors['pastors'].text } : { color: 'rgb(var(--text-rgb))' }}>
                {pastorsTitle}
              </h2>
            </RevealSection>

            <RevealSection>
              <EnhancedPastorGrid pastors={pastors.slice(0, pastorMaxDisplay)} columns={pastorColumns} showBio={pastorShowBio} />
            </RevealSection>
          </div>
        </section>
      )}

      {/* ═══════ SECTION: TESTIMONIALS ═══════ */}
      {isSectionVisible('testimonials') && testimonials.length > 0 && (
        <section className="py-12 md:py-20 lg:py-24 bg-radial-primary" style={getSectionStyle('testimonials')}>
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <RevealSection className="mb-14 text-center">
              <p className="section-label justify-center">Témoignages</p>
              <h2 className="section-title mt-4">
                Ce que Dieu fait parmi nous
              </h2>
            </RevealSection>

            <RevealSection>
              <TestimonialsCarousel testimonials={testimonials} />
            </RevealSection>
          </div>
        </section>
      )}

      {/* ═══════ SECTION: MAP + CTA FINAL ═══════ */}
      {isSectionVisible('cta') && (
      <section className="relative overflow-hidden">
        {/* Map as full background (Google Maps iframe) */}
        <div className="absolute inset-0 z-0">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3907.451037817296!2d27.47710807481882!3d-11.662413288545377!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x19723fdfcdd79fa3%3A0xd1db505d58bc72bb!2sEglise%20Evang%C3%A8lique%20la%20Conqu%C3%AAte!5e0!3m2!1sfr!2scd!4v1784346539701!5m2!1sfr!2scd"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, filter: 'grayscale(0.6) contrast(1.08) brightness(0.9)' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            title="Localisation Église La Conquête"
          />
        </div>
        {/* Dark overlay */}
        <div className="absolute inset-0 z-[1] bg-ink-950/80" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-ink-950/80 via-transparent to-ink-950/40" />

        {/* CTA content overlay */}
        <div className="relative z-[2] mx-auto flex min-h-[440px] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center sm:min-h-[480px] md:min-h-[520px]">
          <div className="w-full">
            <RevealSection>
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center border border-white/25 bg-ink-950/50">
                <Heart className="h-6 w-6 text-evangile-500" />
              </div>

              <p className="section-eyebrow">Nous rejoindre</p>
              <h2 className="section-title mt-4">
                {ctaTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-cream/85">
                {ctaText}
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <button onClick={() => onNavigate('contact')} className="btn-primary">
                  {ctaTitle === 'Rejoignez notre famille' ? 'Rejoindre' : ctaTitle}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => onNavigate('about')} className="btn-ghost border-white/30 text-white hover:bg-white/10">
                  En savoir plus
                </button>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>
      )}

      {/* ═══════ FOOTER ═══════ */}
      <div className="footer-spacer" />
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

      <ArticleReader article={openArticle} onClose={() => setOpenArticle(null)} onNavigate={onNavigate} />
    </div>
  );
}