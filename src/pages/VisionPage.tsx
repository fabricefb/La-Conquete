import { useEffect, useState } from 'react';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { UniversalHero } from '../components/UniversalHero';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { Cross, Users, Send, Flame, Star, Heart, Shield, BookOpen, Crown, ArrowRight } from '../lib/icons';
import { IconBox } from '../components/IconBox';
import type { Page } from '../lib/navigation';
import { db, buildContentMap, getContent } from '../lib/supabase';
import { CHURCH } from '../lib/church';

const FALLBACK_MISSION = [
  { Icon: Cross, title: 'Adorer', desc: "Cultiver une vie d'adoration authentique en esprit et en vérité, individuelle et communautaire." },
  { Icon: BookOpen, title: 'Équiper', desc: "Former et discipler chaque croyant afin qu'il devienne un disciple mature et productif." },
  { Icon: Send, title: 'Envoyer', desc: "Dépêcher des hommes et des femmes transformés pour impacter les nations avec l'Évangile." },
] as const;

const FALLBACK_VALUES = [
  { Icon: Flame, title: 'Foi', desc: "Nous croyons que rien n'est impossible à celui qui croit." },
  { Icon: Star, title: 'Excellence', desc: 'Nous servons Dieu avec le meilleur de nous-mêmes.' },
  { Icon: Users, title: 'Unité', desc: "L'unité est notre force — un seul corps, un seul Esprit." },
  { Icon: Shield, title: 'Service', desc: "Nous suivons l'exemple du Christ qui est venu pour servir." },
  { Icon: Crown, title: 'Intégrité', desc: "La transparence et l'honnêteté guident toutes nos actions." },
  { Icon: Heart, title: 'Amour', desc: "L'amour de Christ est le fondement de tout ce que nous faisons." },
] as const;

/* Repères publiés par l'église. Aucune date antérieure n'est documentée. */
const FALLBACK_TIMELINE = [
  { year: '2025', event: "20 juillet — pose de la première pierre du Centre Évangélique Missionnaire La Conquête Kakana, à une cinquantaine de kilomètres de Lubumbashi." },
  { year: '2026', event: "1er au 30 novembre — marathon de prière sur le thème « La mission de l'Église locale face au monde moderne »." },
] as const;

