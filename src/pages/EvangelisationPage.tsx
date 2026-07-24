import { useEffect, useState, useCallback } from 'react';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { useReveal } from '../lib/hooks';
import { db, buildContentMap, getContent } from '../lib/supabase';
import { Heart, Globe, Users, TrendingUp, ArrowRight, MapPin, Phone, Mail, HandHeart, BookOpen, CheckCircle, Star } from '../lib/icons';

/* ─── Animated counter hook ──────────────────────────────────── */
function useCounter(target: number, duration = 2000, startOnVisible = false, visible = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (startOnVisible && !visible) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, startOnVisible, visible]);
  return count;
}

/* ─── Loading skeleton ───────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="bg-bg min-h-screen mobile-bottom-pad">
      <div className="h-20 bg-white/5 animate-pulse" />
      <div className="h-screen bg-white/5 animate-pulse" />
      <div className="max-w-6xl mx-auto px-4 py-20 space-y-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

/* ─── Stats card ─────────────────────────────────────────────── */
function StatCard({ icon: Icon, value, label, visible }: { icon: typeof Heart; value: number; label: string; visible: boolean }) {
  const count = useCounter(value, 2200, true, visible);
  return (
    <div className="glass-card rounded-2xl p-6 text-center transition-all duration-500 hover:scale-[1.04]">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-400/10 text-accent-400">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-serif text-4xl font-bold text-cream">{count.toLocaleString('fr-FR')}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}

/* ─── Workflow card ──────────────────────────────────────────── */
function WorkflowCard({ step, icon: Icon, title, desc }: { step: number; icon: typeof Heart; title: string; desc: string }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`glass-card rounded-2xl p-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      <div className="mb-4 flex items-center gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-400 text-sm font-bold text-bg">
          {step}
        </span>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent-400/20 bg-accent-400/5 text-accent-400">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <h3 className="font-serif text-lg font-bold text-cream">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */
export function EvangelisationPage({ onNavigate }: { onNavigate: (page: any) => void }) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<Record<string, string>>({});

  const heroReveal = useReveal<HTMLDivElement>();
  const missionReveal = useReveal<HTMLDivElement>();
  const ctaReveal = useReveal<HTMLDivElement>();

  const loadContent = useCallback(async () => {
    try {
      const { data } = await db.contents.select().eq('page', 'evangelisation');
      const map = data ? buildContentMap(data) : {};
      setContent(map);
    } catch {
      // fallback to defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadContent(); }, [loadContent]);

  if (loading) return <Skeleton />;

  // CMS-powered text with French defaults
  const heroTitle = getContent(content, 'evangelisation', 'hero_title', 'Allez dans le monde entier et prêchez la Bonne Nouvelle');
  const heroSubtitle = getContent(content, 'evangelisation', 'hero_subtitle', 'L\'évangélisation est au cœur de notre mission. Chaque âme compte, chaque vie a une destinée en Dieu.');
  const missionTitle = getContent(content, 'evangelisation', 'mission_title', 'Notre Mission');
  const missionText = getContent(content, 'evangelisation', 'mission_text', 'Nous sommes appelés à être des ambassadeurs du Christ, porteurs d\'une message d\'espérance et de transformation. Notre département d\'évangélisation organise des sorties régulières dans les quartiers, les marchés et les espaces publics pour partager l\'amour de Dieu avec ceux qui ne le connaissent pas encore.');
  const participateTitle = getContent(content, 'evangelisation', 'participate_title', 'Comment participer');
  const participateText = getContent(content, 'evangelisation', 'participate_text', 'Chaque membre de l\'église est un évangéliste en puissance. Rejoignez notre équipe d\'évangélisation et participez activement à la conquête des âmes pour le Royaume de Dieu.');

  return (
    <div className="bg-bg min-h-screen">
      <SiteHeader activePage="evangelisation" onNavigate={onNavigate} />
      <MobileNav active="evangelisation" onNavigate={onNavigate} />

      {/* ═══ HERO ═══ */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/382297/pexels-photo-382297.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=2"
            alt="Community outreach"
            className="h-full w-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-bg/80 via-bg/70 to-bg" />
        </div>

        <div
          ref={heroReveal.ref}
          className={`relative z-10 mx-auto max-w-4xl px-4 text-center transition-all duration-1000 ${heroReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-400/30 bg-accent-400/10 px-4 py-2 text-sm font-medium text-accent-400">
            <Heart className="h-4 w-4" />
            Ministère d'Évangélisation
          </div>
          <h1 className="font-serif text-4xl font-bold leading-tight text-cream sm:text-5xl lg:text-6xl">
            {heroTitle}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-cream/70 sm:text-xl">
            {heroSubtitle}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button onClick={() => onNavigate('contact')} className="btn-primary">
              Rejoindre l'équipe <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => onNavigate('about')} className="btn-ghost">
              En savoir plus
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="h-8 w-5 rounded-full border-2 border-cream/30 p-1">
            <div className="h-1.5 w-1.5 rounded-full bg-cream/50" />
          </div>
        </div>
      </section>

      {/* ═══ ANIMATED STATS ═══ */}
      <section className="relative z-10 -mt-20 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="glass-card rounded-2xl border border-white/10 p-2 sm:p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard icon={MapPin} value={156} label="Sorties d'évangélisation" visible={heroReveal.visible} />
              <StatCard icon={Users} value={2340} label="Contacts établis" visible={heroReveal.visible} />
              <StatCard icon={CheckCircle} value={487} label="Nouvelles âmes intégrées" visible={heroReveal.visible} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ NOTRE MISSION ═══ */}
      <section className="py-24 lg:py-32 px-4">
        <div
          ref={missionReveal.ref}
          className={`mx-auto max-w-6xl transition-all duration-1000 ${missionReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
        >
          <div className="mb-12 text-center">
            <p className="section-label mb-3">Pourquoi nous existons</p>
            <h2 className="font-serif text-3xl font-bold text-cream sm:text-4xl lg:text-5xl">
              {missionTitle}
            </h2>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">
              {missionText}
            </p>
          </div>

          {/* Workflow cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <WorkflowCard
              step={1}
              icon={Globe}
              title="Sortie sur le terrain"
              desc="Nous organisons des sorties hebdomadaires dans les quartiers et marchés pour aller à la rencontre des personnes."
            />
            <WorkflowCard
              step={2}
              icon={Phone}
              title="Contact & Accueil"
              desc="Chaque personne rencontrée est accueillie avec amour et ses coordonnées sont notées pour le suivi."
            />
            <WorkflowCard
              step={3}
              icon={BookOpen}
              title="Enseignement & Discipulat"
              desc="Les nouveaux contacts sont invités aux études bibliques et aux cellules de maison pour grandir dans la foi."
            />
            <WorkflowCard
              step={4}
              icon={CheckCircle}
              title="Intégration & Suivi"
              desc="Nous accompagnons chaque personne jusqu'à son intégration complète dans la vie de l'église."
            />
          </div>
        </div>
      </section>

      {/* ═══ SCRIPTURE QUOTE ═══ */}
      <section className="py-16 px-4 bg-black">
        <div className="mx-auto max-w-4xl text-center">
          <Star className="mx-auto mb-4 h-8 w-8 text-accent-400/60" />
          <p className="font-serif text-2xl font-medium leading-relaxed text-accent-400 sm:text-3xl italic">
            « Allez, faites de toutes les nations des disciples, les baptisant au nom du Père, du Fils et du Saint-Esprit. »
          </p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-cream/40">Matthieu 28:19</p>
        </div>
      </section>

      {/* ═══ COMMENT PARTICIPER ═══ */}
      <section className="py-24 lg:py-32 px-4 bg-radial-primary">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="section-label mb-3">Engagez-vous</p>
            <h2 className="font-serif text-3xl font-bold text-cream sm:text-4xl lg:text-5xl">
              {participateTitle}
            </h2>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">
              {participateText}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                Icon: HandHeart,
                title: 'Bénévole de terrain',
                desc: 'Participez aux sorties d\'évangélisation et partagez la Bonne Nouvelle directement sur le terrain.',
              },
              {
                Icon: TrendingUp,
                title: 'Suivi & Accompagnement',
                desc: 'Aidez-nous à suivre et accompagner les nouveaux contacts dans leur cheminement spirituel.',
              },
              {
                Icon: Mail,
                title: 'Prière & Intercession',
                desc: 'Rejoignez l\'équipe de prière qui soutient chaque sortie d\'évangélisation par l\'intercession.',
              },
            ].map((item) => (
              <div key={item.title} className="glass-card rounded-2xl p-8 transition-all duration-300 hover:scale-[1.03] hover:border-accent-400/30">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-accent-400/20 bg-accent-400/5 text-accent-400">
                  <item.Icon className="h-6 w-6" />
                </div>
                <h3 className="font-serif text-lg font-bold text-cream">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-24 px-4">
        <div
          ref={ctaReveal.ref}
          className={`mx-auto max-w-3xl text-center transition-all duration-1000 ${ctaReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
        >
          <div className="glass-card rounded-3xl p-10 sm:p-14 border border-accent-400/20 bg-gradient-to-br from-accent-400/5 to-transparent">
            <Heart className="mx-auto mb-6 h-12 w-12 text-accent-400" />
            <h2 className="font-serif text-3xl font-bold text-cream sm:text-4xl">
              Chaque âme a une valeur éternelle
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-cream/60">
              Vous êtes appelé à faire une différence. Rejoignez le département d'évangélisation et ensemble, changeons des vies par la puissance de l'Évangile.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button onClick={() => onNavigate('contact')} className="btn-primary">
                Nous contacter <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => onNavigate('pastoral')} className="btn-ghost">
                Équipe pastorale
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