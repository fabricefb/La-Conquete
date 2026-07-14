import { useState, useEffect } from 'react';
import { useReveal } from '../lib/hooks';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { Radio, Play, Clock, ArrowRight, Star, Send, Mail, CheckCircle } from '../lib/icons';
import type { Page } from '../lib/navigation';
import { db, buildContentMap, getContent } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface EmissionsPageProps {
  onNavigate: (page: Page) => void;
}

interface Emission {
  id: string;
  title: string;
  description: string;
  platform: 'youtube' | 'facebook';
  schedule: string;
  thumbnailUrl: string;
  videoUrl: string;
  isLive: boolean;
  isFeatured: boolean;
  host: string;
}

// ═══════════════════════════════════════════════════════════════════
// YOUTUBE API INTEGRATION
// To enable: Set VITE_YOUTUBE_API_KEY in .env
// Set VITE_YOUTUBE_CHANNEL_ID to your channel ID
// The fetchYoutubeVideos() function below will auto-populate
// ═══════════════════════════════════════════════════════════════════

// Placeholder: Replace with actual YouTube Data API v3 call
// GET https://www.googleapis.com/youtube/v3/search?part=snippet&channelId={VITE_YOUTUBE_CHANNEL_ID}&type=video&order=date&maxResults=12&key={VITE_YOUTUBE_API_KEY}

async function fetchYoutubeVideos(): Promise<Emission[]> {
  // ─── YouTube Data API v3 Integration ─────────────────────────────
  // const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
  // const channelId = import.meta.env.VITE_YOUTUBE_CHANNEL_ID;
  //
  // if (apiKey && channelId) {
  //   const res = await fetch(
  //     `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=12&key=${apiKey}`
  //   );
  //   const data = await res.json();
  //   return (data.items ?? []).map((item: any) => ({
  //     id: item.id.videoId,
  //     title: item.snippet.title,
  //     description: item.snippet.description,
  //     platform: 'youtube' as const,
  //     schedule: item.snippet.publishedAt,
  //     thumbnailUrl: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.medium?.url,
  //     videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  //     isLive: item.snippet.liveBroadcastContent === 'live',
  //     isFeatured: false,
  //     host: '',
  //   }));
  // }

  // Fallback: return empty (hardcoded data used below)
  return [];
}

// ═══════════════════════════════════════════════════════════════════
// HARDCODED SAMPLE DATA (fallback)
// ═══════════════════════════════════════════════════════════════════

const SAMPLE_EMISSIONS: Emission[] = [
  {
    id: 'em-1',
    title: 'La Conquête du Matin',
    description: 'Émission matinale de prière, louange et enseignement biblique pour bien commencer la journée dans la présence de Dieu.',
    platform: 'youtube',
    schedule: 'Tous les jours à 06h00',
    thumbnailUrl: '',
    videoUrl: '',
    isLive: true,
    isFeatured: true,
    host: 'Pasteur Emmanuel Kayumba',
  },
  {
    id: 'em-2',
    title: 'Paroles de Vie',
    description: 'Enseignements bibliques approfondis pour fortifier votre foi et vous équiper pour la vie quotidienne.',
    platform: 'youtube',
    schedule: 'Mercredi à 19h00',
    thumbnailUrl: '',
    videoUrl: '',
    isLive: false,
    isFeatured: false,
    host: 'Pasteur Jean-Pierre Kalume',
  },
  {
    id: 'em-3',
    title: 'Louange & Adoration',
    description: 'Un moment de louange et d\'adoration pour élever le nom de Jésus et vous reconnecter à Sa présence.',
    platform: 'facebook',
    schedule: 'Samedi à 18h00',
    thumbnailUrl: '',
    videoUrl: '',
    isLive: true,
    isFeatured: false,
    host: 'Chœur La Conquête',
  },
  {
    id: 'em-4',
    title: 'Témoignages de Grâce',
    description: 'Des vies transformées par la puissance de Dieu. Écoutez les témoignages authentiques de nos membres.',
    platform: 'youtube',
    schedule: 'Vendredi à 20h00',
    thumbnailUrl: '',
    videoUrl: '',
    isLive: false,
    isFeatured: false,
    host: 'Équipe Média',
  },
  {
    id: 'em-5',
    title: 'Culte en Direct',
    description: 'Retrouvez le culte dominical en direct depuis notre temple principal à Lubumbashi.',
    platform: 'facebook',
    schedule: 'Dimanche à 09h00',
    thumbnailUrl: '',
    videoUrl: '',
    isLive: true,
    isFeatured: false,
    host: 'Direction de l\'Église',
  },
  {
    id: 'em-6',
    title: 'Jeunesse Conquérante',
    description: 'Programme dédié à la jeunesse : sujets pertinents, discussions, et partage autour de la Parole.',
    platform: 'youtube',
    schedule: 'Samedi à 15h00',
    thumbnailUrl: '',
    videoUrl: '',
    isLive: false,
    isFeatured: false,
    host: 'Département Jeunesse',
  },
];

