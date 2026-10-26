import { useState, useEffect, useRef } from 'react';
import {
  supabase,
  db,
  buildContentMap,
  getContent,
  buildSettingsMap,
  isSupabaseConfigured,
} from '../lib/supabase';
import { loadSectionColors, type SectionColorMap } from '../lib/hooks/useSectionColors';
import { useReveal } from '../lib/hooks';
import { imageSrcSet } from '../lib/images';
import { preparePortrait, type PreparedPortrait } from '../lib/portrait';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { TopBar } from '../components/home/TopBar';
import { UpcomingCarousel, type AgendaSettings } from '../components/home/UpcomingCarousel';
import { RecentTeachings } from '../components/home/RecentTeachings';
import { NextSteps } from '../components/home/NextSteps';
import { FirstVisit } from '../components/home/FirstVisit';
import { PrayerTestimony } from '../components/home/PrayerTestimony';
import { QuickActions } from '../components/home/QuickActions';
import { ServiceCountdown } from '../components/home/ServiceCountdown';
import { LiveStreamModal } from '../components/LiveStreamModal';
import { ArticleReader } from '../components/ArticleReader';
import { PastoralBureau, type BureauPastor } from '../components/home/PastoralBureau';
import { TestimonialsCarousel } from '../components/home/TestimonialsCarousel';
import { sortArticles, articleDate, readingTime, type Article } from '../lib/articles';
import { useArticles } from '../lib/hooks/useArticles';
import { CHURCH } from '../lib/church';
import {
  Crown,
  Flame,
  Compass,
  Heart,
  HandHeart,
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
  MapPin,
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

/* Bureau pastoral de secours — utilisé uniquement si la base ne répond pas,
   pour que l'accueil ne perde jamais la présence pastorale. */
const FALLBACK_PASTORS: BureauPastor[] = [
  {
    id: 'bureau-1',
    full_name: 'Josué Romain Kazadi',
    title: 'Pasteur Principal',
    photo_url: '/pasteur-romain-kazadi.webp',
    pastor_category: 'pastor_principal',
  },
  {
    id: 'bureau-2',
    full_name: 'Dr David Kateba',
    title: '1er Pasteur Assistant',
    photo_url: '/pasteur-david-kateba.webp',
    pastor_category: null,
  },
  {
    id: 'bureau-3',
    full_name: 'Richard Mukendi',
    title: '2e Pasteur Assistant',
    photo_url: '/pasteur-richard-mukendi.webp',
    pastor_category: null,
  },
];

/* ═══════════════════════════════════════════════════════════════════
   Constants & defaults
   ═══════════════════════════════════════════════════════════════════ */

/* Fallbacks only — each is overridable from the admin. These are the church's
   own photographs, shipped from /public so nothing depends on a third-party CDN. */
const DEFAULT_HERO_IMG = '/church-photo-3.webp';
const DEFAULT_ABOUT_IMG = '/church-photo-1.webp';
const DEFAULT_SERMON_IMG = '/predication-1.webp';
const DEFAULT_EVENT_IMG = '/priere.webp';
const DEFAULT_MINISTRY_IMG = '/church-photo-2.webp';
const DEFAULT_MEDIA_IMG = '/bible.webp';
const DEFAULT_NEWS_IMG = '/church-photo-1.webp';
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
  openAuth: (view?: 'login' | 'signup') => void;
}

/* ═══════════════════════════════════════════════════════════════════
   HomePage component
   ═══════════════════════════════════════════════════════════════════ */

