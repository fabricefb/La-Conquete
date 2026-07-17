import { useState, useEffect, useMemo } from 'react';
import { db, buildContentMap, getContent } from '../lib/supabase';
import type { Ministry } from '../types';
import { useReveal } from '../lib/hooks';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { UniversalHero } from '../components/UniversalHero';
import type { Page } from '../lib/navigation';
import {
  Users, Heart, Crown, BookOpen, Moon, Flame, HandHeart, Sparkles,
  Music, GraduationCap, Globe, Mic, MapPin, Clock,
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

const CARD_ACCENT_CLASSES = ['bg-radial-primary', 'bg-radial-ember'] as const;

/* ─── Programme de la Semaine ─────────────────────────────────── */
const LOGO = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuHDznVSbj77TcRuf-r0to8rCYGPa9lZ75G4Zm7hbC__8gp8d56nTozKyHZyybWU9xdaBURMxftyiZF-i4Zdp8XT_bJYNT-WVQWu3r32FHqxjRzt9cCMpPuHJJZryUrKgHbCiFJYnLg0boUgp8ATuXf_zhlyEhW-QlPQVcfIXjf8lrX2G3JGtujmvo3YKp_c94RqPQf5g8LvIBM1zRCErGSOVjRIw8SQ4aH3aliCJ-EOhKBq-PO5S3pZoaMuTk7u2iKCU';

interface WeeklySlot {
  day: string; date: string; title: string; subtitle?: string;
  time: string; endTime?: string; fullWidth?: boolean;
}

function getWeekLabel(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  return `Du ${monday.toLocaleDateString('fr-FR', opts)} au ${sunday.toLocaleDateString('fr-FR', opts)}`;
}

function getDayDate(offset: number, base: Date): string {
  const d = new Date(base);
  d.setDate(base.getDate() + offset);
  return d.getDate().toString().padStart(2, '0');
}

function WeeklySchedule() {
  const base = useMemo(() => {
    const now = new Date();
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dow + 6) % 7));
    return monday;
  }, []);

  const slots: WeeklySlot[] = [
    { day: 'MARDI', date: getDayDate(1, base), title: 'Réunion des Mamans', time: '16h00', endTime: '18h00' },
    { day: 'MERCREDI', date: getDayDate(2, base), title: 'Partage & Étude Biblique', subtitle: 'Croître dans la Parole', time: '16:30', endTime: '18:30' },
    { day: 'VENDREDI', date: getDayDate(4, base), title: 'Jeûne & Prière', time: '09h00', endTime: '18h30' },
    { day: 'SAMEDI', date: getDayDate(5, base), title: 'Réunion de la Jeunesse', subtitle: '"Bâtir une génération de conquérants"', time: '16:30', endTime: '18:30' },
    { day: 'DIMANCHE', date: getDayDate(6, base), title: 'Culte Dominical', time: '08:00', endTime: '12:30', fullWidth: true },
  ];

  return (
    <section className="relative overflow-hidden px-4 py-16 md:py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-bg via-ink-950/50 to-bg" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-400/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-evangile-700/5 rounded-full blur-[100px]" style={{ animationDelay: '3s' }} />
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="reveal flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <img src={LOGO} alt="Logo" className="w-14 h-14 md:w-18 md:h-18 rounded-full object-cover opacity-90" />
            <h2 className="font-serif text-3xl md:text-5xl font-black text-cream leading-tight">
              Programme <span className="text-accent-400">de la Semaine</span>
            </h2>
          </div>
          <div className="text-right">
            <div className="inline-flex rounded-full border border-line bg-white/5 px-4 py-1.5 mb-2">
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-gold/70">{getWeekLabel()}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-nowrap gap-4 md:gap-6 overflow-x-auto pb-8 no-scrollbar snap-x snap-mandatory">
          {slots.map((slot) =>
            slot.fullWidth ? (
              <article key={slot.day} className="reveal snap-center min-w-[320px] md:min-w-[700px] lg:min-w-full glass rounded-3xl p-6 md:p-10 relative overflow-hidden group flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/90 to-evangile-600/10" />
                <div className="absolute -right-10 -top-10 w-48 h-48 bg-accent-400/10 rounded-full blur-[80px] group-hover:scale-110 transition-transform duration-700" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                      <span className="bg-accent-500 text-ink-950 px-4 py-1 rounded-full text-xs font-bold tracking-[0.2em] uppercase">{slot.day}</span>
                      <span className="font-serif text-4xl md:text-5xl font-black text-gold/30">{slot.date}</span>
                    </div>
                    <h3 className="font-serif text-3xl md:text-5xl font-black uppercase tracking-tight text-cream leading-none">{slot.title}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto">
                    <div className="glass bg-white/5 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                      <p className="text-[10px] font-bold text-gold/60 uppercase mb-2 tracking-widest">1<sup>er</sup> Culte (FR)</p>
                      <p className="text-2xl md:text-3xl font-serif font-black text-accent-400">08:00</p>
                      <p className="text-xs text-muted/50 mt-1">Fin à 10:00</p>
                    </div>
                    <div className="glass bg-white/5 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                      <p className="text-[10px] font-bold text-gold/60 uppercase mb-2 tracking-widest">2<sup>ème</sup> Culte (Bilingue)</p>
                      <p className="text-2xl md:text-3xl font-serif font-black text-cream">10:30</p>
                      <p className="text-xs text-muted/50 mt-1">Fin à 12:30</p>
                    </div>
                  </div>
                </div>
              </article>
            ) : (
              <article key={slot.day} className="reveal snap-center min-w-[280px] md:min-w-[320px] glass rounded-3xl p-6 md:p-8 relative overflow-hidden group flex-shrink-0 hover:scale-[1.02] hover:border-gold/30 transition-all duration-500">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gold/5 to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full justify-between min-h-[220px]">
                  <div>
                    <div className="flex justify-between items-start mb-8">
                      <span className="text-gold/60 font-bold text-[10px] uppercase tracking-[0.3em]">{slot.day}</span>
                      <span className="font-serif text-4xl md:text-5xl font-black text-white/10 leading-none">{slot.date}</span>
                    </div>
                    <h3 className="font-serif text-xl md:text-2xl font-black uppercase tracking-tight text-cream leading-tight">{slot.title}</h3>
                    {slot.subtitle && <p className="mt-2 text-sm text-gold/70 italic">{slot.subtitle}</p>}
                  </div>
                  <div className="mt-8 flex items-center gap-3">
                    <div className="h-px flex-1 bg-line" />
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gold/60" />
                      <span className="font-bold text-sm text-cream/80">{slot.time}</span>
                      {slot.endTime && <span className="text-muted/50 text-sm">— {slot.endTime}</span>}
                    </div>
                  </div>
                </div>
              </article>
            )
          )}
        </div>

        <div className="reveal mt-8 flex flex-col md:flex-row items-center gap-4 text-sm text-muted/60 border-t border-line/50 pt-6">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gold/50" />
            <span>Route du Poids Lours — Coin Av/ Colonel Freddy</span>
          </div>
          <span className="hidden md:block text-line">|</span>
          <span className="italic text-gold/40">L'excellence au service de Dieu</span>
        </div>
      </div>
    </section>
  );
}

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
      <div className="min-h-screen bg-bg text-cream font-sans">
        <SiteHeader activePage="activities" onNavigate={onNavigate} />
        <MobileNav active="activities" onNavigate={onNavigate} />

        {/* Hero skeleton */}
        <section className="relative flex min-h-[40vh] items-center justify-center overflow-hidden pt-16 bg-radial-primary">
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
      <SiteHeader activePage="activities" onNavigate={onNavigate} />
      <MobileNav active="activities" onNavigate={onNavigate} />

      {/* ── Hero ── */}
      <UniversalHero pageKey="activities" defaultBadge="Vie communautaire" defaultTitle="Nos Activités" defaultSubtitle="Découvrez les différents ministères et activités de notre église." />

      {/* ── Programme de la Semaine ── */}
      <WeeklySchedule />

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
                    className={`reveal ${i < 6 ? `reveal-delay-${(i % 3) + 1}` : ''} glass card-parallax rounded-3xl p-7 ${accentClass}`}
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