const NEXT_LIVE = {
  title: 'Culte en Direct — Dimanche',
  date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  platform: 'facebook' as const,
  description: 'Rejoignez-nous pour un moment de louange, d\'adoration et de la Parole de Dieu.',
};

// ═══════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={`reveal ${visible ? 'in' : ''} ${className}`}>
      {children}
    </div>
  );
}

function YouTubeIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function FacebookIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function PlatformBadge({ platform }: { platform: 'youtube' | 'facebook' }) {
  if (platform === 'youtube') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-red-400">
        <YouTubeIcon className="h-3 w-3" />
        YouTube
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-blue-400">
      <FacebookIcon className="h-3 w-3" />
      Facebook Live
    </span>
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      En direct
    </span>
  );
}

function VideoPlayerPlaceholder({ title }: { title: string }) {
  return (
    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 via-navy-900 to-black">
      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.08),transparent_70%)]" />
      {/* Play button */}
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-evangile-600/40 bg-evangile-600/10 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:border-evangile-600/60 hover:bg-evangile-600/20">
        <Play className="ml-1 h-8 w-8 text-evangile-500" />
      </div>
      <p className="absolute bottom-4 left-4 text-xs text-muted/60">{title}</p>
    </div>
  );
}

function CountdownDisplay({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    function tick() {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const blocks = [
    { label: 'Jours', value: timeLeft.days },
    { label: 'Heures', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Secondes', value: timeLeft.seconds },
  ];

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      {blocks.map((b) => (
        <div key={b.label} className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-evangile-600/20 bg-evangile-600/5 font-mono text-2xl font-bold text-evangile-500 sm:h-20 sm:w-20 sm:text-3xl">
            {String(b.value).padStart(2, '0')}
          </div>
          <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════

export function EmissionsPage({ onNavigate }: EmissionsPageProps) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [emissions, setEmissions] = useState<Emission[]>(SAMPLE_EMISSIONS);
  const [contentMap, setContentMap] = useState<Record<string, string>>({});
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  // ── Fetch page contents ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const contents = await db.getPageContents('emissions');
        if (!cancelled) setContentMap(buildContentMap(contents));
      } catch { /* fallback */ }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Attempt YouTube fetch on mount ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const ytVideos = await fetchYoutubeVideos();
        if (!cancelled && ytVideos.length > 0) {
          setEmissions(ytVideos);
        }
      } catch { /* keep sample data */ }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const featured = emissions.find((e) => e.isFeatured) ?? emissions[0];
  const grid = emissions.filter((e) => !e.isFeatured);
  const heroSubtitle = getContent(contentMap, 'hero', 'subtitle', 'Retrouvez nos programmes de télévision, radio et web pour vous nourrir de la Parole de Dieu au quotidien.');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <div className="min-h-screen bg-bg text-cream font-sans">
      <SiteHeader onNavigate={onNavigate} activePage="emissions" />

      {/* ─── HERO ─── */}
      <section className="relative flex min-h-[40vh] items-center justify-center overflow-hidden pt-16 bg-radial-primary">
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-20 text-center">
          <RevealSection>
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-evangile-600/20 bg-evangile-600/10">
                <Radio className="h-7 w-7 text-evangile-500" />
              </div>
            </div>
            <p className="section-label justify-center">Diffusion</p>
            <h1 className="mt-4 font-serif text-5xl font-semibold text-cream sm:text-6xl">
              Nos Émissions
            </h1>
            <p className="mt-6 text-lg text-muted">{heroSubtitle}</p>
          </RevealSection>
        </div>
      </section>

      {/* ─── FEATURED EMISSION ─── */}
      {featured && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="glass rounded-3xl overflow-hidden">
              <div className="grid lg:grid-cols-2">
                {/* Video placeholder */}
                <VideoPlayerPlaceholder title={featured.title} />
                {/* Info */}
                <div className="flex flex-col justify-center p-8 lg:p-12">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <PlatformBadge platform={featured.platform} />
                    {featured.isLive && <LiveBadge />}
                    <span className="inline-flex items-center gap-1 rounded-full border border-evangile-600/20 bg-evangile-600/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-evangile-500">
                      <Star className="h-3 w-3" />
                      À la une
                    </span>
                  </div>
                  <h2 className="font-serif text-3xl font-semibold text-cream lg:text-4xl">{featured.title}</h2>
                  <p className="mt-4 text-muted leading-relaxed">{featured.description}</p>
                  {featured.host && (
                    <p className="mt-3 text-sm text-evangile-500 font-medium">Animé par {featured.host}</p>
                  )}
                  <div className="mt-6 flex items-center gap-2 text-sm text-muted">
                    <Clock className="h-4 w-4 text-evangile-500" />
                    <span>{featured.schedule}</span>
                  </div>
                </div>
              </div>
            </div>
          </RevealSection>
        </section>
      )}

      {/* ─── EMISSIONS GRID ─── */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <RevealSection>
          <h2 className="font-serif text-3xl font-semibold text-cream mb-8">Toutes nos émissions</h2>
        </RevealSection>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {grid.map((emission, i) => (
            <RevealSection key={emission.id} className={`reveal-delay-${(i % 3) + 1}`}>
              <div className="glass rounded-3xl overflow-hidden flex flex-col transition-all duration-300 hover:scale-[1.02] group h-full">
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-navy-800 to-black">
                  {emission.thumbnailUrl ? (
                    <img src={emission.thumbnailUrl} alt={emission.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.06),transparent_70%)]">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-evangile-600/20 bg-evangile-600/10 transition-transform group-hover:scale-110">
                        <Play className="ml-0.5 h-5 w-5 text-evangile-500" />
                      </div>
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    <PlatformBadge platform={emission.platform} />
                    {emission.isLive && <LiveBadge />}
                  </div>
                </div>
                {/* Info */}
                <div className="flex flex-col gap-2 p-5 flex-1">
                  <h3 className="font-serif text-lg font-semibold text-cream leading-snug">{emission.title}</h3>
                  <p className="text-sm text-muted line-clamp-2 flex-1">{emission.description}</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted">
                    <Clock className="h-4 w-4 text-evangile-500" />
                    <span>{emission.schedule}</span>
                  </div>
                </div>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ─── PROCHAIN DIRECT ─── */}
      <section className="border-y border-line bg-navy-900/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex items-center gap-2 text-red-400">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-400" />
                </span>
                <span className="text-sm font-semibold uppercase tracking-widest">Prochain direct</span>
              </div>
              <h2 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">{NEXT_LIVE.title}</h2>
              <p className="mt-3 text-muted max-w-xl">{NEXT_LIVE.description}</p>
              <div className="mt-3">
                <PlatformBadge platform={NEXT_LIVE.platform} />
              </div>
              <div className="mt-8">
                <CountdownDisplay targetDate={NEXT_LIVE.date} />
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── NEWSLETTER CTA ─── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="glass rounded-3xl p-8 sm:p-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-evangile-600/20 bg-evangile-600/10">
                <Mail className="h-6 w-6 text-evangile-500" />
              </div>
            </div>
            <h2 className="font-serif text-2xl font-semibold text-cream sm:text-3xl">Ne manquez aucune émission</h2>
            <p className="mt-3 text-muted max-w-lg mx-auto">
              Inscrivez-vous à notre newsletter pour recevoir les rappels de nos directs et les dernières émissions publiées.
            </p>
            {subscribed ? (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-6 py-3 text-sm font-medium text-green-400">
                <CheckCircle className="h-4 w-4" />
                Merci pour votre inscription !
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Votre adresse e-mail"
                  required
                  className="input-surface w-full !rounded-full px-5 py-3 text-sm"
                />
                <button type="submit" className="btn-gold flex items-center gap-2 px-6 py-3 text-sm whitespace-nowrap">
                  <Send className="h-4 w-4" />
                  S'inscrire
                </button>
              </form>
            )}
          </div>
        </RevealSection>
      </section>

      <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />
      <MobileNav onNavigate={onNavigate} active="emissions" />
    </div>
  );
}