export function HomePage({ onNavigate, openAuth }: HomePageProps) {
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

  const articles = useArticles();
  const news = sortArticles(articles);

  /* ── Fetch on mount ──────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!isSupabaseConfigured) {
        setPastors(FALLBACK_PASTORS);
        setLoading(false);
        return;
      }

      try {
        const [contents, settings, testimonialData, pastorData, builderData, colorsData, eventData, activityCardsData] = await Promise.race([
          Promise.all([
            db.getPageContents('home'),
            db.getSettings(),
            db.getActiveTestimonials(),
            db.getActivePastors(),
            supabase.from('site_settings').select('value').eq('key', 'builder_config_home').single(),
            supabase.from('site_settings').select('value').eq('key', 'section_colors_home').single(),
            db.getEvents().catch(() => []),
            supabase.from('activity_cards').select('*').eq('is_active', true).order('sort_order'),
          ]),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => reject(new Error('Supabase timeout')), 6000);
          }),
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
        if (!cancelled) setPastors(FALLBACK_PASTORS);
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
  const pastorsLabel = getContent(cm, 'pastors', 'label', 'Bureau pastoral');
  const pastorsTitle = getContent(cm, 'pastors', 'title', "Une équipe au service de l'Église");

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

  // Slideshow: zoom lent puis fondu vers l'image suivante
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % heroImages.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [heroImages.length]);
  // Hero texts
  const heroTitle1 = getContent(cm, 'hero', 'title_line1', 'La Conquête');
  const heroTitle2 = getContent(cm, 'hero', 'title_line2', 'des Âmes');
  const heroSubtitle = getContent(cm, 'hero', 'subtitle', 'Église Évangélique La Conquête — Lubumbashi, RDC');
  const heroBibleVerse = getContent(cm, 'hero', 'bible_verse', 'Psaumes 2:8 — "Demande-moi, et je te donnerai les nations pour héritage"');
  const heroCtaPrimary = getContent(cm, 'hero', 'cta_primary', 'Rejoindre le culte');
  const heroCtaPrimaryLink = getContent(cm, 'hero', 'cta_primary_link', 'activities');
  const heroCtaSecondary = getContent(cm, 'hero', 'cta_secondary', 'Notre vision');
  const heroCtaSecondaryLink = getContent(cm, 'hero', 'cta_secondary_link', 'about');

  // Agenda — textes et affiche de l'événement à la une (modifiables au back-office)
  const agenda: AgendaSettings = {
    eyebrow: getContent(cm, 'agenda', 'eyebrow', 'Événements'),
    title: getContent(cm, 'agenda', 'title', 'À ne pas manquer'),
    subtitle: getContent(
      cm,
      'agenda',
      'subtitle',
      "Le marathon de prière et les rendez-vous qui rythment la vie de l'église.",
    ),
    kicker: getContent(cm, 'agenda', 'featured_kicker', 'À la une'),
    badge: getContent(cm, 'agenda', 'featured_badge', '1er – 30 novembre 2026'),
    featuredTitle: getContent(cm, 'agenda', 'featured_title', 'Marathon de prière'),
    featuredTime: getContent(
      cm,
      'agenda',
      'featured_time',
      'Lundi – vendredi, 16h00 – 18h45 · Dimanche, 08h00 – 10h30',
    ),
    featuredDescription: getContent(
      cm,
      'agenda',
      'featured_description',
      "« La mission de l'Église locale face au monde moderne » — Matthieu 28:19-20.",
    ),
    featuredImage: getContent(cm, 'agenda', 'featured_image', '/marathon-priere-2026-slide.webp'),
    featuredCta: getContent(cm, 'agenda', 'featured_cta', "Voir l'événement"),
  };

  const serviceImages: Record<number, string> = {
    0: getContent(cm, 'services', 'service_0_image', '/church-photo-3.webp'),
    3: getContent(cm, 'services', 'service_3_image', '/bible.webp'),
    5: getContent(cm, 'services', 'service_5_image', '/church-photo-1.webp'),
    6: getContent(cm, 'services', 'service_6_image', '/church-photo-2.webp'),
  };

  // Pillars
  const pillarsLabel = getContent(cm, 'pillars', 'heading_label', 'Nos Fondements');
  const pillarsTitle = getContent(cm, 'pillars', 'heading_title', 'Trois piliers qui nous guident');
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
    "Depuis 2004, l'Église Évangélique La Conquête est une communauté de foi fondée sur la Parole vivante de Dieu, qui croit en la puissance transformatrice de l'Évangile. Nous sommes appelés à bâtir des vies, à transformer des cœurs et à conquérir des nations pour la gloire de Dieu.",
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
  const pastorName = getContent(cm, 'pastor_word', 'name', CHURCH.pastor.name);
  const pastorRole = getContent(cm, 'pastor_word', 'role', CHURCH.pastor.title);
  const pastorChurchLine = getContent(cm, 'pastor_word', 'church_line', 'Église Évangélique La Conquête');
  const pastorVisionLabel = getContent(cm, 'pastor_word', 'vision_label', 'Notre vision');
  const rawTextAlign = getContent(cm, 'pastor_word', 'text_align', 'center').trim().toLowerCase();
  const pastorTextAlign: 'left' | 'center' | 'right' =
    rawTextAlign === 'center' || rawTextAlign === 'right' ? rawTextAlign : rawTextAlign === 'left' ? 'left' : 'center';
  const pastorTextRaise = Math.min(
    180,
    Math.max(0, Number.parseFloat(getContent(cm, 'pastor_word', 'text_raise', '0')) || 0),
  );
  const pastorMove = (prefix: string) => {
    const axis = (suffix: string, fallback: number) => {
      const raw = Number.parseFloat(getContent(cm, 'pastor_word', `${prefix}_${suffix}`, String(fallback)));
      return Number.isFinite(raw) ? raw : fallback;
    };
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    return {
      x: clamp(axis('x', 0), -260, 260),
      y: clamp(axis('y', 0), -200, 200),
      scale: clamp(axis('scale', 1), 0.5, 2),
    };
  };
  const moved = (position: { x: number; y: number; scale: number }) => ({
    transform: `translate(${position.x}px, ${position.y}px) scale(${position.scale})`,
  });
  const posLabel = pastorMove('pos_label');
  const posTitle = pastorMove('pos_title');
  const posText1 = pastorMove('pos_text1');
  const posText2 = pastorMove('pos_text2');
  const posQuote = pastorMove('pos_quote');
  const posRef = pastorMove('pos_ref');
  const posName = pastorMove('pos_name');
  const posRole = pastorMove('pos_role');
  const posFooter = pastorMove('pos_footer');
  const pastorPortrait = getContent(cm, 'pastor_word', 'portrait_image', '/pasteur-romain-kazadi.webp');
  const pastorSignature = getContent(cm, 'pastor_word', 'signature_image', '');
  const portraitScale = parseFloat(getContent(cm, 'pastor_word', 'portrait_scale', '1.25')) || 1.25;
  const normalizePortraitPos = (raw: string, axis: 'x' | 'y') => {
    const numeric = Number.parseFloat(raw);
    if (Number.isFinite(numeric)) return Math.min(100, Math.max(0, numeric));
    const keyword = raw.trim().toLowerCase();
    if (axis === 'x') return keyword === 'left' ? 0 : keyword === 'right' ? 100 : 50;
    return keyword === 'top' ? 0 : keyword === 'bottom' ? 100 : 50;
  };
  const portraitPosXPct = normalizePortraitPos(getContent(cm, 'pastor_word', 'portrait_pos_x', '50'), 'x');
  const portraitPosYPct = normalizePortraitPos(getContent(cm, 'pastor_word', 'portrait_pos_y', '0'), 'y');
  const [preparedPortrait, setPreparedPortrait] = useState<PreparedPortrait | null>(null);
  const [portraitReady, setPortraitReady] = useState(false);

  useEffect(() => {
    let alive = true;
    setPreparedPortrait(null);
    setPortraitReady(false);
    if (!pastorPortrait) return;
    preparePortrait(pastorPortrait).then((next) => {
      if (!alive) return;
      setPreparedPortrait(next);
      setPortraitReady(true);
    });
    return () => {
      alive = false;
    };
  }, [pastorPortrait]);

  const pastorPortraitSrc = preparedPortrait?.src ?? pastorPortrait;
  const pastorPortraitMode = preparedPortrait?.mode ?? 'photo';
  const portraitUsesCutout = portraitReady && pastorPortraitMode === 'cutout';
  const signaturePosX = getContent(cm, 'pastor_word', 'signature_pos_x', 'center'); // left | center | right
  const signatureScale = parseFloat(getContent(cm, 'pastor_word', 'signature_scale', '1')) || 1;

  // Premier dimanche
  const firstVisitImage = getContent(cm, 'firstvisit', 'image', '/church-photo-2.webp');

  // News section
  const newsEyebrow = getContent(cm, 'news', 'eyebrow', 'Actualités');
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
  const quoteLabel = getContent(cm, 'quote', 'heading_label', 'Verset');

  // Explorer section
  const exploreLabel = getContent(cm, 'explore', 'heading_label', 'Explorer');
  const exploreTitle = getContent(cm, 'explore', 'heading_title', 'Découvrez nos activités');
  const exploreDescription = getContent(
    cm,
    'explore',
    'subtitle',
    "Cinq portes d'entrée dans la vie de l'église : prédications, rendez-vous, ministères, médias et actualités.",
  );

  // Testimonials section
  const testimonialsLabel = getContent(cm, 'testimonials', 'heading_label', 'Témoignages');
  const testimonialsTitle = getContent(cm, 'testimonials', 'heading_title', 'Ce que Dieu fait parmi nous');
  const testimonialsDescription = getContent(
    cm,
    'testimonials',
    'description',
    "Des membres de la communauté racontent ce que Dieu a accompli dans leur vie, pour la gloire de son nom.",
  );

  /* ── Loading ─────────────────────────────────────────────────── */
  if (loading) return <SkeletonPage />;

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen mobile-bottom-pad">
      <SiteHeader onNavigate={onNavigate} activePage="home" />
      <MobileNav onNavigate={onNavigate} active="home" />

      {/* ═══════ HERO — pleine largeur, photo réelle, implantation à gauche ═══════ */}
      {isSectionVisible('hero') && (
      <section className="relative w-full h-[100dvh] m-0 overflow-hidden flex items-end" style={{ marginTop: 0 }}>
        {/* Photo de reportage — calée en clair-obscur sur le marine */}
        <div
          ref={bgRef}
          className="absolute inset-[-6%] will-change-transform"
          style={{ transition: 'transform 0.1s linear' }}
        >
          {heroImages.length > 1 ? (
            heroImages.map((img: string, i: number) => (
              <img
                key={i}
                src={img}
                srcSet={imageSrcSet(img)}
                sizes="100vw"
                alt=""
                aria-hidden="true"
                {...{ fetchpriority: i === 0 ? 'high' : 'low' }}
                decoding="async"
                className="photo-claro-strong hero-slide-zoom absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-[1500ms] ease-in-out"
                style={{ opacity: i === heroIndex ? 1 : 0 }}
              />
            ))
          ) : (
            <img
              src={heroImg}
              srcSet={imageSrcSet(heroImg)}
              sizes="100vw"
              alt=""
              aria-hidden="true"
              {...{ fetchpriority: 'high' }}
              decoding="async"
              className="photo-claro-strong hero-slide-zoom absolute inset-0 h-full w-full object-cover object-center"
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

              <div className="animate-fade-up mt-5" style={{ animationDelay: '0.08s' }}>
                <h1 className="display-title">
                  <span className="block">{heroTitle1}</span>
                  <span className="block">{heroTitle2}</span>
                </h1>
              </div>

              <div className="animate-fade-up mt-6 max-w-xl border-l-2 pl-5" style={{ animationDelay: '0.16s', borderColor: 'rgb(var(--brand-red-rgb))' }}>
                <blockquote className="verse-quote">{heroBibleVerse}</blockquote>
              </div>

              <ServiceCountdown className="animate-fade-up mt-7" />

              <div
                className="animate-fade-up mt-6 flex flex-wrap items-center gap-3"
                style={{ animationDelay: '0.32s' }}
              >
                <button
                  onClick={() => onNavigate(heroCtaPrimaryLink as Page)}
                  className="btn-primary px-6 py-2.5 text-[12.5px]"
                >
                  {heroCtaPrimary}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onNavigate(heroCtaSecondaryLink as Page)}
                  className="btn-ghost px-6 py-2.5 text-[12.5px]"
                >
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
      )}

      {/* ═══════ BANDE PASSANTE — Communiqués & Countdown ═══════ */}
      {isSectionVisible('topbar') && <TopBar onNavigate={(page: string) => onNavigate(page as Page)} onLiveClick={() => setLiveModalOpen(true)} phone={topbarPhone} email={topbarEmail} marqueeOverride={topbarMarquee} textColor={topbarTextColor} bgColor={topbarBgColor} />}

      {/* ═══════ SECTION: À NE PAS MANQUER (carrousel) ═══════ */}
      {isSectionVisible('agenda') && <UpcomingCarousel events={events} agenda={agenda} serviceImages={serviceImages} onNavigate={onNavigate} />}

      {/* ═══════ SECTION: NOS FONDEMENTS + MOT DU PASTEUR ═══════ */}
      {(isSectionVisible('pillars') || isSectionVisible('unique')) && (
      <section className="py-12 md:py-20 lg:py-24 bg-radial-primary" style={getSectionStyle('pillars')}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {isSectionVisible('pillars') && (
          <>
            <RevealSection className="mb-12">
              <div className="flex items-center gap-4">
                <span className="rule-accent" />
                <p className="section-eyebrow">{pillarsLabel}</p>
              </div>
              <h2 className="section-title mt-4">
                {pillarsTitle}
              </h2>
            </RevealSection>

            <div className="grid gap-px border border-line bg-line md:grid-cols-3">
              {[
                { num: '01', title: pillar1Title, desc: pillar1Desc },
                { num: '02', title: pillar2Title, desc: pillar2Desc },
                { num: '03', title: pillar3Title, desc: pillar3Desc },
              ].map(({ num, title, desc }, i) => (
                <RevealSection key={num} className={`reveal-delay-${i + 1}`}>
                  <div className="group relative flex h-full flex-col bg-bg-card p-6 transition-colors duration-300 hover:bg-bg-card-hover sm:p-8">
                    <span className="font-hero text-5xl leading-none text-evangile-600/35">{num}</span>
                    <span className="mt-5 h-px w-10 bg-evangile-600" />
                    <h3 className="card-title mt-5">{title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{desc}</p>
                  </div>
                </RevealSection>
              ))}
            </div>
          </>
          )}

          {isSectionVisible('unique') && (
          <div id="mot-du-pasteur" className={isSectionVisible('pillars') ? 'relative mt-20 md:mt-28 lg:mt-32' : 'relative'}>
            <RevealSection className="relative mx-auto w-full max-w-6xl">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-[54%] h-[56%] w-[56%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-evangile-600/10 blur-3xl"
              />
              <div className="relative flex min-h-[780px] w-full items-end justify-center overflow-hidden sm:min-h-[880px] lg:min-h-[960px]">
                {pastorPortrait && portraitUsesCutout && (
                  <div className="absolute inset-0 flex items-end justify-center">
                    <img
                      src={pastorPortraitSrc}
                      alt={pastorName}
                      className="h-[78%] w-auto max-w-[92%] object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.35)]"
                      style={{
                        transform: `scale(${portraitScale})`,
                        transformOrigin: 'center bottom',
                      }}
                      loading="lazy"
                    />
                  </div>
                )}

                {pastorPortrait && !portraitUsesCutout && (
                  <div className="absolute inset-y-0 left-1/2 w-full max-w-[620px] -translate-x-1/2">
                    <img
                      src={pastorPortraitSrc}
                      alt={pastorName}
                      className="h-full w-full object-cover"
                      style={{
                        objectPosition: `${portraitPosXPct}% ${portraitPosYPct}%`,
                        transform: `scale(${portraitScale})`,
                        maskImage:
                          'linear-gradient(to right, transparent 0%, #000 10%, #000 90%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 14%, #000 56%, transparent 100%)',
                        WebkitMaskImage:
                          'linear-gradient(to right, transparent 0%, #000 10%, #000 90%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 14%, #000 56%, transparent 100%)',
                        maskComposite: 'intersect',
                        WebkitMaskComposite: 'source-in',
                      }}
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Volets : le titre se détache en haut, la lettre se pose en bas */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-[26%]"
                  style={{
                    background:
                      'linear-gradient(to bottom, rgb(var(--bg-rgb)) 0%, rgb(var(--bg-rgb) / 0.72) 55%, transparent 100%)',
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[76%] sm:h-[66%]"
                  style={{
                    background:
                      'linear-gradient(to top, rgb(var(--bg-rgb)) 0%, rgb(var(--bg-rgb) / 0.96) 36%, rgb(var(--bg-rgb) / 0.8) 62%, transparent 100%)',
                  }}
                />

                <div className="absolute inset-x-0 top-0 z-10 px-4 pb-4 pt-6 sm:pt-8" style={{ textAlign: pastorTextAlign }}>
                  <div style={moved(posLabel)}>
                    <div
                      className={`flex items-center gap-3 ${
                        pastorTextAlign === 'center'
                          ? 'justify-center'
                          : pastorTextAlign === 'right'
                            ? 'justify-end'
                            : 'justify-start'
                      }`}
                    >
                      <span className="h-px w-9 bg-evangile-600" />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted">
                        {pastorWordLabel}
                      </p>
                      <span className="h-px w-9 bg-evangile-600" />
                    </div>
                  </div>
                  <h2
                    className="mt-3 font-hero uppercase text-cream"
                    style={{
                      ...moved(posTitle),
                      fontSize: 'clamp(2.35rem, 6vw, 4rem)',
                      lineHeight: 0.92,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {pastorWordTitle}
                  </h2>
                </div>

                <div
                  className="absolute inset-x-0 bottom-0 z-10 px-4 sm:px-8"
                  style={{ textAlign: pastorTextAlign, paddingBottom: `${28 + pastorTextRaise}px` }}
                >
                  <p className="mx-auto max-w-3xl leading-[1.85] text-muted" style={moved(posText1)}>
                    {pastorWordText1}
                  </p>
                  <p className="mx-auto mt-4 max-w-3xl leading-[1.85] text-muted" style={moved(posText2)}>
                    {pastorWordText2}
                  </p>
                  <blockquote className="mx-auto mt-6 max-w-3xl" style={moved(posQuote)}>
                    <p className="verse-quote">&laquo; {pastorWordQuote} &raquo;</p>
                  </blockquote>
                  <p
                    className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted"
                    style={moved(posRef)}
                  >
                    &mdash; {pastorWordQuoteRef}
                  </p>
                  <p className="person-name mt-5" style={moved(posName)}>
                    {pastorName}
                  </p>
                  <p className="person-role mt-1" style={moved(posRole)}>
                    {pastorRole}
                  </p>
                  <div
                    className="mt-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-3"
                    style={moved(posFooter)}
                  >
                    {pastorSignature ? (
                      <img
                        src={pastorSignature}
                        alt="Signature du pasteur"
                        className="h-11 w-auto object-contain opacity-75"
                        style={{
                          transform: `scale(${signatureScale})`,
                          transformOrigin:
                            signaturePosX === 'left'
                              ? 'left center'
                              : signaturePosX === 'right'
                                ? 'right center'
                                : 'center',
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <span className="person-role">{pastorChurchLine}</span>
                    )}
                    <button onClick={() => onNavigate('about')} className="btn-link">
                      {pastorVisionLabel}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>
          )}
        </div>
      </section>
      )}

      {/* ═══════ SECTION: BUREAU PASTORAL ═══════ */}
      {isSectionVisible('pastors') && pastors.length > 0 && (
        <PastoralBureau
          pastors={pastors}
          label={pastorsLabel}
          title={pastorsTitle}
          onNavigate={onNavigate}
        />
      )}

      {/* ═══════ SECTION: MESSAGES RÉCENTS ═══════ */}
      {isSectionVisible('teachings') && <RecentTeachings onNavigate={onNavigate} />}

      {/* ═══════ SECTION: PROCHAIN PAS ═══════ */}
      {isSectionVisible('nextsteps') && (
        <NextSteps
          onNavigate={onNavigate}
          onOpenAuth={openAuth}
          onPrayer={() => document.getElementById('priere')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
      )}

      {/* ═══════ SECTION: PREMIER DIMANCHE ═══════ */}
      {isSectionVisible('firstvisit') && <FirstVisit onNavigate={onNavigate} image={firstVisitImage} />}

      {/* ═══════ SECTION: EXPLORER ═══════ */}
      {isSectionVisible('explore') && (
      <section className="py-12 md:py-20 lg:py-24 bg-radial-primary" style={getSectionStyle('explore')}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-14 text-center">
            <p className="section-label justify-center">{exploreLabel}</p>
            <h2 className="section-title mt-4">
              {exploreTitle}
            </h2>
            <p className="mt-3 text-sm text-muted max-w-2xl mx-auto">
              {exploreDescription}
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
                      className="photo-claro photo-hover-clear absolute inset-0 h-full w-full object-cover transition-[transform,filter] duration-700 group-hover:scale-105"
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
                <p className="section-eyebrow">{newsEyebrow}</p>
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
                      className="photo-claro-strong photo-hover-clear h-full w-full object-cover transition-[transform,filter] duration-700 group-hover:scale-105"
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
                  <h3 className="editorial-title mt-3 text-2xl text-cream transition-colors group-hover:text-evangile-400 sm:text-3xl">{news[0].title}</h3>
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
                          <h3 className="editorial-title mt-2 text-lg leading-snug text-cream transition-colors group-hover:text-evangile-400">
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
              <span className="section-eyebrow">{quoteLabel}</span>
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

      {/* ═══════ SECTION: TESTIMONIALS ═══════ */}
      {isSectionVisible('testimonials') && testimonials.length > 0 && (
        <section id="temoignages" className="border-y border-line bg-bg-card px-4 py-16 md:py-24" style={getSectionStyle('testimonials')}>
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
              <RevealSection className="lg:col-span-7">
                <p className="section-label">{testimonialsLabel}</p>
                <h2 className="section-title mt-4">{testimonialsTitle}</h2>
                <div className="rule-accent mt-6" />
              </RevealSection>
              <RevealSection className="lg:col-span-5">
                <p className="max-w-md text-sm leading-relaxed text-muted lg:ml-auto lg:pb-1">
                  {testimonialsDescription}
                </p>
              </RevealSection>
            </div>

            <RevealSection className="mt-10">
              <TestimonialsCarousel testimonials={testimonials} onShare={() => onNavigate('contact')} />
            </RevealSection>
          </div>
        </section>
      )}

      {/* ═══════ SECTION: PRIÈRE & TÉMOIGNAGE ═══════ */}
      {isSectionVisible('prayer') && <PrayerTestimony />}

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
                <MapPin className="h-6 w-6 text-evangile-500" />
              </div>

              <p className="section-eyebrow">Nous rejoindre</p>
              <h2 className="section-title mt-4 text-white">
                {ctaTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/85">
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

              <button
                onClick={() => onNavigate('dons')}
                className="mt-6 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65 transition-colors hover:text-white"
              >
                <HandHeart className="h-3.5 w-3.5" />
                Soutenir l'œuvre
              </button>
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

      {/* ═══════ ACCÈS RAPIDES (bouton flottant) ═══════ */}
      <QuickActions onNavigate={onNavigate} />
    </div>
  );
}