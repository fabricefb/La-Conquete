import { useState, useEffect } from 'react';
import { db, buildContentMap, getContent } from '../lib/supabase';
import type { Ministry } from '../types';
import { useReveal } from '../lib/hooks';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import type { Page } from '../lib/navigation';
import {
  Users,
  Heart,
  Crown,
  BookOpen,
  Moon,
  Flame,
  HandHeart,
  Sparkles,
  Music,
  GraduationCap,
  Globe,
  Mic,
  type LucideIcon,
} from '../lib/icons';

interface PageProps { onNavigate: (page: Page) => void; }

const ICON_MAP: Record<string, LucideIcon> = {
  Users,
  Heart,
  Crown,
  BookOpen,
  Moon,
  Flame,
  HandHeart,
  Sparkles,
  Music,
  GraduationCap,
  Globe,
  Mic,
};

function getIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] ?? Users;
}

const CARD_ACCENT_CLASSES = ['bg-radial-gold', 'bg-radial-ember'] as const;

function getAccentClass(index: number): string {
  return CARD_ACCENT_CLASSES[index % CARD_ACCENT_CLASSES.length];
}

export function ActivitiesPage({ onNavigate }: PageProps) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [contentMap, setContentMap] = useState<Record<string, string>>({});
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);

  useReveal();

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [contents, ministriesData] = await Promise.all([
          db.getPageContents('activities'),
          db.getActiveMinistries(),
        ]);

        if (!cancelled) {
          setContentMap(buildContentMap(contents));
          setMinistries(ministriesData);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  const heroBadge = getContent(contentMap, 'hero', 'badge', 'Vie communautaire');
  const heroTitle = getContent(contentMap, 'hero', 'title', 'Nos Activités');
  const heroSubtitle = getContent(
    contentMap,
    'hero',
    'subtitle',
    'Découvrez les différents ministères et activités qui font vibrer la vie de notre église.',
  );

  const ministriesTitle = getContent(contentMap, 'ministries', 'title', 'Nos Ministères');
  const ministriesSubtitle = getContent(
    contentMap,
    'ministries',
    'subtitle',
    'Chaque ministère est une opportunité de servir, grandir et bénir ceux qui nous entourent.',
  );

  const ctaTitle = getContent(contentMap, 'cta', 'title', 'Impliquez-vous');
  const ctaText = getContent(
    contentMap,
    'cta',
    'description',
    'Vous avez un désir de servir ou une question sur nos activités ? N\'hésitez pas à nous écrire.',
  );

  if (loading) {
    return (
      <div className="bg-bg min-h-screen">
        <SiteHeader activePage="activities" theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
        <MobileNav active="activities" theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />

        {/* Hero skeleton */}
        <section className="relative flex min-h-[40vh] items-center justify-center overflow-hidden pt-16 bg-radial-gold">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <div className="mb-4 h-6 w-32 animate-pulse rounded-full bg-white/10" />
            <div className="mb-4 h-10 w-64 animate-pulse rounded-xl bg-white/10 mx-auto" />
            <div className="h-5 w-96 max-w-full animate-pulse rounded-lg bg-white/10 mx-auto" />
          </div>
        </section>

        {/* Ministries grid skeleton */}
        <section className="py-20 px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-3 h-8 w-52 animate-pulse rounded-lg bg-white/5 mx-auto text-center" />
            <div className="mb-10 h-5 w-80 animate-pulse rounded bg-white/5 mx-auto" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-56 animate-pulse rounded-3xl bg-white/5" />
              ))}
            </div>
          </div>
        </section>

        {/* CTA skeleton */}
        <section className="py-20 px-4">
          <div className="mx-auto max-w-4xl">
            <div className="h-48 animate-pulse rounded-2xl bg-white/5" />
          </div>
        </section>

        <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="bg-bg min-h-screen">
      <SiteHeader activePage="activities" theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
      <MobileNav active="activities" theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />

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

      {/* ── Ministries Grid ── */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-6xl">
          <h2 className="reveal section-label mb-3 text-center">{ministriesTitle}</h2>
          {ministriesSubtitle && (
            <p className="reveal reveal-delay-1 mb-12 text-center text-base text-muted sm:text-lg">
              {ministriesSubtitle}
            </p>
          )}

          {ministries.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {ministries.map((ministry, i) => {
                const Icon = getIcon(ministry.icon_name ?? '');
                const accentClass = getAccentClass(i);

                return (
                  <div
                    key={ministry.id}
                    className={`reveal ${i < 6 ? `reveal-delay-${(i % 3) + 1}` : ''} glass rounded-3xl p-7 transition-transform duration-300 hover:scale-[1.02] ${accentClass}`}
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10">
                      <Icon className="h-6 w-6 text-gold" />
                    </div>
                    <h3 className="font-serif mb-2 text-xl font-semibold text-cream">
                      {ministry.title}
                    </h3>
                    <p className="mb-4 text-sm leading-relaxed text-muted">
                      {ministry.description}
                    </p>
                    {ministry.schedule && (
                      <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-cream/60">
                        <Moon className="h-3.5 w-3.5 shrink-0 text-gold/70" />
                        <span>{ministry.schedule}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted">
              Aucun ministère n'est disponible pour le moment.
            </p>
          )}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 px-4">
        <div className="reveal mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-2xl">
            {/* Background image placeholder */}
            <div className="absolute inset-0 bg-radial-ember opacity-60" />
            <div className="absolute inset-0 bg-bg/70" />
            <div className="relative z-10 flex flex-col items-center px-6 py-16 text-center sm:py-20">
              <h2 className="section-label mb-4">{ctaTitle}</h2>
              <p className="mb-8 max-w-lg text-cream/70">
                {ctaText}
              </p>
              <button onClick={() => onNavigate('contact')} className="btn-gold">
                Nous contacter
              </button>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
    </div>
  );
}