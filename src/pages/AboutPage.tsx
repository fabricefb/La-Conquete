import { useState, useEffect } from 'react';
import { db, buildContentMap, getContent } from '../lib/supabase';
import type { PageContent, Ministry } from '../types';
import { useReveal } from '../lib/hooks';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import type { Page } from '../lib/navigation';

interface PageProps { onNavigate: (page: Page) => void; }

interface ValueItem {
  icon: string;
  title: string;
  description: string;
}

const FALLBACK_VALUES: ValueItem[] = [
  {
    icon: '❤️',
    title: 'Foi',
    description:
      'Nous croyons en la puissance transformative de la foi en Jésus-Christ. Elle est le fondement de tout ce que nous faisons et la source de notre espérance.',
  },
  {
    icon: '✝️',
    title: 'Amour',
    description:
      "L'amour de Dieu nous motive à aimer notre prochain authentiquement. Nous cultivons une communauté où chacun est accueilli et valorisé.",
  },
  {
    icon: '⭐',
    title: 'Excellence',
    description:
      'Nous nous efforçons de servir Dieu avec excellence dans chaque domaine, offrant le meilleur de nous-mêmes pour honorer Celui qui nous a tout donné.',
  },
  {
    icon: '🤲',
    title: 'Service',
    description:
      'Suivre l\'exemple du Christ, c\'est servir les autres. Chaque membre est encouragé à découvrir ses dons et à les mettre au service de la communauté.',
  },
];