export function VisionPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [cm, setCm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getPageContents('vision')
      .then((contents) => setCm(buildContentMap(contents)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.1 },
    );
    document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [loading]);

  if (loading) {
    return (
      <div className="bg-bg min-h-screen flex items-center justify-center">
        <div className="text-muted animate-pulse text-lg">Chargement…</div>
      </div>
    );
  }

  const mission = FALLBACK_MISSION.map((m, i) => ({
    ...m,
    title: getContent(cm, 'mission', `title_${i + 1}`, m.title),
    desc: getContent(cm, 'mission', `desc_${i + 1}`, m.desc),
  }));

  const values = FALLBACK_VALUES.map((v, i) => ({
    ...v,
    title: getContent(cm, 'values', `title_${i + 1}`, v.title),
    desc: getContent(cm, 'values', `desc_${i + 1}`, v.desc),
  }));

  const timeline = FALLBACK_TIMELINE.map((t, i) => ({
    year: getContent(cm, 'timeline', `year_${i + 1}`, t.year),
    event: getContent(cm, 'timeline', `event_${i + 1}`, t.event),
  }));

  return (
    <div className="bg-bg min-h-screen mobile-bottom-pad">
      <SiteHeader activePage="vision" onNavigate={onNavigate} />
      <MobileNav active="vision" onNavigate={onNavigate} />

      <UniversalHero pageKey="vision" defaultBadge="Pourquoi nous existons" defaultTitle="Vision & Mission" bgImage="/church-photo-1.webp" />

      {/* ═══ DÉCLARATION ═══ */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="reveal section-label">Déclaration</p>
          <h2 className="reveal reveal-delay-1 mt-6 font-hero text-[clamp(2.2rem,5.5vw,4.25rem)] uppercase leading-[0.95] tracking-[0.01em] text-cream">
            La conquête des âmes,<br />
            la conquête des terres<br />
            <span className="text-evangile-600">habitables et cultivables.</span>
          </h2>
          <div className="reveal reveal-delay-2 mt-8 grid gap-px bg-line sm:grid-cols-[1fr_auto]">
            <p className="bg-bg p-0 pr-6 text-[15px] leading-relaxed text-cream/80 sm:text-base">
              {getContent(cm, 'vision', 'text', "Notre vision est ancrée dans la Parole de Dieu. Nous croyons que chaque âme a une valeur éternelle et que chaque terrain de vie peut être transformé par la puissance de l'Évangile.")}
            </p>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-evangile-600 sm:mt-0 sm:bg-bg sm:pl-6 sm:text-right">
              {CHURCH.visionReference}
            </p>
          </div>
        </div>
      </section>

      {/* ═══ MISSION ═══ */}
      <section className="border-y border-line bg-bg-card px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="reveal">
            <p className="section-label">Notre mission</p>
            <h2 className="section-title mt-4">Trois piliers pour un seul but</h2>
            <div className="rule-accent mt-6" />
          </div>
          <div className="mt-10 grid gap-px bg-line sm:grid-cols-3">
            {mission.map((m, i) => (
              <div key={m.title} className={`reveal reveal-delay-${i + 1} bg-bg-card p-8`}>
                <div className="flex items-start justify-between">
                  <IconBox pageKey="vision" elementId={`mission-icon-${i}`} className="inline-flex h-12 w-12 items-center justify-center border border-line text-evangile-600">
                    <m.Icon className="h-6 w-6" />
                  </IconBox>
                  <span className="stat-figure text-[2.25rem] text-evangile-600/20">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="card-title mt-6">{m.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ VALEURS ═══ */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="reveal">
            <p className="section-label">Ce qui nous guide</p>
            <h2 className="section-title mt-4">Nos valeurs</h2>
            <div className="rule-accent mt-6" />
          </div>
          <div className="mt-10 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v, i) => (
              <div key={v.title} className={`reveal reveal-delay-${(i % 3) + 1} bg-bg p-6`}>
                <IconBox pageKey="vision" elementId={`values-icon-${i}`} className="inline-flex h-10 w-10 items-center justify-center border border-line text-evangile-600">
                  <v.Icon className="h-5 w-5" />
                </IconBox>
                <h3 className="card-title mt-5 text-[1.25rem]">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PSAUME 2:8 ═══ */}
      <section className="border-y border-line bg-bg-card px-4 py-16 md:py-20">
        <div className="reveal mx-auto max-w-4xl">
          <blockquote className="border-l-2 border-evangile-600 pl-6 md:pl-10">
            <p className="verse-quote text-[clamp(1.35rem,2.6vw,1.9rem)] leading-snug">
              « Demande-moi, et je te donnerai les nations pour héritage, les extrémités de la terre pour possession. »
            </p>
            <cite className="mt-5 block text-[11px] font-semibold uppercase not-italic tracking-[0.24em] text-evangile-600">
              Psaume 2:8
            </cite>
          </blockquote>
        </div>
      </section>

      {/* ═══ REPÈRES ═══ */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="reveal">
            <p className="section-label">Notre parcours</p>
            <h2 className="section-title mt-4">Repères</h2>
            <div className="rule-accent mt-6" />
          </div>
          <ol className="mt-10 border-l border-line">
            {timeline.map((t, i) => (
              <li key={i} className={`reveal reveal-delay-${(i % 3) + 1} relative pl-8 pb-10 last:pb-0`}>
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 bg-evangile-600" aria-hidden="true" />
                <p className="font-hero text-2xl text-cream">{t.year}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t.event}</p>
              </li>
            ))}
          </ol>
          <p className="reveal mt-8 text-xs leading-relaxed text-muted/70">
            Seuls les faits publiés par l'église sont mentionnés ici. Les dates antérieures seront ajoutées
            lorsqu'elles auront été confirmées par le bureau pastoral.
          </p>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="border-t border-line px-4 py-16 md:py-24">
        <div className="reveal mx-auto flex max-w-4xl flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-eyebrow">Faites partie de l'histoire</p>
            <h2 className="section-title mt-4 text-[clamp(1.8rem,3.4vw,2.5rem)]">Cette vision se vit chaque jour</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
              Elle se réalise grâce à des personnes comme vous, à Lubumbashi et au-delà.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => onNavigate('about')} className="btn-primary">
              En savoir plus <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => onNavigate('contact')} className="btn-ghost">Nous rejoindre</button>
          </div>
        </div>
      </section>

      <div className="footer-spacer" />
      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
    </div>
  );
}
