import { useEffect } from 'react';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { UniversalHero } from '../components/UniversalHero';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { Cross, Users, Send, Flame, Star, Heart, Shield, BookOpen, Crown, ArrowRight } from '../lib/icons';
import type { Page } from '../lib/navigation';

// ─── Data ─────────────────────────────────────────────────────────
const MISSION = [
  { Icon: Cross, title: 'Adorer', desc: 'Cultiver une vie d\'adoration authentique en esprit et en vérité, individuelle et communautaire.' },
  { Icon: BookOpen, title: 'Équiper', desc: 'Former et discipler chaque croyant afin qu\'il devienne un disciple mature et productif.' },
  { Icon: Send, title: 'Envoyer', desc: 'Dépêcher des hommes et des femmes transformés pour impacter les nations avec l\'Évangile.' },
] as const;

const VALUES = [
  { Icon: Flame, title: 'Foi', desc: 'Nous croyons que rien n\'est impossible à celui qui croit.' },
  { Icon: Star, title: 'Excellence', desc: 'Nous servons Dieu avec le meilleur de nous-mêmes.' },
  { Icon: Users, title: 'Unité', desc: 'L\'unité est notre force — un seul corps, un seul Esprit.' },
  { Icon: Shield, title: 'Service', desc: 'Nous suivons l\'exemple du Christ qui est venu pour servir.' },
  { Icon: Crown, title: 'Intégrité', desc: 'La transparence et l\'honnêteté guident toutes nos actions.' },
  { Icon: Heart, title: 'Amour', desc: 'L\'amour de Christ est le fondement de tout ce que nous faisons.' },
] as const;

const TIMELINE = [
  { year: '2010', event: 'Fondation de l\'Église Évangélique La Conquête par le Pst Josué Romain KAZADI.' },
  { year: '2013', event: 'Première campagne d\'évangélisation de quartier avec plus de 200 personnes touchées.' },
  { year: '2016', event: 'Ouverture du département Jeunesse et lancement des cellules de maison.' },
  { year: '2019', event: 'Inauguration du nouveau temple et lancement du live streaming.' },
  { year: '2022', event: 'Création de la première église extension dans la commune de Kampemba.' },
  { year: '2024', event: 'Plus de 1 000 membres réguliers et 4 églises extensions actives.' },
] as const;

// ─── Component ─────────────────────────────────────────────────────
export function VisionPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { colorMode, toggleColorMode } = useDynamicTheme();

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.1 },
    );
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="bg-bg min-h-screen">
      <SiteHeader activePage="vision" onNavigate={onNavigate} />
      <MobileNav active="vision" onNavigate={onNavigate} />

      {/* ═══ HERO ═══ */}
      <UniversalHero pageKey="vision" defaultBadge="Pourquoi nous existons" defaultTitle="Vision & Mission" />

      {/* ═══ NOTRE VISION ═══ */}
      <section className="py-20 lg:py-28 px-4 bg-radial-primary">
        <div className="mx-auto max-w-5xl text-center">
          <p className="reveal section-label justify-center">Déclaration</p>
          <h2 className="reveal reveal-delay-1 mt-6 font-serif text-3xl font-bold leading-snug text-cream sm:text-4xl lg:text-5xl">
            La <span className="brand-text">Conquête</span> des âmes, la{' '}
            <span className="brand-text">Conquête</span> des terres habitables et cultivables.
          </h2>
          <p className="reveal reveal-delay-2 mt-6 text-base leading-relaxed text-muted sm:text-lg max-w-3xl mx-auto">
            Notre vision est ancrée dans la Parole de Dieu. Nous croyons que chaque âme a une valeur éternelle et que chaque terrain de vie peut être transformé par la puissance de l'Évangile.
          </p>
        </div>
      </section>

      {/* ═══ NOTRE MISSION ═══ */}
      <section className="py-20 lg:py-28 px-4">
        <div className="mx-auto max-w-6xl">
          <p className="reveal section-label mb-3 text-center">Notre Mission</p>
          <h2 className="reveal reveal-delay-1 mb-12 text-center font-serif text-3xl font-semibold text-cream sm:text-4xl">
            Trois piliers pour un seul but
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {MISSION.map((m, i) => (
              <div key={m.title} className={`reveal reveal-delay-${i + 1} glass-card rounded-2xl p-8 text-center transition-all duration-300 hover:scale-[1.03]`}>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-evangile-600/20 bg-evangile-600/5 text-evangile-500">
                  <m.Icon className="h-7 w-7" />
                </div>
                <h3 className="font-serif text-xl font-bold text-cream">{m.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ NOS VALEURS ═══ */}
      <section className="py-20 lg:py-28 px-4 bg-radial-ember">
        <div className="mx-auto max-w-6xl">
          <p className="reveal section-label mb-3 text-center">Ce qui nous guide</p>
          <h2 className="reveal reveal-delay-1 mb-12 text-center font-serif text-3xl font-semibold text-cream sm:text-4xl">Nos Valeurs</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((v, i) => (
              <div key={v.title} className={`reveal reveal-delay-${(i % 4) + 1} glass-card rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02]`}>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-evangile-600/20 text-evangile-500">
                  <v.Icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-cream">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PSAUME 2:8 ═══ */}
      <section className="py-16 px-4 bg-black">
        <div className="reveal mx-auto max-w-4xl text-center">
          <p className="font-serif text-2xl font-medium leading-relaxed text-evangile-500 sm:text-3xl italic">
            « Demande-moi, et je te donnerai les nations pour héritage, les extrémités de la terre pour possession. »
          </p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-cream/40">Psaume 2:8</p>
        </div>
      </section>

      {/* ═══ NOTRE HISTOIRE ═══ */}
      <section className="py-20 lg:py-28 px-4">
        <div className="mx-auto max-w-3xl">
          <p className="reveal section-label mb-3 text-center">Notre parcours</p>
          <h2 className="reveal reveal-delay-1 mb-12 text-center font-serif text-3xl font-semibold text-cream sm:text-4xl">Notre Histoire</h2>
          <div className="relative border-l-2 border-evangile-600/20 pl-8 space-y-10">
            {TIMELINE.map((t, i) => (
              <div key={t.year} className={`reveal reveal-delay-${(i % 4) + 1} relative`}>
                <div className="absolute -left-[41px] top-1 h-4 w-4 rounded-full border-2 border-evangile-600 bg-bg" />
                <p className="text-xs font-bold uppercase tracking-widest text-evangile-500">{t.year}</p>
                <p className="mt-1 text-sm leading-relaxed text-cream/80">{t.event}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-20 px-4 bg-radial-primary">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="section-label mb-4">Faites partie de l'histoire</p>
          <p className="mb-8 text-cream/70">
            Cette vision se réalise chaque jour grâce à des personnes comme vous.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button onClick={() => onNavigate('about')} className="btn-primary">
              En savoir plus <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => onNavigate('contact')} className="btn-ghost">Nous rejoindre</button>
          </div>
        </div>
      </section>

      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
    </div>
  );
}