export function AboutPage({ onNavigate }: PageProps) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [contentMap, setContentMap] = useState<ReturnType<typeof buildContentMap>>(new Map());
  const [loading, setLoading] = useState(true);

  useReveal();

  useEffect(() => {
    let cancelled = false;

    async function fetchContent() {
      try {
        const contents = await db.getPageContents('about');
        if (!cancelled) {
          setContentMap(buildContentMap(contents));
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    fetchContent();
    return () => { cancelled = true; };
  }, []);

  const heroBadge = getContent(contentMap, 'hero', 'badge', 'À propos de nous');
  const heroTitle = getContent(contentMap, 'hero', 'title', 'Notre Histoire');
  const heroSubtitle = getContent(contentMap, 'hero', 'subtitle', '');

  const missionTitle = getContent(contentMap, 'mission', 'title', 'Notre Mission');
  const missionText = getContent(
    contentMap,
    'mission',
    'description',
    'Nous sommes une communauté de croyants passionnés, engagés à vivre et partager l\'Évangile de Jésus-Christ. Notre mission est de faire des disciples, de former des leaders et de transformer notre monde par la puissance de l\'amour de Dieu. Chaque jour, nous nous efforçons d\'être les mains et les pieds de Jésus dans notre communauté et au-delà.',
  );

  const historyTitle = getContent(contentMap, 'history', 'title', 'Notre Parcours');
  const historyParagraph1 = getContent(
    contentMap,
    'history',
    'paragraph_1',
    'Fondée avec une vision claire de servir la communauté et de proclamer la Parole de Dieu, notre église a grandi grâce à la fidélité de Dieu et à l\'engagement de ses membres. Depuis nos humbles débuts, nous avons vu des vies transformées, des familles restaurées et une communauté unie autour de l\'essentiel : l\'amour de Christ.',
  );
  const historyParagraph2 = getContent(
    contentMap,
    'history',
    'paragraph_2',
    'Aujourd\'hui, nous continuons à avancer avec la même passion et le même engagement. Chaque étape de notre parcours témoigne de la grâce souveraine de Dieu et de Sa fidélité envers ceux qui Le cherchent de tout leur cœur.',
  );

  const valuesTitle = getContent(contentMap, 'values', 'title', 'Nos Valeurs');
  const valuesSubtitle = getContent(
    contentMap,
    'values',
    'subtitle',
    'Les piliers qui guident notre vie communautaire et notre engagement au service de Dieu.',
  );

  // Build dynamic values from DB or fall back to hardcoded
  const values: ValueItem[] = (() => {
    const dynamicValues: ValueItem[] = [];
    let index = 1;
    while (true) {
      const title = getContent(contentMap, `value_${index}`, 'title', '');
      if (!title) break;
      dynamicValues.push({
        icon: getContent(contentMap, `value_${index}`, 'icon', FALLBACK_VALUES[(index - 1) % FALLBACK_VALUES.length].icon),
        title,
        description: getContent(
          contentMap,
          `value_${index}`,
          'desc',
          FALLBACK_VALUES[(index - 1) % FALLBACK_VALUES.length].description,
        ),
      });
      index++;
    }
    return dynamicValues.length > 0 ? dynamicValues : FALLBACK_VALUES;
  })();

  if (loading) {
    return (
      <div className="bg-bg min-h-screen">
        <SiteHeader theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
        <MobileNav theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />

        {/* Hero skeleton */}
        <section className="relative flex min-h-[40vh] items-center justify-center overflow-hidden pt-16 bg-radial-gold">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <div className="mb-4 h-6 w-28 animate-pulse rounded-full bg-white/10" />
            <div className="mb-4 h-10 w-72 animate-pulse rounded-xl bg-white/10 mx-auto" />
            <div className="h-5 w-96 max-w-full animate-pulse rounded-lg bg-white/10 mx-auto" />
          </div>
        </section>

        {/* Mission skeleton */}
        <section className="py-20 px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4 h-8 w-48 animate-pulse rounded-lg bg-white/5" />
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="h-4 w-full animate-pulse rounded bg-white/5" />
                <div className="h-4 w-full animate-pulse rounded bg-white/5" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/5" />
              </div>
              <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
            </div>
          </div>
        </section>

        {/* Values skeleton */}
        <section className="py-20 px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-3 h-8 w-48 animate-pulse rounded-lg bg-white/5 mx-auto text-center" />
            <div className="mb-10 h-5 w-80 animate-pulse rounded bg-white/5 mx-auto" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-52 animate-pulse rounded-3xl bg-white/5" />
              ))}
            </div>
          </div>
        </section>

        <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="bg-bg min-h-screen">
      <SiteHeader theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
      <MobileNav theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />

      {/* ── Hero ── */}
      <section className="relative flex min-h-[40vh] items-center justify-center overflow-hidden pt-16 bg-radial-gold">
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <span className="reveal mb-4 inline-block rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold">
            {heroBadge}
          </span>
          <h1 className="reveal reveal-delay-1 font-serif text-4xl font-bold leading-tight text-cream sm:text-5xl md:text-6xl">
            {heroTitle}
          </h1>
          {heroSubtitle && (
            <p className="reveal reveal-delay-2 mt-6 text-lg leading-relaxed text-muted sm:text-xl">
              {heroSubtitle}
            </p>
          )}
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="reveal section-label mb-3">{missionTitle}</h2>
              <p className="reveal reveal-delay-1 text-base leading-relaxed text-cream/80 sm:text-lg">
                {missionText}
              </p>
            </div>
            <div className="reveal reveal-delay-2 flex items-center justify-center">
              <div className="glass flex h-72 w-full items-center justify-center rounded-2xl bg-radial-gold sm:h-80">
                <span className="text-6xl opacity-40">⛪</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── History ── */}
      <section className="py-20 px-4 bg-radial-ember">
        <div className="mx-auto max-w-4xl">
          <h2 className="reveal section-label mb-8 text-center">{historyTitle}</h2>
          <div className="reveal reveal-delay-1 space-y-6 text-center">
            <p className="text-base leading-relaxed text-cream/80 sm:text-lg">
              {historyParagraph1}
            </p>
            <p className="text-base leading-relaxed text-cream/80 sm:text-lg">
              {historyParagraph2}
            </p>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-6xl">
          <h2 className="reveal section-label mb-3 text-center">{valuesTitle}</h2>
          {valuesSubtitle && (
            <p className="reveal reveal-delay-1 mb-12 text-center text-base text-muted sm:text-lg">
              {valuesSubtitle}
            </p>
          )}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((value, i) => (
              <div
                key={value.title}
                className={`reveal ${i < 3 ? `reveal-delay-${i + 1}` : ''} glass rounded-3xl p-7 transition-transform duration-300 hover:scale-[1.02]`}
              >
                <span className="mb-4 block text-3xl">{value.icon}</span>
                <h3 className="font-serif mb-3 text-xl font-semibold text-cream">
                  {value.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-4">
        <div className="reveal mx-auto max-w-2xl text-center">
          <h2 className="section-label mb-4">Rejoignez-nous</h2>
          <p className="mb-8 text-cream/70">
            Vous désirez en savoir plus sur notre communauté ou participer à notre prochaine
            rencontre ? Nous serions ravis de vous accueillir.
          </p>
          <button onClick={() => onNavigate('contact')} className="btn-gold">
            Nous contacter
          </button>
        </div>
      </section>

      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
    </div>
  );
}