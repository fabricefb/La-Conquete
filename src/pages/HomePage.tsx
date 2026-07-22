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
import { LiveStreamModal } from '../components/LiveStreamModal';
import { TypingText } from '../components/home/TypingHero';
import { EnhancedPastorGrid } from '../components/home/EnhancedPastorGrid';
import { TestimonialsCarousel } from '../components/home/TestimonialsCarousel';
import {
  Crown,
  Flame,
  Compass,
  Quote,
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
  Hash,
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

const DEFAULT_HERO_IMG =
  'https://images.pexels.com/photos/2889440/pexels-photo-2889440.jpeg?auto=compress&cs=tinysrgb&w=1920';
const DEFAULT_ABOUT_IMG =
  'https://images.pexels.com/photos/290468/pexels-photo-290468.jpeg?auto=compress&cs=tinysrgb&w=1200';
const DEFAULT_SERMON_IMG =
  'https://images.pexels.com/photos/6044266/pexels-photo-6044266.jpeg?auto=compress&cs=tinysrgb&w=800';
const DEFAULT_EVENT_IMG =
  'https://images.pexels.com/photos/4484077/pexels-photo-4484077.jpeg?auto=compress&cs=tinysrgb&w=800';
const DEFAULT_MINISTRY_IMG =
  'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800';
const DEFAULT_MEDIA_IMG =
  'https://images.pexels.com/photos/3811945/pexels-photo-3811945.jpeg?auto=compress&cs=tinysrgb&w=800';
const DEFAULT_NEWS_IMG =
  'https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=800';
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
  const [builderConfig, setBuilderConfig] = useState<Record<string, { visible: boolean; config: Record<string, unknown> }>>({});
  const [sectionColors, setSectionColors] = useState<SectionColorMap>({});
  const [activityCards, setActivityCards] = useState<ActivityCard[]>([]);

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
    { id: 'fb-1', title: 'Prédications', description: '12+ messages', icon_name: 'radio', image_url: DEFAULT_SERMON_IMG, link: 'predications', sort_order: 1, is_active: true },
    { id: 'fb-2', title: 'Événements', description: 'Prochains événements', icon_name: 'calendar', image_url: DEFAULT_EVENT_IMG, link: 'events', sort_order: 2, is_active: true },
    { id: 'fb-3', title: 'Ministères', description: '8 départements', icon_name: 'users', image_url: DEFAULT_MINISTRY_IMG, link: 'departments', sort_order: 3, is_active: true },
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
  const pastorPortrait = getContent(cm, 'pastor_word', 'portrait_image', 'https://snvmythqboaeakzcqkpy.supabase.co/storage/v1/object/public/media/home/about/1784289838638-pkobgo.jpg');
  const pastorSignature = getContent(cm, 'pastor_word', 'signature_image', '');
  const portraitScale = parseFloat(getContent(cm, 'pastor_word', 'portrait_scale', '1')) || 1;
  const portraitPosX = getContent(cm, 'pastor_word', 'portrait_pos_x', 'center'); // left | center | right
  const portraitPosY = getContent(cm, 'pastor_word', 'portrait_pos_y', 'center'); // top | center | bottom
  const signaturePosX = getContent(cm, 'pastor_word', 'signature_pos_x', 'center'); // left | center | right
  const signatureScale = parseFloat(getContent(cm, 'pastor_word', 'signature_scale', '1')) || 1;

  // News section
  const newsTitle = getContent(cm, 'news', 'title', 'Dernières nouvelles');
  const newsSubtitle = getContent(cm, 'news', 'subtitle', 'Restez informé des activités et événements à venir dans notre communauté.');

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
    <div className="min-h-screen">
      <SiteHeader onNavigate={onNavigate} />
      <MobileNav onNavigate={onNavigate} active="home" />

      {/* ═══════ HERO (full-screen immersive — 100vh, full-width, no gaps) ═══════ */}
      <section className="relative w-full h-[100vh] m-0 p-0 spirit-breath flex items-center justify-center overflow-hidden" style={{ marginTop: 0 }}>
        {/* Parallax background wrapper */}
        <div
          ref={bgRef}
          className="absolute inset-[-15%] will-change-transform"
          style={{ transition: 'transform 0.1s linear' }}
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
        </div>
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
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
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

          {/* CTA button — single, prominent */}
          <div
            className="animate-fade-up mt-12 flex flex-col items-center justify-center gap-4"
            style={{ animationDelay: '0.3s' }}
          >
            <button onClick={() => onNavigate('activities')} className="btn-primary text-lg px-8 py-3">
              {heroCtaPrimary}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <ChevronDown className="h-6 w-6 text-cream/50" />
        </div>
      </section>

      {/* ═══════ BANDE PASSANTE — Communiqués & Countdown ═══════ */}
      {isSectionVisible('topbar') && <TopBar onNavigate={(page: string) => onNavigate(page as Page)} onLiveClick={() => setLiveModalOpen(true)} phone={topbarPhone} email={topbarEmail} marqueeOverride={topbarMarquee} textColor={topbarTextColor} bgColor={topbarBgColor} />}

      {/* ═══════ SECTION: THREE PILLARS ═══════ */}
      {isSectionVisible('pillars') && (
      <section className="py-24 bg-radial-primary" style={getSectionStyle('pillars')}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-14 text-center">
            <p className="section-label justify-center">Nos Fondements</p>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl font-semibold text-cream">
              Trois piliers qui nous guident
            </h2>
          </RevealSection>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { num: '01', Icon: Crown, title: pillar1Title, desc: pillar1Desc, accent: 'text-accent-400' },
              { num: '02', Icon: Flame, title: pillar2Title, desc: pillar2Desc, accent: 'text-red-400' },
              { num: '03', Icon: Compass, title: pillar3Title, desc: pillar3Desc, accent: 'text-accent-400' },
            ].map(({ num, Icon, title, desc, accent }, i) => (
              <RevealSection key={num} className={`reveal-delay-${i + 1}`}>
                <div className="glass-card group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 border-t-2 border-transparent hover:border-t-accent-500/60 hover:shadow-lg hover:shadow-accent-500/5">
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
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent-600 to-red-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ═══════ SECTION: MOT DU PASTEUR ═══════ */}
      {isSectionVisible('unique') && (
      <section className="py-24" style={getSectionStyle('unique')}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left: PNG portrait (no frame) + signature */}
            <RevealSection>
              <div className="relative flex flex-col items-center lg:items-start h-[460px] overflow-visible">
                <div
                  className="relative flex items-center justify-center overflow-visible"
                  style={{
                    height: '100%',
                    width: '100%',
                    alignItems: portraitPosY === 'top' ? 'flex-start' : portraitPosY === 'bottom' ? 'flex-end' : 'center',
                    justifyContent: portraitPosX === 'left' ? 'flex-start' : portraitPosX === 'right' ? 'flex-end' : 'center',
                  }}
                >
                  <img
                    src={pastorPortrait}
                    alt="Pasteur"
                    className="h-[420px] w-auto max-w-full object-contain drop-shadow-2xl transition-transform duration-300"
                    style={{ transform: `scale(${portraitScale})` }}
                    loading="lazy"
                  />
                </div>
                {pastorSignature && (
                  <div
                    className="mt-2 w-full flex"
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
              <p className="section-label">{pastorWordLabel}</p>
              <h2 className="mt-4 font-serif text-3xl md:text-4xl font-semibold leading-snug text-cream">
                {pastorWordTitle}
              </h2>
              <p className="mt-6 leading-relaxed text-muted">{pastorWordText1}</p>
              <p className="mt-4 leading-relaxed text-muted">{pastorWordText2}</p>

              {/* Signed quote */}
              <blockquote className="mt-8 border-l-4 border-accent-400/50 pl-5">
                <p className="text-sm italic text-cream/70">&laquo; {pastorWordQuote} &raquo;</p>
                <p className="mt-1 text-xs font-semibold text-accent-400">&mdash; {pastorWordQuoteRef}</p>
              </blockquote>

              <button
                onClick={() => onNavigate('about')}
                className="btn-gold mt-8"
              >
                Voir À propos
                <ArrowRight className="h-4 w-4" />
              </button>
            </RevealSection>
          </div>
        </div>
      </section>
      )}

      {/* ═══════ SECTION: EXPLORER ═══════ */}
      {isSectionVisible('explore') && (
      <section className="py-24 bg-radial-primary" style={getSectionStyle('explore')}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-14 text-center">
            <p className="section-label justify-center">Explorer</p>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl font-semibold text-cream">
              Découvrez nos activités
            </h2>
            <p className="mt-3 text-sm text-muted max-w-2xl mx-auto">
              Gérez les prédications affichées sur la page <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 text-xs font-semibold text-amber-400 mx-1"><Hash className="h-3 w-3" />predications</span>              et modifiez chaque carte depuis le back-office.
            </p>
          </RevealSection>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {displayCards.map((card, i) => {
              const IconComponent = iconMap[(card.icon_name || 'eye').toLowerCase()] || Eye;
              const imgUrl = card.image_url || DEFAULT_SERMON_IMG;
              const navigateTo = card.link || 'activities';
              return (
                <RevealSection key={card.id} className={`reveal-delay-${(i % 5) + 1}`}>
                  <button
                    onClick={() => onNavigate(navigateTo as Page)}
                    className="group relative w-full overflow-hidden rounded-2xl text-left"
                  >
                    <img
                      src={imgUrl}
                      alt={card.title}
                      className="blog-img-zoom h-64 w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {/* Description badge (was "stat") */}
                    {card.description && (
                      <div className="absolute right-3 top-3 z-10">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm">
                          <Eye className="h-3 w-3" />
                          {card.description}
                        </span>
                      </div>
                    )}

                    {/* Bottom content */}
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-400/20 text-accent-400">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <h3 className="font-serif text-lg font-semibold text-white">{card.title}</h3>
                      <div className="mt-2 flex items-center gap-2 text-sm text-accent-300 opacity-0 transition-all duration-300 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
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

      {/* ═══════ SECTION: DERNIÈRES NOUVELLES ═══════ */}
      {isSectionVisible('news') && (
      <section className="py-24 bg-radial-primary" style={getSectionStyle('news')}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-14 text-center">
            <p className="section-label justify-center">Actualités</p>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl font-semibold text-cream">
              {newsTitle}
            </h2>
            <p className="mt-4 text-muted max-w-2xl mx-auto">{newsSubtitle}</p>
          </RevealSection>

          {events.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.slice(0, 3).map((evt, i) => (
                <RevealSection key={evt.id} className={`reveal-delay-${i + 1}`}>
                  <div className="glass-card group rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1">
                    {evt.image_url && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={evt.image_url}
                          alt={evt.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-accent-400/20 border border-accent-400/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-300 backdrop-blur-sm">
                          <Calendar className="h-3 w-3" />
                          {evt.category}
                        </span>
                      </div>
                    )}
                    <div className="p-5">
                      <div className="mb-2 flex items-center gap-2 text-xs text-muted">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(evt.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <h3 className="font-serif text-lg font-semibold text-cream leading-snug">{evt.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-2">{evt.description}</p>
                      <button onClick={() => onNavigate('events')} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent-400 hover:text-accent-300 transition-colors">
                        En savoir plus <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </RevealSection>
              ))}
            </div>
          ) : (
            <RevealSection>
              <div className="glass rounded-2xl p-8 text-center border border-dashed border-accent-400/20">
                <Newspaper className="mx-auto mb-3 h-8 w-8 text-accent-400/40" />
                <p className="text-muted text-sm">Aucun événement à venir pour le moment. Revenez bientôt !</p>
              </div>
            </RevealSection>
          )}
        </div>
      </section>
      )}

      {/* ═══════ SECTION: BIBLICAL QUOTE (full-width dark) ═══════ */}
      {isSectionVisible('quote') && (
      <section
        className="py-28"
        style={{ backgroundColor: 'rgb(var(--bg-rgb))', ...getSectionStyle('quote') }}
      >
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <RevealSection>
            {/* Gold divider above */}
            <div className="mx-auto mb-8 flex items-center justify-center gap-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-evangile-600/50" />
              <Quote className="h-8 w-8 text-accent-400/60 rotate-180" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-evangile-600/50" />
            </div>

            <p className="font-serif text-2xl italic leading-relaxed sm:text-3xl" style={sectionColors['quote']?.text ? { color: sectionColors['quote'].text } : { color: 'var(--cream)' }}>
              &laquo; {quoteText} &raquo;
            </p>
            <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-accent-400" style={sectionColors['quote']?.text ? { color: sectionColors['quote'].text } : undefined}>
              &mdash; {quoteRef}
            </p>

            {/* Gold divider below */}
            <div className="mt-8 mx-auto flex items-center justify-center gap-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-evangile-600/50" />
              <Quote className="h-8 w-8 text-accent-400/60" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-evangile-600/50" />
            </div>
          </RevealSection>
        </div>
      </section>
      )}

      {/* ═══════ SECTION: PASTORAL TEAM ═══════ */}
      {isSectionVisible('pastors') && pastors.length > 0 && (
        <section className="py-24" style={getSectionStyle('pastors')}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <RevealSection className="mb-14 text-center">
              <p className="section-label justify-center" style={sectionColors['pastors']?.text ? { color: sectionColors['pastors'].text } : undefined}>{pastorsLabel}</p>
              <h2 className="mt-4 font-serif text-3xl md:text-4xl font-semibold" style={sectionColors['pastors']?.text ? { color: sectionColors['pastors'].text } : { color: 'var(--cream)' }}>
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
        <section className="py-24 bg-radial-primary" style={getSectionStyle('testimonials')}>
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

      {/* ═══════ SECTION: MAP + CTA FINAL ═══════ */}
      {isSectionVisible('cta') && (
      <section className="relative h-[520px] overflow-hidden">
        {/* Map as full background (Google Maps iframe) */}
        <div className="absolute inset-0 z-0">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3907.451037817296!2d27.47710807481882!3d-11.662413288545377!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x19723fdfcdd79fa3%3A0xd1db505d58bc72bb!2sEglise%20Evang%C3%A8lique%20la%20Conqu%C3%AAte!5e0!3m2!1sfr!2scd!4v1784346539701!5m2!1sfr!2scd"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            title="Localisation Église La Conquête"
          />
        </div>
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50 z-[1]" />

        {/* CTA content overlay */}
        <div className="relative z-[2] flex items-center justify-center h-full">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <RevealSection>
              {/* Heart with ping */}
              <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400/20" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-accent-400/15 border border-accent-400/30">
                  <Heart className="h-7 w-7 text-accent-400" />
                </div>
              </div>

              <h2 className="font-serif text-3xl md:text-4xl font-semibold text-cream">
                {ctaTitle}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-cream/90 max-w-lg mx-auto">
                {ctaText}
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <button onClick={() => onNavigate('contact')} className="btn-gold">
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
    </div>
  );
}